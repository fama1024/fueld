package com.fueld.workout;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, UUID> {
    List<WorkoutLog> findByUserIdOrderByPerformedAtDesc(UUID userId);
    List<WorkoutLog> findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(UUID userId, Instant from, Instant to);
}
