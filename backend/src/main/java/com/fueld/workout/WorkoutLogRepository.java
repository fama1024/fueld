package com.fueld.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, UUID> {
    List<WorkoutLog> findByUserIdOrderByPerformedAtDesc(UUID userId);
    List<WorkoutLog> findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(UUID userId, Instant from, Instant to);

    /** Alle bereits importierten Garmin-Aktivitäts-IDs eines Nutzers (für die Dublettenprüfung). */
    @Query("select w.garminActivityId from WorkoutLog w where w.user.id = :userId and w.garminActivityId is not null")
    Set<Long> findGarminActivityIdsByUserId(@Param("userId") UUID userId);
}
