BEGIN;

INSERT INTO markets (
    code,
    name,
    province,
    latitude,
    longitude,
    handling_fee_per_kg_lkr
) VALUES
    ('DAMBULLA', 'Dambulla Dedicated Economic Centre', 'Central', 7.867500, 80.651700, 2.50),
    ('PETTAH_COLOMBO', 'Colombo Pettah Wholesale Market', 'Western', 6.935500, 79.857500, 2.50),
    ('NUWARA_ELIYA', 'Nuwara Eliya Market', 'Central', 6.949700, 80.789100, 2.50),
    ('KEPPETIPOLA', 'Keppetipola Market', 'Uva', 6.870000, 80.930000, 2.50),
    ('MEEGODA', 'Meegoda Economic Centre', 'Western', 6.840000, 80.030000, 2.50),
    ('THAMBUTTEGAMA', 'Thambuttegama Economic Centre', 'North Central', 8.150000, 80.440000, 2.50),
    ('JAFFNA', 'Jaffna Market', 'Northern', 9.661500, 80.025500, 2.50)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    province = EXCLUDED.province,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    handling_fee_per_kg_lkr = EXCLUDED.handling_fee_per_kg_lkr;

INSERT INTO crops (
    code,
    name,
    spoilage_rate_per_100km_pct
) VALUES
    ('TOMATO', 'Tomato', 1.50),
    ('CARROT', 'Carrot', 0.75),
    ('GREEN_CHILI', 'Green Chili', 1.20),
    ('RED_ONION', 'Red Onion', 0.50)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    spoilage_rate_per_100km_pct = EXCLUDED.spoilage_rate_per_100km_pct;

INSERT INTO market_routes (
    origin_code,
    destination_market_id,
    distance_km,
    estimated_duration_hours,
    road_terrain_factor
)
SELECT
    routes.origin_code,
    markets.id,
    routes.distance_km,
    routes.estimated_duration_hours,
    routes.road_terrain_factor
FROM (
    VALUES
        ('ANURADHAPURA', 'DAMBULLA', 70.00, 1.50, 1.00),
        ('ANURADHAPURA', 'PETTAH_COLOMBO', 205.00, 4.75, 1.00),
        ('ANURADHAPURA', 'NUWARA_ELIYA', 185.00, 5.00, 1.25),
        ('ANURADHAPURA', 'KEPPETIPOLA', 175.00, 4.50, 1.25),
        ('ANURADHAPURA', 'MEEGODA', 195.00, 4.50, 1.00),
        ('ANURADHAPURA', 'THAMBUTTEGAMA', 55.00, 1.20, 1.00),
        ('ANURADHAPURA', 'JAFFNA', 260.00, 6.00, 1.00),

        ('JAFFNA', 'DAMBULLA', 330.00, 7.00, 1.00),
        ('JAFFNA', 'PETTAH_COLOMBO', 400.00, 8.00, 1.00),
        ('JAFFNA', 'NUWARA_ELIYA', 445.00, 9.50, 1.25),
        ('JAFFNA', 'KEPPETIPOLA', 435.00, 9.00, 1.25),
        ('JAFFNA', 'MEEGODA', 390.00, 8.00, 1.00),
        ('JAFFNA', 'THAMBUTTEGAMA', 275.00, 6.25, 1.00),
        ('JAFFNA', 'JAFFNA', 5.00, 0.20, 1.00),

        ('DAMBULLA', 'DAMBULLA', 3.00, 0.15, 1.00),
        ('DAMBULLA', 'PETTAH_COLOMBO', 150.00, 3.50, 1.00),
        ('DAMBULLA', 'NUWARA_ELIYA', 120.00, 3.25, 1.25),
        ('DAMBULLA', 'KEPPETIPOLA', 125.00, 3.50, 1.25),
        ('DAMBULLA', 'MEEGODA', 140.00, 3.25, 1.00),
        ('DAMBULLA', 'THAMBUTTEGAMA', 75.00, 1.75, 1.00),
        ('DAMBULLA', 'JAFFNA', 330.00, 7.00, 1.00),

        ('NUWARA_ELIYA', 'DAMBULLA', 120.00, 3.25, 1.25),
        ('NUWARA_ELIYA', 'PETTAH_COLOMBO', 180.00, 4.50, 1.25),
        ('NUWARA_ELIYA', 'NUWARA_ELIYA', 3.00, 0.15, 1.25),
        ('NUWARA_ELIYA', 'KEPPETIPOLA', 55.00, 1.75, 1.25),
        ('NUWARA_ELIYA', 'MEEGODA', 170.00, 4.00, 1.25),
        ('NUWARA_ELIYA', 'THAMBUTTEGAMA', 185.00, 4.75, 1.25),
        ('NUWARA_ELIYA', 'JAFFNA', 445.00, 9.50, 1.25),

        ('THAMBUTTEGAMA', 'DAMBULLA', 75.00, 1.75, 1.00),
        ('THAMBUTTEGAMA', 'PETTAH_COLOMBO', 190.00, 4.50, 1.00),
        ('THAMBUTTEGAMA', 'NUWARA_ELIYA', 185.00, 4.75, 1.25),
        ('THAMBUTTEGAMA', 'KEPPETIPOLA', 180.00, 4.50, 1.25),
        ('THAMBUTTEGAMA', 'MEEGODA', 175.00, 4.25, 1.00),
        ('THAMBUTTEGAMA', 'THAMBUTTEGAMA', 3.00, 0.15, 1.00),
        ('THAMBUTTEGAMA', 'JAFFNA', 275.00, 6.25, 1.00)
) AS routes (
    origin_code,
    market_code,
    distance_km,
    estimated_duration_hours,
    road_terrain_factor
)
JOIN markets ON markets.code = routes.market_code
ON CONFLICT (origin_code, destination_market_id) DO UPDATE SET
    distance_km = EXCLUDED.distance_km,
    estimated_duration_hours = EXCLUDED.estimated_duration_hours,
    road_terrain_factor = EXCLUDED.road_terrain_factor;

