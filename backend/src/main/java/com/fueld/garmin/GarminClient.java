package com.fueld.garmin;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Dünner Client für die Garmin Personal API. Der API-Key (aus Garmin Connect) wird gegen ein
 * 24h-gültiges Access-Token getauscht; Garmin vergibt keine Refresh-Tokens, wir holen bei
 * Bedarf einfach ein neues. Ohne Key ist der Client deaktiviert (kein Fehler).
 */
@Slf4j
@Component
public class GarminClient {

    private static final String TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";
    private static final String ACTIVITIES_PATH = "/activitylist-service/activities/search/activities";
    // Token gilt 24h; wir erneuern etwas früher
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(23);

    private final RestClient http;
    private final String apiKey;

    private String token;
    private Instant tokenExpiresAt = Instant.EPOCH;

    // Der RestClient wird bewusst selbst gebaut statt als Spring-Bean injiziert:
    // so hängt der Start nicht davon ab, ob Boot 4 einen RestClient.Builder autokonfiguriert.
    @Autowired
    public GarminClient(
            @Value("${app.garmin.api-key:}") String apiKey,
            @Value("${app.garmin.base-url:https://personal.connectapi.garmin.com}") String baseUrl) {
        this(RestClient.builder(), apiKey, baseUrl);
    }

    // Für Tests: erlaubt, den Builder an einen MockRestServiceServer zu binden
    GarminClient(RestClient.Builder builder, String apiKey, String baseUrl) {
        this.http = builder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        if (!isConfigured()) {
            log.warn("GARMIN_API_KEY nicht gesetzt – Garmin-Import deaktiviert");
        }
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Neueste Aktivitäten zuerst (die API sortiert absteigend nach Startzeit). */
    public List<GarminActivity> fetchRecentActivities(int limit) {
        try {
            return requestActivities(limit);
        } catch (RestClientResponseException e) {
            if (isUnauthorized(e.getStatusCode())) {
                // Token evtl. serverseitig ungültig geworden: einmal neu holen
                invalidateToken();
                try {
                    return requestActivities(limit);
                } catch (RestClientResponseException retry) {
                    throw toGarminException(retry);
                } catch (RestClientException retry) {
                    throw unreachable(retry);
                }
            }
            throw toGarminException(e);
        } catch (RestClientException e) {
            throw unreachable(e);
        }
    }

    private List<GarminActivity> requestActivities(int limit) {
        List<GarminActivity> activities = http.get()
                .uri(uri -> uri.path(ACTIVITIES_PATH)
                        .queryParam("start", 0)
                        .queryParam("limit", limit)
                        .build())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken())
                .retrieve()
                .body(new ParameterizedTypeReference<List<GarminActivity>>() {});
        return activities != null ? activities : List.of();
    }

    private synchronized String accessToken() {
        if (!isConfigured()) throw new GarminException("Garmin-Import ist nicht konfiguriert");
        if (token != null && Instant.now().isBefore(tokenExpiresAt)) return token;
        try {
            String raw = http.post()
                    .uri(TOKEN_PATH)
                    .header(HttpHeaders.AUTHORIZATION, "ApiKey " + apiKey)
                    .retrieve()
                    .body(String.class);
            if (raw == null || raw.isBlank()) throw new GarminException("Garmin lieferte kein Token");
            token = raw.trim();
            tokenExpiresAt = Instant.now().plus(TOKEN_LIFETIME);
            return token;
        } catch (RestClientResponseException e) {
            throw toGarminException(e);
        } catch (RestClientException e) {
            throw unreachable(e);
        }
    }

    private synchronized void invalidateToken() {
        token = null;
        tokenExpiresAt = Instant.EPOCH;
    }

    private static boolean isUnauthorized(HttpStatusCode status) {
        return status.value() == 401 || status.value() == 403;
    }

    private GarminException toGarminException(RestClientResponseException e) {
        if (isUnauthorized(e.getStatusCode())) {
            return new GarminException("Garmin-API-Key ungültig oder abgelaufen", e);
        }
        return new GarminException("Garmin antwortete mit HTTP " + e.getStatusCode().value(), e);
    }

    private GarminException unreachable(RestClientException e) {
        return new GarminException("Garmin nicht erreichbar", e);
    }
}
