package com.shiptrackpro.dto;

/**
 * DTO for the "verify registration OTP" endpoint.
 * Carries the email address and the 6-digit OTP entered by the user.
 */
public class VerifyEmailOtpRequest {

    private String email;
    private String otp;

    public VerifyEmailOtpRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}
