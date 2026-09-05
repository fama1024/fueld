package com.fueld.assistant.dto;

import java.time.LocalDate;

/**
 * Antwort des Assistenten. Frage + Antwort werden als Chatverlauf gespeichert
 * (siehe {@code AssistantMessage}), gruppiert nach scope + periodDate.
 *
 * @param answer     die Freitext-Antwort der KI
 * @param scope      der tatsächlich verwendete Zeitraum ({@code "today"} | {@code "range7"})
 * @param periodDate Thread-Schlüssel: der gewählte Tag (bei scope=range7 das Ende des 7-Tage-Fensters)
 */
public record AssistantAnswerResponse(String answer, String scope, LocalDate periodDate) {}
