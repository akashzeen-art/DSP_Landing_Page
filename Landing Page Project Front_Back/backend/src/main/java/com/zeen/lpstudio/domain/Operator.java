package com.zeen.lpstudio.domain;

import javax.persistence.*;

@Entity
@Table(name = "operators")
public class Operator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "landing_page_id", nullable = false)
    private LandingPage landingPage;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 40)
    private String code;

    /** Adpoke adid / Zeen cid */
    @Column(nullable = false, length = 40)
    private String adid;

    @Column(nullable = false, length = 40)
    private String cmpid;

    @Column(length = 80)
    private String priceLabel;

    @Column(length = 40)
    private String unsubKeyword;

    @Column(length = 40)
    private String unsubShortcode;

    /** Full portal URL override (optional). Empty = build from apiBase + portalPath */
    @Column(length = 500)
    private String portalUrlOverride;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    private boolean active = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LandingPage getLandingPage() { return landingPage; }
    public void setLandingPage(LandingPage landingPage) { this.landingPage = landingPage; }
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
