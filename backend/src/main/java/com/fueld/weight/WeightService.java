package com.fueld.weight;

import com.fueld.ai.AiService;
import com.fueld.user.User;
import com.fueld.weight.dto.BodyCompositionAnalysis;
import com.fueld.weight.dto.WeightAnalyzeRequest;
import com.fueld.weight.dto.WeightLogRequest;
import com.fueld.weight.dto.WeightLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WeightService {

    private final WeightLogRepository repo;
    private final AiService aiService;

    public WeightLogResponse log(User user, WeightLogRequest req) {
        WeightLog entry = WeightLog.builder()
                .user(user)
                .weight(req.weight())
                .bmi(req.bmi())
                .bodyFatPct(req.bodyFatPct())
                .muscleMassPct(req.muscleMassPct())
                .boneMassKg(req.boneMassKg())
                .waterPct(req.waterPct())
                .build();
        return toResponse(repo.save(entry));
    }

    public BodyCompositionAnalysis analyze(WeightAnalyzeRequest req) {
        return aiService.extractBodyComposition(req.data(), req.mediaType());
    }

    public List<WeightLogResponse> getHistory(User user) {
        return repo.findByUserIdOrderByLoggedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public void delete(User user, UUID id) {
        WeightLog entry = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!entry.getUser().getId().equals(user.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        repo.delete(entry);
    }

    private WeightLogResponse toResponse(WeightLog w) {
        return new WeightLogResponse(
                w.getId(), w.getWeight(), w.getBmi(),
                w.getBodyFatPct(), w.getMuscleMassPct(),
                w.getBoneMassKg(), w.getWaterPct(),
                w.getLoggedAt());
    }
}
