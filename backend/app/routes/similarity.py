from fastapi import APIRouter
from .. import schemas
from ..services.text_similarity import calculate_text_similarity

router = APIRouter()

@router.post("/similarity/text", response_model=schemas.TextSimilarityResponse)
def compute_text_similarity(payload: schemas.TextSimilarityRequest):
    """
    Calculate semantic text similarity between two civic complaint texts.
    Returns a similarity score between 0.0 and 100.0.
    """
    score = calculate_text_similarity(payload.text1, payload.text2)
    return schemas.TextSimilarityResponse(text_similarity=score)
