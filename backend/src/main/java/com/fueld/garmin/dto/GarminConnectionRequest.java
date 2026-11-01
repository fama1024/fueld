package com.fueld.garmin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code apiKey} ist nur beim ersten Speichern Pflicht, leer bleibt der bisherige Key bestehen. */
public record GarminConnectionRequest(
        @Email @NotBlank @Size(max = 255) String email,
        @Size(max = 500) String apiKey) {}
