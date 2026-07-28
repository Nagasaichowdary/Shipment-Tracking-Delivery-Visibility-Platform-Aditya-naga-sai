package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.*;
import com.shiptrackpro.entity.BusinessClient;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.Role;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.exception.EmailAlreadyExistsException;
import com.shiptrackpro.exception.EmailNotVerifiedException;
import com.shiptrackpro.exception.InvalidCredentialsException;
import com.shiptrackpro.exception.PendingApprovalException;
import com.shiptrackpro.exception.RegistrationRejectedException;
import com.shiptrackpro.repository.BusinessClientRepository;
import com.shiptrackpro.repository.RoleRepository;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.security.JwtService;
import com.shiptrackpro.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import jakarta.mail.internet.MimeMessage;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AuthServiceImpl
 * ────────────────────────────────────────────────────────────────
 * Handles all authentication operations including:
 *  - Registration OTP sending & verification (email-first flow)
 *  - User registration (only after email OTP verified)
 *  - Login (blocks EMAIL_NOT_VERIFIED accounts)
 *  - Forgot-password OTP flow
 */
@Service
public class AuthServiceImpl implements AuthService {

    // ── Repositories & Infrastructure ──────────────────────────

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BusinessClientRepository businessClientRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private JwtService jwtService;

    /** Injected only when spring-boot-starter-mail is on the classpath
     *  and spring.mail.host is configured. Falls back to console log if null. */
    @Autowired(required = false)
    private JavaMailSender mailSender;

    /**
     * The Gmail address used for SMTP authentication.
     * IMPORTANT: Gmail SMTP requires the From address to EXACTLY match this value.
     */
    @Value("${spring.mail.username:}")
    private String mailFromAddress;

    // ── In-memory OTP stores ────────────────────────────────────

    /** Registration OTPs keyed by normalised email */
    private final Map<String, OtpEntry> registrationOtpStore = new ConcurrentHashMap<>();

    /** Emails that have passed OTP verification and may now be registered */
    private final Set<String> verifiedEmails =
            Collections.synchronizedSet(new HashSet<>());

    /** Forgot-password OTPs keyed by normalised email */
    private final Map<String, String> forgotPasswordOtpStore = new HashMap<>();

    // ── Inner helper ────────────────────────────────────────────

    private static class OtpEntry {
        final String otp;
        final Instant expiresAt;

        OtpEntry(String otp) {
            this.otp = otp;
            this.expiresAt = Instant.now().plusSeconds(300); // 5 minutes
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    // ── STEP 1 — Send Registration OTP ─────────────────────────

    @Override
    public Map<String, String> sendRegistrationOtp(SendOtpRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        if (email.isBlank()) {
            throw new RuntimeException("Email address is required.");
        }

        // Block duplicate registrations
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(
                    "An account with this email already exists. Please log in.");
        }

        // Generate cryptographically secure 6-digit OTP
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        OtpEntry entry = new OtpEntry(otp);
        registrationOtpStore.put(email, entry);

        // Attempt to deliver the OTP via email; fall back to console
        sendOtpEmail(email, otp);

        // Return masked email + expiry epoch-ms so the frontend can
        // calculate remaining time from the real server timestamp
        // (fixes browser tab-switch timer freeze caused by setInterval throttling)
        String maskedEmail = maskEmail(email);

        System.out.println("[ShipTrackPro] Registration OTP for " + email + " \u2192 " + otp);

        return Map.of(
                "success",     "true",
                "maskedEmail", maskedEmail,
                "message",     "OTP sent to your email address.",
                "expiresAt",   String.valueOf(entry.expiresAt.toEpochMilli())
        );
    }

    // ── STEP 2 — Verify Registration OTP ───────────────────────

