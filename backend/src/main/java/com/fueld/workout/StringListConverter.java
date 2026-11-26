package com.fueld.workout;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

/** Speichert eine Liste kurzer Texte als JSON in einer Spalte. */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        return values == null || values.isEmpty() ? null : MAPPER.writeValueAsString(values);
    }

    @Override
    public List<String> convertToEntityAttribute(String json) {
        return json == null ? List.of() : MAPPER.readValue(json, new TypeReference<List<String>>() {});
    }
}
