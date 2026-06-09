package com.fueld.profile;

import com.fueld.profile.dto.ProfileRequest;
import com.fueld.profile.dto.ProfileResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;

    public ProfileResponse get(User user) {
        return profileRepository.findByUserId(user.getId())
                .map(this::toResponse)
                .orElse(new ProfileResponse(null, null, null, null, null, null, null, null));
    }

    public ProfileResponse upsert(User user, ProfileRequest request) {
        Profile profile = profileRepository.findByUserId(user.getId())
                .orElse(Profile.builder().user(user).build());

        profile.setGoals(request.goals());
        profile.setDiet(request.diet());
        profile.setSports(request.sports());
        profile.setBodyWeight(request.bodyWeight());
        profile.setHeight(request.height());
        profile.setAge(request.age());

        return toResponse(profileRepository.save(profile));
    }

    private ProfileResponse toResponse(Profile p) {
        return new ProfileResponse(
                p.getId(), p.getGoals(), p.getDiet(), p.getSports(),
                p.getBodyWeight(), p.getHeight(), p.getAge(), p.getUpdatedAt()
        );
    }
}
