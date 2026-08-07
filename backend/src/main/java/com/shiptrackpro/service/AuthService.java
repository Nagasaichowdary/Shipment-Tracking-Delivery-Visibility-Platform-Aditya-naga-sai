package com.shiptrackpro.service;

import com.shiptrackpro.dto.AuthResponse;
import com.shiptrackpro.dto.LoginRequest;
import com.shiptrackpro.dto.RegisterRequest;
import com.shiptrackpro.dto.ForgotPasswordRequest;
import com.shiptrackpro.dto.VerifyOtpRequest;
import com.shiptrackpro.dto.ResetPasswordRequest;
import com.shiptrackpro.dto.SendOtpRequest;
import com.shiptrackpro.dto.VerifyEmailOtpRequest;
import java.util.Map;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse googleLogin(String idToken);

    Map<String, String> sendRegistrationOtp(SendOtpRequest request);

    Map<String, String> verifyRegistrationOtp(VerifyEmailOtpRequest request);

    Map<String, String> forgotPassword(ForgotPasswordRequest request);

    Map<String, String> verifyOtp(VerifyOtpRequest request);

    Map<String, String> resetPassword(ResetPasswordRequest request);

    // ── Delivery OTP ─────────────────────────────────────────────────────────

    /**
     * Generates and emails a 6-digit delivery OTP to the registered customer's
     * email address ({@code shipment.receiverUser.email}).
     *
     * @param shipmentId  ID of the shipment being delivered
     * @param driverEmail authenticated driver's email (from JWT)
     * @return map containing {@code success}, {@code maskedEmail}, {@code expiresAt} epoch-ms
     */
    Map<String, String> generateDeliveryOtp(Long shipmentId, String driverEmail);

    /**
     * Verifies the OTP submitted by the driver against the stored delivery OTP.
     * On success, records the shipment as OTP-verified (enables confirmDelivery).
     *
     * @param shipmentId  ID of the shipment
     * @param driverEmail authenticated driver's email (from JWT)
     * @param otp         6-digit OTP entered by the driver
     * @return map containing {@code success}, optional {@code message} and {@code attemptsRemaining}
     */
    Map<String, String> verifyDeliveryOtp(Long shipmentId, String driverEmail, String otp);

    /**
     * Returns {@code true} if the delivery OTP for this shipment has been
     * successfully verified. Used by {@code ShipmentServiceImpl.confirmDelivery()}
     * to enforce the backend OTP gate.
     *
     * @param shipmentId ID of the shipment
     */
    boolean isDeliveryOtpVerified(Long shipmentId);

    /**
     * Removes the shipment from the verified set after delivery is confirmed,
     * preventing any replayed confirmDelivery calls from re-using the verification.
     *
     * @param shipmentId ID of the shipment
     */
    void clearDeliveryOtpVerification(Long shipmentId);
}