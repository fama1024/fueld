package com.fueld.assistant.dto;

import java.time.LocalDate;

/**
 * Antwort des Assistenten. Frage + Antwort werden als Chatverlauf gespeichert
 * (siehe {@code AssistantMessage}), gruppiert nach scope + periodDate.
 *
 * @param answer     die Freitext-Antwort der KI
 * @param scope      der tatsächlich verwendete Zeitraum ({@code "today"} | {@code "week"})
 * @param periodDate Thread-Schlüssel: bei scope=today der gefragte Tag, bei scope=week der Montag der Woche
 */
public record AssistantAnswerResponse(String answer, String scope, LocalDate periodDate) {}
