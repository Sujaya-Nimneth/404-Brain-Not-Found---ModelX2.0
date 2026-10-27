BEGIN;

DROP TABLE IF EXISTS weather_observations;
DROP TABLE IF EXISTS historical_prices;
DROP TABLE IF EXISTS market_routes;
DROP TABLE IF EXISTS fuel_prices;
DROP TABLE IF EXISTS crops;
DROP TABLE IF EXISTS markets;

CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    province VARCHAR(64) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    handling_fee_per_kg_lkr DECIMAL(8, 2) NOT NULL DEFAULT 2.50,
    CONSTRAINT markets_latitude_range CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT markets_longitude_range CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT markets_handling_non_negative CHECK (handling_fee_per_kg_lkr >= 0)
);

CREATE TABLE crops (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    spoilage_rate_per_100km_pct DECIMAL(5, 2) NOT NULL DEFAULT 1.50,
    CONSTRAINT crops_spoilage_range CHECK (
        spoilage_rate_per_100km_pct >= 0
        AND spoilage_rate_per_100km_pct <= 100
    )
);

CREATE TABLE market_routes (
    id SERIAL PRIMARY KEY,
    origin_code VARCHAR(32) NOT NULL,
    destination_market_id INT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    distance_km DECIMAL(7, 2) NOT NULL,
    estimated_duration_hours DECIMAL(5, 2) NOT NULL,
    road_terrain_factor DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
    CONSTRAINT market_routes_unique_origin_destination
        UNIQUE (origin_code, destination_market_id),
    CONSTRAINT market_routes_distance_positive CHECK (distance_km > 0),
    CONSTRAINT market_routes_duration_positive CHECK (estimated_duration_hours > 0),
    CONSTRAINT market_routes_terrain_positive CHECK (road_terrain_factor > 0)
);

CREATE TABLE historical_prices (
    id BIGSERIAL PRIMARY KEY,
    market_id INT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    crop_id INT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    wholesale_price_lkr_per_kg DECIMAL(10, 2) NOT NULL,
    arrival_volume_tonnes DECIMAL(10, 2),
    source VARCHAR(32) NOT NULL DEFAULT 'HDX',
    CONSTRAINT historical_prices_unique_market_crop_date
        UNIQUE (market_id, crop_id, recorded_date),
    CONSTRAINT historical_prices_price_positive
        CHECK (wholesale_price_lkr_per_kg > 0),
    CONSTRAINT historical_prices_arrivals_non_negative
        CHECK (arrival_volume_tonnes IS NULL OR arrival_volume_tonnes >= 0)
);

CREATE TABLE weather_observations (
    id BIGSERIAL PRIMARY KEY,
    market_id INT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    precipitation_mm DECIMAL(6, 2) NOT NULL,
    temp_max_c DECIMAL(5, 2),
    temp_min_c DECIMAL(5, 2),
    extreme_weather_flag BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(32) NOT NULL DEFAULT 'SEED',
    CONSTRAINT weather_unique_market_date UNIQUE (market_id, observation_date),
    CONSTRAINT weather_precipitation_non_negative CHECK (precipitation_mm >= 0),
    CONSTRAINT weather_temperature_order CHECK (
        temp_max_c IS NULL
        OR temp_min_c IS NULL
        OR temp_max_c >= temp_min_c
    )
);

CREATE TABLE fuel_prices (
    id SERIAL PRIMARY KEY,
    effective_date DATE NOT NULL UNIQUE,
    diesel_lkr_per_liter DECIMAL(8, 2) NOT NULL,
    petrol_lkr_per_liter DECIMAL(8, 2) NOT NULL,
    CONSTRAINT fuel_prices_positive CHECK (
        diesel_lkr_per_liter > 0
        AND petrol_lkr_per_liter > 0
    )
);

CREATE INDEX idx_market_routes_origin ON market_routes(origin_code);
CREATE INDEX idx_historical_prices_lookup
    ON historical_prices(crop_id, market_id, recorded_date DESC);
CREATE INDEX idx_weather_lookup
    ON weather_observations(market_id, observation_date DESC);
CREATE INDEX idx_fuel_prices_effective_date
    ON fuel_prices(effective_date DESC);

CREATE TABLE data_ingestion_runs (
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

CREATE TABLE data_source_status (
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

CREATE INDEX idx_data_ingestion_runs_source_time
    ON data_ingestion_runs(source_code, started_at DESC);

COMMIT;
