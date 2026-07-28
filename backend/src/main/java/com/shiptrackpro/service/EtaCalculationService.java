package com.shiptrackpro.service;

import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.enums.ShipmentStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Dynamic, status-aware ETA calculation engine for ShipTrack Pro.
 *
 * <h3>Core Algorithm</h3>
 * <p>Earlier versions anchored ETA to {@code expectedDeliveryDate} and applied
 * small adjustments, which meant the ETA barely changed as the shipment moved
 * through its lifecycle.  This version computes ETA from the
 * <em>remaining delivery window</em> as follows:</p>
 *
 * <ol>
 *   <li><strong>Total window</strong> = {@code expectedDeliveryDate − createdAt}</li>
 *   <li><strong>Status fraction</strong> = fraction of the window already consumed
 *       by the current status (e.g. IN_TRANSIT ≈ 50 % through, meaning 50 % of
 *       the window remains).</li>
 *   <li><strong>Base remaining</strong> = {@code (1 − statusFraction) × totalWindow}</li>
 *   <li><strong>ETA</strong> = {@code now + baseRemaining ± adjustments}</li>
 * </ol>
 *
 * <p>The key difference from the old design: as the shipment progresses
 * (CREATED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY), the remaining
 * window shrinks automatically, so the ETA moves closer to now.</p>
 *
 * <h3>Status-Remaining Mapping</h3>
 * <pre>
 *   CREATED / PENDING_DRIVER  → 100 % of window remaining
 *   DRIVER_ASSIGNED           →  90 % remaining (driver heading to pickup)
 *   PICKED_UP                 →  70 % remaining (collected, heading to hub)
 *   IN_TRANSIT                →  40 % remaining (in motion, midway)
 *   OUT_FOR_DELIVERY          →  10 % remaining (last mile, ≤ 60 min typical)
 *   DELIVERED                 →   0 % (terminal)
 * </pre>
 *
 * <h3>Adjustments applied on top of the base remaining</h3>
 * <ul>
 *   <li>+weight penalty (heavier packages require more handling)</li>
 *   <li>+stale GPS penalty (driver not reporting position → uncertainty)</li>
 *   <li>−express acceleration (EXPRESS service level commits to faster delivery)</li>
 *   <li>−active driver bonus (driver reporting fresh GPS position)</li>
 *   <li>OUT_FOR_DELIVERY: remaining is clamped to 15–60 minutes range</li>
 * </ul>
 *
 * <h3>Delay calculation</h3>
 * <p>Delay = {@code max(0, finalEta − expectedDeliveryDate)}.
 * If ETA is before or equal to the planned date, delay is 0 (on schedule).</p>
 */
@Service
public class EtaCalculationService {

    // ── Remaining-fraction per status ─────────────────────────────────────────
    // Fraction of the total delivery window that remains at each status.
    // E.g. 0.70 means 70 % of the window is still ahead of us.

    private static final double REM_PENDING_DRIVER   = 1.00;  // not started
    private static final double REM_DRIVER_ASSIGNED  = 0.90;  // driver heading to pickup
    private static final double REM_PICKED_UP        = 0.70;  // collected, in motion
    private static final double REM_IN_TRANSIT       = 0.40;  // midway through route
    private static final double REM_OUT_FOR_DELIVERY = 0.10;  // final mile

    // ── OUT_FOR_DELIVERY hard bounds (minutes) ────────────────────────────────
    private static final int OFD_MIN_MINUTES = 15;
    private static final int OFD_MAX_MINUTES = 60;

    // ── Positive adjustments (add time) ──────────────────────────────────────
    private static final int WEIGHT_MEDIUM_MINUTES = 45;   // 10–25 kg
    private static final int WEIGHT_HEAVY_MINUTES  = 90;   // 25–50 kg
    private static final int WEIGHT_EXTRA_MINUTES  = 180;  // > 50 kg
    private static final int STALE_GPS_PENALTY     = 20;   // driver GPS stale > 60 min

    // ── Negative adjustments (reduce time) ───────────────────────────────────
    private static final int EXPRESS_MINUTES    = 120;  // EXPRESS service level
    private static final int FRESH_GPS_BONUS    = 10;   // fresh GPS confirms progress

