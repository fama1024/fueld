package com.fueld.meal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MealLogRepository extends JpaRepository<MealLog, UUID> {
    List<MealLog> findByUserIdOrderByEatenAtDesc(UUID userId);
    List<MealLog> findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(UUID userId, Instant from, Instant to);
}
