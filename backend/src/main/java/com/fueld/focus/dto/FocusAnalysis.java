package com.fueld.focus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Antwort der KI, wird in dieser Form auch als Tages-Fokus gespeichert. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FocusAnalysis(List<FocusItem> items) {}
