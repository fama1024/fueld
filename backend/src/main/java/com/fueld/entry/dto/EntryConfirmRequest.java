package com.fueld.entry.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record EntryConfirmRequest(@NotEmpty List<EntryDraft> items) {}
