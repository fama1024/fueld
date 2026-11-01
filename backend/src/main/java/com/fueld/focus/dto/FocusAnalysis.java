package com.fueld.focus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Antwort der KI, wird in dieser Form auch als Tages-Fokus gespeichert. {@code version}
 * setzt das Backend beim Speichern, damit ein geänderter Prompt sofort greift.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FocusAnalysis(String summary, List<String> steps, String avoid, Integer version) {}
