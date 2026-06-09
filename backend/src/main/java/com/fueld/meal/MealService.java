package com.fueld.meal;

import com.fueld.ai.AiService;
import com.fueld.meal.dto.MealAnalysis;
import com.fueld.meal.dto.MealLogRequest;
import com.fueld.meal.dto.MealLogResponse;
import com.fueld.profile.Profile;
import com.fueld.profile.ProfileRepository;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MealService {

    private final MealLogRepository mealLogRepository;
    private final ProfileRepository profileRepository;
    private final AiService aiService;

    public MealLogResponse logMeal(User user, MealLogRequest request) {
        String profileContext = buildProfileContext(user);

        MealAnalysis analysis = aiService.analyzeMeal(
                profileContext, request.text(), request.photos());

        MealLog log = MealLog.builder()
                .user(user)
                .textInput(request.text())
                .summary(analysis.summary())
                .calories(analysis.calories())
                .protein(analysis.protein())
                .carbs(analysis.carbs())
                .fat(analysis.fat())
                .feedback(analysis.feedback())
                .tip(analysis.tip())
                .build();

        return toResponse(mealLogRepository.save(log));
    }

    public List<MealLogResponse> getHistory(User user) {
        return mealLogRepository.findByUserIdOrderByLoggedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private String buildProfileContext(User user) {
        return profileRepository.findByUserId(user.getId())
                .map(this::formatProfile)
                .orElse("Kein Profil vorhanden.");
    }

    private String formatProfile(Profile p) {
        StringBuilder sb = new StringBuilder();
        if (p.getGoals() != null) sb.append("Ziele: ").append(p.getGoals()).append("\n");
        if (p.getDiet() != null) sb.append("Ernährung: ").append(p.getDiet()).append("\n");
        if (p.getSports() != null) sb.append("Sport: ").append(p.getSports()).append("\n");
        if (p.getBodyWeight() != null) sb.append("Gewicht: ").append(p.getBodyWeight()).append(" kg\n");
        if (p.getHeight() != null) sb.append("Größe: ").append(p.getHeight()).append(" cm\n");
        if (p.getAge() != null) sb.append("Alter: ").append(p.getAge()).append(" Jahre\n");
        return sb.isEmpty() ? "Kein Profil vorhanden." : sb.toString();
    }

    private MealLogResponse toResponse(MealLog m) {
        return new MealLogResponse(
                m.getId(), m.getTextInput(), m.getSummary(),
                m.getCalories(), m.getProtein(), m.getCarbs(), m.getFat(),
                m.getFeedback(), m.getTip(), m.getLoggedAt()
        );
    }
}
