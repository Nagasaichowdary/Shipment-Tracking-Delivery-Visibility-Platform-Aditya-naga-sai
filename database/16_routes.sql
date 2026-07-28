CREATE TABLE routes (
    route_id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL UNIQUE,
    origin_address_id BIGINT NOT NULL,
    destination_address_id BIGINT NOT NULL,
    total_distance_km DECIMAL(10,2),
    estimated_duration_minutes INTEGER,
    route_polyline TEXT,
    traffic_condition VARCHAR(20) CHECK (traffic_condition IN ('LOW','MODERATE','HEAVY')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_route_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    CONSTRAINT fk_route_origin FOREIGN KEY (origin_address_id) REFERENCES addresses(address_id),
    CONSTRAINT fk_route_destination FOREIGN KEY (destination_address_id) REFERENCES addresses(address_id)
);

CREATE INDEX idx_routes_shipment_id ON routes(shipment_id);

CREATE TRIGGER trg_routes_updated_at
BEFORE UPDATE ON routes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();