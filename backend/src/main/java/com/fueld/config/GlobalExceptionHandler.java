package com.fueld.config;

import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicServiceException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Zentrales Error-Handling. Wichtig vor allem, damit Fehler aus dem KI-Aufruf
 * (Anthropic-API) im Log auftauchen und dem Frontend als lesbare 502-Antwort
 * zurückkommen — statt als stiller Abbruch, den Railway als leeren 403 ausliefert.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AnthropicException.class)
    public ProblemDetail handleAnthropic(AnthropicException ex, HttpServletRequest request) {
        String detail = ex instanceof AnthropicServiceException svc
                ? "KI-Dienst antwortete mit einem Fehler (" + svc.statusCode() + ")"
                : "KI-Dienst nicht erreichbar";
        log.error("Anthropic-Aufruf fehlgeschlagen für {} {}", request.getMethod(), request.getRequestURI(), ex);
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, detail);
        pd.setTitle("KI-Analyse fehlgeschlagen");
        return pd;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        log.warn("{} {} -> {} {}", request.getMethod(), request.getRequestURI(),
                ex.getStatusCode().value(), ex.getReason());
        ProblemDetail pd = ProblemDetail.forStatus(ex.getStatusCode());
        if (ex.getReason() != null) pd.setDetail(ex.getReason());
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unbehandelter Fehler bei {} {}", request.getMethod(), request.getRequestURI(), ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Interner Fehler");
    }
}
