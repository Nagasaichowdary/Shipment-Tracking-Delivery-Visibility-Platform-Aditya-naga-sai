package com.shiptrackpro.repository;

import com.shiptrackpro.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link Address}.
 *
 * <p>Not currently called by {@code ShipmentServiceImpl} — addresses are
 * persisted transitively through {@code Shipment}'s cascading
 * {@code @ManyToOne} associations, so no direct save/query is needed today.
 * Included for architectural completeness and because future features
 * (e.g. "find shipments by destination city") will need direct
 * {@code Address} queries.</p>
 */
@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {

}

