package com.fueld.profile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fueld.profile.dto.GoalsResponse;
import com.fueld.profile.dto.ProfileRequest;
import com.fueld.profile.dto.ProfileResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final ObjectMapper objectMapper;

    public ProfileResponse get(User user) {
        return profileRepository.findByUserId(user.getId())
                .map(p -> toResponse(p, user.getName()))
                .orElse(new ProfileResponse(null, user.getName(), null, null, null, null, null, null, null, null, null, null));
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
        profile.setGender(request.gender());
        profile.setActivityLevel(request.activityLevel());
        profile.setGoalTags(serializeGoalTags(request.goalTags()));

        return toResponse(profileRepository.save(profile), user.getName());
    }

    public GoalsResponse getGoals(User user) {
        return profileRepository.findByUserId(user.getId())
                .map(this::calculateGoals)
                .orElse(new GoalsResponse(2000, 150, 250, 65, false));
    }

    private GoalsResponse calculateGoals(Profile p) {
        if (p.getBodyWeight() == null || p.getHeight() == null || p.getAge() == null) {
            return new GoalsResponse(2000, 150, 250, 65, false);
        }

        double weight = p.getBodyWeight().doubleValue();
        double height = p.getHeight();
        double age = p.getAge();

        // Mifflin-St Jeor BMR
        double bmr;
        if ("female".equals(p.getGender())) {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        } else if ("male".equals(p.getGender())) {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            // diverse / nicht angegeben: Mittelwert
            bmr = 10 * weight + 6.25 * height - 5 * age - 78;
        }

        // PAL-Faktor (Physical Activity Level)
        double pal = switch (p.getActivityLevel() != null ? p.getActivityLevel() : "moderately_active") {
            case "sedentary"        -> 1.2;
            case "lightly_active"   -> 1.375;
            case "very_active"      -> 1.725;
            case "extra_active"     -> 1.9;
            default                 -> 1.55; // moderately_active
        };

        int tdee = (int) Math.round(bmr * pal);

        // Makro-Split: goal_tags haben Priorität über Freitext
        List<String> tags = deserializeGoalTags(p.getGoalTags());
        String goalText = p.getGoals() != null ? p.getGoals().toLowerCase() : "";
        boolean wantsLoseWeight = tags.contains("Gewicht verlieren")
                || goalText.contains("verlier") || goalText.contains("abnehm") || goalText.contains("defizit");
        boolean wantsMuscle = tags.contains("Muskelaufbau")
                || goalText.contains("muskel") || goalText.contains("aufbau");
        boolean wantsEndurance = tags.contains("Ausdauer verbessern");

        int targetCalories;
        int protein;
        if (wantsLoseWeight && !wantsMuscle) {
            targetCalories = Math.max(1200, tdee - 300);
            protein = (int) Math.round(weight * 1.8);
        } else if (wantsMuscle) {
            targetCalories = tdee + 200;
            protein = (int) Math.round(weight * 2.0);
        } else if (wantsEndurance) {
            targetCalories = tdee;
            protein = (int) Math.round(weight * 1.4);
        } else {
            targetCalories = tdee;
            protein = (int) Math.round(weight * 1.4);
        }

        int fat   = (int) Math.round(targetCalories * 0.28 / 9);
        int carbs = (int) Math.round((targetCalories - protein * 4 - fat * 9) / 4.0);

        return new GoalsResponse(targetCalories, protein, Math.max(0, carbs), Math.max(0, fat), true);
    }

    public List<String> getGoalTagsForUser(User user) {
        return profileRepository.findByUserId(user.getId())
                .map(p -> deserializeGoalTags(p.getGoalTags()))
                .orElse(Collections.emptyList());
    }

    private String serializeGoalTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(tags);
        } catch (Exception e) {
            return null;
        }
    }

    public List<String> deserializeGoalTags(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private ProfileResponse toResponse(Profile p, String name) {
        return new ProfileResponse(
                p.getId(), name, p.getGoals(), p.getDiet(), p.getSports(),
                p.getBodyWeight(), p.getHeight(), p.getAge(),
                p.getGender(), p.getActivityLevel(), p.getUpdatedAt(),
                deserializeGoalTags(p.getGoalTags())
        );
    }
}
