package com.shiptrackpro.repository;

import com.shiptrackpro.entity.RegistrationStatus;
import com.shiptrackpro.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

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