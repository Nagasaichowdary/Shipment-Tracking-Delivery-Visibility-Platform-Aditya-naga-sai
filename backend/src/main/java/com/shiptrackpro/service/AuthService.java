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
}