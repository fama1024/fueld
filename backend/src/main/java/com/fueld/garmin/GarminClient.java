package com.fueld.garmin;

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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dünner Client für die Garmin Personal API. Jeder Nutzer hat seinen eigenen API-Key, jeder Aufruf
 * bekommt ihn deshalb übergeben. Der Key wird gegen ein 24h-gültiges Access-Token getauscht; Garmin
 * vergibt keine Refresh-Tokens, wir holen bei Bedarf einfach ein neues. Tokens liegen pro Key im
 * Speicher, damit nie die Daten eines anderen Nutzers abgerufen werden. Ein neuer Key bekommt so
 * automatisch ein neues Token.
 */
@Component
public class GarminClient {

    private static final String TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";
    private static final String ACTIVITIES_PATH = "/activitylist-service/activities/search/activities";
    // Token gilt 24h; wir erneuern etwas früher
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(23);

    private record CachedToken(String value, Instant expiresAt) {}

    private final RestClient http;
    private final Map<String, CachedToken> tokens = new ConcurrentHashMap<>();

    // Der RestClient wird bewusst selbst gebaut statt als Spring-Bean injiziert:
    // so hängt der Start nicht davon ab, ob Boot 4 einen RestClient.Builder autokonfiguriert.
    @Autowired
    public GarminClient(@Value("${app.garmin.base-url:https://personal.connectapi.garmin.com}") String baseUrl) {
        this(RestClient.builder(), baseUrl);
    }

    // Für Tests: erlaubt, den Builder an einen MockRestServiceServer zu binden
    GarminClient(RestClient.Builder builder, String baseUrl) {
        this.http = builder.baseUrl(baseUrl).build();
    }

    /** Prüft den Key bei Garmin. Wirft {@link GarminKeyRejectedException}, wenn Garmin ihn ablehnt. */
    public void verifyKey(String apiKey) {
        tokens.remove(apiKey);
        accessToken(apiKey);
    }

    /**
     * Eine Seite Aktivitäten, neueste zuerst (die API sortiert absteigend nach Startzeit).
     * {@code start} ist der Offset (0-basiert), {@code limit} die Seitengröße.
     */
    public List<GarminActivity> fetchActivities(String apiKey, int start, int limit) {
        try {
            return requestActivities(apiKey, start, limit);
        } catch (RestClientResponseException e) {
            if (isUnauthorized(e.getStatusCode())) {
                // Token evtl. serverseitig ungültig geworden: einmal neu holen
                tokens.remove(apiKey);
                try {
                    return requestActivities(apiKey, start, limit);
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

    private List<GarminActivity> requestActivities(String apiKey, int start, int limit) {
        List<GarminActivity> activities = http.get()
                .uri(uri -> uri.path(ACTIVITIES_PATH)
                        .queryParam("start", start)
                        .queryParam("limit", limit)
                        .build())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(apiKey))
                .retrieve()
                .body(new ParameterizedTypeReference<List<GarminActivity>>() {});
        return activities != null ? activities : List.of();
    }

    private String accessToken(String apiKey) {
        CachedToken cached = tokens.get(apiKey);
        if (cached != null && Instant.now().isBefore(cached.expiresAt())) return cached.value();
        try {
            String raw = http.post()
                    .uri(TOKEN_PATH)
                    .header(HttpHeaders.AUTHORIZATION, "ApiKey " + apiKey)
                    .retrieve()
                    .body(String.class);
            if (raw == null || raw.isBlank()) throw new GarminException("Garmin lieferte kein Token");
            String token = raw.trim();
            tokens.put(apiKey, new CachedToken(token, Instant.now().plus(TOKEN_LIFETIME)));
            return token;
        } catch (RestClientResponseException e) {
            throw toGarminException(e);
        } catch (RestClientException e) {
            throw unreachable(e);
        }
    }

    private static boolean isUnauthorized(HttpStatusCode status) {
        return status.value() == 401 || status.value() == 403;
    }

    private GarminException toGarminException(RestClientResponseException e) {
        if (isUnauthorized(e.getStatusCode())) {
            return new GarminKeyRejectedException(e);
        }
        return new GarminException("Garmin antwortete mit HTTP " + e.getStatusCode().value(), e);
    }

    private GarminException unreachable(RestClientException e) {
        return new GarminException("Garmin nicht erreichbar", e);
    }
}