INSERT INTO fuel_prices (
    effective_date,
    diesel_lkr_per_liter,
    petrol_lkr_per_liter
) VALUES
    ('2025-05-01', 292.00, 320.00),
    ('2025-11-01', 294.00, 322.00),
    ('2025-12-01', 290.00, 318.00),
    ('2026-01-01', 288.00, 316.00),
    ('2026-02-01', 285.00, 313.00),
    ('2026-03-01', 283.00, 311.00),
    ('2026-04-01', 283.00, 311.00),
    ('2026-05-01', 283.00, 311.00),
    ('2026-06-01', 285.00, 313.00),
    ('2026-07-01', 287.00, 315.00),
    ('2026-08-01', 285.00, 313.00),
    ('2026-09-01', 283.00, 311.00),
    ('2026-10-01', 283.00, 311.00)
ON CONFLICT (effective_date) DO UPDATE SET
    diesel_lkr_per_liter = EXCLUDED.diesel_lkr_per_liter,
    petrol_lkr_per_liter = EXCLUDED.petrol_lkr_per_liter;

WITH days AS (
    SELECT
        day_offset,
        DATE '2026-10-27' - day_offset AS recorded_date,
        (540 - day_offset)::DOUBLE PRECISION AS tau,
        EXTRACT(DOY FROM (DATE '2026-10-27' - day_offset))::DOUBLE PRECISION AS day_of_year
    FROM generate_series(0, 179) AS day_offset
),
market_params AS (
    SELECT *
    FROM (
        VALUES
            ('DAMBULLA', 1, 1.07::DOUBLE PRECISION, 48.0::DOUBLE PRECISION, 3.5::DOUBLE PRECISION, 0),
            ('PETTAH_COLOMBO', 2, 0.95::DOUBLE PRECISION, 88.0::DOUBLE PRECISION, 0.5::DOUBLE PRECISION, 18),
            ('NUWARA_ELIYA', 3, 0.91::DOUBLE PRECISION, 30.0::DOUBLE PRECISION, 5.0::DOUBLE PRECISION, 12),
            ('KEPPETIPOLA', 4, 0.89::DOUBLE PRECISION, 28.0::DOUBLE PRECISION, 4.5::DOUBLE PRECISION, 24),
            ('MEEGODA', 5, 0.93::DOUBLE PRECISION, 64.0::DOUBLE PRECISION, 0.5::DOUBLE PRECISION, 30),
            ('THAMBUTTEGAMA', 6, 0.90::DOUBLE PRECISION, 40.0::DOUBLE PRECISION, -0.5::DOUBLE PRECISION, 0),
            ('JAFFNA', 7, 0.94::DOUBLE PRECISION, 32.0::DOUBLE PRECISION, -2.0::DOUBLE PRECISION, 35)
    ) AS m (
        market_code,
        market_ord,
        price_factor,
        base_arrivals,
        rain_offset,
        glut_offset
    )
),
crop_params AS (
    SELECT *
    FROM (
        VALUES
            ('TOMATO', 1, 196.0::DOUBLE PRECISION, 1.00::DOUBLE PRECISION, 1.00::DOUBLE PRECISION),
            ('CARROT', 2, 285.0::DOUBLE PRECISION, 0.85::DOUBLE PRECISION, 0.78::DOUBLE PRECISION),
            ('GREEN_CHILI', 3, 650.0::DOUBLE PRECISION, 0.70::DOUBLE PRECISION, 0.90::DOUBLE PRECISION),
            ('RED_ONION', 4, 390.0::DOUBLE PRECISION, 1.35::DOUBLE PRECISION, 0.68::DOUBLE PRECISION)
    ) AS c (
        crop_code,
        crop_ord,
        base_price,
        arrival_factor,
        sensitivity
    )
),
computed_series AS (
    SELECT
        markets.id AS market_id,
        crops.id AS crop_id,
        days.recorded_date,
        GREATEST(
            0.0::DOUBLE PRECISION,
            7.5
            + 5.5 * SIN((2.0 * PI() * days.day_of_year / 365.25) + mp.market_ord * 0.45)
            + mp.rain_offset
            + 14.0 * CASE
                WHEN COS((days.tau - (540 - (mp.market_ord - 1) * 7)) * 2.0 * PI() / 48.0) <= 1e-6
                THEN 0.0::DOUBLE PRECISION
                ELSE POWER(
                    COS((days.tau - (540 - (mp.market_ord - 1) * 7)) * 2.0 * PI() / 48.0),
                    20.0
                )
              END
        ) AS precip_raw,
        CASE
            WHEN COS((days.tau - (540 - mp.glut_offset - (cp.crop_ord - 1) * 9)) * 2.0 * PI() / 42.0) <= 1e-6
            THEN 0.0::DOUBLE PRECISION
            ELSE POWER(
                COS((days.tau - (540 - mp.glut_offset - (cp.crop_ord - 1) * 9)) * 2.0 * PI() / 42.0),
                20.0
            )
        END AS glut_lead,
        CASE
            WHEN COS((days.tau - 2.5 - (540 - mp.glut_offset - (cp.crop_ord - 1) * 9)) * 2.0 * PI() / 42.0) <= 1e-6
            THEN 0.0::DOUBLE PRECISION
            ELSE POWER(
                COS((days.tau - 2.5 - (540 - mp.glut_offset - (cp.crop_ord - 1) * 9)) * 2.0 * PI() / 42.0),
                22.0
            )
        END AS glut_crash,
        CASE
            WHEN COS((days.tau - (540 - (mp.market_ord - 2) * 8 - (cp.crop_ord - 1) * 11)) * 2.0 * PI() / 48.0) <= 1e-6
            THEN 0.0::DOUBLE PRECISION
            ELSE POWER(
                COS((days.tau - (540 - (mp.market_ord - 2) * 8 - (cp.crop_ord - 1) * 11)) * 2.0 * PI() / 48.0),
                20.0
            )
        END AS short_lead,
        CASE
            WHEN COS((days.tau - 2.5 - (540 - (mp.market_ord - 2) * 8 - (cp.crop_ord - 1) * 11)) * 2.0 * PI() / 48.0) <= 1e-6
            THEN 0.0::DOUBLE PRECISION
            ELSE POWER(
                COS((days.tau - 2.5 - (540 - (mp.market_ord - 2) * 8 - (cp.crop_ord - 1) * 11)) * 2.0 * PI() / 48.0),
                22.0
            )
        END AS short_surge,
        (
            0.040 * SIN(2.0 * PI() * days.day_of_year / 365.25 + cp.crop_ord * 0.70)
            + 0.024 * COS(4.0 * PI() * days.day_of_year / 365.25 + mp.market_ord * 0.35)
            + 0.022 * SIN((days.tau + mp.market_ord * 3.0 + cp.crop_ord * 5.0) * 2.0 * PI() / 24.0)
        ) AS maha_yala,
        0.08 * ((COALESCE(fuel.diesel_lkr_per_liter::DOUBLE PRECISION, 283.0) - 283.0) / 283.0) AS fuel_adj,
        mp.market_ord,
        mp.price_factor,
        mp.base_arrivals,
        cp.crop_ord,
        cp.base_price,
        cp.arrival_factor,
        cp.sensitivity,
        days.tau
    FROM days
    CROSS JOIN market_params mp
    CROSS JOIN crop_params cp
    JOIN markets ON markets.code = mp.market_code
    JOIN crops ON crops.code = cp.crop_code
    LEFT JOIN LATERAL (
        SELECT diesel_lkr_per_liter
        FROM fuel_prices
        WHERE effective_date <= days.recorded_date
        ORDER BY effective_date DESC
        LIMIT 1
    ) fuel ON TRUE
)
INSERT INTO historical_prices (
    market_id,
    crop_id,
    recorded_date,
    wholesale_price_lkr_per_kg,
    arrival_volume_tonnes,
    source
)
SELECT
    cs.market_id,
    cs.crop_id,
    cs.recorded_date,
    ROUND(
        (
            cs.base_price * cs.price_factor * (
                1.0
                + cs.maha_yala
                + cs.fuel_adj
                + 0.08 * cs.sensitivity * cs.glut_lead
                - 0.30 * cs.sensitivity * cs.glut_crash
                - 0.05 * cs.sensitivity * cs.short_lead
                + 0.13 * cs.sensitivity * cs.short_surge
                + 0.003 * GREATEST(0.0::DOUBLE PRECISION, cs.precip_raw - 15.0)
            )
        )::NUMERIC(18, 8),
        2
    ),
    ROUND(
        GREATEST(
            2.0::DOUBLE PRECISION,
            cs.base_arrivals * cs.arrival_factor * (
                1.0
                + 0.12 * SIN((cs.tau + cs.market_ord * 5.0 + cs.crop_ord * 3.0) * 2.0 * PI() / 24.0)
                + 1.65 * cs.sensitivity * cs.glut_lead
                - 0.48 * cs.sensitivity * cs.short_lead
            )
        )::NUMERIC(18, 8),
        2
    ),
    'HDX_SEED'
