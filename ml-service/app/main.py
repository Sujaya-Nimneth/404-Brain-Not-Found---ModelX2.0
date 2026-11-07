from __future__ import annotations

from contextlib import asynccontextmanager
import re
import uuid

from fastapi import FastAPI, HTTPException, Query, Request

from app.config import get_settings
from app.predictor import FallbackUnavailableError, Predictor
from app.schemas import (
    HealthResponse,
    PredictBatchRequest,
    PredictBatchResponse,
)

REQUEST_ID_HEADER = "X-Request-ID"
SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not hasattr(app.state, "predictor"):
        app.state.predictor = Predictor(get_settings())
    yield


app = FastAPI(
    title="ATIE ML Forecast Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    incoming = request.headers.get(REQUEST_ID_HEADER, "")
    request_id = (
        incoming
        if incoming and SAFE_REQUEST_ID.match(incoming)
        else str(uuid.uuid4())
    )
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers[REQUEST_ID_HEADER] = request_id
    return response


def predictor() -> Predictor:
    return app.state.predictor


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    service = predictor()
    return HealthResponse(
        status="UP",
        model_loaded=service.model_loaded,
        model_version=service.model_version,
    )


@app.get("/metrics")
def metrics():
    try:
        return predictor().metrics()
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/predict-batch", response_model=PredictBatchResponse)
def predict_batch(
    request: PredictBatchRequest,
    demo_mode: bool = Query(default=False),
) -> PredictBatchResponse:
    try:
        if demo_mode:
            return predictor().predict_demo_fixture(request)
        return predictor().predict(request)
    except FallbackUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
