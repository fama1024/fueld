package com.fueld.assistant.dto;

/**
 * Freitext-Frage vom Dashboard.
 *
 * @param question die Frage des Nutzers
 * @param scope    {@code "today"} (Standard) oder {@code "week"} – legt fest, welcher
 *                 Zeitraum an Log-Einträgen als Kontext mitgeschickt wird
 */
public record AssistantAskRequest(String question, String scope) {}
