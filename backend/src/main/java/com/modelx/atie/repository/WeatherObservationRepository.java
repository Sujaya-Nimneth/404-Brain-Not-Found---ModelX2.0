package com.modelx.atie.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.WeatherObservation;

public interface WeatherObservationRepository
        extends JpaRepository<WeatherObservation, Long> {
    Optional<WeatherObservation>
    findTopByMarketCodeOrderByObservationDateDesc(String marketCode);
}
