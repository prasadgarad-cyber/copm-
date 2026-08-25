import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DB_FILE = "./test_civicsync.db"
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


def test_create_and_get_complaint():
    response = client.post(
        "/api/complaints",
        data={
            "description": "Large pothole in front of public library",
            "category": "pothole",
            "latitude": 37.7749,
            "longitude": -122.4194
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "complaint" in data
    assert "duplicate_detection" in data
    c = data["complaint"]
    assert c["id"] == 1
    assert c["status"] == "pending"
    assert c["parent_id"] is None
    assert data["duplicate_detection"]["status"] == "new"
    assert data["duplicate_detection"]["matched_complaint_id"] is None

def test_check_duplicate_endpoint():
    # Submit first complaint
    client.post(
        "/api/complaints",
        data={
            "description": "Broken streetlight near central plaza",
            "category": "streetlight",
            "latitude": 37.7750,
            "longitude": -122.4180
        }
    )

    # Pre-check check-duplicate endpoint
    response = client.post(
        "/api/complaints/check-duplicate",
        json={
            "description": "Broken streetlight at central plaza",
            "category": "streetlight",
            "latitude": 37.77501,
            "longitude": -122.41801
        }
    )
    assert response.status_code == 200
    res = response.json()
    assert res["status"] in ["likely_duplicate", "possible_duplicate"]
    assert res["duplicate_score"] >= 80.0
    assert res["matched_complaint"]["id"] == 1
    assert "signals" in res
    assert "location_similarity" in res["signals"]
    assert "text_similarity" in res["signals"]
    assert "category_similarity" in res["signals"]

def test_auto_flag_duplicate_on_submit():
    # Submit primary complaint
    res1 = client.post(
        "/api/complaints",
        data={
            "description": "Water pipe leak on 1st avenue",
            "category": "water_leakage",
            "latitude": 37.7700,
            "longitude": -122.4100
        }
    )
    c1_id = res1.json()["complaint"]["id"]

    # Submit second very similar complaint nearby
    res2 = client.post(
        "/api/complaints",
        data={
            "description": "Water leak on 1st avenue pipe",
            "category": "water_leakage",
            "latitude": 37.77005,
            "longitude": -122.41005
        }
    )
    res2_data = res2.json()
    c2 = res2_data["complaint"]
    assert c2["status"] == "duplicate"
    assert c2["parent_id"] == c1_id
    assert c2["duplicate_score"] is not None
    assert res2_data["duplicate_detection"]["status"] == "likely_duplicate"
    assert res2_data["duplicate_detection"]["matched_complaint_id"] == c1_id

def test_update_status_and_get_duplicates():
    # Submit two complaints
    res1 = client.post(
        "/api/complaints",
        data={
            "description": "Fallen tree blocking lane A",
            "category": "fallen_tree",
            "latitude": 37.8000,
            "longitude": -122.5000
        }
    )
    c1_id = res1.json()["complaint"]["id"]

    res2 = client.post(
        "/api/complaints",
        data={
            "description": "Tree fallen on lane B",
            "category": "fallen_tree",
            "latitude": 37.8100,
            "longitude": -122.5100
        }
    )
    c2_id = res2.json()["complaint"]["id"]

    # Mark c2 as duplicate of c1 via PATCH status
    patch_res = client.patch(
        f"/api/complaints/{c2_id}/status",
        json={"status": "duplicate", "parent_id": c1_id}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "duplicate"
    assert patch_res.json()["parent_id"] == c1_id

    # Retrieve duplicates of c1
    dup_res = client.get(f"/api/complaints/{c1_id}/duplicates")
    assert dup_res.status_code == 200
    dups = dup_res.json()
    assert len(dups) == 1
    assert dups[0]["id"] == c2_id


def test_get_nearby_complaints_endpoint():
    # Submit complaint near ABC College Pune
    client.post(
        "/api/complaints",
        data={
            "description": "Huge pothole near ABC College",
            "category": "pothole",
            "latitude": 18.5204,
            "longitude": 73.8567
        }
    )

    # Submit complaint far away (> 500m)
    client.post(
        "/api/complaints",
        data={
            "description": "Distant streetlight breakdown",
            "category": "streetlight",
            "latitude": 18.5300,
            "longitude": 73.8700
        }
    )

    # Query nearby within 100 meters of 18.5206, 73.8567 (~22 meters away)
    response = client.get(
        "/api/complaints/nearby",
        params={
            "latitude": 18.5206,
            "longitude": 73.8567,
            "radius_meters": 100.0
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    item = data["complaints"][0]
    assert item["description"] == "Huge pothole near ABC College"
    assert "distance_meters" in item
    assert "location_similarity" in item
    assert 20.0 <= item["distance_meters"] <= 25.0
    assert item["location_similarity"] > 80.0

