package com.fueld.assistant.dto;

/**
 * Antwort des Assistenten. Wird nicht persistiert – One-Shot, kein Verlauf.
 *
 * @param answer die Freitext-Antwort der KI
 * @param scope  der tatsächlich verwendete Zeitraum ({@code "today"} | {@code "week"})
 */
public record AssistantAnswerResponse(String answer, String scope) {}
