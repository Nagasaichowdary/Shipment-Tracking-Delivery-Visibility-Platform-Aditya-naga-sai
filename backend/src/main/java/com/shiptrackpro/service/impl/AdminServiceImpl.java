package com.shiptrackpro.service.impl;

import com.shiptrackpro.dto.PendingUserResponse;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.exception.ResourceNotFoundException;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.service.AdminService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Injected only when spring-boot-starter-mail is on the classpath
     * and spring.mail.host is configured. Falls back to console log if null.
     * Same injection pattern as AuthServiceImpl.
     */
    @Autowired(required = false)
    private JavaMailSender mailSender;

    /** Must match the authenticated Gmail account (same binding as AuthServiceImpl). */
    @Value("${spring.mail.username:}")
    private String mailFromAddress;

    // ── User list queries ─────────────────────────────────────────

    @Override
    public List<PendingUserResponse> getPendingUsers() {
        List<User> pendingUsers = userRepository.findByRegistrationStatus(RegistrationStatus.PENDING);

        return pendingUsers.stream().map(user -> new PendingUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getRegistrationStatus()
        )).collect(Collectors.toList());
    }

    @Override
    public List<PendingUserResponse> getApprovedUsers() {
        List<User> approvedUsers = userRepository.findByRegistrationStatus(RegistrationStatus.APPROVED);

        return approvedUsers.stream().map(user -> new PendingUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getRegistrationStatus()
        )).collect(Collectors.toList());
    }

    @Override
    public List<PendingUserResponse> getRejectedUsers() {
        List<User> rejectedUsers = userRepository.findByRegistrationStatus(RegistrationStatus.REJECTED);

        return rejectedUsers.stream().map(user -> new PendingUserResponse(
                user.getUserId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getRoleName(),
                user.getRegistrationStatus()
        )).collect(Collectors.toList());
    }

    // ── Approve / Reject ──────────────────────────────────────────

    @Override
    public void approveUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setRegistrationStatus(RegistrationStatus.APPROVED);
        userRepository.save(user);

        // Send approval notification after a successful save.
        // Email failure is caught and logged — it never blocks the admin action.
        sendApprovalEmail(user);
    }

    @Override
    public void rejectUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setRegistrationStatus(RegistrationStatus.REJECTED);
        userRepository.save(user);

        // Send rejection notification after a successful save.
        sendRejectionEmail(user);
    }

    // ── Email notification helpers ────────────────────────────────

    /**
     * Sends an account-approval email to the user.
     * Uses the same JavaMailSender infrastructure and brand template as AuthServiceImpl.
     *
     * @param user the newly approved user (email and firstName must be populated)
     */
    private void sendApprovalEmail(User user) {
        if (!isMailConfigured()) {
            System.out.println("[ShipTrackPro] Mail not configured — approval email skipped for: " + user.getEmail());
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFromAddress, "Shipment Tracker Pro");
            helper.setTo(user.getEmail());
            helper.setSubject("Welcome to Shipment Tracker Pro \u2013 Your Account Has Been Approved");
            helper.setText(buildApprovalEmailTemplate(user.getFirstName()), true);
            mailSender.send(message);
            System.out.println("[ShipTrackPro] Approval email dispatched to: " + user.getEmail());
        } catch (Exception e) {
            // Log but never propagate — admin action is already committed to DB
            System.err.println("[ShipTrackPro] Approval email failed for " + user.getEmail() + ": " + e.getMessage());
        }
    }

    /**
     * Sends an account-rejection email to the user.
     *
     * @param user the rejected user (email and firstName must be populated)
     */
    private void sendRejectionEmail(User user) {
        if (!isMailConfigured()) {
            System.out.println("[ShipTrackPro] Mail not configured — rejection email skipped for: " + user.getEmail());
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFromAddress, "Shipment Tracker Pro");
            helper.setTo(user.getEmail());
            helper.setSubject("Shipment Tracker Pro \u2013 Account Request Update");
            helper.setText(buildRejectionEmailTemplate(user.getFirstName()), true);
            mailSender.send(message);
            System.out.println("[ShipTrackPro] Rejection email dispatched to: " + user.getEmail());
        } catch (Exception e) {
            System.err.println("[ShipTrackPro] Rejection email failed for " + user.getEmail() + ": " + e.getMessage());
        }
    }

    // ── HTML template builders ────────────────────────────────────

    /**
     * Builds the branded HTML approval email.
     * Reuses the identical outer shell as AuthServiceImpl.buildEmailTemplate():
     * blue-gradient header, white card body, light grey footer.
     */
    private String buildApprovalEmailTemplate(String firstName) {
        String name = (firstName != null && !firstName.isBlank()) ? escapeHtml(firstName) : "User";
        return "<!DOCTYPE html>" +
               "<html lang='en'>" +
               "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>" +
               "<body style='margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;'>" +
               "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:40px 0;'>" +
               "  <tr><td align='center'>" +
               "    <table width='560' cellpadding='0' cellspacing='0' " +
               "           style='background:#ffffff;border-radius:16px;overflow:hidden;" +
               "                  box-shadow:0 4px 24px rgba(15,23,42,0.08);'>" +
               // ── Header (identical to OTP template) ──────────────────
               "      <tr><td style='background:linear-gradient(135deg,#4f46e5 0%,#3730a3 100%);" +
               "                     padding:36px 40px;text-align:center;'>" +
               "        <div style='display:inline-flex;align-items:center;gap:10px;'>" +
               "          <div style='width:40px;height:40px;background:rgba(255,255,255,0.2);" +
               "                      border-radius:10px;display:flex;align-items:center;" +
               "                      justify-content:center;font-size:20px;'>&#128230;</div>" +
               "          <span style='color:#ffffff;font-size:20px;font-weight:800;" +
               "                       letter-spacing:-0.02em;'>Shipment Tracker Pro</span>" +
               "        </div>" +
               "        <p style='color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:13px;'>" +
               "          Enterprise Logistics Platform</p>" +
               "      </td></tr>" +
               // ── Body ────────────────────────────────────────────────
               "      <tr><td style='padding:40px 40px 32px;'>" +
               "        <h1 style='margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;'>" +
               "          Account Approved &#127881;</h1>" +
               "        <p style='margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Dear <strong>" + name + "</strong>,</p>" +
               "        <p style='margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Great news!</p>" +
               "        <p style='margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Your <strong>Shipment Tracker Pro</strong> account has been approved " +
               "          by our administrator.</p>" +
               // Green status box
               "        <div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;" +
               "                    padding:24px;text-align:center;margin-bottom:28px;'>" +
               "          <p style='margin:0 0 6px;font-size:12px;font-weight:700;color:#15803d;" +
               "                    text-transform:uppercase;letter-spacing:0.1em;'>Account Status</p>" +
               "          <p style='margin:0;font-size:22px;font-weight:800;color:#16a34a;'>" +
               "            &#10003;&nbsp;APPROVED</p>" +
               "        </div>" +
               "        <p style='margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          You can now sign in and start using the Shipment Tracker Pro platform.</p>" +
               "        <p style='margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Thank you for choosing Shipment Tracker Pro.</p>" +
               "        <p style='margin:0;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Regards,<br><strong>Shipment Tracker Pro Team</strong></p>" +
               "      </td></tr>" +
               // ── Footer (identical to OTP template) ──────────────────
               "      <tr><td style='background:#f8fafc;border-top:1px solid #e2e8f0;" +
               "                     padding:24px 40px;text-align:center;'>" +
               "        <p style='margin:0;font-size:12px;color:#94a3b8;'>" +
               "          &#169; 2026 Shipment Tracker Pro &middot; Enterprise Logistics Platform</p>" +
               "        <p style='margin:4px 0 0;font-size:12px;color:#94a3b8;'>" +
               "          This is an automated message &mdash; please do not reply.</p>" +
               "      </td></tr>" +
               "    </table>" +
               "  </td></tr>" +
               "</table>" +
               "</body></html>";
    }

    /**
     * Builds the branded HTML rejection email.
     * Same outer shell as the approval and OTP templates; red status box instead of green.
     */
    private String buildRejectionEmailTemplate(String firstName) {
        String name = (firstName != null && !firstName.isBlank()) ? escapeHtml(firstName) : "User";
        return "<!DOCTYPE html>" +
               "<html lang='en'>" +
               "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>" +
               "<body style='margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;'>" +
               "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:40px 0;'>" +
               "  <tr><td align='center'>" +
               "    <table width='560' cellpadding='0' cellspacing='0' " +
               "           style='background:#ffffff;border-radius:16px;overflow:hidden;" +
               "                  box-shadow:0 4px 24px rgba(15,23,42,0.08);'>" +
               // ── Header ──────────────────────────────────────────────
               "      <tr><td style='background:linear-gradient(135deg,#4f46e5 0%,#3730a3 100%);" +
               "                     padding:36px 40px;text-align:center;'>" +
               "        <div style='display:inline-flex;align-items:center;gap:10px;'>" +
               "          <div style='width:40px;height:40px;background:rgba(255,255,255,0.2);" +
               "                      border-radius:10px;display:flex;align-items:center;" +
               "                      justify-content:center;font-size:20px;'>&#128230;</div>" +
               "          <span style='color:#ffffff;font-size:20px;font-weight:800;" +
               "                       letter-spacing:-0.02em;'>Shipment Tracker Pro</span>" +
               "        </div>" +
               "        <p style='color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:13px;'>" +
               "          Enterprise Logistics Platform</p>" +
               "      </td></tr>" +
               // ── Body ────────────────────────────────────────────────
               "      <tr><td style='padding:40px 40px 32px;'>" +
               "        <h1 style='margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;'>" +
               "          Account Request Update</h1>" +
               "        <p style='margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Dear <strong>" + name + "</strong>,</p>" +
               "        <p style='margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Thank you for registering with Shipment Tracker Pro.</p>" +
               "        <p style='margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          After reviewing your registration request, we are unable to approve " +
               "          your account at this time.</p>" +
               // Red status box
               "        <div style='background:#fef2f2;border:1px solid #fecaca;border-radius:12px;" +
               "                    padding:24px;text-align:center;margin-bottom:28px;'>" +
               "          <p style='margin:0 0 6px;font-size:12px;font-weight:700;color:#991b1b;" +
               "                    text-transform:uppercase;letter-spacing:0.1em;'>Account Status</p>" +
               "          <p style='margin:0;font-size:22px;font-weight:800;color:#dc2626;'>" +
               "            &#10007;&nbsp;NOT APPROVED</p>" +
               "        </div>" +
               "        <p style='margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          If you believe this is an error, please contact the administrator " +
               "          or submit a new registration request.</p>" +
               "        <p style='margin:0;font-size:14px;color:#475569;line-height:1.6;'>" +
               "          Regards,<br><strong>Shipment Tracker Pro Team</strong></p>" +
               "      </td></tr>" +
               // ── Footer ──────────────────────────────────────────────
               "      <tr><td style='background:#f8fafc;border-top:1px solid #e2e8f0;" +
               "                     padding:24px 40px;text-align:center;'>" +
               "        <p style='margin:0;font-size:12px;color:#94a3b8;'>" +
               "          &#169; 2026 Shipment Tracker Pro &middot; Enterprise Logistics Platform</p>" +
               "        <p style='margin:4px 0 0;font-size:12px;color:#94a3b8;'>" +
               "          This is an automated message &mdash; please do not reply.</p>" +
               "      </td></tr>" +
               "    </table>" +
               "  </td></tr>" +
               "</table>" +
               "</body></html>";
    }

    // ── Utility helpers ───────────────────────────────────────────

    /** Returns true only when JavaMailSender is configured with real credentials. */
    private boolean isMailConfigured() {
        return mailSender != null
                && mailFromAddress != null
                && !mailFromAddress.isBlank()
                && !mailFromAddress.equals("YOUR_GMAIL_ADDRESS@gmail.com");
    }

    /** Escapes HTML special characters to prevent injection via the user's first name. */
    private String escapeHtml(String text) {
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#x27;");
    }
}