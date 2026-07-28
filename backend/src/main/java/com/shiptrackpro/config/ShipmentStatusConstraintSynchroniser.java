package com.shiptrackpro.config;

import com.shiptrackpro.enums.ShipmentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Automatically synchronises the PostgreSQL CHECK constraint on
 * {@code shipments.shipment_status} with the {@link ShipmentStatus} Java enum.
 *
 * <h3>Why this is needed</h3>
 * <p>Hibernate's {@code ddl-auto=update} creates the column and its initial
 * constraint from the enum values that existed at the time of first deployment.
 * When new enum values are added later (e.g. {@code PENDING_DRIVER},
 * {@code DRIVER_ASSIGNED}), Hibernate does <em>not</em> update the existing
 * CHECK constraint — it only alters column types and adds missing columns.
 * This leaves the database constraint out of sync with the Java enum, causing
 * {@code ConstraintViolationException} on INSERT.</p>
 *
 * <h3>Solution</h3>
 * <p>At every application startup this component:
 * <ol>
 *   <li>Reads the live constraint definition from {@code pg_constraint}.</li>
 *   <li>Compares it with the current {@link ShipmentStatus} enum values.</li>
 *   <li>If they differ, drops the old constraint and recreates it with all
 *       current enum values — in a single idempotent operation.</li>
 * </ol>
 * The operation is a no-op when the constraint is already correct, so it adds
 * negligible startup overhead.</p>
 *
 * <h3>Future-proof</h3>
 * <p>No developer action is required when adding new {@link ShipmentStatus}
 * values. Simply add the value to the enum; this component will update the
 * database constraint automatically on the next boot.</p>
 */
@Component
public class ShipmentStatusConstraintSynchroniser {

    private static final Logger log = LoggerFactory.getLogger(ShipmentStatusConstraintSynchroniser.class);

    private static final String TABLE_NAME      = "shipments";
    private static final String COLUMN_NAME     = "shipment_status";
    private static final String CONSTRAINT_NAME = "shipments_shipment_status_check";

    private final JdbcTemplate jdbc;

    public ShipmentStatusConstraintSynchroniser(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Runs after the application context is fully started and all beans are
     * wired, but before the first HTTP request is served.
     */
    @EventListener(ApplicationStartedEvent.class)
    public void synchroniseConstraint() {
        try {
            // Build the authoritative list of allowed values from the Java enum
            String[] enumValues = Arrays.stream(ShipmentStatus.values())
                    .map(Enum::name)
                    .toArray(String[]::new);

            String allowedIn = Arrays.stream(enumValues)
                    .map(v -> "'" + v + "'")
                    .collect(Collectors.joining(", "));

            // Check whether the constraint already covers all enum values
            if (constraintIsUpToDate(enumValues)) {
                log.info("[ShipmentStatus] Constraint '{}' is up-to-date — no changes needed.", CONSTRAINT_NAME);
                return;
            }

            log.warn("[ShipmentStatus] Constraint '{}' is out of sync with the Java enum. Updating…", CONSTRAINT_NAME);

            // Drop old constraint (IF EXISTS is safe — first run may not have it)
            jdbc.execute(
                    "ALTER TABLE " + TABLE_NAME +
                    " DROP CONSTRAINT IF EXISTS " + CONSTRAINT_NAME
            );

            // Recreate with the full enum value list
            jdbc.execute(
                    "ALTER TABLE " + TABLE_NAME +
                    " ADD CONSTRAINT " + CONSTRAINT_NAME +
                    " CHECK (" + COLUMN_NAME + " IN (" + allowedIn + "))"
            );

            log.info("[ShipmentStatus] Constraint '{}' updated successfully. Allowed values: {}",
                    CONSTRAINT_NAME, allowedIn);

        } catch (Exception ex) {
            // Non-fatal: log the error but do not crash the application.
            // The next INSERT will surface the constraint issue in the normal
            // error path if the fix failed.
            log.error("[ShipmentStatus] Failed to synchronise constraint '{}': {}",
                    CONSTRAINT_NAME, ex.getMessage(), ex);
        }
    }

    /**
     * Returns {@code true} when the live PostgreSQL constraint already
     * includes every value in the current {@link ShipmentStatus} enum.
     * <p>We query {@code information_schema.check_constraints} for the
     * constraint definition and check that each enum name appears in the
     * constraint text. If the constraint doesn't exist yet, returns
     * {@code false} so it gets created.</p>
     */
    private boolean constraintIsUpToDate(String[] enumValues) {
        try {
            String definition = jdbc.queryForObject(
                    "SELECT check_clause " +
                    "FROM information_schema.check_constraints " +
                    "WHERE constraint_name = ?",
                    String.class,
                    CONSTRAINT_NAME
            );

            if (definition == null) return false;

            // Every enum value must appear literally in the constraint text
            for (String value : enumValues) {
                if (!definition.contains(value)) {
                    return false;
                }
            }
            return true;
        } catch (Exception ex) {
            // Constraint not found or query failed → treat as out-of-date
            return false;
        }
    }
}
