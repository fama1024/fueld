package com.fueld.garmin;

/** Beim ersten Speichern fehlt der Key, später darf er leer bleiben. */
public class GarminKeyMissingException extends GarminException {

    public GarminKeyMissingException() {
        super("Bitte trag deinen Garmin-API-Key ein");
    }
}
