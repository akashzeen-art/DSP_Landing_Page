package com.zeen.lpstudio.service;

import com.zeen.lpstudio.domain.ApiProvider;
import com.zeen.lpstudio.domain.PlatformType;
import com.zeen.lpstudio.domain.UiTemplate;
import com.zeen.lpstudio.dto.LandingPageDto;
import com.zeen.lpstudio.dto.MetaResponse;
import com.zeen.lpstudio.dto.OperatorDto;
import com.zeen.lpstudio.repository.LandingPageRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class SeedDataRunner implements ApplicationRunner {

    private final LandingPageRepository landingPageRepository;
    private final LandingPageService landingPageService;

    public SeedDataRunner(LandingPageRepository landingPageRepository,
                          LandingPageService landingPageService) {
        this.landingPageRepository = landingPageRepository;
        this.landingPageService = landingPageService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (landingPageRepository.count() > 0) return;

        // Sample: Google Palestine G01 style
        LandingPageDto google = new LandingPageDto();
        google.setName("Palestine Google G01 (sample)");
        google.setSlug("psgog01-sample");
        google.setPlatform(PlatformType.GOOGLE);
        google.setUiTemplate(UiTemplate.GOOGLE_MOBILE);
        google.setApiProvider(ApiProvider.ADPOKE);
        google.setCountryCode("970");
        google.setDialPrefix("+970");
        google.setMsisdnRegex("^5[0-9]{8}$");
        google.setMsisdnLength(9);
        google.setPinLength(4);
        google.setServiceName("Gamers Paradise");
        google.setPageTitle("Get Access On Your Mobile");
        google.setPricePointEn("Ooredoo PS: NIS 1.5 / day — Jawwal PS: NIS 1.16 / day");
        google.setDisclaimerEn("On subscribing to Gamers Paradise, you will be charged according to your mobile operator.\n\nOoredoo Palestine: NIS 1.5 per day. Unsubscribe by sending NS to 7902.\nJawwal Palestine: NIS 1.16 per day. Unsubscribe by sending SP to 37637.");
        google.setApiBaseUrl("http://64.225.87.221/adpoke/cnt/inapp");
        google.setSendPinPath("sendotp");
        google.setVerifyPinPath("validateotp");
        google.setStatusPath("statuscheck");
        google.setPortalPath("portal");
        google.setPinParamName("param1");
        google.setGoogleAdsId("AW-18322570229");
        google.setGooglePageViewSendTo("AW-18322570229/B8TfCJHL59UcEPX38KBE");
        google.setGoogleThankYouSendTo("AW-18322570229/NAR8CM3U59UcEPX38KBE");
        google.setTrackingParams("clickid,click_id,gclid,token");
        google.setRequireOperator(true);
        google.setEnableArabic(true);

        OperatorDto o1 = new OperatorDto();
        o1.setName("Ooredoo PS");
        o1.setCode("ooredoo");
        o1.setAdid("232");
        o1.setCmpid("469");
        o1.setPriceLabel("NIS 1.5 / day");
        o1.setUnsubKeyword("NS");
        o1.setUnsubShortcode("7902");
        o1.setSortOrder(0);

        OperatorDto o2 = new OperatorDto();
        o2.setName("Jawwal PS");
        o2.setCode("jawwal");
        o2.setAdid("232");
        o2.setCmpid("468");
        o2.setPriceLabel("NIS 1.16 / day");
        o2.setUnsubKeyword("SP");
        o2.setUnsubShortcode("37637");
        o2.setSortOrder(1);
        google.setOperators(Arrays.asList(o1, o2));
        landingPageService.create(google);

        // Sample: Oman Propeller Zeen
        LandingPageDto oman = new LandingPageDto();
        oman.setName("Oman Propeller ZD Gamez (sample)");
        oman.setSlug("omanprop-sample");
        oman.setPlatform(PlatformType.PROPELLER);
        oman.setUiTemplate(UiTemplate.PROPELLER_MOVSTREAM);
        oman.setApiProvider(ApiProvider.ZEEN);
        oman.setCountryCode("968");
        oman.setDialPrefix("+968");
        oman.setMsisdnRegex("^[79][0-9]{7}$");
        oman.setMsisdnLength(8);
        oman.setPinLength(4);
        oman.setServiceName("ZD Gamez");
        oman.setPageTitle("ZD Gamez");
        oman.setPricePointEn("Omantel: 0.25 OMR / day");
        oman.setDisclaimerEn("ZD Gamez — Omantel: 0.25 OMR/day. To cancel, send SMS UNSUB IVID to 92149.");
        oman.setApiBaseUrl("http://64.225.85.48/adnet");
        oman.setSendPinPath("sendpin");
        oman.setVerifyPinPath("verifypin");
        oman.setStatusPath("checkstatus");
        oman.setPortalPath("Promo/Api/CPportal");
        oman.setPinParamName("otp");
        oman.setPropellerAid("3898869");
        oman.setPropellerTid("154120");
        oman.setPropellerPayout("1");
        oman.setTrackingParams("clickid,click_id,token,zoneid");
        oman.setRequireOperator(false);
        oman.setEnableArabic(true);

        OperatorDto om = new OperatorDto();
        om.setName("Omantel");
        om.setCode("omantel");
        om.setAdid("2203"); // cid
        om.setCmpid("2203");
        om.setPriceLabel("0.25 OMR / day");
        om.setUnsubKeyword("UNSUB IVID");
        om.setUnsubShortcode("92149");
        om.setPortalUrlOverride("http://64.225.85.48/adnet/Promo/Api/CPportal?cid=388");
        oman.setOperators(Collections.singletonList(om));
        landingPageService.create(oman);
    }

    public MetaResponse meta() {
        MetaResponse m = new MetaResponse();
        m.setPlatforms(Arrays.asList("GOOGLE", "PROPELLER", "OTHER"));
        m.setApiProviders(Arrays.asList("ADPOKE", "GECMP", "ZEEN", "CUSTOM"));
        m.setUiTemplates(Arrays.asList("GOOGLE_MOBILE", "PROPELLER_MOVSTREAM"));

        List<Map<String, Object>> presets = new ArrayList<>();
        Map<String, Object> p1 = new LinkedHashMap<>();
        p1.put("id", "ps-google-adpoke");
        p1.put("label", "Palestine Google · Gautam Adpoke");
        p1.put("platform", "GOOGLE");
        p1.put("apiProvider", "ADPOKE");
        p1.put("uiTemplate", "GOOGLE_MOBILE");
        p1.put("countryCode", "970");
        presets.add(p1);

        Map<String, Object> p2 = new LinkedHashMap<>();
        p2.put("id", "oman-propeller-zeen");
        p2.put("label", "Oman Propeller · Zeen");
        p2.put("platform", "PROPELLER");
        p2.put("apiProvider", "ZEEN");
        p2.put("uiTemplate", "PROPELLER_MOVSTREAM");
        p2.put("countryCode", "968");
        presets.add(p2);

        Map<String, Object> p3 = new LinkedHashMap<>();
        p3.put("id", "ps-propeller-adpoke");
        p3.put("label", "Palestine Propeller · Gautam Adpoke");
        p3.put("platform", "PROPELLER");
        p3.put("apiProvider", "ADPOKE");
        p3.put("uiTemplate", "PROPELLER_MOVSTREAM");
        p3.put("countryCode", "970");
        presets.add(p3);

        Map<String, Object> p4 = new LinkedHashMap<>();
        p4.put("id", "ge-beeline-gecmp");
        p4.put("label", "Georgia Beeline · Sanket GEcmp");
        p4.put("platform", "GOOGLE");
        p4.put("apiProvider", "GECMP");
        p4.put("uiTemplate", "GOOGLE_MOBILE");
        p4.put("countryCode", "995");
        presets.add(p4);

        m.setPresets(presets);
        return m;
    }
}
