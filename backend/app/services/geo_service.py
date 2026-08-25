import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from .. import models
from ..config import settings

EARTH_RADIUS_METERS: float = 6371000.0  # Mean radius of the Earth in meters

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth 
    using the Haversine formula. Returns distance in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 + 
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = EARTH_RADIUS_METERS * c
    return round(distance, 1)

def calculate_location_similarity(distance_meters: float, max_radius: float = settings.DUPLICATE_SEARCH_RADIUS_METERS) -> float:
    """
    Calculate a location similarity score (0.0 to 100.0%) based on distance.
    Uses a smooth non-linear decay curve over max_radius:
    - 0 meters: 100.0%
    - 0-20m: Very high (83.7% - 100.0%)
    - 20-50m: High (57.4% - 83.7%)
    - 50-100m: Moderate (0.0% - 57.4%)
    - >100m: 0.0%
    """
    if distance_meters <= 0:
        return 100.0
    if distance_meters >= max_radius or max_radius <= 0:
        return 0.0

    fraction = 1.0 - (distance_meters / max_radius)
    # Smooth decay exponent
    similarity = 100.0 * (fraction ** 0.8)
    return round(max(0.0, min(100.0, similarity)), 1)

def calculate_geo_match(lat1: float, lon1: float, lat2: float, lon2: float, max_radius: float = settings.DUPLICATE_SEARCH_RADIUS_METERS) -> Dict[str, float]:
    """
    Calculate both distance in meters and location similarity percentage between two coordinates.
    """
    dist = calculate_distance_meters(lat1, lon1, lat2, lon2)
    sim = calculate_location_similarity(dist, max_radius)
    return {
        "distance_meters": dist,
        "location_similarity": sim
    }

def find_nearby_complaints(
    db: Session,
    latitude: float,
    longitude: float,
    radius_meters: float = settings.DUPLICATE_SEARCH_RADIUS_METERS
) -> List[Dict[str, Any]]:
    """
    Search existing complaints in DB near (latitude, longitude) within radius_meters.
    Returns list of complaint items with computed distance_meters and location_similarity.
    """
    complaints = db.query(models.Complaint).all()
    results = []

    for item in complaints:
        dist = calculate_distance_meters(latitude, longitude, item.latitude, item.longitude)
        if dist <= radius_meters:
            sim = calculate_location_similarity(dist, radius_meters)
            results.append({
                "id": item.id,
                "description": item.description,
                "category": item.category,
                "latitude": item.latitude,
                "longitude": item.longitude,
                "image_path": item.image_path,
                "status": item.status,
                "created_at": item.created_at,
                "distance_meters": dist,
                "location_similarity": sim
            })

    results.sort(key=lambda x: x["distance_meters"])
    return results
