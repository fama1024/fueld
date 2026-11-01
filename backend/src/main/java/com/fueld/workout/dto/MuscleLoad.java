package com.fueld.workout.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Eine beanspruchte Muskelgruppe. {@code level} ist {@code primary} (Hauptbelastung) oder {@code secondary}. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MuscleLoad(String group, String level) {}
