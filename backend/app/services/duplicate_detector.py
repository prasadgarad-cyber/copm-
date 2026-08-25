import math
import re
from difflib import SequenceMatcher
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from .. import models
from ..config import settings

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on earth in meters."""
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_distance_score(distance_meters: float, max_radius: float) -> float:
    """Calculate a 0.0 to 1.0 proximity score based on distance within max_radius."""
    if distance_meters >= max_radius or max_radius <= 0:
        return 0.0
    return max(0.0, 1.0 - (distance_meters / max_radius))

def normalize_text(text: str) -> str:
    """Lowercase and remove non-alphanumeric characters except spaces."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return ' '.join(text.split())

def calculate_text_similarity(desc1: str, desc2: str) -> float:
    """Calculate text similarity combining SequenceMatcher and Jaccard word set index."""
    norm1 = normalize_text(desc1)
    norm2 = normalize_text(desc2)
    
    if not norm1 or not norm2:
        return 0.0

    seq_score = SequenceMatcher(None, norm1, norm2).ratio()
    
    words1 = set(norm1.split())
    words2 = set(norm2.split())
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    jaccard_score = len(intersection) / len(union) if union else 0.0

    return (seq_score * 0.6) + (jaccard_score * 0.4)

def compute_composite_score(
    category1: str,
    category2: str,
    distance_meters: float,
    text_similarity: float
) -> float:
    """Calculate overall duplicate confidence score (0.0 to 1.0)."""
    if category1 != category2:
        return 0.0

    dist_score = calculate_distance_score(distance_meters, settings.DUPLICATE_RADIUS_METERS)
    comp_score = (dist_score * settings.DISTANCE_WEIGHT) + (text_similarity * settings.TEXT_SIMILARITY_WEIGHT)
    return round(comp_score, 4)

def find_potential_duplicates(
    db: Session,
    category: str,
    latitude: float,
    longitude: float,
    description: str,
    exclude_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Query existing active complaints and calculate duplicate scores."""
    query = db.query(models.Complaint).filter(
        models.Complaint.category == category,
        models.Complaint.status != "duplicate"
    )
    if exclude_id:
        query = query.filter(models.Complaint.id != exclude_id)

    existing_complaints = query.all()
    matches = []

    for item in existing_complaints:
        dist = haversine_distance(latitude, longitude, item.latitude, item.longitude)
        if dist <= settings.DUPLICATE_RADIUS_METERS:
            t_sim = calculate_text_similarity(description, item.description)
            c_score = compute_composite_score(category, item.category, dist, t_sim)
            
            matches.append({
                "complaint": item,
                "distance_meters": round(dist, 2),
                "text_similarity": round(t_sim, 4),
                "composite_score": c_score
            })

    matches.sort(key=lambda x: x["composite_score"], reverse=True)
    return matches
