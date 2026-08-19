package com.zeen.lpstudio.dto;

import java.util.Map;

public class DeployResultDto {
    private boolean success;
    private String message;
    private String deployPath;
    private String liveBase;
    private String campaignUrl;
    private String nginxSnippet;
    private Map<String, String> urls;
    private Integer filesUploaded;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getDeployPath() { return deployPath; }
    public void setDeployPath(String deployPath) { this.deployPath = deployPath; }
    public String getLiveBase() { return liveBase; }
    public void setLiveBase(String liveBase) { this.liveBase = liveBase; }
    public String getCampaignUrl() { return campaignUrl; }
    public void setCampaignUrl(String campaignUrl) { this.campaignUrl = campaignUrl; }
    public String getNginxSnippet() { return nginxSnippet; }
    public void setNginxSnippet(String nginxSnippet) { this.nginxSnippet = nginxSnippet; }
    public Map<String, String> getUrls() { return urls; }
    public void setUrls(Map<String, String> urls) { this.urls = urls; }
    public Integer getFilesUploaded() { return filesUploaded; }
    public void setFilesUploaded(Integer filesUploaded) { this.filesUploaded = filesUploaded; }
}
