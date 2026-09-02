package com.fueld.push.dto;

import jakarta.validation.constraints.NotBlank;

/** Kommt 1:1 aus dem PushManager des Browsers (subscription.toJSON()). */
public record PushSubscriptionRequest(
        @NotBlank String endpoint,
        @NotBlank String p256dh,
        @NotBlank String auth
) {}
