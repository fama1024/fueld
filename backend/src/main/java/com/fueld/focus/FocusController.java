package com.fueld.focus;

import com.fueld.focus.dto.FocusResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/focus")
@RequiredArgsConstructor
public class FocusController {

    private final FocusService focusService;

    @GetMapping
    public ResponseEntity<FocusResponse> getFocus(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(focusService.getFocus(user));
    }
}