FROM computed_series cs
ON CONFLICT (market_id, crop_id, recorded_date) DO UPDATE SET
    wholesale_price_lkr_per_kg = EXCLUDED.wholesale_price_lkr_per_kg,
    arrival_volume_tonnes = EXCLUDED.arrival_volume_tonnes,
    source = EXCLUDED.source;

WITH days AS (
    SELECT
        day_offset,
        DATE '2026-10-27' - day_offset AS observation_date,
        (540 - day_offset)::DOUBLE PRECISION AS tau,
        EXTRACT(DOY FROM (DATE '2026-10-27' - day_offset))::DOUBLE PRECISION AS day_of_year
    FROM generate_series(0, 179) AS day_offset
),
market_weather_params AS (
    SELECT *
    FROM (
        VALUES
            ('DAMBULLA', 1, 3.5::DOUBLE PRECISION),
            ('PETTAH_COLOMBO', 2, 0.5::DOUBLE PRECISION),
            ('NUWARA_ELIYA', 3, 5.0::DOUBLE PRECISION),
            ('KEPPETIPOLA', 4, 4.5::DOUBLE PRECISION),
            ('MEEGODA', 5, 0.5::DOUBLE PRECISION),
            ('THAMBUTTEGAMA', 6, -0.5::DOUBLE PRECISION),
            ('JAFFNA', 7, -2.0::DOUBLE PRECISION)
    ) AS m (market_code, market_ord, rain_offset)
),
weather_raw AS (
    SELECT
        markets.id AS market_id,
        markets.province,
        days.observation_date,
        days.tau,
        ROUND(
            GREATEST(
                0.0::DOUBLE PRECISION,
                7.5
                + 5.5 * SIN((2.0 * PI() * days.day_of_year / 365.25) + mwp.market_ord * 0.45)
                + mwp.rain_offset
                + 14.0 * CASE
                    WHEN COS((days.tau - (540 - (mwp.market_ord - 1) * 7)) * 2.0 * PI() / 48.0) <= 1e-6
                    THEN 0.0::DOUBLE PRECISION
                    ELSE POWER(
                        COS((days.tau - (540 - (mwp.market_ord - 1) * 7)) * 2.0 * PI() / 48.0),
                        20.0
                    )
                  END
            )::NUMERIC(18, 8),
            2
        ) AS precip_mm
    FROM days
    CROSS JOIN market_weather_params mwp
    JOIN markets ON markets.code = mwp.market_code
)
INSERT INTO weather_observations (
    market_id,
    observation_date,
    precipitation_mm,
    temp_max_c,
    temp_min_c,
    extreme_weather_flag,
    source
)
SELECT
    wr.market_id,
    wr.observation_date,
    wr.precip_mm,
    ROUND(
        (
            30.5
            - CASE
                WHEN wr.province IN ('Central', 'Uva') THEN 4.5
                ELSE 0.0
              END
            + 1.2 * COS(wr.tau * PI() / 45.0)
        )::NUMERIC(18, 8),
        2
    ),
    ROUND(
        (
            23.0
            - CASE
                WHEN wr.province IN ('Central', 'Uva') THEN 4.0
                ELSE 0.0
              END
            + 0.8 * COS(wr.tau * PI() / 45.0)
        )::NUMERIC(18, 8),
        2
    ),
    (wr.precip_mm >= 15.0),
    'SEED'
FROM weather_raw wr
ON CONFLICT (market_id, observation_date) DO UPDATE SET
    precipitation_mm = EXCLUDED.precipitation_mm,
    temp_max_c = EXCLUDED.temp_max_c,
    temp_min_c = EXCLUDED.temp_min_c,
    extreme_weather_flag = EXCLUDED.extreme_weather_flag,
    source = EXCLUDED.source;

COMMIT;
