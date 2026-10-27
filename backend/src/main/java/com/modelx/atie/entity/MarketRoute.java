package com.modelx.atie.entity;

import java.math.BigDecimal;

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
        name = "market_routes",
        uniqueConstraints = @UniqueConstraint(
                name = "market_routes_unique_origin_destination",
                columnNames = {"origin_code", "destination_market_id"}
        )
)
public class MarketRoute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.INTEGER)
    private Long id;

    @Column(name = "origin_code", nullable = false, length = 32)
    private String originCode;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "destination_market_id", nullable = false)
    private Market destinationMarket;

    @Column(nullable = false, precision = 7, scale = 2)
    private BigDecimal distanceKm;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal estimatedDurationHours;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal roadTerrainFactor;

    protected MarketRoute() {
    }

    public String getOriginCode() {
        return originCode;
    }

    public Market getDestinationMarket() {
        return destinationMarket;
    }

    public BigDecimal getDistanceKm() {
        return distanceKm;
    }

    public BigDecimal getEstimatedDurationHours() {
        return estimatedDurationHours;
    }

    public BigDecimal getRoadTerrainFactor() {
        return roadTerrainFactor;
    }
}
