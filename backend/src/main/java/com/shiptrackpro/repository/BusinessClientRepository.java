package com.shiptrackpro.repository;

import com.shiptrackpro.entity.BusinessClient;
import com.shiptrackpro.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BusinessClientRepository extends JpaRepository<BusinessClient, Long> {

    Optional<BusinessClient> findByUser(User user);

}