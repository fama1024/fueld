package com.fueld.assistant;

import com.fueld.assistant.dto.AssistantAnswerResponse;
import com.fueld.assistant.dto.AssistantAskRequest;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    @PostMapping("/ask")
    public ResponseEntity<AssistantAnswerResponse> ask(
            @AuthenticationPrincipal User user,
            @RequestBody AssistantAskRequest request) {
        return ResponseEntity.ok(assistantService.ask(user, request));
    }
}
