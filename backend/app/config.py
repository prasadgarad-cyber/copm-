from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicSync Backend"
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # Duplicate Detection Settings
    DUPLICATE_SEARCH_RADIUS_METERS: float = 100.0  # Search radius in meters for GPS duplicate detection
    DUPLICATE_RADIUS_METERS: float = 100.0  # Maximum radius in meters to consider proximity
    DUPLICATE_SCORE_THRESHOLD: float = 0.70  # Threshold (0.0 to 1.0) above which a complaint is tagged duplicate
    DISTANCE_WEIGHT: float = 0.5  # Weight for distance in composite score
    TEXT_SIMILARITY_WEIGHT: float = 0.5  # Weight for text similarity in composite score

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
