from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from .geo_service import calculate_distance_meters, calculate_location_similarity
from .text_similarity import calculate_text_similarity

# Duplicate Engine Weights
LOCATION_WEIGHT = 0.50
TEXT_WEIGHT = 0.35
CATEGORY_WEIGHT = 0.15

# Duplicate Classification Thresholds
LIKELY_DUPLICATE_THRESHOLD = 80.0
POSSIBLE_DUPLICATE_THRESHOLD = 50.0

def calculate_category_similarity(cat1: str, cat2: str) -> float:
    """
    Compare complaint categories.
    Same category: 100.0
    Different category: 0.0
    """
    if not cat1 or not cat2:
        return 0.0
    val1 = cat1.value if hasattr(cat1, "value") else str(cat1).strip().lower()
    val2 = cat2.value if hasattr(cat2, "value") else str(cat2).strip().lower()
    return 100.0 if val1 == val2 else 0.0

def calculate_duplicate_score(
    location_similarity: float,
    text_similarity: float,
    category_similarity: float
) -> float:
    """
    Calculate composite duplicate score:
    duplicate_score = (location_similarity * 0.50) + (text_similarity * 0.35) + (category_similarity * 0.15)
    Returns score rounded to 1 decimal place.
    """
    score = (
        (location_similarity * LOCATION_WEIGHT)
        + (text_similarity * TEXT_WEIGHT)
        + (category_similarity * CATEGORY_WEIGHT)
    )
    return round(max(0.0, min(100.0, score)), 1)

def determine_duplicate_status(score: float) -> str:
    """
    Classify duplicate status by score:
    - score < 50: "new"
    - 50 <= score < 80: "possible_duplicate"
    - score >= 80: "likely_duplicate"
    """
    if score >= LIKELY_DUPLICATE_THRESHOLD:
        return "likely_duplicate"
    elif score >= POSSIBLE_DUPLICATE_THRESHOLD:
        return "possible_duplicate"
    else:
        return "new"

def check_duplicate_complaint(
    db: Session,
    description: str,
    category: str,
    latitude: float,
    longitude: float,
    radius_meters: float = settings.DUPLICATE_SEARCH_RADIUS_METERS,
    exclude_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Search existing complaints within radius_meters and compute composite duplicate score
    combining geospatial proximity, semantic text similarity, and category similarity.
    Returns the highest matching existing complaint or 'new' if none found.
    """
    query = db.query(models.Complaint)
    if exclude_id is not None:
        query = query.filter(models.Complaint.id != exclude_id)

    existing_complaints: List[models.Complaint] = query.all()
    candidates = []

    for item in existing_complaints:
        dist = calculate_distance_meters(latitude, longitude, item.latitude, item.longitude)
        if dist <= radius_meters:
            loc_sim = calculate_location_similarity(dist, max_radius=radius_meters)
            txt_sim = calculate_text_similarity(description, item.description)
            cat_sim = calculate_category_similarity(category, item.category)
            dup_score = calculate_duplicate_score(loc_sim, txt_sim, cat_sim)

            candidates.append({
                "complaint": item,
                "distance_meters": dist,
                "location_similarity": loc_sim,
                "text_similarity": txt_sim,
                "category_similarity": cat_sim,
                "duplicate_score": dup_score
            })

    if not candidates:
        return {
            "status": "new",
            "duplicate_score": 0.0,
            "matched_complaint": None,
            "signals": None,
            "distance_meters": None
        }

    # Sort by duplicate score descending, then distance ascending
    candidates.sort(key=lambda x: (x["duplicate_score"], -x["distance_meters"]), reverse=True)
    best = candidates[0]
    status = determine_duplicate_status(best["duplicate_score"])

    return {
        "status": status,
        "duplicate_score": best["duplicate_score"],
        "matched_complaint": {
            "id": best["complaint"].id,
            "description": best["complaint"].description,
            "category": best["complaint"].category,
            "latitude": best["complaint"].latitude,
            "longitude": best["complaint"].longitude
        },
        "signals": {
            "location_similarity": best["location_similarity"],
            "text_similarity": best["text_similarity"],
            "category_similarity": best["category_similarity"]
        },
        "distance_meters": best["distance_meters"]
    }
