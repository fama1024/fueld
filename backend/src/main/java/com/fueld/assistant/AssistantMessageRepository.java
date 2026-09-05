package com.fueld.assistant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AssistantMessageRepository extends JpaRepository<AssistantMessage, UUID> {
    List<AssistantMessage> findByUserIdAndScopeAndPeriodDateOrderByCreatedAtAsc(
            UUID userId, String scope, LocalDate periodDate);
}
