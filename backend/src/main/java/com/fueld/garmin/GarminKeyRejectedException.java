package com.fueld.garmin;

/** Garmin hat den Key abgelehnt: er ist falsch, gelöscht oder abgelaufen. */
public class GarminKeyRejectedException extends GarminException {

    public GarminKeyRejectedException(Throwable cause) {
        super("Garmin-API-Key ungültig oder abgelaufen", cause);
    }
}
