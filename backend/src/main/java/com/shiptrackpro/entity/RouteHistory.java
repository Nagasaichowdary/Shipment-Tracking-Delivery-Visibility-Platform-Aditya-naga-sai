package com.shiptrackpro.entity;

import com.shiptrackpro.enums.ShipmentStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Audit trail entry recording every lifecycle event for a {@link Shipment}.
 *
 * <p>A new row is inserted automatically by {@code RouteHistoryServiceImpl}
 * whenever the shipment status changes (created, driver assigned, picked up,
 * in transit, out for delivery, delivered, cancelled, etc.).
 *
 * <p>Records are <b>append-only</b>. No existing row is ever updated or deleted,
 * guaranteeing a tamper-evident full history.</p>
 *
 * <p>Table: {@code route_history}. Auto-created by {@code ddl-auto=update}.</p>
 */
@Entity
@Table(name = "route_history", indexes = {
        @Index(name = "idx_rh_tracking", columnList = "shipment_tracking_number"),
        @Index(name = "idx_rh_shipment_id", columnList = "shipment_id"),
        @Index(name = "idx_rh_timestamp",   columnList = "event_timestamp")
})
public class RouteHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /**
     * The shipment this record belongs to.
     * Lazy-fetched; use the denormalized {@code shipmentTrackingNumber}
     * for read queries that only need the tracking number.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shipment_id", nullable = false)
    private Shipment shipment;

    /**
     * Denormalised copy of {@code shipment.trackingNumber} so that
     * {@code findByShipmentTrackingNumber} queries can run without a JOIN.
     */
    @Column(name = "shipment_tracking_number", nullable = false, length = 30)
    private String shipmentTrackingNumber;

    /**
     * The shipment status at the moment this event was recorded.
     * Stored as a VARCHAR matching the {@link ShipmentStatus} enum name.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ShipmentStatus status;

    /**
     * Optional human-readable location label at the time of the event
     * (e.g. "Mumbai Hub", "Chennai Warehouse", "Customer address").
     * Null when no location context is available.
     */
    @Column(name = "location", length = 200)
    private String location;

    /**
     * Human-readable description of what happened
     * (e.g. "Shipment created", "Driver John Doe assigned", "Delivered to Jane Smith").
     */
    @Column(name = "description", nullable = false, length = 500)
    private String description;

    /**
     * Full name of the user who triggered this event.
     * Set to "System" for automated events.
     */
    @Column(name = "performed_by_name", length = 150)
    private String performedByName;

    /**
     * Role of the user who triggered this event
     * (e.g. "DISPATCHER", "DRIVER", "ADMIN").
     * Set to "System" for automated events.
     */
    @Column(name = "performed_by_role", length = 50)
    private String performedByRole;

    /**
     * Server-side timestamp when this history record was created.
     * Automatically populated by Hibernate; never updated.
     */
    @CreationTimestamp
    @Column(name = "event_timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;

    // ── constructors ───────────────────────────────────────────────────────────

    public RouteHistory() {}

    public RouteHistory(Shipment shipment,
                        String   shipmentTrackingNumber,
                        ShipmentStatus status,
                        String   location,
                        String   description,
                        String   performedByName,
                        String   performedByRole) {
        this.shipment               = shipment;
        this.shipmentTrackingNumber = shipmentTrackingNumber;
        this.status                 = status;
        this.location               = location;
        this.description            = description;
        this.performedByName        = performedByName;
        this.performedByRole        = performedByRole;
    }

    // ── getters / setters ──────────────────────────────────────────────────────

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public Shipment getShipment()                { return shipment; }
    public void setShipment(Shipment shipment)   { this.shipment = shipment; }

    public String getShipmentTrackingNumber()    { return shipmentTrackingNumber; }
    public void setShipmentTrackingNumber(String t) { this.shipmentTrackingNumber = t; }

    public ShipmentStatus getStatus()            { return status; }
    public void setStatus(ShipmentStatus status) { this.status = status; }

    public String getLocation()                  { return location; }
    public void setLocation(String location)     { this.location = location; }

    public String getDescription()               { return description; }
    public void setDescription(String d)         { this.description = d; }

    public String getPerformedByName()           { return performedByName; }
    public void setPerformedByName(String n)     { this.performedByName = n; }

    public String getPerformedByRole()           { return performedByRole; }
    public void setPerformedByRole(String r)     { this.performedByRole = r; }

    public LocalDateTime getTimestamp()          { return timestamp; }
    public void setTimestamp(LocalDateTime t)    { this.timestamp = t; }
}
