package com.shiptrackpro.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response wrapper for the Route History and Timeline APIs.
 *
 * <p>Contains the tracking number, a chronological list of history events,
 * and a summary of the shipment's current status.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RouteHistoryResponse {

    private String trackingNumber;
    private String currentStatus;
    private int    totalEvents;
    private List<RouteHistoryEvent> events;

    public RouteHistoryResponse() {}

    public RouteHistoryResponse(String trackingNumber,
                                String currentStatus,
                                List<RouteHistoryEvent> events) {
        this.trackingNumber = trackingNumber;
        this.currentStatus  = currentStatus;
        this.events         = events;
        this.totalEvents    = events != null ? events.size() : 0;
    }

    // ── getters / setters ──────────────────────────────────────────────────────

    public String getTrackingNumber()                    { return trackingNumber; }
    public void   setTrackingNumber(String t)            { this.trackingNumber = t; }

    public String getCurrentStatus()                     { return currentStatus; }
    public void   setCurrentStatus(String s)             { this.currentStatus = s; }

    public int    getTotalEvents()                       { return totalEvents; }
    public void   setTotalEvents(int n)                  { this.totalEvents = n; }

    public List<RouteHistoryEvent> getEvents()           { return events; }
    public void setEvents(List<RouteHistoryEvent> events){
        this.events      = events;
        this.totalEvents = events != null ? events.size() : 0;
    }

    // ── inner event DTO ───────────────────────────────────────────────────────

    /**
     * A single lifecycle event in the shipment's route history.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class RouteHistoryEvent {

        private Long          id;
        private String        status;
        private String        statusLabel;   // human-readable label
        private String        location;
        private String        description;
        private String        performedByName;
        private String        performedByRole;
        private LocalDateTime timestamp;

        public RouteHistoryEvent() {}

        public Long          getId()                               { return id; }
        public void          setId(Long id)                        { this.id = id; }

        public String        getStatus()                           { return status; }
        public void          setStatus(String status)              { this.status = status; }

        public String        getStatusLabel()                      { return statusLabel; }
        public void          setStatusLabel(String label)          { this.statusLabel = label; }

        public String        getLocation()                         { return location; }
        public void          setLocation(String location)          { this.location = location; }

        public String        getDescription()                      { return description; }
        public void          setDescription(String description)    { this.description = description; }

        public String        getPerformedByName()                  { return performedByName; }
        public void          setPerformedByName(String name)       { this.performedByName = name; }

        public String        getPerformedByRole()                  { return performedByRole; }
        public void          setPerformedByRole(String role)       { this.performedByRole = role; }

        public LocalDateTime getTimestamp()                        { return timestamp; }
        public void          setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    }
}
