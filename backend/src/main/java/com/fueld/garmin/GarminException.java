package com.fueld.garmin;

/** Fehler beim Abruf der Garmin Personal API (Key ungültig/abgelaufen, Garmin nicht erreichbar). */
public class GarminException extends RuntimeException {

    public GarminException(String message) {
        super(message);
    }

    public GarminException(String message, Throwable cause) {
        super(message, cause);
    }
}
