package com.modelx.atie.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.modelx.atie.entity.WeatherObservation;

public interface WeatherObservationRepository
        extends JpaRepository<WeatherObservation, Long> {
    Optional<WeatherObservation>
    findTopByMarketCodeOrderByObservationDateDesc(String marketCode);

    @EntityGraph(attributePaths = "market")
    List<WeatherObservation>
    findByMarketCodeInAndObservationDateLessThanEqualOrderByObservationDateDesc(
            Collection<String> marketCodes,
            LocalDate observationDate
    );
}
