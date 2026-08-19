package com.zeen.lpstudio.domain;

import javax.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "landing_pages")
public class LandingPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    /** URL path slug e.g. psgog01, omanprop, palestine */
    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    /** Live host without scheme, e.g. ge-playcontent.com */
    @Column(length = 120)
    private String publicDomain;

    /**
     * Public URL path under the domain (no leading slash).
     * Empty + serveAtRoot=true → https://domain/
     * Empty + serveAtRoot=false → uses slug
     */
    @Column(length = 160)
    private String urlPath;

    /** Absolute server filesystem path, e.g. /var/www/vaszeen/zeen_lp/georgia/ge-audiobooks */
    @Column(length = 400)
    private String deployPath;

    /** If true, site is served at domain root (ignore slug in public URL). */
    private boolean serveAtRoot = false;

    private Instant lastDeployedAt;

    @Column(length = 500)
    private String lastDeployMessage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PlatformType platform = PlatformType.GOOGLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UiTemplate uiTemplate = UiTemplate.GOOGLE_MOBILE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ApiProvider apiProvider = ApiProvider.ADPOKE;

    @Column(nullable = false, length = 8)
    private String countryCode = "970";

    @Column(nullable = false, length = 8)
    private String dialPrefix = "+970";

    /** Regex for local MSISDN (without country code) */
    @Column(nullable = false, length = 80)
    private String msisdnRegex = "^5[0-9]{8}$";

    @Column(nullable = false)
    private Integer msisdnLength = 9;

    @Column(nullable = false)
    private Integer pinLength = 4;

    @Column(nullable = false, length = 120)
    private String serviceName = "Gamers Paradise";

    @Column(nullable = false, length = 200)
    private String pageTitle = "Get Access On Your Mobile";

    @Lob
    @Column(columnDefinition = "TEXT")
    private String disclaimerEn;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String disclaimerAr;

    @Column(length = 255)
    private String pricePointEn;

    @Column(length = 255)
    private String pricePointAr;

    /** API base e.g. http://64.225.87.221/adpoke/cnt/inapp */
    @Column(nullable = false, length = 500)
    private String apiBaseUrl;

    @Column(nullable = false, length = 80)
    private String sendPinPath = "sendotp";

    @Column(nullable = false, length = 80)
    private String verifyPinPath = "validateotp";

    @Column(nullable = false, length = 80)
    private String statusPath = "statuscheck";

    @Column(nullable = false, length = 80)
    private String portalPath = "portal";

    /** PIN query param name: param1 for Adpoke, otp for Zeen */
    @Column(nullable = false, length = 40)
    private String pinParamName = "param1";

    /** Google Ads — optional IDs (legacy / helpers) */
    @Column(length = 40)
    private String googleAdsId;

    @Column(length = 80)
    private String googlePageViewSendTo;

    @Column(length = 80)
    private String googleThankYouSendTo;

    /** Full Google / GTM scripts pasted in admin — used as-is in export */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String googleHeadScript;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String googleBodyScript;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String googleThankYouScript;

    /** Propeller postback */
    @Column(length = 40)
    private String propellerAid;

    @Column(length = 40)
    private String propellerPid;

    @Column(length = 40)
    private String propellerTid;

    @Column(length = 20)
    private String propellerPayout = "1";

    @Column(length = 255)
    private String propellerPostbackUrl = "https://ad.propellerads.com/conversion.php";

    /** Tracking query keys comma-separated: clickid,gclid,token,zoneid */
    @Column(length = 255)
    private String trackingParams = "clickid,click_id,gclid,token";

    private boolean requireOperator = true;

    private boolean enableArabic = true;

    private boolean published = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getPublicDomain() { return publicDomain; }
    public void setPublicDomain(String publicDomain) { this.publicDomain = publicDomain; }
    public String getUrlPath() { return urlPath; }
    public void setUrlPath(String urlPath) { this.urlPath = urlPath; }
    public String getDeployPath() { return deployPath; }
    public void setDeployPath(String deployPath) { this.deployPath = deployPath; }
    public boolean isServeAtRoot() { return serveAtRoot; }
    public void setServeAtRoot(boolean serveAtRoot) { this.serveAtRoot = serveAtRoot; }
    public Instant getLastDeployedAt() { return lastDeployedAt; }
    public void setLastDeployedAt(Instant lastDeployedAt) { this.lastDeployedAt = lastDeployedAt; }
    public String getLastDeployMessage() { return lastDeployMessage; }
    public void setLastDeployMessage(String lastDeployMessage) { this.lastDeployMessage = lastDeployMessage; }
    public PlatformType getPlatform() { return platform; }
    public void setPlatform(PlatformType platform) { this.platform = platform; }
    public UiTemplate getUiTemplate() { return uiTemplate; }
    public void setUiTemplate(UiTemplate uiTemplate) { this.uiTemplate = uiTemplate; }
    public ApiProvider getApiProvider() { return apiProvider; }
    public void setApiProvider(ApiProvider apiProvider) { this.apiProvider = apiProvider; }
    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
    public String getDialPrefix() { return dialPrefix; }
    public void setDialPrefix(String dialPrefix) { this.dialPrefix = dialPrefix; }
    public String getMsisdnRegex() { return msisdnRegex; }
    public void setMsisdnRegex(String msisdnRegex) { this.msisdnRegex = msisdnRegex; }
    public Integer getMsisdnLength() { return msisdnLength; }
    public void setMsisdnLength(Integer msisdnLength) { this.msisdnLength = msisdnLength; }
    public Integer getPinLength() { return pinLength; }
    public void setPinLength(Integer pinLength) { this.pinLength = pinLength; }
    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public String getPageTitle() { return pageTitle; }
    public void setPageTitle(String pageTitle) { this.pageTitle = pageTitle; }
    public String getDisclaimerEn() { return disclaimerEn; }
    public void setDisclaimerEn(String disclaimerEn) { this.disclaimerEn = disclaimerEn; }
    public String getDisclaimerAr() { return disclaimerAr; }
    public void setDisclaimerAr(String disclaimerAr) { this.disclaimerAr = disclaimerAr; }
    public String getPricePointEn() { return pricePointEn; }
    public void setPricePointEn(String pricePointEn) { this.pricePointEn = pricePointEn; }
    public String getPricePointAr() { return pricePointAr; }
    public void setPricePointAr(String pricePointAr) { this.pricePointAr = pricePointAr; }
    public String getApiBaseUrl() { return apiBaseUrl; }
    public void setApiBaseUrl(String apiBaseUrl) { this.apiBaseUrl = apiBaseUrl; }
    public String getSendPinPath() { return sendPinPath; }
    public void setSendPinPath(String sendPinPath) { this.sendPinPath = sendPinPath; }
    public String getVerifyPinPath() { return verifyPinPath; }
    public void setVerifyPinPath(String verifyPinPath) { this.verifyPinPath = verifyPinPath; }
    public String getStatusPath() { return statusPath; }
    public void setStatusPath(String statusPath) { this.statusPath = statusPath; }
    public String getPortalPath() { return portalPath; }
    public void setPortalPath(String portalPath) { this.portalPath = portalPath; }
    public String getPinParamName() { return pinParamName; }
    public void setPinParamName(String pinParamName) { this.pinParamName = pinParamName; }
    public String getGoogleAdsId() { return googleAdsId; }
    public void setGoogleAdsId(String googleAdsId) { this.googleAdsId = googleAdsId; }
    public String getGooglePageViewSendTo() { return googlePageViewSendTo; }
    public void setGooglePageViewSendTo(String googlePageViewSendTo) { this.googlePageViewSendTo = googlePageViewSendTo; }
    public String getGoogleThankYouSendTo() { return googleThankYouSendTo; }
    public void setGoogleThankYouSendTo(String googleThankYouSendTo) { this.googleThankYouSendTo = googleThankYouSendTo; }
    public String getGoogleHeadScript() { return googleHeadScript; }
    public void setGoogleHeadScript(String googleHeadScript) { this.googleHeadScript = googleHeadScript; }
    public String getGoogleBodyScript() { return googleBodyScript; }
    public void setGoogleBodyScript(String googleBodyScript) { this.googleBodyScript = googleBodyScript; }
    public String getGoogleThankYouScript() { return googleThankYouScript; }
    public void setGoogleThankYouScript(String googleThankYouScript) { this.googleThankYouScript = googleThankYouScript; }
    public String getPropellerAid() { return propellerAid; }
    public void setPropellerAid(String propellerAid) { this.propellerAid = propellerAid; }
    public String getPropellerPid() { return propellerPid; }
    public void setPropellerPid(String propellerPid) { this.propellerPid = propellerPid; }
    public String getPropellerTid() { return propellerTid; }
    public void setPropellerTid(String propellerTid) { this.propellerTid = propellerTid; }
    public String getPropellerPayout() { return propellerPayout; }
    public void setPropellerPayout(String propellerPayout) { this.propellerPayout = propellerPayout; }
    public String getPropellerPostbackUrl() { return propellerPostbackUrl; }
    public void setPropellerPostbackUrl(String propellerPostbackUrl) { this.propellerPostbackUrl = propellerPostbackUrl; }
    public String getTrackingParams() { return trackingParams; }
    public void setTrackingParams(String trackingParams) { this.trackingParams = trackingParams; }
    public boolean isRequireOperator() { return requireOperator; }
    public void setRequireOperator(boolean requireOperator) { this.requireOperator = requireOperator; }
    public boolean isEnableArabic() { return enableArabic; }
    public void setEnableArabic(boolean enableArabic) { this.enableArabic = enableArabic; }
    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
