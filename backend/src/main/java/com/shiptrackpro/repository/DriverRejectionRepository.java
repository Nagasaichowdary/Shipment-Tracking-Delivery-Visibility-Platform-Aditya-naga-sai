package com.shiptrackpro.repository;

import com.shiptrackpro.entity.DriverRejection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DriverRejectionRepository extends JpaRepository<DriverRejection, Long> {
    
    boolean existsByDriver_UserIdAndShipment_Id(Long driverId, Long shipmentId);
    
    List<DriverRejection> findByDriver_UserId(Long driverId);
}
