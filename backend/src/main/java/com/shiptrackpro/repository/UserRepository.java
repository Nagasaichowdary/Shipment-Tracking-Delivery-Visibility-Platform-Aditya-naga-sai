package com.shiptrackpro.repository;

import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    /**
     * Case-insensitive email lookup.
     *
     * <p>Used during shipment creation to auto-associate a shipment with a
     * registered Customer when the Admin/Logistics Operator manually enters
     * a receiver email that matches an existing Customer account, without
     * having explicitly selected that Customer from the dropdown.</p>
     *
     * <p>Spring Data JPA translates {@code IgnoreCase} into a
     * {@code LOWER(email) = LOWER(:email)} predicate, so mixed-case entries
     * such as "Customer@Gmail.com" correctly match "customer@gmail.com".</p>
     *
     * @param email the receiver email entered on the Create Shipment form
     * @return the matching User, or empty if no account has that email
     */
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    List<User> findByRegistrationStatus(RegistrationStatus registrationStatus);

    /**
     * Returns all users that have the specified role name AND the given
     * registration status in a single query — used to list assignable drivers:
     * {@code findByRole_RoleNameAndRegistrationStatus("DRIVER", APPROVED)}.
     *
     * <p>Spring Data JPA traverses {@code User.role.roleName} automatically
     * via the underscore property-path convention.</p>
     */
    List<User> findByRole_RoleNameAndRegistrationStatus(
            String roleName,
            RegistrationStatus registrationStatus);

}