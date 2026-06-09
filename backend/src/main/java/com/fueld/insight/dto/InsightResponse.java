package com.fueld.insight.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InsightResponse(
        UUID id,
        String type,
        LocalDate periodStart,
        LocalDate periodEnd,
        String content,
        Instant createdAt
) {}
