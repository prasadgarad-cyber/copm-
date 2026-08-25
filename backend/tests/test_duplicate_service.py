import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app import models
from app.services.duplicate_service import (
    calculate_category_similarity,
    calculate_duplicate_score,
    determine_duplicate_status,
    check_duplicate_complaint,
)

TEST_DB_FILE = "./test_dup_service.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

client = TestClient(app)


def test_category_similarity_scoring():
    """Verify category similarity returns 100 for matching categories and 0 otherwise."""
    assert calculate_category_similarity("pothole", "pothole") == 100.0
    assert calculate_category_similarity("pothole", "streetlight") == 0.0
    assert calculate_category_similarity("", "pothole") == 0.0

def test_duplicate_score_formula_and_thresholds():
    """Verify duplicate score formula: (loc * 0.50) + (text * 0.35) + (cat * 0.15)."""
    # 100 on all signals => 100
    score_perfect = calculate_duplicate_score(100.0, 100.0, 100.0)
    assert score_perfect == 100.0
    assert determine_duplicate_status(score_perfect) == "likely_duplicate"

    # 95.2 loc, 89.4 text, 100 cat => 47.6 + 31.29 + 15 = 93.89 => 93.9
    score_example = calculate_duplicate_score(95.2, 89.4, 100.0)
    assert 93.0 <= score_example <= 95.0
    assert determine_duplicate_status(score_example) == "likely_duplicate"

    # Mid-range: loc=70, text=40, cat=100 => 35 + 14 + 15 = 64.0 => "possible_duplicate"
    score_mid = calculate_duplicate_score(70.0, 40.0, 100.0)
    assert score_mid == 64.0
    assert determine_duplicate_status(score_mid) == "possible_duplicate"

    # Low score: loc=40, text=20, cat=0 => 20 + 7 + 0 = 27.0 => "new"
    score_low = calculate_duplicate_score(40.0, 20.0, 0.0)
    assert score_low == 27.0
    assert determine_duplicate_status(score_low) == "new"

def test_scenario_no_existing_complaints():
    """Verify check-duplicate returns 'new' with score 0 when DB is empty."""
    db = TestingSessionLocal()
    result = check_duplicate_complaint(
        db=db,
        description="Dangerous road hole outside ABC College",
        category="pothole",
        latitude=18.5206,
        longitude=73.8568
    )
    db.close()

    assert result["status"] == "new"
    assert result["duplicate_score"] == 0.0
    assert result["matched_complaint"] is None
    assert result["signals"] is None
    assert result["distance_meters"] is None

def test_scenario_same_location_similar_text():
    """
    Scenario 1: Same location + similar text + same category.
    Should yield likely_duplicate with high score.
    """
    db = TestingSessionLocal()
    existing = models.Complaint(
        description="Huge pothole near ABC College",
        category="pothole",
        latitude=18.5204,
        longitude=73.8567,
        status="pending"
    )
    db.add(existing)
    db.commit()
    db.refresh(existing)

    result = check_duplicate_complaint(
        db=db,
        description="Dangerous road hole outside ABC College",
        category="pothole",
        latitude=18.5206,
        longitude=73.8568
    )
    db.close()

    assert result["status"] == "likely_duplicate"
    assert result["duplicate_score"] >= 80.0
    assert result["matched_complaint"] is not None
    assert result["matched_complaint"]["id"] == existing.id
    assert result["signals"]["location_similarity"] >= 75.0
    assert result["signals"]["text_similarity"] >= 75.0
    assert result["signals"]["category_similarity"] == 100.0
    assert result["distance_meters"] < 35.0

def test_scenario_nearby_different_text():
    """
    Scenario 2: Nearby (< 50m) + completely different text description + same category.
    """
    db = TestingSessionLocal()
    existing = models.Complaint(
        description="Pothole near library gate",
        category="pothole",
        latitude=18.5204,
        longitude=73.8567,
        status="pending"
    )
    db.add(existing)
    db.commit()
    db.refresh(existing)

    result = check_duplicate_complaint(
        db=db,
        description="Open construction trench with warning signs",
        category="pothole",
        latitude=18.5206,
        longitude=73.8568
    )
    db.close()

    # Location similarity will be high (~90+), but text similarity is low (~20), cat is 100
    # Duplicate score should be lower than likely_duplicate threshold (< 80)
    assert result["matched_complaint"] is not None
    assert result["signals"]["text_similarity"] < 50.0
    assert result["duplicate_score"] < 80.0
    assert result["status"] in ["possible_duplicate", "new"]

