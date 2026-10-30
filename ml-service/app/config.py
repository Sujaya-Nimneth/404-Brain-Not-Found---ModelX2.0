from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Runtime settings shared by inference and training entry points."""

    model_config = SettingsConfigDict(
        env_prefix="ML_",
        env_file=".env",
        extra="ignore",
    )

    service_name: str = "atie-ml-service"
    model_path: Path = ROOT_DIR / "models" / "atie_forecaster.joblib"
    metadata_path: Path = ROOT_DIR / "models" / "evaluation_report.json"
    fallback_data_path: Path = ROOT_DIR / "data" / "fallback_forecasts.json"
    history_path: Path = ROOT_DIR / "data" / "feature_history.csv"
    database_dsn: str | None = None
    feature_refresh_seconds: int = Field(default=900, ge=30)
    movement_threshold_pct: float = Field(default=10.0, gt=0, le=100)
    random_seed: int = 404
    retrain_on_startup: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
