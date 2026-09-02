package com.fueld.meal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SavedMealRepository extends JpaRepository<SavedMeal, UUID> {
    List<SavedMeal> findByUserIdOrderByLastUsedAtDesc(UUID userId);
}
