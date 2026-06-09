package com.fueld.profile.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProfileRequest(
        String goals,
        String diet,
        String sports,
        BigDecimal bodyWeight,
        Integer height,
        Integer age,
        String gender,
        String activityLevel,
        List<String> goalTags
) {}
