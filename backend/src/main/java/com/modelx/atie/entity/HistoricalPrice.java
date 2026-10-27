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
        name = "historical_prices",
        uniqueConstraints = @UniqueConstraint(
                name = "historical_prices_unique_market_crop_date",
                columnNames = {"market_id", "crop_id", "recorded_date"}
        )
)
public class HistoricalPrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.BIGINT)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "market_id", nullable = false)
    private Market market;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "crop_id", nullable = false)
    private Crop crop;

    @Column(name = "recorded_date", nullable = false)
    private LocalDate recordedDate;

    @Column(name = "wholesale_price_lkr_per_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal wholesalePriceLkrPerKg;

    @Column(name = "arrival_volume_tonnes", precision = 10, scale = 2)
    private BigDecimal arrivalVolumeTonnes;

    @Column(nullable = false, length = 32)
    private String source;

    protected HistoricalPrice() {
    }

    public Market getMarket() {
        return market;
    }

    public Crop getCrop() {
        return crop;
    }

    public LocalDate getRecordedDate() {
        return recordedDate;
    }

    public BigDecimal getWholesalePriceLkrPerKg() {
        return wholesalePriceLkrPerKg;
    }

    public BigDecimal getArrivalVolumeTonnes() {
        return arrivalVolumeTonnes;
    }

    public String getSource() {
        return source;
    }
}
