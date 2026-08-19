package com.zeen.lpstudio.dto;

import com.zeen.lpstudio.domain.ApiProvider;
import com.zeen.lpstudio.domain.PlatformType;
import com.zeen.lpstudio.domain.UiTemplate;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class LandingPageDto {
    private Long id;

    @NotBlank
    private String name;

    @NotBlank
    private String slug;

    /** Live host without scheme, e.g. ge-playcontent.com */
    private String publicDomain;

    /** Public URL path under domain (empty = slug, or root if serveAtRoot) */
    private String urlPath;

    /** Absolute server path for FileZilla / SFTP deploy */
    private String deployPath;

    private boolean serveAtRoot = false;
    private Instant lastDeployedAt;
    private String lastDeployMessage;

    @NotNull
    private PlatformType platform = PlatformType.GOOGLE;

    @NotNull
    private UiTemplate uiTemplate = UiTemplate.GOOGLE_MOBILE;

    @NotNull
    private ApiProvider apiProvider = ApiProvider.ADPOKE;

    @NotBlank
    private String countryCode = "970";
    private String dialPrefix = "+970";
    private String msisdnRegex = "^5[0-9]{8}$";
    private Integer msisdnLength = 9;
    private Integer pinLength = 4;
    private String serviceName = "Gamers Paradise";
    private String pageTitle = "Get Access On Your Mobile";
    private String disclaimerEn;
    private String disclaimerAr;
    private String pricePointEn;
    private String pricePointAr;

    @NotBlank
    private String apiBaseUrl;
    private String sendPinPath = "sendotp";
    private String verifyPinPath = "validateotp";
    private String statusPath = "statuscheck";
    private String portalPath = "portal";
    private String pinParamName = "param1";

    private String googleAdsId;
    private String googlePageViewSendTo;
    private String googleThankYouSendTo;
    private String googleHeadScript;
    private String googleBodyScript;
    private String googleThankYouScript;

    private String propellerAid;
    private String propellerPid;
    private String propellerTid;
    private String propellerPayout = "1";
    private String propellerPostbackUrl = "https://ad.propellerads.com/conversion.php";

    private String trackingParams = "clickid,click_id,gclid,token";
    private boolean requireOperator = true;
    private boolean enableArabic = true;
    private boolean published = false;
    private Instant createdAt;
    private Instant updatedAt;

    @Valid
    private List<OperatorDto> operators = new ArrayList<>();

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
    public List<OperatorDto> getOperators() { return operators; }
    public void setOperators(List<OperatorDto> operators) { this.operators = operators; }
}
