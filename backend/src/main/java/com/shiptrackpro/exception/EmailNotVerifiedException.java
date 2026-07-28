package com.shiptrackpro.exception;

/**
 * Thrown when a user attempts to log in but their email address
 * has not yet been verified via OTP.
 */
public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
