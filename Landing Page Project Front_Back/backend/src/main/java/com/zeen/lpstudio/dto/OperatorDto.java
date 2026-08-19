package com.zeen.lpstudio.dto;

import javax.validation.constraints.NotBlank;

public class OperatorDto {
    private Long id;

    @NotBlank
    private String name;

    @NotBlank
    private String code;

    @NotBlank
    private String adid;

    @NotBlank
    private String cmpid;

    private String priceLabel;
    private String unsubKeyword;
    private String unsubShortcode;
    private String portalUrlOverride;
    private Integer sortOrder = 0;
    private boolean active = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getAdid() { return adid; }
    public void setAdid(String adid) { this.adid = adid; }
    public String getCmpid() { return cmpid; }
    public void setCmpid(String cmpid) { this.cmpid = cmpid; }
    public String getPriceLabel() { return priceLabel; }
    public void setPriceLabel(String priceLabel) { this.priceLabel = priceLabel; }
    public String getUnsubKeyword() { return unsubKeyword; }
    public void setUnsubKeyword(String unsubKeyword) { this.unsubKeyword = unsubKeyword; }
    public String getUnsubShortcode() { return unsubShortcode; }
    public void setUnsubShortcode(String unsubShortcode) { this.unsubShortcode = unsubShortcode; }
    public String getPortalUrlOverride() { return portalUrlOverride; }
    public void setPortalUrlOverride(String portalUrlOverride) { this.portalUrlOverride = portalUrlOverride; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
