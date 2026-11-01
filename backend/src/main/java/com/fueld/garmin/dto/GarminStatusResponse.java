package com.fueld.garmin.dto;

/**
 * {@code available}: serverseitig eingerichtet. {@code connected}: dieser Nutzer hat einen Zugang
 * hinterlegt, {@code email} ist dann dessen Mail. Der Key selbst kommt nie zurück.
 */
public record GarminStatusResponse(boolean available, boolean connected, String email) {}
