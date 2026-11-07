from __future__ import annotations

import json
import logging
import pickle
import threading
import time
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import psycopg

from app.config import Settings
from app.schemas import (
    Direction,
    ForecastSource,
    GlutRisk,
    InputDataState,
    MarketForecast,
    PredictBatchRequest,
    PredictBatchResponse,
)
from etl.feature_engineering import (
    FEATURE_COLUMNS,
    build_features,
    movement_direction,
)
from etl.seed_loader import generate_demo_history, round_half_up_2

logger = logging.getLogger(__name__)

SUPPORTED_CROPS = {"TOMATO", "CARROT", "GREEN_CHILI", "RED_ONION"}
DEMO_REFERENCE_DATE = date(2026, 10, 27)


class FallbackUnavailableError(ValueError):
    """Raised when both the model and local fallback snapshot are unusable."""


@dataclass(frozen=True)
class FixtureMarket:
    current: float
    predicted_48h: float
    predicted_72h: float
    ma7: float
    glut_risk: GlutRisk
    confidence_48h: float
    confidence_72h: float
    driver: str


DEMO_FIXTURE = {
    "DAMBULLA": FixtureMarket(
        current=220.0,
        predicted_48h=154.0,
        predicted_72h=155.0,
        ma7=237.76,
        glut_risk=GlutRisk.HIGH,
        confidence_48h=0.89,
        confidence_72h=0.87,
        driver="Supply glut from Northern province harvest and elevated arrivals.",
    ),
    "PETTAH_COLOMBO": FixtureMarket(
        current=170.0,
        predicted_48h=187.5,
        predicted_72h=188.5,
        ma7=171.2,
        glut_risk=GlutRisk.LOW,
        confidence_48h=0.86,
        confidence_72h=0.84,
        driver="High urban demand with constrained upcountry arrivals.",
    ),
    "KEPPETIPOLA": FixtureMarket(
        current=175.0,
        predicted_48h=165.0,
        predicted_72h=166.0,
        ma7=176.4,
        glut_risk=GlutRisk.MEDIUM,
        confidence_48h=0.75,
        confidence_72h=0.73,
        driver="Hill-country arrivals offset by elevated transit spoilage.",
    ),
    "MEEGODA": FixtureMarket(
        current=180.0,
        predicted_48h=172.0,
        predicted_72h=173.0,
        ma7=181.3,
        glut_risk=GlutRisk.LOW,
        confidence_48h=0.74,
        confidence_72h=0.72,
        driver="Western market arrivals remain close to recent demand levels.",
    ),
    "NUWARA_ELIYA": FixtureMarket(
        current=185.0,
        predicted_48h=182.0,
        predicted_72h=183.0,
        ma7=186.1,
        glut_risk=GlutRisk.MEDIUM,
        confidence_48h=0.72,
        confidence_72h=0.70,
        driver="Upcountry arrivals remain close to seasonal demand.",
    ),
    "THAMBUTTEGAMA": FixtureMarket(
        current=190.0,
        predicted_48h=174.0,
        predicted_72h=175.0,
        ma7=191.2,
        glut_risk=GlutRisk.HIGH,
        confidence_48h=0.78,
        confidence_72h=0.76,
        driver="Northern and North Central arrivals are elevating supply.",
    ),
    "JAFFNA": FixtureMarket(
        current=160.0,
        predicted_48h=158.0,
        predicted_72h=159.0,
        ma7=161.4,
        glut_risk=GlutRisk.LOW,
        confidence_48h=0.70,
        confidence_72h=0.68,
        driver="Local demand is balanced against steady arrivals.",
    ),
}


