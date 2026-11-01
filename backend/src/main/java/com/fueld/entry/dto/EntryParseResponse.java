package com.fueld.entry.dto;

import java.util.List;

public record EntryParseResponse(List<EntryDraft> items, String message) {}
