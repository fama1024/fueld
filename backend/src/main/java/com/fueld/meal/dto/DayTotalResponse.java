package com.fueld.meal.dto;

import java.time.LocalDate;

public record DayTotalResponse(
        LocalDate date,
        int calories,
        int protein,
        int carbs,
        int fat
) {}
