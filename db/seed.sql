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
        DATE '2026-10-27' - day_offset AS recorded_date
    FROM generate_series(0, 179) AS day_offset
),
market_crop_base AS (
    SELECT *
    FROM (
        VALUES
            ('DAMBULLA', 'TOMATO', 220.00, 42.00),
            ('PETTAH_COLOMBO', 'TOMATO', 170.00, 88.00),
            ('NUWARA_ELIYA', 'TOMATO', 185.00, 26.00),
            ('KEPPETIPOLA', 'TOMATO', 175.00, 24.00),
            ('MEEGODA', 'TOMATO', 180.00, 60.00),
            ('THAMBUTTEGAMA', 'TOMATO', 190.00, 35.00),
            ('JAFFNA', 'TOMATO', 160.00, 30.00),

            ('DAMBULLA', 'CARROT', 280.00, 48.00),
            ('PETTAH_COLOMBO', 'CARROT', 320.00, 72.00),
            ('NUWARA_ELIYA', 'CARROT', 260.00, 40.00),
            ('KEPPETIPOLA', 'CARROT', 250.00, 32.00),
            ('MEEGODA', 'CARROT', 300.00, 55.00),
            ('THAMBUTTEGAMA', 'CARROT', 275.00, 30.00),
            ('JAFFNA', 'CARROT', 310.00, 26.00),

            ('DAMBULLA', 'GREEN_CHILI', 650.00, 34.00),
            ('PETTAH_COLOMBO', 'GREEN_CHILI', 720.00, 66.00),
            ('NUWARA_ELIYA', 'GREEN_CHILI', 600.00, 22.00),
            ('KEPPETIPOLA', 'GREEN_CHILI', 620.00, 20.00),
            ('MEEGODA', 'GREEN_CHILI', 690.00, 44.00),
            ('THAMBUTTEGAMA', 'GREEN_CHILI', 670.00, 28.00),
            ('JAFFNA', 'GREEN_CHILI', 700.00, 24.00),

            ('DAMBULLA', 'RED_ONION', 380.00, 90.00),
            ('PETTAH_COLOMBO', 'RED_ONION', 410.00, 145.00),
            ('NUWARA_ELIYA', 'RED_ONION', 390.00, 46.00),
            ('KEPPETIPOLA', 'RED_ONION', 385.00, 42.00),
            ('MEEGODA', 'RED_ONION', 400.00, 105.00),
            ('THAMBUTTEGAMA', 'RED_ONION', 375.00, 62.00),
            ('JAFFNA', 'RED_ONION', 420.00, 70.00)
    ) AS values_table (
        market_code,
        crop_code,
        base_price,
        base_arrivals
    )
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
    markets.id,
    crops.id,
    days.recorded_date,
    ROUND(
        CASE
            WHEN days.day_offset = 0 THEN market_crop_base.base_price
            WHEN market_crop_base.crop_code = 'TOMATO'
                 AND market_crop_base.market_code = 'DAMBULLA'
                 AND days.day_offset <= 7
                THEN market_crop_base.base_price
                     * (1 + days.day_offset * 0.032)
            ELSE market_crop_base.base_price
                 * (
                     1
                     + 0.055 * SIN(
                         (180 - days.day_offset + markets.id * 11.0) * PI() / 31.0
                     )
                     + 0.022 * COS(
                         (180 - days.day_offset + crops.id * 17.0) * PI() / 23.0
                     )
                 )
        END::NUMERIC,
        2
    ),
    ROUND(
        CASE
            WHEN market_crop_base.crop_code = 'TOMATO'
                 AND market_crop_base.market_code = 'DAMBULLA'
                 AND days.day_offset <= 7
                THEN 125.00 + (7 - days.day_offset) * 5.00
            ELSE market_crop_base.base_arrivals
                 * (
                     1
                     + 0.18 * SIN(
                         (180 - days.day_offset + markets.id * 7.0) * PI() / 29.0
                     )
                 )
        END::NUMERIC,
        2
    ),
    'HDX_SEED'
FROM days
CROSS JOIN market_crop_base
JOIN markets ON markets.code = market_crop_base.market_code
JOIN crops ON crops.code = market_crop_base.crop_code
ON CONFLICT (market_id, crop_id, recorded_date) DO UPDATE SET
    wholesale_price_lkr_per_kg = EXCLUDED.wholesale_price_lkr_per_kg,
    arrival_volume_tonnes = EXCLUDED.arrival_volume_tonnes,
    source = EXCLUDED.source;

WITH days AS (
    SELECT
        day_offset,
        DATE '2026-10-27' - day_offset AS observation_date
    FROM generate_series(0, 179) AS day_offset
)
INSERT INTO weather_observations (
    market_id,
    observation_date,
    precipitation_mm,
    temp_max_c,
    temp_min_c,
    extreme_weather_flag
)
SELECT
    markets.id,
    days.observation_date,
    ROUND(
        GREATEST(
            0,
            8.0
            + 7.0 * SIN(
                (180 - days.day_offset + markets.id * 13.0) * PI() / 27.0
            )
            + CASE
                WHEN markets.province IN ('Central', 'Uva') THEN 4.0
                WHEN markets.province = 'Northern' THEN -2.0
                ELSE 0.0
              END
        )::NUMERIC,
        2
    ),
    ROUND(
        (
            30.5
            - CASE
                WHEN markets.province IN ('Central', 'Uva') THEN 4.5
                ELSE 0.0
              END
            + 1.2 * COS((180 - days.day_offset) * PI() / 45.0)
        )::NUMERIC,
        2
    ),
    ROUND(
        (
            23.0
            - CASE
                WHEN markets.province IN ('Central', 'Uva') THEN 4.0
                ELSE 0.0
              END
            + 0.8 * COS((180 - days.day_offset) * PI() / 45.0)
        )::NUMERIC,
        2
    ),
    (
        ROUND(
            GREATEST(
                0,
                8.0
                + 7.0 * SIN(
                    (180 - days.day_offset + markets.id * 13.0) * PI() / 27.0
                )
                + CASE
                    WHEN markets.province IN ('Central', 'Uva') THEN 4.0
                    WHEN markets.province = 'Northern' THEN -2.0
                    ELSE 0.0
                  END
            )::NUMERIC,
            2
        ) >= 18.0
    )
FROM days
CROSS JOIN markets
ON CONFLICT (market_id, observation_date) DO UPDATE SET
    precipitation_mm = EXCLUDED.precipitation_mm,
    temp_max_c = EXCLUDED.temp_max_c,
    temp_min_c = EXCLUDED.temp_min_c,
    extreme_weather_flag = EXCLUDED.extreme_weather_flag;

COMMIT;