    @Override
    public Map<String, String> verifyRegistrationOtp(VerifyEmailOtpRequest request) {

        String email = request.getEmail().trim().toLowerCase();
        String otp   = request.getOtp() == null ? "" : request.getOtp().trim();

        OtpEntry entry = registrationOtpStore.get(email);

        if (entry == null) {
            throw new RuntimeException(
                    "No OTP found for this email. Please request a new one.");
        }

        if (entry.isExpired()) {
            registrationOtpStore.remove(email);
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        if (!entry.otp.equals(otp)) {
            throw new RuntimeException("Invalid OTP. Please try again.");
        }

        // Mark as verified; remove used OTP
        verifiedEmails.add(email);
        registrationOtpStore.remove(email);

        return Map.of(
                "success", "true",
                "message", "Email verified successfully."
        );
    }

    // ── STEP 3 — Register (only after OTP verified) ─────────────

    @Override
    public AuthResponse register(RegisterRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        // Guard: email must be OTP-verified before account creation
        if (!verifiedEmails.contains(email)) {
            throw new RuntimeException(
                    "Email not verified. Please complete OTP verification first.");
        }

        // Guard: no duplicates
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already exists.");
        }

        // Guard: unique phone (only when a non-blank phone is provided)
        String phoneValue = (request.getPhone() == null || request.getPhone().isBlank())
                ? null : request.getPhone().trim();
        if (phoneValue != null && userRepository.existsByPhone(phoneValue)) {
            throw new EmailAlreadyExistsException("Phone number already registered.");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Invalid role selected."));

        // Build user entity
        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(email);
        user.setPhone(phoneValue);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setActive(true);

        // Customers are auto-approved; all others require admin review
        if ("CUSTOMER".equalsIgnoreCase(role.getRoleName())) {
            user.setRegistrationStatus(RegistrationStatus.APPROVED);
        } else {
            user.setRegistrationStatus(RegistrationStatus.PENDING);
        }

        User savedUser = userRepository.save(user);

        // Business-client extra data
        if ("BUSINESS_CLIENT".equalsIgnoreCase(role.getRoleName())) {
            if (request.getCompanyName() == null || request.getCompanyName().isBlank()) {
                throw new RuntimeException("Company name is required.");
            }
            BusinessClient bc = new BusinessClient();
            bc.setUser(savedUser);
            bc.setCompanyName(request.getCompanyName());
            bc.setGstNumber(request.getGstNumber());
            bc.setBusinessType(request.getBusinessType());
            // website field stores the business website URL
            bc.setWebsite(request.getWebsite());
            businessClientRepository.save(bc);
        }

        // Consume the verified-email token
        verifiedEmails.remove(email);

        String successMsg = (savedUser.getRegistrationStatus() == RegistrationStatus.APPROVED)
                ? "Registration successful. You can login now."
                : "Registration request submitted. Please wait for Admin approval.";

        return new AuthResponse(
                null,
                savedUser.getRole().getRoleName(),
                savedUser.getFirstName(),
                savedUser.getLastName(),
                savedUser.getEmail(),
                successMsg
        );
    }

    // ── Login ───────────────────────────────────────────────────

    @Override
    public AuthResponse login(LoginRequest request) {

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() ->
                        new InvalidCredentialsException("Invalid email or password."));

        // Block unverified accounts
        if (user.getRegistrationStatus() == RegistrationStatus.EMAIL_NOT_VERIFIED) {
            throw new EmailNotVerifiedException(
                    "Your email address has not been verified. " +
                    "Please complete OTP verification to activate your account.");
        }

        if (user.getRegistrationStatus() == RegistrationStatus.PENDING) {
            throw new PendingApprovalException(
                    "Your account is waiting for Admin approval.");
        }

        if (user.getRegistrationStatus() == RegistrationStatus.REJECTED) {
            throw new RegistrationRejectedException(
                    "Your registration request has been rejected.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        normalizedEmail,
                        request.getPassword()
                )
        );

        String token = jwtService.generateToken(user);

        return new AuthResponse(
                token,
                user.getRole().getRoleName(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                "Login successful."
        );
    }

    @Override
    public AuthResponse googleLogin(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList("261827118198-ll9ijstuaimrr9hd845tp9ibikr7cpb2.apps.googleusercontent.com"))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new InvalidCredentialsException("Invalid Google ID token.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            if (email == null) {
                throw new InvalidCredentialsException("Email not found in Google token.");
            }

            String normalizedEmail = email.trim().toLowerCase();

            User user = userRepository.findByEmail(normalizedEmail)
                    .orElseThrow(() -> new InvalidCredentialsException("No account is associated with this Google account. Please register first."));

            // Apply exactly the same business rules as standard login
            if (user.getRegistrationStatus() == RegistrationStatus.EMAIL_NOT_VERIFIED) {
                throw new EmailNotVerifiedException(
                        "Your email address has not been verified. " +
                        "Please complete OTP verification to activate your account.");
            }

            if (user.getRegistrationStatus() == RegistrationStatus.PENDING) {
                throw new PendingApprovalException(
                        "Your account is waiting for Admin approval.");
            }

            if (user.getRegistrationStatus() == RegistrationStatus.REJECTED) {
                throw new RegistrationRejectedException(
                        "Your registration request has been rejected.");
            }

            String token = jwtService.generateToken(user);

            return new AuthResponse(
                    token,
                    user.getRole().getRoleName(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getEmail(),
                    "Google Login successful."
            );

        } catch (Exception e) {
            throw new InvalidCredentialsException("Google authentication failed: " + e.getMessage());
        }
    }

    // ── Forgot-Password OTP Flow ────────────────────────────────

    @Override
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("No account found with this email address."));

        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        forgotPasswordOtpStore.put(email, otp);

        sendOtpEmail(email, otp);
        System.out.println("[ShipTrackPro] Forgot-password OTP for " + email + " → " + otp);

