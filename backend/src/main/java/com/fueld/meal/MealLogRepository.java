package com.fueld.meal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MealLogRepository extends JpaRepository<MealLog, UUID> {
    List<MealLog> findByUserIdOrderByLoggedAtDesc(UUID userId);
}
