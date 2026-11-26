package com.fueld.workout;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

/** Speichert die Übungsliste als JSON-Text in einer Spalte und liest sie wieder ein. */
@Converter
public class WorkoutExerciseListConverter implements AttributeConverter<List<WorkoutExercise>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<WorkoutExercise> exercises) {
        return exercises == null || exercises.isEmpty() ? null : MAPPER.writeValueAsString(exercises);
    }

    @Override
    public List<WorkoutExercise> convertToEntityAttribute(String json) {
        return json == null ? List.of() : MAPPER.readValue(json, new TypeReference<List<WorkoutExercise>>() {});
    }
}
