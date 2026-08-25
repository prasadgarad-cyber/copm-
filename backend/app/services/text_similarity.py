import numpy as np
from typing import Optional, Any

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model_instance: Optional[Any] = None

def get_model():
    """
    Lazy load and cache the SentenceTransformer model singleton.
    The model is loaded into memory once and reused across all requests.
    """
    global _model_instance
    if _model_instance is None:
        from sentence_transformers import SentenceTransformer
        _model_instance = SentenceTransformer(MODEL_NAME)
    return _model_instance

def get_embedding(text: str) -> np.ndarray:
    """
    Generate vector embedding for a given text.
    Handles empty/whitespace text safely by returning a zero vector (dimension 384).
    """
    if text is None or not isinstance(text, str) or not text.strip():
        return np.zeros(384, dtype=np.float32)

    model = get_model()
    embedding = model.encode(text.strip(), convert_to_numpy=True)
    return embedding

def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate semantic text similarity using cosine similarity of sentence embeddings.
    Converts cosine similarity into a 0.0 to 100.0 similarity score.
    """
    if (
        text1 is None
        or text2 is None
        or not isinstance(text1, str)
        or not isinstance(text2, str)
        or not text1.strip()
        or not text2.strip()
    ):
        return 0.0

    emb1 = get_embedding(text1)
    emb2 = get_embedding(text2)

    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    # Cosine similarity formula: dot(u, v) / (norm(u) * norm(v))
    cosine_sim = np.dot(emb1, emb2) / (norm1 * norm2)

    # Scale cosine similarity (0.0 to 1.0) to percentage (0.0 to 100.0)
    score = max(0.0, min(1.0, float(cosine_sim))) * 100.0
    return round(score, 1)

