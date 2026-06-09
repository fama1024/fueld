package com.fueld.pantry.dto;

import java.time.Instant;
import java.util.UUID;

public record PantryItemResponse(UUID id, String name, String quantity, Instant addedAt) {}
