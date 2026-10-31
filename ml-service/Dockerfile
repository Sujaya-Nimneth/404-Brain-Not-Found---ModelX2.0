FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --retries 5 --timeout 120 -r requirements.txt

COPY app ./app
COPY etl ./etl
COPY training ./training
COPY models ./models
COPY data ./data

RUN groupadd --system --gid 10001 atie \
    && useradd --system --uid 10001 --gid atie --create-home atie \
    && mkdir -p /app/data/cache \
    && chown -R atie:atie /app

USER atie

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
