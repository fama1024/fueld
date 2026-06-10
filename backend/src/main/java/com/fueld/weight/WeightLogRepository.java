package com.fueld.weight;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WeightLogRepository extends JpaRepository<WeightLog, UUID> {
    List<WeightLog> findByUserIdOrderByLoggedAtDesc(UUID userId);
}
