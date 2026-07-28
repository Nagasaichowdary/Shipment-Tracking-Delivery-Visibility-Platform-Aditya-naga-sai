package com.shiptrackpro.exception;

/**
 * Thrown when a requested resource (shipment, user, etc.) cannot be found
 * by its identifier.
 *
 * <p>Unchecked (extends {@code RuntimeException}) so it doesn't force a
 * {@code throws} clause through the service interface — callers that care
 * (e.g. a future {@code @RestControllerAdvice}) can catch it explicitly to
 * translate it into a 404 response.</p>
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

}
