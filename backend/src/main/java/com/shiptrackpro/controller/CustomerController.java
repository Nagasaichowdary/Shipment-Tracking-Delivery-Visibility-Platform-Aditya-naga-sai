package com.shiptrackpro.controller;

import com.shiptrackpro.dto.CustomerResponse;
import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST API for customer-related operations.
 *
 * <p>This controller is intentionally separate from {@link ShipmentController}
 * because customer data belongs to user/customer management, not shipment
 * management. The endpoint is reusable across:
 * <ul>
 *   <li>Shipment Creation — populating the "Registered Customer" dropdown so
 *       that {@code receiverUserId} can be sent during shipment creation, which
 *       links {@code Shipment.receiverUser} and enables the Delivery OTP system
 *       to retrieve {@code shipment.getReceiverUser().getEmail()} at delivery time.</li>
 *   <li>Future Admin CRM — customer directory</li>
 *   <li>Future Pickup Assignment — assigning pickup to a customer account</li>
 *   <li>Any other module that needs the list of registered customers</li>
 * </ul>
 *
 * <p>Authorization: all endpoints require a valid JWT (covered by the
 * {@code anyRequest().authenticated()} rule in {@link com.shiptrackpro.security.SecurityConfig}).
 * No additional role restriction is applied here because every authenticated role
 * that can create a shipment (Business Client, Logistics Operator, Administrator)
 * needs access to this list.</p>
 */
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final UserRepository userRepository;

    public CustomerController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Returns all approved registered customers.
     *
     * <p>A "customer" is defined as a {@link User} whose role name is
     * {@code "CUSTOMER"} and whose registration status is {@code APPROVED}.
     * Pending, rejected, or inactive accounts are excluded.</p>
     *
     * <p>The response is ordered by first name then last name for a consistent
     * dropdown experience. Each entry includes {@code id}, {@code firstName},
     * {@code lastName}, {@code fullName}, {@code email}, and {@code phone}.</p>
     *
     * <pre>GET /api/customers</pre>
     *
     * @return HTTP 200 with a list of {@link CustomerResponse} objects;
     *         empty list if no approved customers exist.
     */
    @GetMapping
    public ResponseEntity<List<CustomerResponse>> getApprovedCustomers() {

        List<CustomerResponse> customers = userRepository
                .findByRole_RoleNameAndRegistrationStatus("CUSTOMER", RegistrationStatus.APPROVED)
                .stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .sorted((a, b) -> {
                    int cmp = a.getFirstName().compareToIgnoreCase(b.getFirstName());
                    return cmp != 0 ? cmp : a.getLastName().compareToIgnoreCase(b.getLastName());
                })
                .map(this::toCustomerResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(customers);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private CustomerResponse toCustomerResponse(User user) {
        String fullName = (user.getFirstName() + " " + user.getLastName()).trim();
        return CustomerResponse.builder()
                .id(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(fullName)
                .email(user.getEmail())
                .phone(user.getPhone())
                .build();
    }
}
