package com.fueld.garmin.dto;

/** {@code connected}: dieser Nutzer hat einen Zugang hinterlegt, {@code email} ist dann dessen Mail. Der Key selbst kommt nie zurück. */
public record GarminStatusResponse(boolean connected, String email) {}
