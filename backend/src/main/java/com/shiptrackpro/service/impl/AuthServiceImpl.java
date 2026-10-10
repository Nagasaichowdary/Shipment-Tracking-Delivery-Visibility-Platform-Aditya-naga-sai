package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.*;
import com.shiptrackpro.entity.BusinessClient;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.Role;
import com.shiptrackpro.entity.Shipment;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.exception.EmailAlreadyExistsException;
import com.shiptrackpro.exception.EmailNotVerifiedException;
import com.shiptrackpro.exception.InvalidCredentialsException;
import com.shiptrackpro.exception.PendingApprovalException;
import com.shiptrackpro.exception.RegistrationRejectedException;
import com.shiptrackpro.repository.BusinessClientRepository;
import com.shiptrackpro.repository.RoleRepository;
import com.shiptrackpro.repository.ShipmentRepository;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.enums.ShipmentStatus;
import com.shiptrackpro.security.JwtService;
import com.shiptrackpro.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

// jakarta.mail removed — OTP email now sent via Brevo HTTPS API
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
    @Autowired private ShipmentRepository shipmentRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private JwtService jwtService;

    /** Brevo transactional email API key loaded from BREVO_API_KEY.
     *  NEVER log this value. */
    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    /** Verified sender address registered in Brevo (matches BREVO_SENDER_EMAIL). */
    @Value("${brevo.sender-email:}")
    private String brevoSenderEmail;

    /** Brevo transactional email REST endpoint (HTTPS — no SMTP port needed). */
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    // ── In-memory OTP stores ────────────────────────────────────

    /** Registration OTPs keyed by normalised email */
    private final Map<String, OtpEntry> registrationOtpStore = new ConcurrentHashMap<>();

    /** Emails that have passed OTP verification and may now be registered */
    private final Set<String> verifiedEmails =
            Collections.synchronizedSet(new HashSet<>());

    /** Forgot-password OTPs keyed by normalised email — uses OtpEntry for 120-second server-side expiry */
    private final Map<String, OtpEntry> forgotPasswordOtpStore = new HashMap<>();

    /**
     * Delivery OTPs keyed by shipmentId.
     * Each entry tracks: the OTP value, expiry, attempt count, and resend count.
     */
    private final Map<Long, DeliveryOtpEntry> deliveryOtpStore = new ConcurrentHashMap<>();

    /**
     * Shipment IDs whose delivery OTP has been successfully verified.
     * ShipmentServiceImpl.confirmDelivery() checks this set before allowing
     * the shipment to transition to DELIVERED. This is the backend security gate.
     */
    private final Set<Long> deliveryVerifiedSet = ConcurrentHashMap.newKeySet();

    // ── Inner helpers ───────────────────────────────────────────

    /** Registration OTP: 2-minute expiry, no attempt tracking needed. */
    private static class OtpEntry {
        final String otp;
        final Instant expiresAt;

        OtpEntry(String otp) {
            this.otp = otp;
            this.expiresAt = Instant.now().plusSeconds(120); // 2 minutes
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    /**
     * Delivery OTP entry: 2-minute expiry, tracks verification attempts and
     * resend attempts to enforce the security limits.
     */
    private static class DeliveryOtpEntry {
        final String otp;
        final Instant expiresAt;
        int attemptCount;  // max 5 — incremented on each wrong guess
        int resendCount;   // max 3 — incremented on each new OTP generated

        DeliveryOtpEntry(String otp, int resendCount) {
            this.otp         = otp;
            this.expiresAt   = Instant.now().plusSeconds(120); // 2 minutes
            this.attemptCount = 0;
            this.resendCount  = resendCount;
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

        // Send OTP via Brevo HTTPS API; roll back the store entry if delivery fails
        // so an undelivered OTP cannot be verified.
        try {
            sendOtpEmail(email, otp, "REGISTRATION");
        } catch (RuntimeException ex) {
            registrationOtpStore.remove(email);
            throw ex;
        }

        // Return masked email + expiry epoch-ms so the frontend can
        // calculate remaining time from the real server timestamp
        // (fixes browser tab-switch timer freeze caused by setInterval throttling)
        String maskedEmail = maskEmail(email);

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
        OtpEntry entry = new OtpEntry(otp);          // 120-second server-side expiry
        // Preserve the previous OTP entry so we can restore it if email delivery fails.
        // A resend that fails should not invalidate a previously sent (and still valid) OTP.
        OtpEntry previousFpEntry = forgotPasswordOtpStore.get(email);
        forgotPasswordOtpStore.put(email, entry);

        try {
            sendOtpEmail(email, otp, "FORGOT-PASSWORD");
        } catch (RuntimeException ex) {
            // Restore the previous state: reinstate the old OTP if one existed,
            // or remove the entry entirely if this was the first request.
            if (previousFpEntry != null) {
                forgotPasswordOtpStore.put(email, previousFpEntry);
            } else {
                forgotPasswordOtpStore.remove(email);
            }
            throw ex;
        }

        return Map.of(
                "success",     "true",
                "maskedEmail", maskEmail(email),
                "message",     "OTP sent successfully.",
                "expiresAt",   String.valueOf(entry.expiresAt.toEpochMilli())
        );
    }

    @Override
    public Map<String, String> verifyOtp(VerifyOtpRequest request) {

        String email = request.getEmail().trim().toLowerCase();
        OtpEntry entry = forgotPasswordOtpStore.get(email);

        if (entry == null) {
            throw new RuntimeException("No OTP found for this email. Please request a new one.");
        }

        if (entry.isExpired()) {
            forgotPasswordOtpStore.remove(email);
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        if (!entry.otp.equals(request.getOtp())) {
            throw new RuntimeException("Invalid OTP. Please try again.");
        }

        // OTP is correct — leave it in store so resetPassword() can clear it
        return Map.of("success", "true", "message", "OTP verified successfully.");
    }

    @Override
    public Map<String, String> resetPassword(ResetPasswordRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User account not found."));

        // Re-validate the OTP entry has not expired between verifyOtp and resetPassword
        OtpEntry entry = forgotPasswordOtpStore.get(email);
        if (entry == null || entry.isExpired()) {
            forgotPasswordOtpStore.remove(email);
            throw new RuntimeException("OTP session has expired. Please restart the password reset flow.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        forgotPasswordOtpStore.remove(email);          // consume the OTP

        return Map.of("success", "true", "message", "Password reset successfully.");
    }

    // ── Delivery OTP Flow ────────────────────────────────────────

    @Override
    public Map<String, String> generateDeliveryOtp(Long shipmentId, String driverEmail) {

        // 1. Load shipment and verify driver assignment
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found with id: " + shipmentId));

        validateDriverAssignment(shipment, driverEmail);

        // 2. Shipment must be OUT_FOR_DELIVERY before OTP can be generated
        if (shipment.getShipmentStatus() != ShipmentStatus.OUT_FOR_DELIVERY) {
            throw new RuntimeException(
                    "Delivery OTP can only be generated when the shipment is OUT_FOR_DELIVERY. " +
                    "Current status: " + shipment.getShipmentStatus());
        }

        // 3. Enforce resend limit — check existing entry for resend count
        DeliveryOtpEntry existing = deliveryOtpStore.get(shipmentId);
        int currentResendCount = (existing != null) ? existing.resendCount : 0;
        if (currentResendCount >= 3) {
            throw new RuntimeException(
                    "Maximum OTP resend limit (3) reached for this shipment. " +
                    "Please contact support if the customer did not receive the OTP.");
        }

        // 4. Resolve delivery email — registered customer takes priority over guest email.
        //    The driver NEVER supplies or sees the email address; the backend resolves it
        //    entirely from the database so drivers cannot manipulate the destination.
        //
        //    Path A (Registered customer): receiverUser was linked during shipment creation.
        //    Path B (Guest customer):      guestEmail was collected from the operator form.
        //    Path C (Neither):             OTP cannot be sent — operator must fix the shipment.
        final String customerEmail;
        User receiverUser = shipment.getReceiverUser();
        if (receiverUser != null && receiverUser.getEmail() != null
                && !receiverUser.getEmail().isBlank()) {
            // Path A — registered customer
            customerEmail = receiverUser.getEmail();
        } else if (shipment.getGuestEmail() != null && !shipment.getGuestEmail().isBlank()) {
            // Path B — guest customer (email stored at shipment creation time)
            customerEmail = shipment.getGuestEmail();
        } else {
            // Path C — no email available; OTP impossible
            throw new RuntimeException(
                    "No email address is associated with this shipment. " +
                    "OTP-based delivery verification cannot be performed. " +
                    "Please contact the logistics operator to update the shipment.");
        }

        // 5. Generate a cryptographically secure 6-digit OTP
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        // 6. Store the new OTP, overwriting any previous entry.
        //    The previous entry (captured above as `existing`) is retained in a local
        //    variable so the store can be restored if email delivery fails.
        int nextResendCount = currentResendCount + 1;
        DeliveryOtpEntry entry = new DeliveryOtpEntry(otp, nextResendCount);
        deliveryOtpStore.put(shipmentId, entry);

        // 7. Snapshot whether the shipment was already verified before this resend
        //    so the verified status can be accurately restored if email delivery fails.
        boolean wasVerified = deliveryVerifiedSet.contains(shipmentId);

        // 8. Clear the verified flag - a resend requires OTP verification again.
        //    On email failure this is rolled back below.
        deliveryVerifiedSet.remove(shipmentId);

        // 9. Send OTP email to customer; roll back both the OTP store and the
        //    verified-set if delivery fails so no undelivered OTP can be used.
        try {
            sendDeliveryOtpEmail(customerEmail, otp);
        } catch (RuntimeException ex) {
            // Restore previous OTP entry (null means there was none before this call).
            if (existing != null) {
                deliveryOtpStore.put(shipmentId, existing);
            } else {
                deliveryOtpStore.remove(shipmentId);
            }
            // Restore verified status precisely: if the shipment was already verified
            // before this resend attempt, that verification remains valid because the
            // new OTP was never delivered. If it was not verified, leave it unverified.
            if (wasVerified) {
                deliveryVerifiedSet.add(shipmentId);
            }
            throw ex;
        }

        return Map.of(
                "success",          "true",
                "maskedEmail",      maskEmail(customerEmail),
                "expiresAt",        String.valueOf(entry.expiresAt.toEpochMilli()),
                "message",          "OTP sent to the registered customer.",
                "resendsRemaining", String.valueOf(3 - nextResendCount)
        );
    }

    @Override
    public Map<String, String> verifyDeliveryOtp(Long shipmentId, String driverEmail, String otp) {

        // 1. Load shipment and verify driver assignment
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Shipment not found with id: " + shipmentId));

        validateDriverAssignment(shipment, driverEmail);

        // 2. Retrieve OTP entry
        DeliveryOtpEntry entry = deliveryOtpStore.get(shipmentId);
        if (entry == null) {
            return Map.of(
                    "success", "false",
                    "message", "No OTP found for this shipment. Please generate a new OTP.",
                    "attemptsRemaining", "0"
            );
        }

        // 3. Check expiry
        if (entry.isExpired()) {
            deliveryOtpStore.remove(shipmentId);
            return Map.of(
                    "success", "false",
                    "message", "OTP has expired (120 seconds). Please request a new one.",
                    "attemptsRemaining", "0"
            );
        }

        // 4. Check attempt limit
        if (entry.attemptCount >= 5) {
            deliveryOtpStore.remove(shipmentId);
            return Map.of(
                    "success", "false",
                    "message", "Maximum verification attempts (5) exceeded. Please request a new OTP.",
                    "attemptsRemaining", "0"
            );
        }

        // 5. Verify OTP value
        if (!entry.otp.equals(otp)) {
            entry.attemptCount++;
            int remaining = 5 - entry.attemptCount;
            return Map.of(
                    "success", "false",
                    "message", "Incorrect OTP. Please try again.",
                    "attemptsRemaining", String.valueOf(remaining)
            );
        }

        // 6. OTP is correct — record verification and clear OTP
        deliveryVerifiedSet.add(shipmentId);
        deliveryOtpStore.remove(shipmentId);

        System.out.println("[ShipTrackPro] Delivery OTP verified for shipment " + shipmentId +
                " by driver " + driverEmail);

        return Map.of(
                "success", "true",
                "message", "Customer identity verified. You may now complete the delivery."
        );
    }

    @Override
    public boolean isDeliveryOtpVerified(Long shipmentId) {
        return deliveryVerifiedSet.contains(shipmentId);
    }

    @Override
    public void clearDeliveryOtpVerification(Long shipmentId) {
        deliveryVerifiedSet.remove(shipmentId);
        // Also clear any pending OTP (e.g., if delivery confirmed without further resends)
        deliveryOtpStore.remove(shipmentId);
    }

    /**
     * Validates that the authenticated driver is the one assigned to the shipment.
     * Throws RuntimeException if the assignment does not match.
     */
    private void validateDriverAssignment(Shipment shipment, String driverEmail) {
        User assignedDriver = shipment.getAssignedDriver();
        if (assignedDriver == null || !assignedDriver.getEmail().equalsIgnoreCase(driverEmail)) {
            throw new RuntimeException(
                    "You are not the assigned driver for shipment " + shipment.getTrackingNumber() + ".");
        }
    }

    // ── Private Helpers ─────────────────────────────────────────

    /**
     * Sends an OTP email via the Brevo HTTPS API.
     * Supported callers: "REGISTRATION", "FORGOT-PASSWORD".
     * OTP generation, storage, expiry, verification, and limits are unchanged.
     * Throws RuntimeException if Brevo is not configured or delivery fails
     * so the endpoint returns an error instead of silently claiming success.
     */
    private void sendOtpEmail(String toEmail, String otp, String caller) {
        if (brevoApiKey == null || brevoApiKey.isBlank()
                || brevoSenderEmail == null || brevoSenderEmail.isBlank()) {
            throw new RuntimeException(
                    "Email delivery is not configured. Please contact support.");
        }

        String subject;
        String htmlBody;
        switch (caller) {
            case "FORGOT-PASSWORD" -> {
                subject  = "Shipment Tracker Pro \u2014 Password Reset Code";
                htmlBody = buildForgotPasswordEmailTemplate(otp);
            }
            default -> {
                subject  = "Your Shipment Tracker Pro Verification Code";
                htmlBody = buildEmailTemplate(otp);
            }
        }

        // sendViaBrevo throws RuntimeException on any delivery failure.
        sendViaBrevo(toEmail, subject, htmlBody, caller);
    }

    /**
     * Sends a delivery OTP email to the customer via the Brevo HTTPS API.
     * OTP generation, storage, expiry, verification, and resend limits are UNCHANGED.
     * Throws RuntimeException if Brevo is not configured or delivery fails.
     */
    private void sendDeliveryOtpEmail(String toEmail, String otp) {
        if (brevoApiKey == null || brevoApiKey.isBlank()
                || brevoSenderEmail == null || brevoSenderEmail.isBlank()) {
            throw new RuntimeException(
                    "Email delivery is not configured. Please contact support.");
        }

        // sendViaBrevo throws RuntimeException on any delivery failure.
        sendViaBrevo(toEmail,
                "Shipment Tracker Pro \u2014 Your Delivery Verification Code",
                buildDeliveryOtpEmailTemplate(otp),
                "DELIVERY");
    }

    /**
     * Sends a transactional email through the Brevo HTTPS API.
     * Uses Spring RestClient (Spring Boot 3.2+, no SMTP port required).
     * JSON is serialized via Jackson ObjectMapper — all HTML special characters
     * (quotes, backslashes, newlines) are handled correctly.
     * The API key is transmitted in an HTTP header and is NEVER logged.
     *
     * @param toEmail   recipient email address
     * @param subject   email subject line
     * @param htmlBody  full HTML email body built by the template helpers
     * @param caller    label used only in safe diagnostic log messages
     * @throws RuntimeException on serialisation failure, 4xx, 5xx, or network error
     */
    private void sendViaBrevo(String toEmail, String subject, String htmlBody, String caller) {
        String json;
        try {
            ObjectMapper mapper = new ObjectMapper();
            json = mapper.writeValueAsString(Map.of(
                    "sender",      Map.of("name", "ShipTrack Pro", "email", brevoSenderEmail),
                    "to",          List.of(Map.of("email", toEmail)),
                    "subject",     subject,
                    "htmlContent", htmlBody
            ));
        } catch (JsonProcessingException ex) {
            // Cannot occur for a simple Map<String, Object> — treat as fatal.
            throw new RuntimeException("Failed to prepare email payload. Please try again.");
        }

        try {
            RestClient.builder()
                    .baseUrl(BREVO_API_URL)
                    .defaultHeader("accept",       "application/json")
                    .defaultHeader("api-key",      brevoApiKey)
                    .defaultHeader("content-type", MediaType.APPLICATION_JSON_VALUE)
                    .build()
                    .post()
                    .body(json)
                    .retrieve()
                    .body(String.class);

            System.out.println("[ShipTrackPro] OTP email sent via Brevo [" + caller + "]");

        } catch (HttpClientErrorException ex) {
            // 4xx — wrong API key, unverified sender, or account issue.
            System.out.println("[ShipTrackPro] Brevo 4xx [" + caller + "]: HTTP " + ex.getStatusCode());
            throw new RuntimeException(
                    "Email delivery failed (provider configuration error). Please try again later.");
        } catch (HttpServerErrorException ex) {
            // 5xx — Brevo server-side error.
            System.out.println("[ShipTrackPro] Brevo 5xx [" + caller + "]: HTTP " + ex.getStatusCode());
            throw new RuntimeException(
                    "Email delivery failed (provider temporarily unavailable). Please try again later.");
        } catch (Exception ex) {
            // Network timeout, connection refused, or other runtime error.
            System.out.println("[ShipTrackPro] Brevo unreachable [" + caller + "]: " + ex.getClass().getSimpleName());
            throw new RuntimeException(
                    "Email delivery failed (network error). Please try again later.");
        }
    }

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
               "        <p style='margin:0 0 32px;font-size:14px;color:#64748b;line-height:1.6;'>Use the code below to complete your Shipment Tracker Pro registration. This code expires in <strong>2 minutes</strong>.</p>" +
               // OTP Box
               "        <div style='background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;'>" +
               "          <p style='margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;'>Your Verification Code</p>" +
               "          <div style='font-size:42px;font-weight:800;letter-spacing:0.25em;color:#4f46e5;font-family:monospace;'>" + otp + "</div>" +
               "          <p style='margin:12px 0 0;font-size:12px;color:#94a3b8;'>Expires in 2 minutes</p>" +
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
               "        <p style='margin:0;font-size:12px;color:#94a3b8;'>© 2026 Shipment Tracker Pro · Enterprise Logistics Platform</p>" +
               "        <p style='margin:4px 0 0;font-size:12px;color:#94a3b8;'>This is an automated message — please do not reply.</p>" +
               "      </td></tr>" +
               "    </table>" +
               "  </td></tr>" +
               "</table>" +
               "</body></html>";
    }
    private String buildForgotPasswordEmailTemplate(String otp) {

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
               "        <h1 style='margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;'>Reset Your Password</h1>" +
               "        <p style='margin:0 0 32px;font-size:14px;color:#64748b;line-height:1.6;'>Use the code below to reset your password. This code expires in <strong>120 seconds</strong>.</p>" +
               // OTP Box
               "        <div style='background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;'>" +
               "          <p style='margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;'>Password Reset Code</p>" +
               "          <div style='font-size:42px;font-weight:800;letter-spacing:0.25em;color:#4f46e5;font-family:monospace;'>" + otp + "</div>" +
               "          <p style='margin:12px 0 0;font-size:12px;color:#94a3b8;'>Password reset code expires in 120 seconds</p>" +
               "        </div>" +
               // Security notice
               "        <div style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:28px;'>" +
               "          <p style='margin:0;font-size:13px;color:#991b1b;font-weight:600;'>⚠️ Password Reset Security</p>" +
               "          <p style='margin:6px 0 0;font-size:13px;color:#b91c1c;line-height:1.5;'>If you did not request a password reset, ignore this email immediately. Never share this password reset code with anyone. Shipment Tracker Pro will never ask for this code via phone, email, or chat.</p>" +
               "        </div>" +
               "        <p style='font-size:13px;color:#64748b;line-height:1.6;'>If you did not request to reset your password, no further action is required. Your account remains secure, and you can safely ignore this email.</p>" +
               "      </td></tr>" +
               // Footer
               "      <tr><td style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;'>" +
               "        <p style='margin:0;font-size:12px;color:#94a3b8;'>© 2026 Shipment Tracker Pro · Enterprise Logistics Platform</p>" +
               "        <p style='margin:4px 0 0;font-size:12px;color:#94a3b8;'>This is an automated message — please do not reply.</p>" +
               "      </td></tr>" +
               "    </table>" +
               "  </td></tr>" +
               "</table>" +
               "</body></html>";
    }

    /** Builds the dedicated HTML email template for delivery OTP verification.
     *  Uses a green-themed header to visually distinguish it from the
     *  Registration (blue) and Forgot-Password (blue) templates.
     */
    private String buildDeliveryOtpEmailTemplate(String otp) {
        return "<!DOCTYPE html>" +
               "<html lang='en'>" +
               "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>" +
               "<body style='margin:0;padding:0;background:#f0fdf4;font-family:Inter,Segoe UI,Arial,sans-serif;'>" +
               "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f0fdf4;padding:40px 0;'>" +
               "  <tr><td align='center'>" +
               "    <table width='560' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);'>" +
               // Header — green gradient
               "      <tr><td style='background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:36px 40px;text-align:center;'>" +
               "        <div style='display:inline-flex;align-items:center;gap:10px;'>" +
               "          <div style='width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;'>🚚</div>" +
               "          <span style='color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;'>Shipment Tracker Pro</span>" +
               "        </div>" +
               "        <p style='color:rgba(255,255,255,0.80);margin:8px 0 0;font-size:13px;'>Delivery Verification</p>" +
               "      </td></tr>" +
               // Body
               "      <tr><td style='padding:40px 40px 32px;'>" +
               "        <h1 style='margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;'>Your Delivery is Here!</h1>" +
               "        <p style='margin:0 0 32px;font-size:14px;color:#64748b;line-height:1.6;'>A Shipment Tracker Pro driver is at your door and needs to verify your identity before completing the delivery. Please share the code below <strong>only with the driver present in front of you</strong>. This code expires in <strong>120 seconds</strong>.</p>" +
               // OTP Box — green accent
               "        <div style='background:#f0fdf4;border:2px dashed #6ee7b7;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;'>" +
               "          <p style='margin:0 0 8px;font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.1em;'>Delivery Verification Code</p>" +
               "          <div style='font-size:42px;font-weight:800;letter-spacing:0.25em;color:#059669;font-family:monospace;'>" + otp + "</div>" +
               "          <p style='margin:12px 0 0;font-size:12px;color:#94a3b8;'>⏱ Expires in 120 seconds — act quickly</p>" +
               "        </div>" +
               // Info notice
               "        <div style='background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:16px;margin-bottom:28px;'>" +
               "          <p style='margin:0;font-size:13px;color:#065f46;font-weight:600;'>✅ What to do</p>" +
               "          <p style='margin:6px 0 0;font-size:13px;color:#047857;line-height:1.5;'>Read this code aloud to the driver. They will enter it into the delivery app to confirm you are the registered recipient before handing over your package.</p>" +
               "        </div>" +
               // Security notice
               "        <div style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:28px;'>" +
               "          <p style='margin:0;font-size:13px;color:#991b1b;font-weight:600;'>⚠️ Safety Reminder</p>" +
               "          <p style='margin:6px 0 0;font-size:13px;color:#b91c1c;line-height:1.5;'>Only share this code with a Shipment Tracker Pro delivery driver who is physically at your location. Never share it via phone call, message, or email.</p>" +
               "        </div>" +
               "        <p style='font-size:13px;color:#64748b;line-height:1.6;'>If you were not expecting a delivery or did not request this code, please do not share it and contact our support team.</p>" +
               "      </td></tr>" +
               // Footer
               "      <tr><td style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;'>" +
               "        <p style='margin:0;font-size:12px;color:#94a3b8;'>© 2026 Shipment Tracker Pro · Enterprise Logistics Platform</p>" +
               "        <p style='margin:4px 0 0;font-size:12px;color:#94a3b8;'>This is an automated message — please do not reply.</p>" +
               "      </td></tr>" +
               "    </table>" +
               "  </td></tr>" +
               "</table>" +
               "</body></html>";
    }
}
