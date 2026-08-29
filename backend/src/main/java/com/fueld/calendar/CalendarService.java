package com.fueld.calendar;

import com.fueld.calendar.dto.CalendarEntryResponse;
import com.fueld.meal.MealLogRepository;
import com.fueld.user.User;
import com.fueld.weight.WeightLogRepository;
import com.fueld.workout.WorkoutLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final MealLogRepository mealLogRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final WeightLogRepository weightLogRepository;

    public List<CalendarEntryResponse> getMonth(User user, YearMonth month) {
        ZoneId zone = ZoneId.of("Europe/Berlin");
        Instant from = month.atDay(1).atStartOfDay(zone).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();

        List<CalendarEntryResponse> entries = new ArrayList<>();

        mealLogRepository.findByUserIdAndEatenAtBetweenOrderByEatenAtDesc(user.getId(), from, to)
                .forEach(m -> entries.add(new CalendarEntryResponse(m.getId(), m.getEatenAt(), "meal")));

        workoutLogRepository.findByUserIdAndPerformedAtBetweenOrderByPerformedAtDesc(user.getId(), from, to)
                .forEach(w -> entries.add(new CalendarEntryResponse(w.getId(), w.getPerformedAt(), "workout")));

        weightLogRepository.findByUserIdAndLoggedAtBetweenOrderByLoggedAtDesc(user.getId(), from, to)
                .forEach(w -> entries.add(new CalendarEntryResponse(w.getId(), w.getLoggedAt(), "weight")));

        return entries;
    }
}
