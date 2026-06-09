package com.fueld.insight;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AiInsightRepository extends JpaRepository<AiInsight, UUID> {
    List<AiInsight> findByUserIdAndTypeOrderByCreatedAtDesc(UUID userId, String type);
    List<AiInsight> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<AiInsight> findByUserIdAndTypeAndPeriodStart(UUID userId, String type, LocalDate periodStart);
}
