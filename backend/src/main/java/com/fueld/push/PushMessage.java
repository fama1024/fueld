package com.fueld.push;

/** Nutzlast einer Push-Nachricht – wird als JSON an den Service Worker geschickt. */
public record PushMessage(String title, String body, String url) {}
