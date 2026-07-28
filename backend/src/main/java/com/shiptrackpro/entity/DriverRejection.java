package com.shiptrackpro.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "driver_rejections", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"driver_id", "shipment_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverRejection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id", nullable = false)
    private Shipment shipment;

    @CreationTimestamp
    @Column(name = "rejected_at", updatable = false)
    private LocalDateTime rejectedAt;
}
