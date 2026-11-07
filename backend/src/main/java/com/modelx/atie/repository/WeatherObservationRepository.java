package com.modelx.atie.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            SELECT w FROM WeatherObservation w
            JOIN FETCH w.market m
            WHERE m.code IN :marketCodes
              AND w.observationDate = (
                  SELECT MAX(w2.observationDate)
                  FROM WeatherObservation w2
                  WHERE w2.market = m
                    AND w2.observationDate <= :observationDate
              )
            ORDER BY w.observationDate DESC
            """)
    List<WeatherObservation> findLatestByMarketCodesOnOrBefore(
            @Param("marketCodes") Collection<String> marketCodes,
            @Param("observationDate") LocalDate observationDate
    );
}
