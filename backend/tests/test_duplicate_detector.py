import pytest
from app.services.duplicate_detector import (
    haversine_distance,
    calculate_distance_score,
    calculate_text_similarity,
    compute_composite_score,
    normalize_text
)

def test_haversine_distance_same_location():
    # Same point should have 0 meters distance
    dist = haversine_distance(37.7749, -122.4194, 37.7749, -122.4194)
    assert dist == pytest.approx(0.0, abs=1e-3)

def test_haversine_distance_known_points():
    # Distance between SF (37.7749, -122.4194) and Oakland (37.8044, -122.2712) ~ 13.5 km
    dist = haversine_distance(37.7749, -122.4194, 37.8044, -122.2712)
    assert 13000 <= dist <= 14500

def test_calculate_distance_score():
    assert calculate_distance_score(0, 100) == 1.0
    assert calculate_distance_score(50, 100) == 0.5
    assert calculate_distance_score(100, 100) == 0.0
    assert calculate_distance_score(150, 100) == 0.0

def test_normalize_text():
    assert normalize_text("  Large Pothole on Main St.!!  ") == "large pothole on main st"

def test_calculate_text_similarity():
    sim_exact = calculate_text_similarity("Deep pothole on 5th street", "Deep pothole on 5th street")
    assert sim_exact == 1.0

    sim_similar = calculate_text_similarity("Big pothole on 5th street", "Deep pothole near 5th street")
    assert sim_similar > 0.6

    sim_different = calculate_text_similarity("Pothole on 5th street", "Broken street light near park")
    assert sim_different < 0.3

def test_compute_composite_score():
    # Category mismatch gives 0
    score_mismatch = compute_composite_score("pothole", "streetlight", 10.0, 0.9)
    assert score_mismatch == 0.0

    # Matching category, close distance, high text similarity
    score_high = compute_composite_score("pothole", "pothole", 10.0, 0.9)
    assert score_high >= 0.85
