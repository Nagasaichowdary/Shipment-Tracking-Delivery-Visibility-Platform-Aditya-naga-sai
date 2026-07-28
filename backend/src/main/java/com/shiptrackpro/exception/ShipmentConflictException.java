package com.shiptrackpro.exception;

/**
 * Thrown when a driver attempts to accept a shipment that has already been
 * assigned to another driver (race-condition / duplicate acceptance).
 * Mapped to HTTP 409 Conflict by {@link GlobalExceptionHandler}.
 */
public class ShipmentConflictException extends RuntimeException {

    public ShipmentConflictException(String message) {
        super(message);
    }
}
