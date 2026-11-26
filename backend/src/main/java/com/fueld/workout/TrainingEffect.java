package com.fueld.workout;

import java.math.BigDecimal;

/** Training Effect laut Garmin: aerob und anaerob je 0 bis 5, dazu Garmins Bezeichnung. Alles optional. */
public record TrainingEffect(BigDecimal aerobic, BigDecimal anaerobic, String label) {}