def _pct_change_2dp(current: float, predicted: float) -> float:
    cur_dec = Decimal(str(current))
    pred_dec = Decimal(str(predicted))
    pct = (pred_dec - cur_dec) / cur_dec * Decimal("100")
    return float(pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


class Predictor:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = threading.Lock()
        self._refresh_lock = threading.Lock()
        self.artifact: dict[str, Any] | None = None
        self.metadata: dict[str, Any] = {}
        self.history = pd.DataFrame()
        self.input_data_state = InputDataState.SEED
        self._feature_frame: pd.DataFrame | None = None
        self._history_loaded_at = 0.0
        self._fallback_cache: tuple[Path, int, dict[str, Any]] | None = None
        self._load_artifacts()
        self._configure_model_runtime()
        self._replace_history(*self._load_history(allow_seed_fallback=True))

    def _load_artifacts(self) -> None:
        try:
            self.artifact = joblib.load(self.settings.model_path)
            if not isinstance(self.artifact, dict) or "models" not in self.artifact:
                raise ValueError("model artifact has an invalid shape")
            logger.info("Loaded model artifact from %s", self.settings.model_path)
        except (
            OSError,
            ValueError,
            ImportError,
            KeyError,
            EOFError,
            pickle.UnpicklingError,
        ) as error:
            logger.warning(
                "Model unavailable; fallback predictions enabled: %s", error
            )
            self.artifact = None

        if self.settings.metadata_path.exists():
            try:
                self.metadata = json.loads(
                    self.settings.metadata_path.read_text(encoding="utf-8")
                )
            except (OSError, json.JSONDecodeError) as error:
                logger.warning("Evaluation metadata unavailable: %s", error)

    def _configure_model_runtime(self) -> None:
        if not self.artifact:
            return
        models = self.artifact.get("models", {})
        if not isinstance(models, dict):
            return
        for model in models.values():
            # Small batch inference is faster without process/thread pool setup.
            if hasattr(model, "n_jobs"):
                model.n_jobs = 1

    @property
    def model_loaded(self) -> bool:
        return self.artifact is not None

    @property
    def model_version(self) -> str:
        if self.artifact:
            return str(self.artifact.get("model_version", "unknown"))
        return "fallback-v1.0"

    @property
    def _feature_columns(self) -> list[str]:
        if self.artifact and isinstance(self.artifact.get("feature_columns"), list):
            return list(self.artifact["feature_columns"])
        return FEATURE_COLUMNS

    def _load_history(
        self,
        *,
        allow_seed_fallback: bool = True,
    ) -> tuple[pd.DataFrame, InputDataState]:
        last_error: Exception | None = None
        if self.settings.database_dsn:
            try:
                frame = self._load_database_history(self.settings.database_dsn)
                if not frame.empty:
                    return frame, _data_state(frame)
                last_error = ValueError("PostgreSQL returned an empty price history")
            except (OSError, psycopg.Error, ValueError, KeyError, TypeError) as error:
                last_error = error
                logger.warning(
                    "PostgreSQL feature history unavailable; %s: %s",
                    "checking local snapshot"
                    if allow_seed_fallback
                    else "retaining active in-memory snapshot",
                    error,
                )
                if not allow_seed_fallback:
                    raise

        if self.settings.history_path.exists():
            try:
                frame = pd.read_csv(self.settings.history_path)
                if not frame.empty:
                    return frame, _data_state(frame)
                last_error = ValueError("Local CSV feature history is empty")
            except (OSError, pd.errors.ParserError, ValueError) as error:
                last_error = error
                logger.warning(
                    "Local feature history unavailable; %s: %s",
                    "using generated seed"
                    if allow_seed_fallback
                    else "retaining active in-memory snapshot",
                    error,
                )
                if not allow_seed_fallback:
                    raise

        if not allow_seed_fallback:
            if last_error is not None:
                raise last_error
            return pd.DataFrame(), self.input_data_state

        return generate_demo_history(), InputDataState.SEED

    def _load_database_history(self, dsn: str) -> pd.DataFrame:
        query = """
            SELECT markets.code AS market_code,
                   crops.code AS crop_code,
                   history.recorded_date,
                   history.wholesale_price_lkr_per_kg,
                   COALESCE(history.arrival_volume_tonnes, 1.0)
                       AS arrival_volume_tonnes,
                   COALESCE(fuel.diesel_lkr_per_liter, 283.0)
                       AS diesel_price_lkr,
                   COALESCE(weather.precipitation_mm, 0.0)
                       AS precipitation_mm,
                   COALESCE(
                       weather_48h.precipitation_mm,
                       weather.precipitation_mm,
                       0.0
                   ) AS forecast_rain_48h_mm,
                   COALESCE(
                       weather_72h.precipitation_mm,
                       weather.precipitation_mm,
                       0.0
                   ) AS forecast_rain_72h_mm,
                   history.source
            FROM historical_prices history
            JOIN markets ON markets.id = history.market_id
            JOIN crops ON crops.id = history.crop_id
            LEFT JOIN LATERAL (
                SELECT diesel_lkr_per_liter
                FROM fuel_prices
                WHERE effective_date <= history.recorded_date
                ORDER BY effective_date DESC
                LIMIT 1
            ) fuel ON TRUE
            LEFT JOIN weather_observations weather
              ON weather.market_id = history.market_id
             AND weather.observation_date = history.recorded_date
            LEFT JOIN weather_observations weather_48h
              ON weather_48h.market_id = history.market_id
             AND weather_48h.observation_date = history.recorded_date + INTERVAL '2 days'
            LEFT JOIN weather_observations weather_72h
              ON weather_72h.market_id = history.market_id
             AND weather_72h.observation_date = history.recorded_date + INTERVAL '3 days'
            WHERE history.recorded_date >= (
                SELECT MAX(recorded_date) FROM historical_prices
            ) - INTERVAL '730 days'
            ORDER BY history.recorded_date, markets.code, crops.code
        """
        with psycopg.connect(dsn, connect_timeout=3) as connection:
            return pd.read_sql_query(query, connection)

    def _replace_history(
        self,
        history: pd.DataFrame,
        data_state: InputDataState,
    ) -> None:
        normalized = history.copy()
        if not normalized.empty and "recorded_date" in normalized.columns:
            normalized["recorded_date"] = pd.to_datetime(
                normalized["recorded_date"], errors="raise"
            )
        feature_frame = self._build_feature_cache(normalized)
        with self._lock:
            self.history = normalized
            self.input_data_state = data_state
            self._feature_frame = feature_frame
            self._history_loaded_at = time.monotonic()

    def _refresh_history_if_due(self) -> None:
        if (
            not self.settings.database_dsn
            and not self.settings.history_path.exists()
        ):
            return
        if (
            time.monotonic() - self._history_loaded_at
            < self.settings.feature_refresh_seconds
        ):
            return
        if not self._refresh_lock.acquire(blocking=False):
            return
        try:
            if (
                time.monotonic() - self._history_loaded_at
                < self.settings.feature_refresh_seconds
            ):
                return
            history, data_state = self._load_history(
                allow_seed_fallback=self.history.empty
            )
            if not history.empty:
                self._replace_history(history, data_state)
            else:
                with self._lock:
                    self._history_loaded_at = time.monotonic()
        except (
            OSError,
            psycopg.Error,
            pd.errors.ParserError,
            ValueError,
            KeyError,
            TypeError,
        ) as error:
            logger.warning(
                "Feature refresh failed; keeping previous snapshot: %s", error
            )
            with self._lock:
                self._history_loaded_at = time.monotonic()
        finally:
            self._refresh_lock.release()

    def _build_feature_cache(
        self, history: pd.DataFrame
    ) -> pd.DataFrame | None:
        if history.empty:
            return None
        try:
            return build_features(history)
        except (KeyError, TypeError, ValueError) as error:
            logger.warning(
                "Feature cache unavailable; requests will fall back: %s", error
            )
            return None

    def predict(self, request: PredictBatchRequest) -> PredictBatchResponse:
        if request.crop_code not in SUPPORTED_CROPS:
            raise ValueError(f"unsupported crop: {request.crop_code}")
        unknown_markets = set(request.markets).difference(DEMO_FIXTURE)
        if unknown_markets:
            raise ValueError(f"unsupported markets: {sorted(unknown_markets)}")

        self._refresh_history_if_due()
        with self._lock:
            history = self.history
            feature_frame = self._feature_frame
            cached_data_state = self.input_data_state

        if history.empty:
            predictions, fallback_ref_date, fallback_state = (
                self._fallback_predictions_with_meta(request)
            )
            return PredictBatchResponse(
                crop_code=request.crop_code,
                horizon_hours=request.horizon_hours,
                reference_date=fallback_ref_date,
                forecast_source=ForecastSource.FALLBACK,
                input_data_state=fallback_state,
                model_version="fallback-v1.0",
                predictions=predictions,
            )

        reference_date = self._reference_date_for_request(request, history)
        source = (
            ForecastSource.MODEL if self.model_loaded else ForecastSource.FALLBACK
        )
        effective_data_state = cached_data_state
        if self.model_loaded:
            try:
                rows = self._select_rows(request, reference_date, feature_frame)
                predictions = self._model_predictions(request, rows)
                effective_data_state = _rows_data_state(rows, cached_data_state)
            except (KeyError, ValueError, TypeError) as error:
                logger.warning("Model inference failed; using fallback: %s", error)
                source = ForecastSource.FALLBACK
                predictions, reference_date, effective_data_state = (
                    self._fallback_predictions_with_meta(request)
                )
        else:
            predictions, _, effective_data_state = (
                self._fallback_predictions_with_meta(request)
            )

        return PredictBatchResponse(
            crop_code=request.crop_code,
            horizon_hours=request.horizon_hours,
            reference_date=reference_date,
            forecast_source=source,
            input_data_state=effective_data_state,
            model_version=(
                self.model_version
                if source == ForecastSource.MODEL
                else "fallback-v1.0"
            ),
            predictions=predictions,
        )

    def _reference_date_for_request(
        self,
        request: PredictBatchRequest,
        history: pd.DataFrame | None = None,
    ) -> date:
        active_history = self.history if history is None else history
        if active_history.empty:
            raise ValueError("feature history is unavailable")
        recorded_dates = active_history["recorded_date"]
        if not pd.api.types.is_datetime64_any_dtype(recorded_dates):
            recorded_dates = pd.to_datetime(recorded_dates, errors="raise")
        requested = pd.Timestamp(request.reference_date)
        eligible = active_history[
            (active_history["crop_code"] == request.crop_code)
            & (active_history["market_code"].isin(request.markets))
            & (recorded_dates <= requested)
        ]
        if eligible.empty:
            raise ValueError(
                "no observations exist on or before reference_date for: "
                + ", ".join(sorted(request.markets))
            )
        latest = (
            recorded_dates.loc[eligible.index]
            .groupby(eligible["market_code"])
            .max()
        )
        missing = set(request.markets).difference(latest.index)
        if missing:
            raise ValueError(
                "no observations exist on or before reference_date for: "
                + ", ".join(sorted(missing))
            )
        return max(latest).date()

    def _select_rows(
        self,
        request: PredictBatchRequest,
        reference_date: date,
        feature_frame: pd.DataFrame | None = None,
    ) -> dict[str, pd.Series]:
        active_features = (
            self._feature_frame if feature_frame is None else feature_frame
        )
        if active_features is None:
            raise ValueError("feature cache is unavailable")
        feature_columns = self._feature_columns
        eligible = active_features[
            (active_features["crop_code"] == request.crop_code)
            & (active_features["market_code"].isin(request.markets))
            & (active_features["recorded_date"] <= pd.Timestamp(reference_date))
        ].dropna(subset=feature_columns)
        if eligible.empty:
            raise ValueError("no complete feature rows exist for reference_date")
        latest = (
            eligible.sort_values("recorded_date")
            .groupby("market_code", sort=False)
            .tail(1)
            .set_index("market_code")
        )
        missing = set(request.markets).difference(latest.index)
        if missing:
            raise ValueError(
                "no complete feature rows exist for: " + ", ".join(sorted(missing))
            )
        return {
            market_code: latest.loc[market_code]
            for market_code in request.markets
        }

    def _model_predictions(
        self,
        request: PredictBatchRequest,
        rows: dict[str, pd.Series],
    ) -> list[MarketForecast]:
        assert self.artifact is not None
        model = self.artifact["models"][str(request.horizon_hours)]
        feature_columns = self._feature_columns
        rain_col = f"forecast_rain_{request.horizon_hours}h_mm"

        matrix_rows: list[list[float]] = []
        for market_code in request.markets:
            row = rows[market_code]
            values: list[float] = []
            for column in feature_columns:
                if (
                    column == "forecast_rain_mm"
                    and rain_col in row.index
                    and pd.notna(row[rain_col])
                ):
                    values.append(float(row[rain_col]))
                else:
                    values.append(float(row[column]))
            matrix_rows.append(values)

        feature_matrix = pd.DataFrame(matrix_rows, columns=feature_columns)
        raw_predictions = model.predict(feature_matrix)
        target_mode = str(self.artifact.get("target_mode", "absolute_price"))

        forecasts: list[MarketForecast] = []
        for market_code, raw_pred in zip(
            request.markets,
            raw_predictions,
            strict=True,
        ):
            row = rows[market_code]
            current = float(row["wholesale_price_lkr_per_kg"])
            if target_mode == "relative_return":
                predicted = max(1.0, current * (1.0 + float(raw_pred)))
            else:
                predicted = float(raw_pred)
            forecasts.append(
                self._market_forecast(
                    market_code=market_code,
                    row=row,
                    predicted=predicted,
                )
            )
        return forecasts

    def _load_fallback_data(self) -> dict[str, Any]:
        path = self.settings.fallback_data_path
        mtime_ns = path.stat().st_mtime_ns
        with self._lock:
            if (
                self._fallback_cache is not None
                and self._fallback_cache[0] == path
                and self._fallback_cache[1] == mtime_ns
            ):
                return self._fallback_cache[2]
        parsed = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(parsed, dict):
            raise ValueError("fallback snapshot root must be a JSON object")
        with self._lock:
            self._fallback_cache = (path, mtime_ns, parsed)
        return parsed

    def _fallback_predictions(
        self, request: PredictBatchRequest
    ) -> list[MarketForecast]:
        predictions, _, _ = self._fallback_predictions_with_meta(request)
        return predictions

    def _fallback_predictions_with_meta(
        self, request: PredictBatchRequest
    ) -> tuple[list[MarketForecast], date, InputDataState]:
        try:
            data = self._load_fallback_data()
            crop_data = data["markets"][request.crop_code]
            snap_ref = date.fromisoformat(
                str(data.get("reference_date", request.reference_date.isoformat()))
            )
            snap_state = InputDataState(str(data.get("input_data_state", "SEED")))
            result: list[MarketForecast] = []
            for market_code in request.markets:
                market_data = crop_data[market_code][str(request.horizon_hours)]
                current = round_half_up_2(float(market_data["current_price_lkr"]))
                predicted = round_half_up_2(
                    float(market_data["predicted_price_lkr"])
                )
                ma7 = round_half_up_2(float(market_data["baseline_ma7_lkr"]))
                pct_change = _pct_change_2dp(current, predicted)
                result.append(
                    MarketForecast(
                        market_code=market_code,
                        current_price_lkr=current,
                        predicted_price_lkr=predicted,
                        baseline_naive_lkr=current,
                        baseline_ma7_lkr=ma7,
                        pct_change=pct_change,
                        direction=Direction(
                            movement_direction(
                                current,
                                predicted,
                                self.settings.movement_threshold_pct,
                            )
                        ),
                        glut_risk_level=GlutRisk(market_data["glut_risk_level"]),
                        confidence_score=round_half_up_2(
                            float(market_data["confidence_score"])
                        ),
                        primary_driver=str(market_data["primary_driver"]),
                    )
                )
            return result, snap_ref, snap_state
        except (
            OSError,
            json.JSONDecodeError,
            KeyError,
            TypeError,
            ValueError,
        ) as error:
            raise FallbackUnavailableError(
                "fallback forecast snapshot is unavailable or incomplete"
            ) from error

    def _market_forecast(
        self,
        market_code: str,
        row: pd.Series,
        predicted: float,
    ) -> MarketForecast:
        current = round_half_up_2(float(row["wholesale_price_lkr_per_kg"]))
        predicted_2dp = round_half_up_2(predicted)
        ma7 = round_half_up_2(float(row["rolling_mean_7d"]))
        pct_change = _pct_change_2dp(current, predicted_2dp)
        direction = movement_direction(
            current,
            predicted_2dp,
            self.settings.movement_threshold_pct,
        )
        arrivals = float(row["arrival_volume_tonnes"])
        baseline_arrivals = float(
            row.get(
                "rolling_mean_14d_arrivals",
                row.get("rolling_mean_7d_arrivals", arrivals),
            )
        )
        volatility = abs(float(row["rolling_std_7d"]) / current)
        confidence = max(0.55, min(0.92, 0.90 - volatility * 1.8))
        if direction == "CRASH" or arrivals >= baseline_arrivals * 1.15:
            glut_risk = GlutRisk.HIGH
        elif direction == "SURGE" or arrivals <= baseline_arrivals * 0.85:
            glut_risk = GlutRisk.LOW
        else:
            glut_risk = GlutRisk.MEDIUM

        if direction == "CRASH":
            driver = (
                "Elevated recent arrivals and negative price momentum indicate "
                "a localized supply glut."
            )
        elif direction == "SURGE":
            driver = (
                "Positive price momentum and relatively constrained arrivals "
                "support the upward forecast."
            )
        else:
            driver = (
                "Recent price and arrival patterns indicate a broadly stable "
                "market."
            )

        return MarketForecast(
            market_code=market_code,
            current_price_lkr=current,
            predicted_price_lkr=predicted_2dp,
            baseline_naive_lkr=current,
            baseline_ma7_lkr=ma7,
            pct_change=pct_change,
            direction=Direction(direction),
            glut_risk_level=glut_risk,
            confidence_score=round_half_up_2(confidence),
            primary_driver=driver,
        )

    def predict_demo_fixture(
        self, request: PredictBatchRequest
    ) -> PredictBatchResponse:
        if request.crop_code != "TOMATO":
            raise ValueError("the canonical demo fixture is only available for TOMATO")
        unknown = set(request.markets).difference(DEMO_FIXTURE)
        if unknown:
            raise ValueError(f"unsupported fixture markets: {sorted(unknown)}")
        predictions: list[MarketForecast] = []
        for market_code in request.markets:
            fixture = DEMO_FIXTURE[market_code]
            predicted = (
                fixture.predicted_48h
                if request.horizon_hours == 48
                else fixture.predicted_72h
            )
            confidence = (
                fixture.confidence_48h
                if request.horizon_hours == 48
                else fixture.confidence_72h
            )
            predictions.append(
                MarketForecast(
                    market_code=market_code,
                    current_price_lkr=round_half_up_2(fixture.current),
                    predicted_price_lkr=round_half_up_2(predicted),
                    baseline_naive_lkr=round_half_up_2(fixture.current),
                    baseline_ma7_lkr=round_half_up_2(fixture.ma7),
                    pct_change=_pct_change_2dp(fixture.current, predicted),
                    direction=Direction(
                        movement_direction(
                            fixture.current,
                            predicted,
                            self.settings.movement_threshold_pct,
                        )
                    ),
                    glut_risk_level=fixture.glut_risk,
                    confidence_score=round_half_up_2(confidence),
                    primary_driver=fixture.driver,
                )
            )
        return PredictBatchResponse(
            crop_code=request.crop_code,
            horizon_hours=request.horizon_hours,
            reference_date=DEMO_REFERENCE_DATE,
            forecast_source=ForecastSource.DEMO_FIXTURE,
            input_data_state=InputDataState.SEED,
            model_version="demo-fixture-v1.0",
            predictions=predictions,
        )

    def metrics(self) -> dict[str, Any]:
        if not self.metadata:
            raise FileNotFoundError("evaluation report is unavailable")
        return self.metadata


def _rows_data_state(
    rows: dict[str, pd.Series],
    fallback_state: InputDataState,
) -> InputDataState:
    sources = {
        str(row["source"])
        for row in rows.values()
        if "source" in row.index and pd.notna(row["source"])
    }
    if not sources:
        return fallback_state
    if all(source.endswith("_LIVE") for source in sources):
        return InputDataState.LIVE
    if any(
        source.endswith("_LIVE") or source.endswith("_CACHED")
        for source in sources
    ):
        return InputDataState.CACHED
    return InputDataState.SEED


def _data_state(frame: pd.DataFrame) -> InputDataState:
    if "source" not in frame.columns:
        return InputDataState.SEED
    sources = {str(value) for value in frame["source"].dropna().unique()}
    if sources and all(source.endswith("_LIVE") for source in sources):
        return InputDataState.LIVE
    if any(
        source.endswith("_LIVE") or source.endswith("_CACHED")
        for source in sources
    ):
        return InputDataState.CACHED
    return InputDataState.SEED
