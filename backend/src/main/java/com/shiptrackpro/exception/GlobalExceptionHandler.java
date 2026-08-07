package com.shiptrackpro.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<?> handleEmailExists(EmailAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<?> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", ex.getMessage()));
    }

    /**
     * Catches Spring Security's BadCredentialsException (and any other
     * AuthenticationException) that escapes from authenticationManager.authenticate().
     *
     * Without this handler it falls into handleRuntime() which returns HTTP 400
     * instead of 401, and the frontend shows "Bad credentials" instead of the
     * expected "Invalid email or password."
     */
    @ExceptionHandler({BadCredentialsException.class, AuthenticationException.class})
    public ResponseEntity<?> handleBadCredentials(Exception ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid email or password."));
    }

    @ExceptionHandler(PendingApprovalException.class)
    public ResponseEntity<?> handlePendingApproval(PendingApprovalException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(RegistrationRejectedException.class)
    public ResponseEntity<?> handleRejected(RegistrationRejectedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<?> handleEmailNotVerified(EmailNotVerifiedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "message", ex.getMessage(),
                        "code", "EMAIL_NOT_VERIFIED"
                ));
    }

    /**
     * Handles concurrent driver acceptance collisions.
     * Returns HTTP 409 Conflict so the losing driver gets a clear error.
     */
    @ExceptionHandler(ShipmentConflictException.class)
    public ResponseEntity<?> handleShipmentConflict(ShipmentConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", ex.getMessage()));
    }

    /**
     * Handles Bean Validation failures triggered by {@code @Valid} on request bodies
     * (e.g. {@code @NotBlank}, {@code @Size} on {@link com.shiptrackpro.dto.DeliveryConfirmationRequest}).
     *
     * <p>Without this handler, Spring returns its own verbose error body which the
     * frontend cannot surface as a human-readable message. This handler collects every
     * field error and joins them into a single {@code message} string matching the
     * format expected by every other error response in this application.</p>
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", message.isBlank() ? "Validation failed." : message));
    }

    /**
     * Handles business rule violations — e.g., attempting to update shipment
     * status while the driver acceptance is still pending.
     * Returns HTTP 409 Conflict so the frontend can surface a clear message.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException ex) {
        log.warn("[BusinessRule] Rejected: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", ex.getMessage()));
    }

    /**
     * Handles database integrity violations (CHECK constraints, FK failures, etc.).
     *
     * <p>The raw SQL exception is logged server-side for diagnosis but never
     * exposed to the caller. The response body is a structured JSON object so
     * the frontend can display a meaningful message instead of a stack trace.</p>
     *
     * <p>Common trigger: {@code shipments_shipment_status_check} — the
     * PostgreSQL CHECK constraint on {@code shipment_status} is out of sync
     * with the Java {@link com.shiptrackpro.enums.ShipmentStatus} enum.
     * {@link com.shiptrackpro.config.ShipmentStatusConstraintSynchroniser}
     * auto-repairs this at startup, so this handler is a last-resort safety net.</p>
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("[DataIntegrity] Database constraint violation: {}", ex.getMostSpecificCause().getMessage(), ex);

        String userMessage = "Shipment could not be created.";
        String details     = "A database validation rule was violated. Please contact support.";

        // Detect the specific shipment-status constraint so we can give a more
        // actionable message (helps developers identify the sync issue quickly).
        String cause = ex.getMostSpecificCause().getMessage();
        if (cause != null && cause.contains("shipments_shipment_status_check")) {
            userMessage = "Shipment could not be created.";
            details     = "Shipment status configuration is invalid. "
                        + "The database constraint is out of sync — restart the server to auto-repair.";
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", userMessage);
        body.put("details", details);

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntime(RuntimeException ex) {
        log.error("[Runtime] Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred."));
    }
}