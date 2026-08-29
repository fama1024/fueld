package com.fueld.calendar.dto;

import java.time.Instant;
import java.util.UUID;

public record CalendarEntryResponse(
        UUID id,
        Instant date,
        String type
) {}
