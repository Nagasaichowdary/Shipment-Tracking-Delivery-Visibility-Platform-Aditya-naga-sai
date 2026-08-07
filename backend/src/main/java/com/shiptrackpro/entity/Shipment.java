package com.shiptrackpro.entity;

import com.shiptrackpro.enums.ShipmentStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * JPA entity representing a shipment.
 *
 * <p><b>MODIFIED from the previous version:</b> {@code originAddress} and
 * {@code destinationAddress} now cascade {@code PERSIST}/{@code MERGE}.
 * Without this, saving a new {@code Shipment} with a transient
 * {@code Address} attached would throw
 * {@code TransientPropertyValueException} — the address row needs to be
 * persisted in the same operation as the shipment that owns it. Every
 * other field is unchanged from the prior version.</p>
 */
@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "shipments")
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 50)
    private String trackingNumber;

    @Column(name = "sender_name", nullable = false, length = 150)
    private String senderName;

    @Column(name = "sender_phone", nullable = false, length = 20)
    private String senderPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id")
    private User senderUser;

    @Column(name = "receiver_name", nullable = false, length = 150)
    private String receiverName;

    @Column(name = "receiver_phone", nullable = false, length = 20)
    private String receiverPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_user_id")
    private User receiverUser;

    /**
     * Email address for a guest (non-registered) receiver.
     *
     * <p>Populated during shipment creation when the operator does NOT select
     * a registered customer from the dropdown ({@code receiverUser} is null).
     * Used by the Delivery OTP system as a fallback when
     * {@code shipment.getReceiverUser()} is null — allowing the driver to send
     * an OTP to a guest receiver without requiring them to have a platform account.
     *
     * <p>Always {@code null} when {@code receiverUser} is set (the registered
     * customer's email is fetched directly from their {@link User} entity).
     * Always {@code null} for shipments created before this feature was added.
     */
    @Column(name = "guest_email", length = 255)
    private String guestEmail;

    /**
     * The driver (User with ROLE_DRIVER) currently assigned to deliver this
     * shipment. Nullable — null means the shipment is not yet dispatched to a
     * specific driver.
     *
     * <p>Managed via {@code PUT /api/shipments/{id}/assign-driver} and
     * {@code DELETE /api/shipments/{id}/assign-driver}. Only users whose
     * {@code role_name = 'DRIVER'} and {@code registration_status = 'APPROVED'}
     * may be assigned.</p>
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_driver_id")
    private User assignedDriver;

    // ──────────────────────────────────────────────────────────────────────
    // Milestone 2 placeholders — fields are stored in the DB but not yet
    // exposed through any API. Adding them here avoids a schema migration
    // when Live Location and Delay Prediction are implemented.
    // ──────────────────────────────────────────────────────────────────────

    /** Latitude of the driver's last known GPS position. Milestone 2: Live Location. */
    @Column(name = "last_known_latitude")
    private Double lastKnownLatitude;

    /** Longitude of the driver's last known GPS position. Milestone 2: Live Location. */
    @Column(name = "last_known_longitude")
    private Double lastKnownLongitude;

    /** Timestamp of the most recent GPS update. Milestone 2: Live Location. */
    @Column(name = "last_location_updated_at")
    private LocalDateTime lastLocationUpdatedAt;

    /**
     * Optional human-readable city label of the last known position.
     * Populated when callers supply a {@code city} field in the
     * {@code POST /api/shipments/{id}/location} request body.
     * Milestone 2: Live Location.
     */
    @Column(name = "last_known_city", length = 100)
    private String lastKnownCity;

    /**
     * Model-predicted delay in minutes relative to the expected delivery date.
     * Positive = delayed; negative = ahead of schedule. Milestone 2: Delay Prediction.
     */
    @Column(name = "estimated_delay_minutes")
    private Integer estimatedDelayMinutes;

    /**
     * Human-readable reason for cancellation.
     * Populated only when {@code shipmentStatus == CANCELLED}.
     * {@code null} for all other statuses.
     */
    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    /**
     * Human-readable reason for the delay, supplied by the Logistics Operator.
     * Populated only when {@code shipmentStatus == DELAYED}.
     * {@code null} for all other statuses.
     */
    @Column(name = "delay_reason", length = 500)
    private String delayReason;

    // ──────────────────────────────────────────────────────────────────────
    // Milestone 3: Delivery Confirmation fields
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Whether the delivery has been formally confirmed by the assigned driver.
     * Defaults to {@code false}; set to {@code true} by
     * {@code POST /api/shipments/{id}/confirm-delivery}.
     *
     * <p>Column is nullable in the DB so {@code ddl-auto=update} can add it to
     * existing populated tables without a migration script. All reads use
     * {@code Boolean.TRUE.equals()} which treats {@code null} as {@code false}.</p>
     */
    @Column(name = "delivery_confirmed")
    @Builder.Default
    private Boolean deliveryConfirmed = false;

    /**
     * Server-side timestamp recorded at the moment the driver confirms delivery.
     * {@code null} until the delivery is confirmed.
     */
    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    /**
     * Name of the person who physically received the package.
     * Supplied by the driver at confirmation time.
     * Distinct from {@code receiverName} (the intended recipient from the shipment form).
     */
    @Column(name = "delivery_receiver_name", length = 150)
    private String deliveryReceiverName;

    /**
     * Optional free-text remarks from the driver about the delivery
     * (e.g. "Left with neighbour", "Handed to security").
     */
    @Column(name = "delivery_remarks", length = 500)
    private String deliveryRemarks;

    /**
     * Relative path to the customer's drawn signature PNG on the server filesystem.
     * Populated by {@code POST /api/shipments/{id}/confirm-delivery}.
     * Example: {@code delivery/SHIP-ABCD1234/signature.png}
     */
    @Column(name = "customer_signature_path", length = 500)
    private String customerSignaturePath;

    /**
     * Relative path to the delivery photo on the server filesystem.
     * Populated by {@code POST /api/shipments/{id}/confirm-delivery}.
     * Example: {@code delivery/SHIP-ABCD1234/delivery-photo.jpg}
     */
    @Column(name = "delivery_photo_path", length = 500)
    private String deliveryPhotoPath;

    // MODIFIED: added cascade = {PERSIST, MERGE}

    @ManyToOne(fetch = FetchType.LAZY, optional = false, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "origin_address_id", nullable = false)
    private Address originAddress;

    // MODIFIED: added cascade = {PERSIST, MERGE}
    @ManyToOne(fetch = FetchType.LAZY, optional = false, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "destination_address_id", nullable = false)
    private Address destinationAddress;

    @Column(name = "weight", nullable = false)
    private Double packageWeight;

    @Column(name = "shipment_type", nullable = false, length = 30)
    private String shipmentType;

    @Column(name = "package_type", length = 50)
    private String packageType;

    @Enumerated(EnumType.STRING)
    @Column(name = "shipment_status", nullable = false, length = 30)
    private ShipmentStatus shipmentStatus;

    @Column(name = "expected_delivery_date")
    private LocalDateTime expectedDeliveryDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.shipmentStatus == null) {
            this.shipmentStatus = ShipmentStatus.CREATED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
