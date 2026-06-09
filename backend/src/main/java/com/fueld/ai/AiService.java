package com.fueld.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fueld.meal.dto.MealAnalysis;
import com.fueld.meal.dto.MealLogRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    @Value("${app.claude.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper;

    private AnthropicClient client;

    @PostConstruct
    void init() {
        client = apiKey.isBlank()
                ? AnthropicOkHttpClient.fromEnv()
                : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
    }

    public MealAnalysis analyzeMeal(String profileContext, String mealText,
                                     List<MealLogRequest.PhotoDto> photos) {
        String systemPrompt = buildSystemPrompt(profileContext);

        List<ContentBlockParam> userContent = new ArrayList<>();

        if (photos != null) {
            for (MealLogRequest.PhotoDto photo : photos) {
                Base64ImageSource.MediaType mediaType = resolveMediaType(photo.mediaType());
                userContent.add(ContentBlockParam.ofImage(
                        ImageBlockParam.builder()
                                .source(ImageBlockParam.Source.ofBase64(
                                        Base64ImageSource.builder()
                                                .mediaType(mediaType)
                                                .data(photo.data())
                                                .build()))
                                .build()));
            }
        }

        userContent.add(ContentBlockParam.ofText(
                TextBlockParam.builder().text(mealText).build()));

        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-opus-4-8")
                .maxTokens(1024L)
                .system(systemPrompt)
                .addUserMessageOfBlockParams(userContent)
                .build();

        Message response = client.messages().create(params);

        String content = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(TextBlock::text)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Keine Antwort von Claude erhalten"));

        return parseAnalysis(content);
    }

    private String buildSystemPrompt(String profileContext) {
        return """
                Du bist ein Ernährungs- und Fitness-Coach. Analysiere die beschriebene Mahlzeit und antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung.

                Nutzerprofil:
                %s

                Antworte NUR mit diesem JSON-Objekt (kein Text davor oder danach, keine Code-Blöcke):
                {
                  "summary": "kurze Beschreibung der Mahlzeit",
                  "calories": 450,
                  "protein": 28,
                  "carbs": 52,
                  "fat": 12,
                  "feedback": "Bewertung bezogen auf die Ziele des Nutzers",
                  "tip": "ein konkreter Tipp oder null"
                }
                """.formatted(profileContext);
    }

    private MealAnalysis parseAnalysis(String raw) {
        // Strip potential markdown code fences
        String cleaned = raw.trim()
                .replaceAll("(?s)^```[a-z]*\\s*", "")
                .replaceAll("(?s)\\s*```$", "")
                .trim();
        try {
            return objectMapper.readValue(cleaned, MealAnalysis.class);
        } catch (Exception e) {
            log.error("AI-Antwort konnte nicht geparst werden: {}", raw, e);
            throw new RuntimeException("AI-Antwort konnte nicht verarbeitet werden");
        }
    }

    private Base64ImageSource.MediaType resolveMediaType(String mime) {
        if (mime == null) return Base64ImageSource.MediaType.IMAGE_JPEG;
        return switch (mime.toLowerCase()) {
            case "image/png" -> Base64ImageSource.MediaType.IMAGE_PNG;
            case "image/gif" -> Base64ImageSource.MediaType.IMAGE_GIF;
            case "image/webp" -> Base64ImageSource.MediaType.IMAGE_WEBP;
            default -> Base64ImageSource.MediaType.IMAGE_JPEG;
        };
    }
}
