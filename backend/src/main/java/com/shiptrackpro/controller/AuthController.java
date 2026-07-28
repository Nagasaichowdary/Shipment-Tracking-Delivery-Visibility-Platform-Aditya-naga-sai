package com.shiptrackpro.controller;

import com.shiptrackpro.dto.*;
import com.shiptrackpro.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * AuthController — handles all /api/auth/** endpoints.
 *
 * Registration OTP Flow:
 *   POST /api/auth/send-registration-otp   → send OTP to email
 *   POST /api/auth/verify-registration-otp → validate OTP
 *   POST /api/auth/register                → create account (OTP-verified emails only)
 *
 * Login:
 *   POST /api/auth/login
 *
 * Forgot-Password Flow:
 *   POST /api/auth/forgot-password
 *   POST /api/auth/verify-otp
 *   POST /api/auth/reset-password
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    // ── Registration OTP ──────────────────────────────────────

    @PostMapping("/send-registration-otp")
    public ResponseEntity<?> sendRegistrationOtp(
            @RequestBody SendOtpRequest request) {
        return ResponseEntity.ok(authService.sendRegistrationOtp(request));
    }

    @PostMapping("/verify-registration-otp")
    public ResponseEntity<?> verifyRegistrationOtp(
            @RequestBody VerifyEmailOtpRequest request) {
        return ResponseEntity.ok(authService.verifyRegistrationOtp(request));
    }

    // ── Registration ──────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    // ── Login ─────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request) {
        System.out.println("========== LOGIN API HIT ==========");
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @RequestBody Map<String, String> request) {
        System.out.println("========== GOOGLE LOGIN API HIT ==========");
        return ResponseEntity.ok(authService.googleLogin(request.get("token")));
    }

    // ── Forgot-Password Flow ──────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }
}