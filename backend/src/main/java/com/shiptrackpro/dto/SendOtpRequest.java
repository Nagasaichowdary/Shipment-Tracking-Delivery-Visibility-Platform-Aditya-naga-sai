package com.shiptrackpro.dto;

/**
 * DTO for the "send registration OTP" endpoint.
 * Carries only the email address to which the OTP will be delivered.
 */
public class SendOtpRequest {

    private String email;

    public SendOtpRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
