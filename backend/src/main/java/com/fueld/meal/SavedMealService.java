package com.fueld.meal;

import com.fueld.meal.dto.SavedMealRequest;
import com.fueld.meal.dto.SavedMealResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavedMealService {

    private final SavedMealRepository savedMealRepository;

    public List<SavedMealResponse> getSavedMeals(User user) {
        return savedMealRepository.findByUserIdOrderByLastUsedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public SavedMealResponse create(User user, SavedMealRequest request) {
        SavedMeal saved = SavedMeal.builder()
                .user(user)
                .name(request.name().trim())
                .textInput(request.textInput() != null && !request.textInput().isBlank()
                        ? request.textInput().trim() : null)
                .calories(request.calories())
                .protein(request.protein())
                .carbs(request.carbs())
                .fat(request.fat())
                .build();
        return toResponse(savedMealRepository.save(saved));
    }

    public void delete(User user, UUID id) {
        SavedMeal saved = savedMealRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!saved.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        savedMealRepository.delete(saved);
    }

    private SavedMealResponse toResponse(SavedMeal s) {
        return new SavedMealResponse(
                s.getId(), s.getName(), s.getTextInput(),
                s.getCalories(), s.getProtein(), s.getCarbs(), s.getFat(),
                s.getLastUsedAt());
    }
}
