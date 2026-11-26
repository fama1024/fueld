package com.fueld.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, UUID> {
    // "join fetch" lädt die Metrik in derselben Abfrage. Ohne ihn löst Hibernate das
    // inverse @OneToOne pro Training einzeln auf (N+1) und blockiert damit bei langer
    // Garmin-Historie die wenigen Datenbankverbindungen.
    @Query("""
            select w from WorkoutLog w left join fetch w.metric
            where w.user.id = :userId
            order by w.performedAt desc
            """)
    List<WorkoutLog> findByUserIdOrderByPerformedAtDesc(@Param("userId") UUID userId);

    @Query("""
            select w from WorkoutLog w left join fetch w.metric
            where w.user.id = :userId and w.performedAt between :from and :to
            order by w.performedAt desc
            """)
    List<WorkoutLog> findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(
            @Param("userId") UUID userId, @Param("from") Instant from, @Param("to") Instant to);

    /** Alle bereits importierten Garmin-Trainings eines Nutzers (Dublettenprüfung und Nachtragen von Details). */
    @Query("""
            select w from WorkoutLog w left join fetch w.metric
            where w.user.id = :userId and w.garminActivityId is not null
            """)
    List<WorkoutLog> findGarminImportsByUserId(@Param("userId") UUID userId);
}
