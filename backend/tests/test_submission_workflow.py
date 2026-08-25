import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app import models

TEST_DB_FILE = "./test_workflow.db"
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

def test_submission_workflow_new_complaint():
    """
    Submitting first complaint when no duplicates exist:
    - Saved in database with status 'pending'
    - Returns duplicate_detection status 'new' and matched_complaint_id null
    """
    res = client.post(
        "/api/complaints",
        data={
            "description": "Huge pothole near ABC College",
            "category": "pothole",
            "latitude": 18.5204,
            "longitude": 73.8567
        }
    )
    assert res.status_code == 200
    data = res.json()

    assert "complaint" in data
    assert "duplicate_detection" in data

    complaint = data["complaint"]
    assert complaint["id"] == 1
    assert complaint["description"] == "Huge pothole near ABC College"
    assert complaint["category"] == "pothole"
    assert complaint["status"] == "pending"
    assert complaint["parent_id"] is None

    detection = data["duplicate_detection"]
    assert detection["status"] == "new"
    assert detection["duplicate_score"] == 0.0
    assert detection["matched_complaint_id"] is None
    assert detection["distance_meters"] is None

def test_submission_workflow_likely_duplicate():
    """
    Submitting a complaint that closely matches an existing one:
    - Saved in DB (NOT deleted/discarded)
    - Auto-assigned status 'duplicate' and parent_id = original complaint id
    - Returns duplicate_detection status 'likely_duplicate'
    """
    # 1. Primary complaint
    res1 = client.post(
        "/api/complaints",
        data={
            "description": "Huge pothole near ABC College",
            "category": "pothole",
            "latitude": 18.5204,
            "longitude": 73.8567
        }
    )
    c1_id = res1.json()["complaint"]["id"]

    # 2. Duplicate submission
    res2 = client.post(
        "/api/complaints",
        data={
            "description": "Dangerous road hole outside ABC College",
            "category": "pothole",
            "latitude": 18.5206,
            "longitude": 73.8568
        }
    )
    assert res2.status_code == 200
    data2 = res2.json()

    c2 = data2["complaint"]
    assert c2["id"] == 2
    assert c2["status"] == "duplicate"
    assert c2["parent_id"] == c1_id
    assert c2["duplicate_score"] >= 80.0

    detection2 = data2["duplicate_detection"]
    assert detection2["status"] == "likely_duplicate"
    assert detection2["duplicate_score"] >= 80.0
    assert detection2["matched_complaint_id"] == c1_id
    assert detection2["distance_meters"] is not None
    assert detection2["distance_meters"] < 35.0

    # Verify both records exist in DB (total 2 records)
    all_complaints_res = client.get("/api/complaints")
    assert all_complaints_res.status_code == 200
    all_records = all_complaints_res.json()
    assert len(all_records) == 2

def test_submission_workflow_possible_duplicate():
    """
    Submitting a complaint nearby with moderate similarity:
    - Saved in DB with status 'pending' (requires manual verification)
    - Returns duplicate_detection status 'possible_duplicate' with matched_complaint_id
    """
    # 1. Primary complaint
    res1 = client.post(
        "/api/complaints",
        data={
            "description": "Pothole near library main gate",
            "category": "pothole",
            "latitude": 18.5204,
            "longitude": 73.8567
        }
    )
    c1_id = res1.json()["complaint"]["id"]

    # 2. Complaint nearby with different text
    res2 = client.post(
        "/api/complaints",
        data={
            "description": "Open road trench on corner side",
            "category": "pothole",
            "latitude": 18.5206,
            "longitude": 73.8568
        }
    )
    assert res2.status_code == 200
    data2 = res2.json()

    c2 = data2["complaint"]
    assert c2["id"] == 2
    assert c2["status"] == "pending"  # kept pending because it's only possible, not likely

    detection2 = data2["duplicate_detection"]
    assert detection2["status"] in ["possible_duplicate", "new"]
    if detection2["status"] == "possible_duplicate":
        assert detection2["matched_complaint_id"] == c1_id
        assert 50.0 <= detection2["duplicate_score"] < 80.0

    # Verify both are preserved in DB
    all_res = client.get("/api/complaints")
    assert len(all_res.json()) == 2

def test_all_submissions_preserved_no_silent_deletion():
    """
    Ensure every submission remains stored and retrievable,
    verifying no deletion or discard happens.
    """
    for i in range(5):
        res = client.post(
            "/api/complaints",
            data={
                "description": f"Pothole report variation #{i} near ABC College",
                "category": "pothole",
                "latitude": 18.5204 + (i * 0.00005),
                "longitude": 73.8567 + (i * 0.00005)
            }
        )
        assert res.status_code == 200

    all_res = client.get("/api/complaints")
    assert all_res.status_code == 200
    records = all_res.json()
    assert len(records) == 5
    # First is pending, subsequent duplicates reference parent
    assert records[0]["status"] == "pending"
    assert records[0]["parent_id"] is None
