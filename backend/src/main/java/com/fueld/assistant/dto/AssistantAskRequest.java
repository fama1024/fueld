package com.fueld.assistant.dto;

/**
 * Freitext-Frage vom Dashboard.
 *
 * @param question die Frage des Nutzers
 * @param scope    {@code "today"} (Standard, nur der gewählte Tag) oder {@code "range7"}
 *                 (die 7 Tage bis einschließlich des gewählten Tages)
 * @param date     der gewählte Tag ("YYYY-MM-DD"), Default heute (z.B. wenn über die
 *                 Dashboard Tage-Navigation ein vergangener Tag angezeigt wird) – bei
 *                 scope=range7 das Ende des 7-Tage-Fensters
 */
public record AssistantAskRequest(String question, String scope, String date) {}
