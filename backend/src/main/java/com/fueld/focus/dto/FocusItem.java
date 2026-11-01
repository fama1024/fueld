package com.fueld.focus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FocusItem(
        String direction,   // "more" | "less" | "ok"
        String text,
        List<String> foods
) {}
