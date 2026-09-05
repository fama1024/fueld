package com.fueld.assistant.dto;

/**
 * Freitext-Frage vom Dashboard.
 *
 * @param question die Frage des Nutzers
 * @param scope    {@code "today"} (Standard) oder {@code "week"} – legt fest, welcher
 *                 Zeitraum an Log-Einträgen als Kontext mitgeschickt wird
 * @param date     nur bei scope=today relevant: der gefragte Tag ("YYYY-MM-DD"), Default heute
 *                 (z.B. wenn über die Dashboard Tage-Navigation ein vergangener Tag angezeigt wird)
 */
public record AssistantAskRequest(String question, String scope, String date) {}
