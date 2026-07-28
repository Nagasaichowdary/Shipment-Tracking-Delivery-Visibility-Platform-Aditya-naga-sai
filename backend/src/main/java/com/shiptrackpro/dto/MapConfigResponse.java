package com.shiptrackpro.dto;

public class MapConfigResponse {

    private String apiKey;
    private String defaultCenter;

    public MapConfigResponse() {
    }

    public MapConfigResponse(String apiKey, String defaultCenter) {
        this.apiKey = apiKey;
        this.defaultCenter = defaultCenter;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getDefaultCenter() {
        return defaultCenter;
    }

    public void setDefaultCenter(String defaultCenter) {
        this.defaultCenter = defaultCenter;
    }
}