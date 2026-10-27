from datetime import date
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Direction(str, Enum):
    CRASH = "CRASH"
    STABLE = "STABLE"
    SURGE = "SURGE"


class GlutRisk(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ForecastSource(str, Enum):
    MODEL = "MODEL"
    FALLBACK = "FALLBACK"
    DEMO_FIXTURE = "DEMO_FIXTURE"


class MarketForecast(BaseModel):
    model_config = ConfigDict(extra="forbid")

    market_code: str
    current_price_lkr: float = Field(gt=0)
    predicted_price_lkr: float = Field(gt=0)
    baseline_naive_lkr: float = Field(gt=0)
    baseline_ma7_lkr: float = Field(gt=0)
    pct_change: float
    direction: Direction
    glut_risk_level: GlutRisk
    confidence_score: float = Field(ge=0, le=1)
    primary_driver: str


class PredictBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    crop_code: str
    horizon_hours: int
    reference_date: date
    markets: list[str] = Field(min_length=1)

    @field_validator("crop_code")
    @classmethod
    def normalize_crop(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("markets")
    @classmethod
    def normalize_markets(cls, value: list[str]) -> list[str]:
        normalized = [market.strip().upper() for market in value]
        if len(normalized) != len(set(normalized)):
            raise ValueError("markets must be unique")
        return normalized

    @field_validator("horizon_hours")
    @classmethod
    def validate_horizon(cls, value: int) -> int:
        if value not in {48, 72}:
            raise ValueError("horizon_hours must be 48 or 72")
        return value


class PredictBatchResponse(BaseModel):
    crop_code: str
    horizon_hours: int
    reference_date: date
    forecast_source: ForecastSource
    model_version: str
    predictions: list[MarketForecast]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str
