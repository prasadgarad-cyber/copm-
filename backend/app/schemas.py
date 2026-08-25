from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

class ComplaintCategory(str, Enum):
    pothole = "pothole"
    road_damage = "road_damage"
    streetlight = "streetlight"
    garbage = "garbage"
    water_leakage = "water_leakage"
    drainage = "drainage"
    traffic_signal = "traffic_signal"
    fallen_tree = "fallen_tree"
    other = "other"

class ComplaintStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    duplicate = "duplicate"
    resolved = "resolved"

class ComplaintBase(BaseModel):
    description: str = Field(..., min_length=1)
    category: ComplaintCategory
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    image_path: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    parent_id: Optional[int] = None

class ComplaintResponse(ComplaintBase):
    id: int
    status: ComplaintStatus = ComplaintStatus.pending
    parent_id: Optional[int] = None
    duplicate_score: Optional[float] = None
    duplicate_count: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DuplicateMatchStatus(str, Enum):
    new = "new"
    possible_duplicate = "possible_duplicate"
    likely_duplicate = "likely_duplicate"

class MatchedComplaintSummary(BaseModel):
    id: int
    description: str
    category: ComplaintCategory
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)

class DuplicateSignals(BaseModel):
    location_similarity: float
    text_similarity: float
    category_similarity: float

class DuplicateCheckRequest(BaseModel):
    description: str = Field(..., min_length=1)
    category: ComplaintCategory
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class DuplicateCheckResponse(BaseModel):
    status: DuplicateMatchStatus
    duplicate_score: float
    matched_complaint: Optional[MatchedComplaintSummary] = None
    signals: Optional[DuplicateSignals] = None
    distance_meters: Optional[float] = None

class DuplicateDetectionSummary(BaseModel):
    status: DuplicateMatchStatus
    duplicate_score: float
    matched_complaint_id: Optional[int] = None
    distance_meters: Optional[float] = None

class ComplaintSubmissionResponse(BaseModel):
    complaint: ComplaintResponse
    duplicate_detection: DuplicateDetectionSummary

class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    parent_id: Optional[int] = None

class NearbyComplaintItem(BaseModel):
    id: int
    description: str
    category: ComplaintCategory
    latitude: float
    longitude: float
    image_path: Optional[str] = None
    status: ComplaintStatus = ComplaintStatus.pending
    created_at: datetime
    distance_meters: float
    location_similarity: float

    model_config = ConfigDict(from_attributes=True)

class NearbyComplaintsResponse(BaseModel):
    count: int
    complaints: List[NearbyComplaintItem]

class TextSimilarityRequest(BaseModel):
    text1: str
    text2: str

class TextSimilarityResponse(BaseModel):
    text_similarity: float
