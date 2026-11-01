package com.fueld.focus.dto;

import java.util.List;

/** Ohne Einträge oder bei einem KI-Fehler ist {@code items} leer, das Frontend zeigt dann einfache Hinweise. */
public record FocusResponse(String goal, String diet, List<FocusItem> items) {}
