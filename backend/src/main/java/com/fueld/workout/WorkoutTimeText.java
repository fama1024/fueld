package com.fueld.workout;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Zeitpunkt eines Trainings als Text für die KI-Prompts. */
public final class WorkoutTimeText {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE, dd.MM.yyyy", Locale.GERMANY);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private WorkoutTimeText() {}

    /**
     * Eine echte Uhrzeit gibt es nur von Garmin ({@code exactTime}). Sonst steht in der Datenbank ein
     * Platzhalter (12:00 oder der Eintragszeitpunkt), den die KI nicht für die Trainingszeit halten soll.
     */
    public static String format(Instant performedAt, boolean exactTime, ZoneId zone) {
        var local = performedAt.atZone(zone);
        return local.format(DAY) + (exactTime ? ", Start " + local.format(TIME) + " Uhr" : " (Uhrzeit unbekannt)");
    }
}
