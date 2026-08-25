from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os

from .. import models, schemas
from ..database import get_db
from ..config import settings
from ..services.duplicate_detector import find_potential_duplicates
from ..services.duplicate_service import check_duplicate_complaint as run_duplicate_check
from ..services.geo_service import find_nearby_complaints

router = APIRouter()

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def get_file_extension(filename: str) -> str:
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

@router.post("/complaints/check-duplicate", response_model=schemas.DuplicateCheckResponse)
def check_duplicate(
    payload: schemas.DuplicateCheckRequest,
    db: Session = Depends(get_db)
):
    """Check potential duplicates before submitting a complaint."""
    result = run_duplicate_check(
        db=db,
        description=payload.description,
        category=payload.category.value,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    return schemas.DuplicateCheckResponse(**result)

@router.post("/complaints", response_model=schemas.ComplaintSubmissionResponse)
async def create_complaint(
    description: str = Form(...),
    category: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    parent_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # 1. Validation
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description must not be empty")

    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")

    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")

    try:
        category_enum = schemas.ComplaintCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    if parent_id is not None:
        parent_complaint = db.query(models.Complaint).filter(models.Complaint.id == parent_id).first()
        if not parent_complaint:
            raise HTTPException(status_code=404, detail=f"Parent complaint with ID {parent_id} not found")

    image_path = None
    if image and image.filename:
        ext = get_file_extension(image.filename)
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        content = await image.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit")

        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        with open(filepath, "wb") as f:
            f.write(content)

        image_path = f"/uploads/{filename}"

    # 2. Check nearby existing complaints & evaluate duplicate score using clean service layer
    dup_result = run_duplicate_check(
        db=db,
        description=description,
        category=category_enum.value,
        latitude=latitude,
        longitude=longitude
    )

    dup_status_str = dup_result["status"]  # "new", "possible_duplicate", "likely_duplicate"
    dup_score = dup_result["duplicate_score"]
    matched_id = dup_result["matched_complaint"]["id"] if dup_result["matched_complaint"] else None
    distance_meters = dup_result["distance_meters"]

    # 3. Determine status and parent_id for saving
    assigned_status = "pending"
    assigned_parent_id = parent_id

    if assigned_parent_id is not None:
        assigned_status = "duplicate"
    elif dup_status_str == "likely_duplicate" and matched_id is not None:
        assigned_status = "duplicate"
        assigned_parent_id = matched_id

    # 4. Save new complaint regardless of duplicate detection result
    db_complaint = models.Complaint(
        description=description,
        category=category_enum.value,
        latitude=latitude,
        longitude=longitude,
        image_path=image_path,
        status=assigned_status,
        parent_id=assigned_parent_id,
        duplicate_score=dup_score
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)

    # 5. Return complaint along with duplicate detection analysis
    detection_summary = schemas.DuplicateDetectionSummary(
        status=schemas.DuplicateMatchStatus(dup_status_str),
        duplicate_score=dup_score,
        matched_complaint_id=matched_id,
        distance_meters=distance_meters
    )

    return schemas.ComplaintSubmissionResponse(
        complaint=schemas.ComplaintResponse.model_validate(db_complaint),
        duplicate_detection=detection_summary
    )


@router.get("/complaints/nearby", response_model=schemas.NearbyComplaintsResponse)
def get_nearby_complaints(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude of location"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude of location"),
    radius_meters: float = Query(settings.DUPLICATE_SEARCH_RADIUS_METERS, gt=0, description="Search radius in meters"),
    db: Session = Depends(get_db)
):
    """Retrieve all complaints within radius_meters of specified GPS location."""
    results = find_nearby_complaints(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters
    )
    return schemas.NearbyComplaintsResponse(
        count=len(results),
        complaints=results
    )

@router.get("/complaints", response_model=List[schemas.ComplaintResponse])
def get_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    only_parent: bool = Query(False, description="Filter only master complaints (exclude duplicates)"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Complaint)
    if only_parent:
        query = query.filter(models.Complaint.parent_id.is_(None), models.Complaint.status != "duplicate")
    if status:
        query = query.filter(models.Complaint.status == status)
    if category:
        query = query.filter(models.Complaint.category == category)
    
    complaints = query.all()
    results = []
    for c in complaints:
        dup_count = db.query(models.Complaint).filter(models.Complaint.parent_id == c.id).count()
        item = schemas.ComplaintResponse.model_validate(c)
        item.duplicate_count = dup_count
        results.append(item)
    return results

@router.get("/complaints/{complaint_id}", response_model=schemas.ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    dup_count = db.query(models.Complaint).filter(models.Complaint.parent_id == complaint.id).count()
    resp = schemas.ComplaintResponse.model_validate(complaint)
    resp.duplicate_count = dup_count
    return resp

@router.get("/complaints/{complaint_id}/duplicates", response_model=List[schemas.ComplaintResponse])
def get_complaint_duplicates(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    duplicates = db.query(models.Complaint).filter(models.Complaint.parent_id == complaint_id).all()
    results = []
    for d in duplicates:
        d_count = db.query(models.Complaint).filter(models.Complaint.parent_id == d.id).count()
        item = schemas.ComplaintResponse.model_validate(d)
        item.duplicate_count = d_count
        results.append(item)
    return results

@router.patch("/complaints/{complaint_id}/status", response_model=schemas.ComplaintResponse)
def update_complaint_status(
    complaint_id: int,
    payload: schemas.ComplaintStatusUpdate,
    db: Session = Depends(get_db)
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if payload.parent_id is not None:
        parent = db.query(models.Complaint).filter(models.Complaint.id == payload.parent_id).first()
        if parent is None:
            raise HTTPException(status_code=404, detail=f"Parent complaint {payload.parent_id} not found")
        if payload.parent_id == complaint_id:
            raise HTTPException(status_code=400, detail="A complaint cannot be its own parent")
        complaint.parent_id = payload.parent_id
    elif payload.status != schemas.ComplaintStatus.duplicate:
        complaint.parent_id = None

    complaint.status = payload.status.value

    # If resolving parent, cascade resolution to merged duplicates
    if payload.status.value == "resolved" and complaint.parent_id is None:
        db.query(models.Complaint).filter(models.Complaint.parent_id == complaint_id).update({"status": "resolved"})


    db.commit()
    db.refresh(complaint)
    
    dup_count = db.query(models.Complaint).filter(models.Complaint.parent_id == complaint.id).count()
    resp = schemas.ComplaintResponse.model_validate(complaint)
    resp.duplicate_count = dup_count
    return resp