    // ── GPS freshness threshold ───────────────────────────────────────────────
    private static final long GPS_FRESH_MINUTES           = 60;   // ETA bonus/penalty threshold
    private static final long GPS_STALE_CONFIDENCE_MINUTES = 30;  // confidence penalty threshold

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Computes the dynamic ETA and delay for a shipment.
     *
     * @param shipment must not be {@code null}
     * @return an immutable {@link EtaResult}
     */
    public EtaResult calculate(Shipment shipment) {
        LocalDateTime now    = LocalDateTime.now();
        ShipmentStatus status = shipment.getShipmentStatus();

        // ── Terminal: DELIVERED ───────────────────────────────────────────────
        if (ShipmentStatus.DELIVERED.equals(status)) {
            LocalDateTime eta = shipment.getExpectedDeliveryDate() != null
                    ? shipment.getExpectedDeliveryDate()
                    : now;
            return new EtaResult(eta, 0, "Delivered successfully", 100);
        }

        // ── Terminal / cancelled states ───────────────────────────────────────
        if (ShipmentStatus.CANCELLED.equals(status)
                || ShipmentStatus.FAILED_DELIVERY.equals(status)
                || ShipmentStatus.RETURNED.equals(status)) {
            LocalDateTime eta = shipment.getExpectedDeliveryDate() != null
                    ? shipment.getExpectedDeliveryDate()
                    : now;
            return new EtaResult(eta, 0, "Shipment " + status.name().toLowerCase().replace("_", " "), 100);
        }

        LocalDateTime plannedEta = shipment.getExpectedDeliveryDate();
        LocalDateTime createdAt  = shipment.getCreatedAt();

        // ── Compute base remaining minutes from status progress ───────────────
        long baseRemainingMinutes = computeBaseRemaining(status, plannedEta, createdAt, now);

        StringBuilder reason = new StringBuilder();
        reason.append("Status ").append(status.name())
              .append(" → ~").append(toHumanTime(baseRemainingMinutes)).append(" remaining");

        int adjustment = 0;

        // ── Weight penalty ────────────────────────────────────────────────────
        int weightAdj = weightPenalty(shipment.getPackageWeight());
        if (weightAdj > 0) {
            adjustment += weightAdj;
            reason.append(String.format("; Weight %.1f kg: +%s",
                    shipment.getPackageWeight(), toHumanTime(weightAdj)));
        }

        // ── Express acceleration ──────────────────────────────────────────────
        if ("EXPRESS".equalsIgnoreCase(shipment.getShipmentType())) {
            adjustment -= EXPRESS_MINUTES;
            reason.append("; EXPRESS: −").append(toHumanTime(EXPRESS_MINUTES));
        }

        // ── Driver GPS adjustments ────────────────────────────────────────────
        User driver = shipment.getAssignedDriver();
        if (driver != null) {
            if (hasFreshGps(driver, now)) {
                adjustment -= FRESH_GPS_BONUS;
                reason.append("; Fresh GPS: −").append(FRESH_GPS_BONUS).append(" min");
            } else if (hasStaleGps(driver, now)) {
                adjustment += STALE_GPS_PENALTY;
                reason.append("; Stale GPS: +").append(STALE_GPS_PENALTY).append(" min");
            }
        }

        // ── Compute raw ETA ───────────────────────────────────────────────────
        long finalRemainingMinutes = Math.max(0, baseRemainingMinutes + adjustment);

        // ── OUT_FOR_DELIVERY hard clamp ───────────────────────────────────────
        if (ShipmentStatus.OUT_FOR_DELIVERY.equals(status)) {
            finalRemainingMinutes = Math.min(finalRemainingMinutes, OFD_MAX_MINUTES);
            finalRemainingMinutes = Math.max(finalRemainingMinutes, OFD_MIN_MINUTES);
            reason.append("; Clamped to ").append(finalRemainingMinutes).append(" min (out for delivery)");
        }

        LocalDateTime estimatedDeliveryTime = now.plusMinutes(finalRemainingMinutes);

        // ── Delay: how many minutes after the planned ETA are we? ─────────────
        int delayMinutes = 0;
        if (plannedEta != null && estimatedDeliveryTime.isAfter(plannedEta)) {
            delayMinutes = (int) Duration.between(plannedEta, estimatedDeliveryTime).toMinutes();
        }

        // ── Confidence score ──────────────────────────────────────────────────
        int confidence = computeConfidence(shipment, status, delayMinutes, driver, now);

        return new EtaResult(estimatedDeliveryTime, delayMinutes, reason.toString(), confidence);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core computation helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Computes how many minutes remain based on the status's fraction of the
     * total delivery window.
     *
     * <p>If the planned ETA and createdAt are available, the window is computed
     * precisely.  Otherwise a sensible fallback based on status is used.</p>
     */
    private long computeBaseRemaining(ShipmentStatus status,
                                      LocalDateTime plannedEta,
                                      LocalDateTime createdAt,
                                      LocalDateTime now) {
        double remainingFraction = remainingFraction(status);

        if (plannedEta != null && createdAt != null && plannedEta.isAfter(createdAt)) {
            long totalWindowMinutes = Duration.between(createdAt, plannedEta).toMinutes();
            if (totalWindowMinutes > 0) {
                return Math.round(totalWindowMinutes * remainingFraction);
            }
        }

        // Fallback: estimate from current time to planned ETA if available
        if (plannedEta != null) {
            long minutesToPlanned = Duration.between(now, plannedEta).toMinutes();
            if (minutesToPlanned > 0) {
                // Scale by remaining fraction to show we are partway through
                return Math.round(minutesToPlanned * remainingFraction);
            }
        }

        // Last fallback: fixed estimates per status
        return switch (status) {
            case PENDING_DRIVER, CREATED -> 1440L;   // 24 h
            case DRIVER_ASSIGNED         ->  360L;   //  6 h
            case PICKED_UP               ->  300L;   //  5 h
            case IN_TRANSIT              ->  180L;   //  3 h
            case OUT_FOR_DELIVERY        ->   30L;   // 30 min
            default                      ->  480L;   //  8 h
        };
    }

    /**
     * Returns the fraction of the delivery window that is <em>still remaining</em>
     * at the given status.  Lower fraction = closer to delivery.
     */
    private double remainingFraction(ShipmentStatus status) {
        if (status == null) return REM_PENDING_DRIVER;
        return switch (status) {
            case CREATED, PENDING_DRIVER -> REM_PENDING_DRIVER;
            case DRIVER_ASSIGNED         -> REM_DRIVER_ASSIGNED;
            case PICKED_UP               -> REM_PICKED_UP;
            case IN_TRANSIT              -> REM_IN_TRANSIT;
            case OUT_FOR_DELIVERY        -> REM_OUT_FOR_DELIVERY;
            default                      -> REM_PENDING_DRIVER;
        };
    }

    private int weightPenalty(Double weight) {
        if (weight == null || weight <= 10.0) return 0;
        if (weight <= 25.0)                   return WEIGHT_MEDIUM_MINUTES;
        if (weight <= 50.0)                   return WEIGHT_HEAVY_MINUTES;
        return WEIGHT_EXTRA_MINUTES;
    }

    private boolean hasFreshGps(User driver, LocalDateTime now) {
        if (driver.getCurrentLatitude() == null
                || driver.getCurrentLongitude() == null
                || driver.getLastLocationUpdate() == null) return false;
        return Duration.between(driver.getLastLocationUpdate(), now).toMinutes() <= GPS_FRESH_MINUTES;
    }

    private boolean hasStaleGps(User driver, LocalDateTime now) {
        if (driver.getCurrentLatitude() == null
                || driver.getCurrentLongitude() == null
                || driver.getLastLocationUpdate() == null) return false;
        return Duration.between(driver.getLastLocationUpdate(), now).toMinutes() > GPS_FRESH_MINUTES;
    }

    /**
     * Computes a forecast confidence score (0–100) that reflects how reliable
     * the current ETA estimate is.
     *
     * <p>Rules applied in order:
     * <ol>
     *   <li>Start at 100.</li>
     *   <li>Delay &gt; 0 min: −15</li>
     *   <li>Delay &gt; 60 min: −10</li>
     *   <li>Delay &gt; 180 min: −10</li>
     *   <li>Driver GPS older than 30 min: −15</li>
     *   <li>Status IN_TRANSIT: +5</li>
     *   <li>Status OUT_FOR_DELIVERY: +10</li>
     *   <li>EXPRESS shipment: +5</li>
     * </ol>
     * Result is clamped to [0, 100].
     */
    private int computeConfidence(Shipment shipment,
                                  ShipmentStatus status,
                                  int delayMinutes,
                                  User driver,
                                  LocalDateTime now) {
        int score = 100;

        // Delay penalties
        if (delayMinutes > 0)   score -= 15;
        if (delayMinutes > 60)  score -= 10;
        if (delayMinutes > 180) score -= 10;

        // Stale GPS penalty (30-min threshold for confidence)
        if (driver != null
                && driver.getLastLocationUpdate() != null
                && Duration.between(driver.getLastLocationUpdate(), now).toMinutes() > GPS_STALE_CONFIDENCE_MINUTES) {
            score -= 15;
        }

        // Status bonuses
        if (ShipmentStatus.IN_TRANSIT.equals(status))       score += 5;
        if (ShipmentStatus.OUT_FOR_DELIVERY.equals(status)) score += 10;

        // Express bonus
        if ("EXPRESS".equalsIgnoreCase(shipment.getShipmentType())) score += 5;

        return Math.max(0, Math.min(100, score));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Formatting
    // ─────────────────────────────────────────────────────────────────────────

    private String toHumanTime(long minutes) {
        long abs = Math.abs(minutes);
        long h   = abs / 60;
        long m   = abs % 60;
        if (h == 0) return m + " min";
        if (m == 0) return h + "h";
        return h + "h " + m + " min";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Value object
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Immutable result of the ETA calculation.
     *
     * @param estimatedDeliveryTime the computed delivery timestamp
     * @param delayMinutes          minutes beyond {@code expectedDeliveryDate};
     *                              0 when on time or ahead of schedule
     * @param delayReason           human-readable audit trail of applied rules
     * @param confidence            forecast reliability score 0–100
     */
    public record EtaResult(
            LocalDateTime estimatedDeliveryTime,
            int           delayMinutes,
            String        delayReason,
            int           confidence
    ) {}
}
