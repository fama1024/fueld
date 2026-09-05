package com.fueld.assistant.dto;

import java.time.Instant;
import java.util.UUID;

/** Eine Nachricht im gespeicherten Chatverlauf zu einem scope+periodDate-Thread. */
public record AssistantMessageResponse(UUID id, String role, String content, Instant createdAt) {}
