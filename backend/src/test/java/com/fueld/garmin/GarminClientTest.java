package com.fueld.garmin;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GarminClientTest {

    private static final String BASE = "https://garmin.test";
    private static final String TOKEN_URL = BASE + "/personalapitoken-service/personal-api/personal-api-key/token";
    private static final String ACTIVITIES_URL = BASE + "/activitylist-service/activities/search/activities?start=0&limit=3";
    // Mit unbekannten Feldern, wie sie die echte API liefert
    private static final String ACTIVITIES_JSON = """
            [{"activityId": 42, "startTimeGMT": "2026-10-25 09:47:39", "duration": 3600.0, "distance": 10000.0,
              "averageHR": 140.0, "maxHR": 170.0, "calories": 700.0, "someNewField": {"x": 1},
              "activityType": {"typeId": 1, "typeKey": "running", "parentTypeId": 17}}]
            """;

    private MockRestServiceServer server;
    private GarminClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GarminClient(builder, "my-key", BASE);
    }

    @Test
    void tauschtKeyGegenTokenUndLiestAktivitaeten() {
        server.expect(requestTo(TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "ApiKey my-key"))
                .andRespond(withSuccess("tok123", MediaType.TEXT_PLAIN));
        server.expect(requestTo(ACTIVITIES_URL))
                .andExpect(header("Authorization", "Bearer tok123"))
                .andRespond(withSuccess(ACTIVITIES_JSON, MediaType.APPLICATION_JSON));

        List<GarminActivity> result = client.fetchRecentActivities(3);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().activityId()).isEqualTo(42L);
        assertThat(result.getFirst().typeKey()).isEqualTo("running");
        server.verify();
    }

    @Test
    void holtBei401EinmalNeuesTokenUndWiederholt() {
        server.expect(requestTo(TOKEN_URL)).andRespond(withSuccess("old", MediaType.TEXT_PLAIN));
        server.expect(requestTo(ACTIVITIES_URL)).andRespond(withStatus(org.springframework.http.HttpStatus.UNAUTHORIZED));
        server.expect(requestTo(TOKEN_URL)).andRespond(withSuccess("fresh", MediaType.TEXT_PLAIN));
        server.expect(requestTo(ACTIVITIES_URL))
                .andExpect(header("Authorization", "Bearer fresh"))
                .andRespond(withSuccess(ACTIVITIES_JSON, MediaType.APPLICATION_JSON));

        assertThat(client.fetchRecentActivities(3)).hasSize(1);
        server.verify();
    }

    @Test
    void abgelaufenerKey_ergibtVerstaendlicheFehlermeldung() {
        server.expect(requestTo(TOKEN_URL)).andRespond(withStatus(org.springframework.http.HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.fetchRecentActivities(3))
                .isInstanceOf(GarminException.class)
                .hasMessageContaining("ungültig oder abgelaufen");
    }

    @Test
    void ohneKey_istDeaktiviert() {
        GarminClient disabled = new GarminClient(RestClient.builder(), "", BASE);

        assertThat(disabled.isConfigured()).isFalse();
        assertThatThrownBy(() -> disabled.fetchRecentActivities(3)).isInstanceOf(GarminException.class);
    }
}