def test_scenario_nearby_different_category():
    """
    Scenario 3: Same or nearby location + different category.
    Category similarity should be 0.
    """
    db = TestingSessionLocal()
    existing = models.Complaint(
        description="Broken streetlight not working at night",
        category="streetlight",
        latitude=18.5204,
        longitude=73.8567,
        status="pending"
    )
    db.add(existing)
    db.commit()
    db.refresh(existing)

    result = check_duplicate_complaint(
        db=db,
        description="Dangerous road hole outside ABC College",
        category="pothole",
        latitude=18.5206,
        longitude=73.8568
    )
    db.close()

    assert result["signals"]["category_similarity"] == 0.0
    assert result["signals"]["text_similarity"] < 35.0
    # With category 0 and low text similarity, score is under 60
    assert result["duplicate_score"] < 60.0

def test_scenario_far_away_complaint():
    """
    Scenario 4: Complaint > 100m away (beyond DUPLICATE_SEARCH_RADIUS_METERS).
    Should not match and return status 'new'.
    """
    db = TestingSessionLocal()
    existing = models.Complaint(
        description="Dangerous road hole outside ABC College",
        category="pothole",
        latitude=18.5300,  # ~1.1 km away
        longitude=73.8700,
        status="pending"
    )
    db.add(existing)
    db.commit()

    result = check_duplicate_complaint(
        db=db,
        description="Dangerous road hole outside ABC College",
        category="pothole",
        latitude=18.5206,
        longitude=73.8568
    )
    db.close()

    assert result["status"] == "new"
    assert result["duplicate_score"] == 0.0
    assert result["matched_complaint"] is None
    assert result["signals"] is None
    assert result["distance_meters"] is None

def test_api_check_duplicate_endpoint_full_flow():
    """Test POST /api/complaints/check-duplicate endpoint with API client."""
    # 1. First test empty state
    empty_res = client.post(
        "/api/complaints/check-duplicate",
        json={
            "description": "Dangerous road hole outside ABC College",
            "category": "pothole",
            "latitude": 18.5206,
            "longitude": 73.8568
        }
    )
    assert empty_res.status_code == 200
    empty_data = empty_res.json()
    assert empty_data["status"] == "new"
    assert empty_data["duplicate_score"] == 0
    assert empty_data["matched_complaint"] is None

    # 2. Add an existing complaint via POST /api/complaints
    create_res = client.post(
        "/api/complaints",
        data={
            "description": "Huge pothole near ABC College",
            "category": "pothole",
            "latitude": 18.5204,
            "longitude": 73.8567
        }
    )
    assert create_res.status_code == 200
    complaint_id = create_res.json()["complaint"]["id"]

    # 3. Check duplicate endpoint with similar wording nearby
    dup_res = client.post(
        "/api/complaints/check-duplicate",
        json={
            "description": "Dangerous road hole outside ABC College",
            "category": "pothole",
            "latitude": 18.5206,
            "longitude": 73.8568
        }
    )
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["status"] == "likely_duplicate"
    assert dup_data["duplicate_score"] >= 80.0
    assert dup_data["matched_complaint"]["id"] == complaint_id
    assert dup_data["matched_complaint"]["description"] == "Huge pothole near ABC College"
    assert dup_data["matched_complaint"]["category"] == "pothole"
    assert "location_similarity" in dup_data["signals"]
    assert "text_similarity" in dup_data["signals"]
    assert "category_similarity" in dup_data["signals"]
    assert dup_data["signals"]["category_similarity"] == 100.0
    assert "distance_meters" in dup_data
    assert dup_data["distance_meters"] < 35.0
