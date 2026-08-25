import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.services.text_similarity import (
    get_model,
    get_embedding,
    calculate_text_similarity,
)

client = TestClient(app)

def test_model_singleton_reused():
    """Verify the model is cached and reused across calls instead of reloading."""
    model_1 = get_model()
    model_2 = get_model()
    assert model_1 is model_2

def test_get_embedding_dimension():
    """Verify that sentence embeddings produce a 384-dimensional vector."""
    text = "Large pothole near ABC College"
    emb = get_embedding(text)
    assert isinstance(emb, np.ndarray)
    assert emb.shape == (384,)
    assert not np.all(emb == 0)

def test_get_embedding_empty_safe():
    """Verify that empty/whitespace text safely returns a zero vector without raising errors."""
    emb_empty = get_embedding("")
    emb_spaces = get_embedding("   ")
    assert isinstance(emb_empty, np.ndarray)
    assert emb_empty.shape == (384,)
    assert np.all(emb_empty == 0)
    assert np.all(emb_spaces == 0)

def test_similarity_same_meaning_different_wording():
    """
    Two citizens describing the same issue using different words.
    Example:
    'Large pothole near ABC College' vs 'Dangerous road hole outside ABC College'
    Should produce high similarity score.
    """
    text1 = "Large pothole near ABC College"
    text2 = "Dangerous road hole outside ABC College"
    score = calculate_text_similarity(text1, text2)

    # Cosine similarity for these two semantically similar sentences should be high (>= 75%)
    assert score >= 75.0, f"Expected high similarity >= 75.0, got {score}"
    assert 0.0 <= score <= 100.0

def test_similarity_identical_and_very_similar():
    """Verify very similar and identical descriptions receive very high scores."""
    # Identical
    score_identical = calculate_text_similarity("Streetlight broken on 5th Avenue", "Streetlight broken on 5th Avenue")
    assert pytest.approx(score_identical, rel=1e-2) == 100.0

    # Very similar
    score_similar = calculate_text_similarity(
        "Streetlight broken on 5th Avenue",
        "Streetlight is broken on 5th Avenue"
    )
    assert score_similar >= 90.0

def test_similarity_completely_different():
    """Verify completely different civic complaints receive low similarity scores."""
    text1 = "Large pothole near ABC College"
    text2 = "Garbage bin overflowing with plastic waste near fish market"
    score = calculate_text_similarity(text1, text2)

    # Completely different topics should have low similarity (< 35%)
    assert score < 35.0, f"Expected low similarity < 35.0, got {score}"

    text3 = "Water leakage from municipal pipe flooding the lane"
    text4 = "Illegal banner placed on traffic signal pole"
    score2 = calculate_text_similarity(text3, text4)
    assert score2 < 35.0, f"Expected low similarity < 35.0, got {score2}"

def test_similarity_empty_handling():
    """Verify empty/blank texts return 0.0 similarity score safely."""
    assert calculate_text_similarity("", "Large pothole") == 0.0
    assert calculate_text_similarity("Large pothole", "") == 0.0
    assert calculate_text_similarity("   ", "   ") == 0.0
    assert calculate_text_similarity("", "") == 0.0

def test_api_similarity_endpoint_same_meaning():
    """Test POST /api/similarity/text with semantically similar complaint descriptions."""
    payload = {
        "text1": "Large pothole near ABC College",
        "text2": "Dangerous road hole outside ABC College"
    }
    response = client.post("/api/similarity/text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "text_similarity" in data
    assert isinstance(data["text_similarity"], (float, int))
    assert data["text_similarity"] >= 75.0

def test_api_similarity_endpoint_different_descriptions():
    """Test POST /api/similarity/text with completely different complaint descriptions."""
    payload = {
        "text1": "Pothole on the road",
        "text2": "Stray dog menace in residential colony park"
    }
    response = client.post("/api/similarity/text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["text_similarity"] < 35.0

def test_api_similarity_endpoint_empty_text():
    """Test POST /api/similarity/text with empty strings."""
    payload = {
        "text1": "",
        "text2": "Pothole on road"
    }
    response = client.post("/api/similarity/text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["text_similarity"] == 0.0
