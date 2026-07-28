package com.shiptrackpro.enums;

/**
 * Lifecycle states for a {@link com.shiptrackpro.entity.Shipment}.
 *
 * <p>{@code CREATED} is the legacy default; new shipments now start in
 * {@code PENDING_DRIVER} so they appear in the driver broadcast queue.
 * {@code CANCELLED} is the terminal status used by the soft-delete flow in
 * {@code ShipmentServiceImpl.deleteShipment}.
 * The remaining values model the normal delivery pipeline.</p>
 */
public enum ShipmentStatus {

    /** Shipment record created; not yet handed to a carrier (legacy). */
    CREATED,

    /**
     * Shipment is waiting for a driver to accept the delivery request.
     * This is the default initial state for all new shipments.
     */
    PENDING_DRIVER,

    /**
     * A driver has accepted the delivery request; shipment is waiting
     * to be physically picked up.
     */
    DRIVER_ASSIGNED,

    /** Package has been collected from the sender. */
    PICKED_UP,

    /** Package is in transit between facilities. */
    IN_TRANSIT,

    /** Delivery is delayed; a Logistics Operator-supplied reason is stored in {@code Shipment.delayReason}. */
    DELAYED,

    /** Package is with the courier for final-mile delivery. */
    OUT_FOR_DELIVERY,

    /** Package has been delivered to the receiver. */
    DELIVERED,

    /** Shipment was cancelled; terminal state used by the soft-delete flow. */
    CANCELLED,

    /** Delivery attempt was made but failed (e.g. recipient not available). */
    FAILED_DELIVERY,

    /** Package could not be delivered and was sent back to the sender. */
    RETURNED

}
