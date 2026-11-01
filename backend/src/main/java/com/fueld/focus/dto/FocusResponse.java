package com.fueld.focus.dto;

import java.util.List;

/** Ohne Einträge oder bei einem KI-Fehler ist {@code summary} leer, das Frontend zeigt dann einfache Hinweise. */
/** {@code avoid} ist optional und nur gesetzt, wenn die Daten einen klaren Anlass liefern. */
public record FocusResponse(String goal, String diet, String summary, List<String> steps, String avoid) {}
