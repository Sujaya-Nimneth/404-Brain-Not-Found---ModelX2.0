package com.modelx.atie.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "fuel_prices")
public class FuelPrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JdbcTypeCode(SqlTypes.INTEGER)
    private Long id;

    @Column(name = "effective_date", nullable = false, unique = true)
    private LocalDate effectiveDate;

    @Column(name = "diesel_lkr_per_liter", nullable = false, precision = 8, scale = 2)
    private BigDecimal dieselLkrPerLiter;

    @Column(name = "petrol_lkr_per_liter", nullable = false, precision = 8, scale = 2)
    private BigDecimal petrolLkrPerLiter;

    protected FuelPrice() {
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public BigDecimal getDieselLkrPerLiter() {
        return dieselLkrPerLiter;
    }

    public BigDecimal getPetrolLkrPerLiter() {
        return petrolLkrPerLiter;
    }
}
