package com.zeen.lpstudio.service;

import com.zeen.lpstudio.domain.LandingPage;
import com.zeen.lpstudio.domain.Operator;
import com.zeen.lpstudio.domain.UiTemplate;
import com.zeen.lpstudio.dto.LandingPageDto;
import com.zeen.lpstudio.dto.OperatorDto;
import com.zeen.lpstudio.repository.LandingPageRepository;
import com.zeen.lpstudio.repository.OperatorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class LandingPageService {

    private final LandingPageRepository landingPageRepository;
    private final OperatorRepository operatorRepository;

    public LandingPageService(LandingPageRepository landingPageRepository,
                              OperatorRepository operatorRepository) {
        this.landingPageRepository = landingPageRepository;
        this.operatorRepository = operatorRepository;
    }

    @Transactional(readOnly = true)
    public List<LandingPageDto> list() {
        return landingPageRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LandingPageDto get(Long id) {
        return toDto(findEntity(id));
    }

    @Transactional(readOnly = true)
    public LandingPageDto getBySlug(String slug) {
        LandingPage lp = landingPageRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Landing page not found"));
        return toDto(lp);
    }

    @Transactional
    public LandingPageDto create(LandingPageDto dto) {
        validateSlug(dto.getSlug(), null);
        LandingPage lp = new LandingPage();
        apply(lp, dto);
        lp = landingPageRepository.save(lp);
        saveOperators(lp, dto.getOperators());
        return toDto(lp);
    }

    @Transactional
    public LandingPageDto update(Long id, LandingPageDto dto) {
        LandingPage lp = findEntity(id);
        validateSlug(dto.getSlug(), id);
        apply(lp, dto);
        lp = landingPageRepository.save(lp);
        operatorRepository.deleteByLandingPageId(id);
        saveOperators(lp, dto.getOperators());
        return toDto(lp);
    }

    @Transactional
    public void delete(Long id) {
        if (!landingPageRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Landing page not found");
        }
        operatorRepository.deleteByLandingPageId(id);
        landingPageRepository.deleteById(id);
    }

    @Transactional
    public LandingPageDto updateUiTemplate(Long id, String uiTemplateName) {
        if (uiTemplateName == null || uiTemplateName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "uiTemplate is required");
        }
        UiTemplate template;
        try {
            template = UiTemplate.valueOf(uiTemplateName.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown UI template: " + uiTemplateName);
        }
        LandingPage lp = findEntity(id);
        lp.setUiTemplate(template);
        return toDto(landingPageRepository.save(lp));
    }

    @Transactional(readOnly = true)
    public LandingPage findEntity(Long id) {
        return landingPageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Landing page not found"));
    }

    @Transactional(readOnly = true)
    public List<Operator> operatorsFor(Long landingPageId) {
        return operatorRepository.findByLandingPageIdOrderBySortOrderAsc(landingPageId);
    }

    private void validateSlug(String slug, Long excludeId) {
        String clean = slug == null ? "" : slug.trim().toLowerCase().replaceAll("[^a-z0-9\\-_]", "");
        if (clean.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid slug");
        }
        boolean exists = excludeId == null
                ? landingPageRepository.existsBySlug(clean)
                : landingPageRepository.existsBySlugAndIdNot(clean, excludeId);
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already exists: " + clean);
        }
    }

    private void saveOperators(LandingPage lp, List<OperatorDto> ops) {
        if (ops == null) return;
        int i = 0;
        for (OperatorDto dto : ops) {
            Operator op = new Operator();
            op.setLandingPage(lp);
            op.setName(dto.getName());
            op.setCode(dto.getCode());
            op.setAdid(dto.getAdid());
            op.setCmpid(dto.getCmpid());
            op.setPriceLabel(dto.getPriceLabel());
            op.setUnsubKeyword(dto.getUnsubKeyword());
            op.setUnsubShortcode(dto.getUnsubShortcode());
            op.setPortalUrlOverride(dto.getPortalUrlOverride());
            op.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : i);
            op.setActive(dto.isActive());
            operatorRepository.save(op);
            i++;
        }
    }

    private void apply(LandingPage lp, LandingPageDto dto) {
        lp.setName(dto.getName());
        lp.setSlug(dto.getSlug().trim().toLowerCase().replaceAll("[^a-z0-9\\-_]", ""));
        lp.setPublicDomain(normalizeDomain(dto.getPublicDomain()));
        lp.setUrlPath(normalizeUrlPath(dto.getUrlPath()));
        lp.setDeployPath(trimSlash(dto.getDeployPath()));
        lp.setServeAtRoot(dto.isServeAtRoot());
        lp.setPlatform(dto.getPlatform());
        lp.setUiTemplate(dto.getUiTemplate());
        lp.setApiProvider(dto.getApiProvider());
        lp.setCountryCode(dto.getCountryCode());
        lp.setDialPrefix(dto.getDialPrefix());
        lp.setMsisdnRegex(dto.getMsisdnRegex());
        lp.setMsisdnLength(dto.getMsisdnLength());
        lp.setPinLength(dto.getPinLength());
        lp.setServiceName(dto.getServiceName());
        lp.setPageTitle(dto.getPageTitle());
        lp.setDisclaimerEn(dto.getDisclaimerEn());
        lp.setDisclaimerAr(dto.getDisclaimerAr());
        lp.setPricePointEn(dto.getPricePointEn());
        lp.setPricePointAr(dto.getPricePointAr());
        lp.setApiBaseUrl(trimSlash(dto.getApiBaseUrl()));
        lp.setSendPinPath(dto.getSendPinPath());
        lp.setVerifyPinPath(dto.getVerifyPinPath());
        lp.setStatusPath(dto.getStatusPath());
        lp.setPortalPath(dto.getPortalPath());
        lp.setPinParamName(dto.getPinParamName());
        lp.setGoogleAdsId(dto.getGoogleAdsId());
        lp.setGooglePageViewSendTo(dto.getGooglePageViewSendTo());
        lp.setGoogleThankYouSendTo(dto.getGoogleThankYouSendTo());
        lp.setGoogleHeadScript(dto.getGoogleHeadScript());
        lp.setGoogleBodyScript(dto.getGoogleBodyScript());
        lp.setGoogleThankYouScript(dto.getGoogleThankYouScript());
        lp.setPropellerAid(dto.getPropellerAid());
        lp.setPropellerPid(dto.getPropellerPid());
        lp.setPropellerTid(dto.getPropellerTid());
        lp.setPropellerPayout(dto.getPropellerPayout());
        lp.setPropellerPostbackUrl(dto.getPropellerPostbackUrl());
        lp.setTrackingParams(dto.getTrackingParams());
        lp.setRequireOperator(dto.isRequireOperator());
        lp.setEnableArabic(dto.isEnableArabic());
        lp.setPublished(dto.isPublished());
    }

    private String trimSlash(String url) {
        if (url == null) return null;
        while (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url;
    }

    private String normalizeDomain(String domain) {
        if (domain == null) return null;
        String d = domain.trim().toLowerCase();
        if (d.isEmpty()) return null;
        d = d.replaceFirst("^https?://", "");
        int slash = d.indexOf('/');
        if (slash >= 0) d = d.substring(0, slash);
        while (d.endsWith("/")) d = d.substring(0, d.length() - 1);
        return d;
    }

    private String normalizeUrlPath(String path) {
        if (path == null) return null;
        String p = path.trim();
        if (p.isEmpty()) return null;
        while (p.startsWith("/")) p = p.substring(1);
        while (p.endsWith("/")) p = p.substring(0, p.length() - 1);
        return p.isEmpty() ? null : p;
    }

    public LandingPageDto toDto(LandingPage lp) {
        LandingPageDto dto = new LandingPageDto();
        dto.setId(lp.getId());
        dto.setName(lp.getName());
        dto.setSlug(lp.getSlug());
        dto.setPublicDomain(lp.getPublicDomain());
        dto.setUrlPath(lp.getUrlPath());
        dto.setDeployPath(lp.getDeployPath());
        dto.setServeAtRoot(lp.isServeAtRoot());
        dto.setLastDeployedAt(lp.getLastDeployedAt());
        dto.setLastDeployMessage(lp.getLastDeployMessage());
        dto.setPlatform(lp.getPlatform());
        dto.setUiTemplate(lp.getUiTemplate());
        dto.setApiProvider(lp.getApiProvider());
        dto.setCountryCode(lp.getCountryCode());
        dto.setDialPrefix(lp.getDialPrefix());
        dto.setMsisdnRegex(lp.getMsisdnRegex());
        dto.setMsisdnLength(lp.getMsisdnLength());
        dto.setPinLength(lp.getPinLength());
        dto.setServiceName(lp.getServiceName());
        dto.setPageTitle(lp.getPageTitle());
        dto.setDisclaimerEn(lp.getDisclaimerEn());
        dto.setDisclaimerAr(lp.getDisclaimerAr());
        dto.setPricePointEn(lp.getPricePointEn());
        dto.setPricePointAr(lp.getPricePointAr());
        dto.setApiBaseUrl(lp.getApiBaseUrl());
        dto.setSendPinPath(lp.getSendPinPath());
        dto.setVerifyPinPath(lp.getVerifyPinPath());
        dto.setStatusPath(lp.getStatusPath());
        dto.setPortalPath(lp.getPortalPath());
        dto.setPinParamName(lp.getPinParamName());
        dto.setGoogleAdsId(lp.getGoogleAdsId());
        dto.setGooglePageViewSendTo(lp.getGooglePageViewSendTo());
        dto.setGoogleThankYouSendTo(lp.getGoogleThankYouSendTo());
        dto.setGoogleHeadScript(lp.getGoogleHeadScript());
        dto.setGoogleBodyScript(lp.getGoogleBodyScript());
        dto.setGoogleThankYouScript(lp.getGoogleThankYouScript());
        dto.setPropellerAid(lp.getPropellerAid());
        dto.setPropellerPid(lp.getPropellerPid());
        dto.setPropellerTid(lp.getPropellerTid());
        dto.setPropellerPayout(lp.getPropellerPayout());
        dto.setPropellerPostbackUrl(lp.getPropellerPostbackUrl());
        dto.setTrackingParams(lp.getTrackingParams());
        dto.setRequireOperator(lp.isRequireOperator());
        dto.setEnableArabic(lp.isEnableArabic());
        dto.setPublished(lp.isPublished());
        dto.setCreatedAt(lp.getCreatedAt());
        dto.setUpdatedAt(lp.getUpdatedAt());
        dto.setOperators(
                operatorRepository.findByLandingPageIdOrderBySortOrderAsc(lp.getId()).stream()
                        .map(this::toOpDto)
                        .collect(Collectors.toList())
        );
        return dto;
    }

    private OperatorDto toOpDto(Operator op) {
        OperatorDto dto = new OperatorDto();
        dto.setId(op.getId());
        dto.setName(op.getName());
        dto.setCode(op.getCode());
        dto.setAdid(op.getAdid());
        dto.setCmpid(op.getCmpid());
        dto.setPriceLabel(op.getPriceLabel());
        dto.setUnsubKeyword(op.getUnsubKeyword());
        dto.setUnsubShortcode(op.getUnsubShortcode());
        dto.setPortalUrlOverride(op.getPortalUrlOverride());
        dto.setSortOrder(op.getSortOrder());
        dto.setActive(op.isActive());
        return dto;
    }
}
