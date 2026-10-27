package com.modelx.atie.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
        name = "weather_observations",
        uniqueConstraints = @UniqueConstraint(
                name = "weather_unique_market_date",
                columnNames = {"market_id", "observation_date"}
        )
)
public class WeatherObservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.BIGINT)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "market_id", nullable = false)
    private Market market;

    @Column(name = "observation_date", nullable = false)
    private LocalDate observationDate;

    @Column(name = "precipitation_mm", nullable = false, precision = 6, scale = 2)
    private BigDecimal precipitationMm;

    @Column(name = "temp_max_c", precision = 5, scale = 2)
    private BigDecimal tempMaxC;

    @Column(name = "temp_min_c", precision = 5, scale = 2)
    private BigDecimal tempMinC;

    @Column(name = "extreme_weather_flag", nullable = false)
    private boolean extremeWeatherFlag;

    protected WeatherObservation() {
    }

    public Market getMarket() {
        return market;
    }

    public LocalDate getObservationDate() {
        return observationDate;
    }

    public BigDecimal getPrecipitationMm() {
        return precipitationMm;
    }

    public BigDecimal getTempMaxC() {
        return tempMaxC;
    }

    public BigDecimal getTempMinC() {
        return tempMinC;
    }

    public boolean isExtremeWeatherFlag() {
        return extremeWeatherFlag;
    }
}