        return Map.of(
                "success",     "true",
                "maskedEmail", maskEmail(email),
                "message",     "OTP sent successfully."
        );
    }

    @Override
    public Map<String, String> verifyOtp(VerifyOtpRequest request) {

        String email = request.getEmail().trim().toLowerCase();
        String storedOtp = forgotPasswordOtpStore.get(email);

        if (storedOtp == null || !storedOtp.equals(request.getOtp())) {
            throw new RuntimeException("Invalid or expired OTP. Please try again.");
        }

        return Map.of("success", "true", "message", "OTP verified successfully.");
    }

    @Override
    public Map<String, String> resetPassword(ResetPasswordRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User account not found."));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        forgotPasswordOtpStore.remove(email);

        return Map.of("success", "true", "message", "Password reset successfully.");
    }

    // ── Private Helpers ─────────────────────────────────────────

    /**
     * Sends OTP via Gmail SMTP if mailSender is configured,
     * otherwise prints to console as a safe development fallback.
     */
    private void sendOtpEmail(String toEmail, String otp) {
        boolean mailConfigured = mailSender != null
                && mailFromAddress != null
                && !mailFromAddress.isBlank()
                && !mailFromAddress.equals("YOUR_GMAIL_ADDRESS@gmail.com");

        if (!mailConfigured) {
            System.out.println("=========================================");
            System.out.println("[ShipTrackPro] Mail not configured — console fallback.");
            System.out.println("Email : " + toEmail);
            System.out.println("OTP   : " + otp);
            System.out.println("=========================================");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            // Gmail SMTP: from address MUST match the authenticated account
            helper.setFrom(mailFromAddress, "Shipment Tracker Pro");
            helper.setTo(toEmail);
            helper.setSubject("Your Shipment Tracker Pro Verification Code — " + otp);
            helper.setText(buildEmailTemplate(otp), true);
            mailSender.send(message);
            System.out.println("[ShipTrackPro] OTP email dispatched to: " + toEmail);
        } catch (Exception e) {
            // Fallback — do NOT block the user; log OTP to console
            System.out.println("=========================================");
            System.out.println("[ShipTrackPro] Email delivery failed: " + e.getMessage());
            System.out.println("Email : " + toEmail);
            System.out.println("OTP   : " + otp);
            System.out.println("=========================================");
        }
    }

    /** Returns a masked version of the email for UI display, e.g. adi***@gmail.com */
    private String maskEmail(String email) {
        String[] parts = email.split("@");
        int visibleChars = Math.min(3, parts[0].length());
        return parts[0].substring(0, visibleChars) + "***@" + parts[1];
    }

    /** Builds a professional HTML email template for OTP delivery */
    private String buildEmailTemplate(String otp) {
        return "<!DOCTYPE html>" +
               "<html lang='en'>" +
               "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>" +
               "<body style='margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;'>" +
               "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:40px 0;'>" +
               "  <tr><td align='center'>" +
               "    <table width='560' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);'>" +
               // Header
               "      <tr><td style='background:linear-gradient(135deg,#4f46e5 0%,#3730a3 100%);padding:36px 40px;text-align:center;'>" +
               "        <div style='display:inline-flex;align-items:center;gap:10px;'>" +
               "          <div style='width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;'>📦</div>" +
               "          <span style='color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;'>Shipment Tracker Pro</span>" +
               "        </div>" +
               "        <p style='color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:13px;'>Enterprise Logistics Platform</p>" +
               "      </td></tr>" +
               // Body
               "      <tr><td style='padding:40px 40px 32px;'>" +
               "        <h1 style='margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;'>Verify Your Email Address</h1>" +
               "        <p style='margin:0 0 32px;font-size:14px;color:#64748b;line-height:1.6;'>Use the code below to complete your Shipment Tracker Pro registration. This code expires in <strong>5 minutes</strong>.</p>" +
               // OTP Box
               "        <div style='background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;'>" +
               "          <p style='margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;'>Your Verification Code</p>" +
               "          <div style='font-size:42px;font-weight:800;letter-spacing:0.25em;color:#4f46e5;font-family:monospace;'>" + otp + "</div>" +
               "          <p style='margin:12px 0 0;font-size:12px;color:#94a3b8;'>Expires in 5 minutes</p>" +
               "        </div>" +
               // Security notice
               "        <div style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:28px;'>" +
               "          <p style='margin:0;font-size:13px;color:#991b1b;font-weight:600;'>⚠️ Security Notice</p>" +
               "          <p style='margin:6px 0 0;font-size:13px;color:#b91c1c;line-height:1.5;'>Never share this OTP with anyone. Shipment Tracker Pro will never ask for your OTP via phone, email, or chat.</p>" +
               "        </div>" +
               "        <p style='font-size:13px;color:#64748b;line-height:1.6;'>If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.</p>" +
               "      </td></tr>" +
               // Footer
               "      <tr><td style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;'>" +
               "        <p style='margin:0;font-size:12px;color:#94a3b8;'>© 2025 Shipment Tracker Pro · Enterprise Logistics Platform</p>" +
               "        <p style='margin:4px 0 0;font-size:12px;color:#94a3b8;'>This is an automated message — please do not reply.</p>" +
               "      </td></tr>" +
               "    </table>" +
               "  </td></tr>" +
               "</table>" +
               "</body></html>";
    }
}