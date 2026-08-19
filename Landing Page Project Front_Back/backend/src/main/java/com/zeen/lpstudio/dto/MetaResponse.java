package com.zeen.lpstudio.dto;

import java.util.List;
import java.util.Map;

public class MetaResponse {
    private List<String> platforms;
    private List<String> apiProviders;
    private List<String> uiTemplates;
    private List<Map<String, Object>> presets;

    public List<String> getPlatforms() { return platforms; }
    public void setPlatforms(List<String> platforms) { this.platforms = platforms; }
    public List<String> getApiProviders() { return apiProviders; }
    public void setApiProviders(List<String> apiProviders) { this.apiProviders = apiProviders; }
    public List<String> getUiTemplates() { return uiTemplates; }
    public void setUiTemplates(List<String> uiTemplates) { this.uiTemplates = uiTemplates; }
    public List<Map<String, Object>> getPresets() { return presets; }
    public void setPresets(List<Map<String, Object>> presets) { this.presets = presets; }
}
