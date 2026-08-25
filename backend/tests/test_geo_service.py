import pytest
from app.services.geo_service import (
    calculate_distance_meters,
    calculate_location_similarity,
    calculate_geo_match
)

# Base coordinate (Pune, India)
BASE_LAT = 18.5204
BASE_LON = 73.8567

def test_same_coordinates():
    """1. Same coordinates should have 0m distance and 100.0% similarity."""
    dist = calculate_distance_meters(BASE_LAT, BASE_LON, BASE_LAT, BASE_LON)
    sim = calculate_location_similarity(dist, max_radius=100.0)
    match = calculate_geo_match(BASE_LAT, BASE_LON, BASE_LAT, BASE_LON, max_radius=100.0)

    assert dist == 0.0
    assert sim == 100.0
    assert match["distance_meters"] == 0.0
    assert match["location_similarity"] == 100.0

def test_10_meters_apart():
    """2. ~10 meters apart should return distance ~10m and very high similarity (> 85%)."""
    # 0.00009 degrees latitude offset is approximately 10 meters
    lat2 = BASE_LAT + 0.00009
    lon2 = BASE_LON

    dist = calculate_distance_meters(BASE_LAT, BASE_LON, lat2, lon2)
    sim = calculate_location_similarity(dist, max_radius=100.0)

    assert 9.0 <= dist <= 11.0
    assert sim >= 85.0  # Very high similarity

def test_50_meters_apart():
    """3. ~50 meters apart should return distance ~50m and moderate-high similarity (50% - 65%)."""
    # 0.00045 degrees latitude offset is approximately 50 meters
    lat2 = BASE_LAT + 0.00045
    lon2 = BASE_LON

    dist = calculate_distance_meters(BASE_LAT, BASE_LON, lat2, lon2)
    sim = calculate_location_similarity(dist, max_radius=100.0)

    assert 48.0 <= dist <= 52.0
    assert 50.0 <= sim <= 65.0

def test_more_than_100_meters_apart():
    """4. More than 100 meters apart should return 0.0% location similarity."""
    # 0.00135 degrees latitude offset is approximately 150 meters
    lat2 = BASE_LAT + 0.00135
    lon2 = BASE_LON

    dist = calculate_distance_meters(BASE_LAT, BASE_LON, lat2, lon2)
    sim = calculate_location_similarity(dist, max_radius=100.0)

    assert dist > 100.0
    assert sim == 0.0
