package com.fueld.profile;

import com.fueld.profile.dto.ProfileRequest;
import com.fueld.profile.dto.ProfileResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ProfileResponse> get(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(profileService.get(user));
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> upsert(
            @RequestBody ProfileRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(profileService.upsert(user, request));
    }
}
