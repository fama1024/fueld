package com.fueld.meal.dto;

/**
 * Gerasteter Ring-Füllstand für das Tendenz-Dashboard.
 * Jeder Wert ist eine von 5 Stufen: 0, 25, 50, 75 oder 100 (Prozent gefüllt).
 * Bewusst grob, weil der Input ("Nudeln mit Tomatensauce") keine exakte
 * Prozentangabe hergibt.
 */
public record MacroBuckets(
        int calories,
        int protein,
        int carbs,
        int fat
) {
    /** Rundet value/goal auf die nächste 25%-Stufe, gedeckelt bei 0 und 100. */
    public static int bucket(double value, double goal) {
        if (goal <= 0) return 0;
        int step = (int) Math.round(value / goal * 4);
        step = Math.max(0, Math.min(4, step));
        return step * 25;
    }
}
