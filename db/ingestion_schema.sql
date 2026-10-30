BEGIN;

CREATE TABLE IF NOT EXISTS data_ingestion_runs (
    id BIGSERIAL PRIMARY KEY,
    source_code VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    data_state VARCHAR(16) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    records_received INT NOT NULL DEFAULT 0,
    records_written INT NOT NULL DEFAULT 0,
    source_url TEXT,
    error_message TEXT,
    CONSTRAINT data_ingestion_runs_source_check
        CHECK (source_code IN ('HDX', 'CROPIX', 'OPEN_METEO')),
    CONSTRAINT data_ingestion_runs_status_check
        CHECK (status IN ('SUCCESS', 'FALLBACK', 'FAILED')),
    CONSTRAINT data_ingestion_runs_state_check
        CHECK (data_state IN ('LIVE', 'CACHED', 'SEED', 'UNAVAILABLE'))
);

CREATE TABLE IF NOT EXISTS data_source_status (
    source_code VARCHAR(32) PRIMARY KEY,
    data_state VARCHAR(16) NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL,
    last_success_at TIMESTAMPTZ,
    latest_observation_date DATE,
    source_url TEXT,
    records_written INT NOT NULL DEFAULT 0,
    message TEXT,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT data_source_status_source_check
        CHECK (source_code IN ('HDX', 'CROPIX', 'OPEN_METEO')),
    CONSTRAINT data_source_status_state_check
        CHECK (data_state IN ('LIVE', 'CACHED', 'SEED', 'UNAVAILABLE'))
);

CREATE INDEX IF NOT EXISTS idx_data_ingestion_runs_source_time
    ON data_ingestion_runs(source_code, started_at DESC);

ALTER TABLE weather_observations
    ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'SEED';

CREATE OR REPLACE FUNCTION atie_source_priority(source_value TEXT)
RETURNS INT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN source_value LIKE '%!_LIVE' ESCAPE '!' THEN 3
        WHEN source_value LIKE '%!_CACHED' ESCAPE '!' THEN 2
        WHEN source_value = 'SEED'
          OR source_value LIKE '%!_SEED' ESCAPE '!' THEN 1
        ELSE 0
    END;
$$;

COMMIT;
