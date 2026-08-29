package com.fueld.calendar;

import com.fueld.calendar.dto.CalendarEntryResponse;
import com.fueld.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;

    @GetMapping
    public ResponseEntity<List<CalendarEntryResponse>> getMonth(
            @AuthenticationPrincipal User user,
            @RequestParam String month) {
        return ResponseEntity.ok(calendarService.getMonth(user, YearMonth.parse(month)));
    }
}
