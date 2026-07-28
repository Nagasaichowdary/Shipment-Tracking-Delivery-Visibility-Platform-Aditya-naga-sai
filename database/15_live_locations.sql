CREATE TABLE live_locations (
    location_id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL,
    vehicle_id BIGINT,
    driver_id BIGINT,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    speed_kmph DECIMAL(6,2),
    heading DECIMAL(5,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_live_location_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    CONSTRAINT fk_live_location_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    CONSTRAINT fk_live_location_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);

CREATE INDEX idx_live_locations_shipment_id ON live_locations(shipment_id);
CREATE INDEX idx_live_locations_recorded_at ON live_locations(recorded_at);