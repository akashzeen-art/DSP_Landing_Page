package com.zeen.lpstudio.generator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zeen.lpstudio.domain.LandingPage;
import com.zeen.lpstudio.domain.Operator;
import com.zeen.lpstudio.domain.PlatformType;
import com.zeen.lpstudio.domain.UiTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds a deployable static LP folder (HTML/JS/CSS/PHP) from DB config.
 */
@Component
public class LandingPageGenerator {

    private final ObjectMapper objectMapper;

    public LandingPageGenerator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, byte[]> generateFiles(LandingPage lp, List<Operator> operators) {
        Map<String, byte[]> files = new LinkedHashMap<>();
        List<Operator> active = operators.stream().filter(Operator::isActive).collect(Collectors.toList());

        String configJson = toConfigJson(lp, active);
        boolean googleUi = lp.getPlatform() == PlatformType.GOOGLE
                || lp.getUiTemplate() == UiTemplate.GOOGLE_MOBILE;
        boolean needsPostback = lp.getPlatform() == PlatformType.PROPELLER
                || lp.getPlatform() == PlatformType.OTHER
                || (lp.getPropellerAid() != null && !lp.getPropellerAid().isBlank());

        if (googleUi) {
            files.put("index.html", bytes(googleIndexHtml(lp)));
            files.put("thankyou.html", bytes(googleThankYouHtml(lp)));
            files.put("styles.css", bytes(googleStylesCss()));
            files.put("script.js", bytes(runtimeScript(lp, configJson, true)));
            files.put("adpoke-api.php", bytes(apiProxyPhp(lp)));
            files.put("php-test.php", bytes(phpTest(lp)));
        } else {
            files.put("index.html", bytes(propellerIndexHtml(lp)));
            files.put("pin.html", bytes(propellerPinHtml(lp)));
            files.put("styles.css", bytes(propellerStylesCss()));
            files.put("script.js", bytes(runtimeScript(lp, configJson, false)));
            files.put("adpoke-api.php", bytes(apiProxyPhp(lp)));
            files.put("php-test.php", bytes(phpTest(lp)));
        }
        if (needsPostback) {
            files.put("propeller-pb.php", bytes(propellerPbPhp(lp)));
        }

        files.put("lp-config.json", bytes(configJson));
        files.put("nginx-site.conf", bytes(com.zeen.lpstudio.util.CampaignUrls.nginxSnippet(lp)));
        files.put("README-DEPLOY.txt", bytes(deployReadme(lp)));
        return files;
    }

    private String toConfigJson(LandingPage lp, List<Operator> ops) {
        try {
            Map<String, Object> cfg = new LinkedHashMap<>();
            cfg.put("slug", lp.getSlug());
            cfg.put("platform", lp.getPlatform().name());
            cfg.put("uiTemplate", lp.getUiTemplate().name());
            cfg.put("apiProvider", lp.getApiProvider().name());
            cfg.put("countryCode", lp.getCountryCode());
            cfg.put("dialPrefix", lp.getDialPrefix());
            cfg.put("msisdnRegex", lp.getMsisdnRegex());
            cfg.put("msisdnLength", lp.getMsisdnLength());
            cfg.put("pinLength", lp.getPinLength());
            cfg.put("serviceName", lp.getServiceName());
            cfg.put("pageTitle", lp.getPageTitle());
            cfg.put("disclaimerEn", nullToEmpty(lp.getDisclaimerEn()));
            cfg.put("disclaimerAr", nullToEmpty(lp.getDisclaimerAr()));
            cfg.put("pricePointEn", nullToEmpty(lp.getPricePointEn()));
            cfg.put("pricePointAr", nullToEmpty(lp.getPricePointAr()));
            cfg.put("apiBaseUrl", lp.getApiBaseUrl());
            cfg.put("sendPinPath", lp.getSendPinPath());
            cfg.put("verifyPinPath", lp.getVerifyPinPath());
            cfg.put("statusPath", lp.getStatusPath());
            cfg.put("portalPath", lp.getPortalPath());
            cfg.put("pinParamName", lp.getPinParamName());
            cfg.put("googleAdsId", nullToEmpty(lp.getGoogleAdsId()));
            cfg.put("googlePageViewSendTo", nullToEmpty(lp.getGooglePageViewSendTo()));
            cfg.put("googleThankYouSendTo", nullToEmpty(lp.getGoogleThankYouSendTo()));
            cfg.put("googleHeadScript", nullToEmpty(lp.getGoogleHeadScript()));
            cfg.put("googleBodyScript", nullToEmpty(lp.getGoogleBodyScript()));
            cfg.put("googleThankYouScript", nullToEmpty(lp.getGoogleThankYouScript()));
            cfg.put("propellerAid", nullToEmpty(lp.getPropellerAid()));
            cfg.put("propellerPid", nullToEmpty(lp.getPropellerPid()));
            cfg.put("propellerTid", nullToEmpty(lp.getPropellerTid()));
            cfg.put("propellerPayout", nullToEmpty(lp.getPropellerPayout()));
            cfg.put("propellerPostbackUrl", nullToEmpty(lp.getPropellerPostbackUrl()));
            cfg.put("trackingParams", nullToEmpty(lp.getTrackingParams()));
            cfg.put("requireOperator", lp.isRequireOperator());
            cfg.put("enableArabic", lp.isEnableArabic());

            List<Map<String, Object>> opList = new ArrayList<>();
            for (Operator op : ops) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("code", op.getCode());
                m.put("name", op.getName());
                m.put("adid", op.getAdid());
                m.put("cmpid", op.getCmpid());
                m.put("priceLabel", nullToEmpty(op.getPriceLabel()));
                m.put("unsubKeyword", nullToEmpty(op.getUnsubKeyword()));
                m.put("unsubShortcode", nullToEmpty(op.getUnsubShortcode()));
                m.put("portalUrlOverride", nullToEmpty(op.getPortalUrlOverride()));
                opList.add(m);
            }
            cfg.put("operators", opList);
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(cfg);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize LP config", e);
        }
    }

    private String googleHeadTagsHtml(LandingPage lp) {
        String custom = nullToEmpty(lp.getGoogleHeadScript()).trim();
        return custom.isEmpty() ? "" : custom + "\n";
    }

    private String googleBodyBackup(LandingPage lp) {
        String custom = nullToEmpty(lp.getGoogleBodyScript()).trim();
        return custom.isEmpty() ? "" : custom + "\n";
    }

    private String googleThankYouHtml(LandingPage lp) {
        // Same head + body scripts on thank-you page (paste once in admin)
        return "<!DOCTYPE html>\n<html lang=\"en\"><head>\n"
                + googleHeadTagsHtml(lp)
                + "<meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
                + "<title>Thank You</title><link rel=\"stylesheet\" href=\"styles.css\" />\n"
                + "<style>.thankyou-wrap{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;padding:32px}</style>\n"
                + "</head><body>\n"
                + googleBodyBackup(lp)
                + "<div class=\"root ps\"><div class=\"container\"><div class=\"thankyou-wrap\"><h1>Thank you</h1><p>Redirecting you now…</p></div></div></div>\n"
                + "<script>\n"
                + "(function(){\n"
                + "  var p=new URLSearchParams(location.search);\n"
                + "  var qs='adid='+encodeURIComponent(p.get('adid')||'')+'&cmpid='+encodeURIComponent(p.get('cmpid')||'')+'&token='+encodeURIComponent(p.get('token')||'')+'&msisdn='+encodeURIComponent(p.get('msisdn')||'');\n"
                + "  setTimeout(function(){\n"
                + "    if(p.get('adid')&&p.get('cmpid')&&p.get('token')&&p.get('msisdn')) location.href='adpoke-api.php?path=" + esc(lp.getPortalPath()) + "&'+qs;\n"
                + "    else location.href='index.html';\n"
                + "  },800);\n"
                + "})();\n"
                + "</script>\n</body></html>\n";
    }

    private String googleIndexHtml(LandingPage lp) {
        StringBuilder ops = new StringBuilder();
        ops.append("<div class=\"operator-list\" id=\"operatorList\" role=\"group\" aria-label=\"Operators\"></div>");

        return "<!DOCTYPE html>\n"
                + "<html lang=\"en\">\n<head>\n"
                + googleHeadTagsHtml(lp)
                + "  <meta charset=\"UTF-8\" />\n"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no\" />\n"
                + "  <meta name=\"theme-color\" content=\"#0b1b2b\" />\n"
                + "  <title>" + esc(lp.getPageTitle()) + "</title>\n"
                + "  <link rel=\"icon\" href=\"data:,\" />\n"
                + "  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n"
                + "  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n"
                + "  <link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap\" rel=\"stylesheet\" />\n"
                + "  <link rel=\"stylesheet\" href=\"styles.css\" />\n"
                + "</head>\n<body>\n"
                + googleBodyBackup(lp)
                + "  <div id=\"top\" class=\"root ps\">\n"
                + "    <div class=\"container\">\n"
                + "      <div class=\"creativeArea\">\n"
                + "        <h1 class=\"mainTitle\"><span data-i18n=\"mainTitle\">" + esc(lp.getPageTitle()) + "</span></h1>\n"
                + "      </div>\n"
                + (lp.isEnableArabic() ? "      <button type=\"button\" class=\"switchLang\" id=\"langBtn\">عربى</button>\n" : "")
                + "      <div class=\"subscriptionAreaWrapper\">\n"
                + "        <div id=\"divFocus\" class=\"PinFlow\">\n"
                + "          <div class=\"subscriptionArea msisdn-entry view\" id=\"viewMsisdn\">\n"
                + "            <div class=\"steps\">\n"
                + "              <div class=\"step active\"><span class=\"num\">1</span><span data-i18n=\"step1\">Enter your mobile number</span></div>\n"
                + "              <div class=\"step\"><span class=\"num\">2</span><span data-i18n=\"step2\">Enter PIN Code</span></div>\n"
                + "            </div>\n"
                + "            <form id=\"msisdnForm\" autocomplete=\"on\">\n"
                + "              <div class=\"number-entry\">\n"
                + "                <h1 class=\"msisdnLabel\" data-i18n=\"msisdnLabel\">Enter your mobile number to access now</h1>\n"
                + "                <div class=\"phoneInputWrap\">\n"
                + "                  <div class=\"phone-input pulse-field\" id=\"phoneField\">\n"
                + "                    <div class=\"phone\"><span class=\"cc\">" + esc(lp.getDialPrefix()) + "</span></div>\n"
                + "                    <input type=\"tel\" inputmode=\"numeric\" id=\"phone-input\" class=\"text-input\" maxlength=\"" + lp.getMsisdnLength() + "\" />\n"
                + "                  </div>\n"
                + "                </div>\n"
                + "                <p class=\"errorBox\" id=\"errMsisdn\" role=\"alert\"></p>\n"
                + "                <button id=\"msisdn-submit-button\" type=\"submit\" class=\"btn flex btn-blink\" disabled>\n"
                + "                  <div class=\"btn__primary\" data-i18n=\"btnContinue\">Continue</div>\n"
                + "                  <span class=\"btn__secondary\" data-i18n=\"btnSub\">to Subscribe</span>\n"
                + "                </button>\n"
                + "              </div>\n"
                + "            </form>\n"
                + "          </div>\n"
                + "          <div class=\"subscriptionArea operator-entry view hide\" id=\"viewOperator\">\n"
                + "            <div class=\"number-entry\">\n"
                + "              <h1 class=\"msisdnLabel\" data-i18n=\"opLabel\">Choose your operator</h1>\n"
                + ops
                + "              <p class=\"errorBox\" id=\"errOperator\" role=\"alert\"></p>\n"
                + "              <div class=\"submitload\" id=\"opLoad\"></div>\n"
                + "            </div>\n"
                + "          </div>\n"
                + "          <div class=\"subscriptionArea pin-entry view hide\" id=\"viewPin\">\n"
                + "            <form id=\"pinForm\">\n"
                + "              <div class=\"number-entry\">\n"
                + "                <h1 class=\"msisdnLabel\" data-i18n=\"pinLabel\">Enter the " + lp.getPinLength() + "-digit PIN</h1>\n"
                + "                <div class=\"phoneInputWrap\">\n"
                + "                  <div class=\"phone-input pin-input\">\n"
                + "                    <input type=\"tel\" inputmode=\"numeric\" id=\"pin-input\" class=\"text-input\" maxlength=\"" + lp.getPinLength() + "\" placeholder=\"••••\" />\n"
                + "                  </div>\n"
                + "                </div>\n"
                + "                <p class=\"errorBox\" id=\"errPin\" role=\"alert\"></p>\n"
                + "                <button id=\"pin-submit-button\" type=\"submit\" class=\"btn flex\" disabled>\n"
                + "                  <div class=\"btn__primary\" data-i18n=\"btnConfirm\">Confirm</div>\n"
                + "                </button>\n"
                + "              </div>\n"
                + "            </form>\n"
                + "          </div>\n"
                + "        </div>\n"
                + "      </div>\n"
                + "      <div class=\"legalArea\" id=\"legal\">\n"
                + "        <div class=\"price-point\"><div data-i18n=\"pricePoint\">" + esc(nullToEmpty(lp.getPricePointEn())) + "</div></div>\n"
                + "        <div class=\"disclaimer\"><div data-i18n=\"disclaimer\">" + esc(nullToEmpty(lp.getDisclaimerEn())).replace("\n", "<br/>") + "</div></div>\n"
                + "      </div>\n"
                + "      <div class=\"agree-checkboxes\">\n"
                + "        <div class=\"checkbox-container\">\n"
                + "          <input type=\"checkbox\" id=\"agreeAutoRenew\" checked />\n"
                + "          <label for=\"agreeAutoRenew\"><span class=\"checkbox-label\" data-i18n=\"agreeRenew\">I agree that my subscription will automatically renew.</span></label>\n"
                + "        </div>\n"
                + "        <div class=\"checkbox-container\">\n"
                + "          <input type=\"checkbox\" id=\"agreeTerms\" checked />\n"
                + "          <label for=\"agreeTerms\"><span class=\"checkbox-label\" data-i18n=\"agreeTerms\">I confirm I am 18+ and accept the Terms.</span></label>\n"
                + "        </div>\n"
                + "      </div>\n"
                + "    </div>\n"
                + "  </div>\n"
                + "  <script src=\"script.js\" defer></script>\n"
                + "</body>\n</html>\n";
    }

    private String propellerIndexHtml(LandingPage lp) {
        return "<!DOCTYPE html>\n<html lang=\"en\" dir=\"ltr\">\n<head>\n"
                + "<meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no\" />\n"
                + "<title>" + esc(lp.getServiceName()) + "</title>\n"
                + "<link rel=\"stylesheet\" href=\"styles.css\" />\n</head>\n<body>\n"
                + "<div class=\"wrapper\">\n"
                + "  <div id=\"header\"><div class=\"rightheader\"><div class=\"hdrtxt\">Watch Now</div>"
                + (lp.isEnableArabic() ? "<div class=\"langbtnwrap show\"><a href=\"#\" class=\"langbtn active\" data-lang=\"en\">English</a><a href=\"#\" class=\"langbtn\" data-lang=\"ar\">عربي</a></div>" : "")
                + "</div><div class=\"clear\"></div></div>\n"
                + "  <div class=\"videoframe\"><div class=\"screenload\">\n"
                + "    <div class=\"loadbox\" id=\"loadbox\"><div class=\"contentbox\"><div class=\"contentsection\">\n"
                + "      <div id=\"mbox\" class=\"section\"><form id=\"mboxform\" novalidate>\n"
                + "        <div class=\"pntxt\" data-i18n=\"pnTitle\">Please enter your mobile number</div>\n"
                + "        <div class=\"mobileBox pulseflash\"><span class=\"prefixbox\">" + esc(lp.getDialPrefix()) + "</span>\n"
                + "          <input type=\"tel\" id=\"m\" maxlength=\"" + lp.getMsisdnLength() + "\" inputmode=\"numeric\" />\n"
                + "        </div>\n"
                + "        <div class=\"errorBox\"></div>\n"
                + "        <div class=\"btnpn\"><button type=\"submit\" class=\"button\"><div class=\"btntxt\" data-i18n=\"mBtn\">Subscribe</div><div class=\"submitload\"></div></button></div>\n"
                + "      </form></div>\n"
                + "    </div></div></div>\n"
                + "  </div></div>\n"
                + "  <div id=\"footer\"><div class=\"tnc\" data-i18n-html=\"footerNote\">" + esc(nullToEmpty(lp.getDisclaimerEn())) + "</div></div>\n"
                + "</div>\n<script src=\"script.js\"></script>\n</body></html>\n";
    }

    private String propellerPinHtml(LandingPage lp) {
        return "<!DOCTYPE html>\n<html lang=\"en\"><head>\n"
                + "<meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n"
                + "<title>PIN</title><link rel=\"stylesheet\" href=\"styles.css\" />\n</head><body>\n"
                + "<div class=\"wrapper\"><div class=\"videoframe\"><div class=\"screenload\"><div class=\"loadbox resetloadbox\" style=\"display:block\">\n"
                + "<div class=\"contentbox\"><form id=\"pboxform\" novalidate>\n"
                + "<div class=\"pintxt\" data-i18n=\"pinTitle\">Enter the " + lp.getPinLength() + "-digit PIN</div>\n"
                + "<div class=\"pinBox pulseflash\"><input type=\"tel\" id=\"p\" maxlength=\"" + lp.getPinLength() + "\" inputmode=\"numeric\" /></div>\n"
                + "<div class=\"errorBox\"></div>\n"
                + "<div class=\"btnpin\"><button type=\"submit\" class=\"button\"><div class=\"btntxt\">Confirm</div><div class=\"submitload\"></div></button></div>\n"
                + "</form></div></div></div></div>\n"
                + "<div id=\"footer\"><div class=\"tnc\" data-i18n-html=\"footerNote\">" + esc(nullToEmpty(lp.getDisclaimerEn())) + "</div></div></div>\n"
                + "<script src=\"script.js\"></script>\n</body></html>\n";
    }

    /**
     * Shared runtime — multi API doc styles: ADPOKE (Gautam), ZEEN, GECMP (Sanket).
     */
    private String runtimeScript(LandingPage lp, String configJson, boolean googleStyle) {
        return "(function(){\n\"use strict\";\n"
                + "var CFG=" + configJson.replace("</", "<\\/") + ";\n"
                + "var PIN_LENGTH=CFG.pinLength||4;\n"
                + "var msisdnFormat=new RegExp(CFG.msisdnRegex);\n"
                + "var COUNTRY=String(CFG.countryCode||'');\n"
                + "var API_BASE=String(CFG.apiBaseUrl||'');\n"
                + "var PROVIDER=String(CFG.apiProvider||'ADPOKE');\n"
                + "var useProxy=typeof location!=='undefined'&&location.protocol!=='file:'&&(location.protocol==='http:'||location.protocol==='https:');\n"
                + "function persist(k,v){if(v==null||v==='')return;try{sessionStorage.setItem(k,v)}catch(e){}try{localStorage.setItem(k,v)}catch(e2){}}\n"
                + "function track(k){try{var v=sessionStorage.getItem(k);if(v)return v}catch(e){}try{return localStorage.getItem(k)||''}catch(e2){return ''}}\n"
                + "function normalizeLocal(raw){var d=String(raw||'').replace(/\\D/g,'');if(COUNTRY&&d.indexOf(COUNTRY)===0)d=d.slice(COUNTRY.length);if(d.charAt(0)==='0')d=d.slice(1);return d.slice(0,CFG.msisdnLength||9)}\n"
                + "function fullMsisdn(local){return (PROVIDER==='ADPOKE')?local:(COUNTRY+local)}\n"
                + "function initTracking(){var p=new URLSearchParams(location.search);var keys=(CFG.trackingParams||'clickid,token,gclid').split(',');var token='';for(var i=0;i<keys.length;i++){var v=p.get(keys[i].trim());if(v){token=v;break}}if(token&&token!=='${SUBID}'&&String(token).toLowerCase()!=='clickid'&&token!=='{gclid}')persist('token',token)}\n"
                + "function getToken(){var e=track('token');if(e)return e;var f='t_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);persist('token',f);return f}\n"
                + "function getUserIp(cb){var c=track('user_ip');if(c){cb(c);return}fetch('https://api.ipify.org?format=json').then(function(r){return r.json()}).then(function(d){var ip=(d&&d.ip)||'0.0.0.0';persist('user_ip',ip);cb(ip)}).catch(function(){cb('0.0.0.0')})}\n"
                + "function buildProxy(path,qs){return 'adpoke-api.php?path='+encodeURIComponent(path)+'&'+qs}\n"
                + "function apiCall(path,params,done){var qs=Object.keys(params).filter(function(k){return params[k]!=null&&params[k]!==''}).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k])}).join('&');var url=useProxy?buildProxy(path,qs):(API_BASE+'/'+path+'?'+qs);fetch(url,{method:'GET'}).then(function(r){return r.text()}).then(function(t){if(/^\\s*<\\?php/i.test(t)){done(new Error('php_not_running'));return}try{done(null,JSON.parse(t))}catch(e){done(new Error('bad_json'))}}).catch(function(err){done(err)})}\n"
                + "function isOk(d){if(!d)return false;var r=String(d.response||d.msg||'').toUpperCase();if(r.indexOf('SUCCESS')!==-1||r==='ACTIVE')return true;if(d.status===true||String(d.status).toLowerCase()==='true')return true;return false}\n"
                + "function firstOp(){return (CFG.operators&&CFG.operators[0])||null}\n"
                /* Build send-PIN params per integration doc family */
                + "function buildSendParams(op,local,ip,done){var msisdn=fullMsisdn(local);if(PROVIDER==='GECMP'){done({cid:op.adid||op.cmpid,msisdn:msisdn,ip:ip||'0.0.0.0'});return}if(PROVIDER==='ZEEN'){done({cid:op.adid,msisdn:msisdn,click_id:getToken(),pub_id:'lp',user_ip:ip||'0.0.0.0',ua:navigator.userAgent||''});return}done({adid:op.adid,cmpid:op.cmpid,token:getToken(),msisdn:msisdn})}\n"
                + "function buildVerifyParams(op,local,pin,ip,done){var msisdn=fullMsisdn(local);if(PROVIDER==='GECMP'){done({cid:op.adid||op.cmpid,msisdn:msisdn,pin:pin,ip:ip||'0.0.0.0',sessionKey:track('sessionKey')});return}if(PROVIDER==='ZEEN'){done({cid:op.adid,msisdn:msisdn,click_id:getToken(),otp:pin,user_ip:ip||'0.0.0.0',ua:navigator.userAgent||'',sessionKey:track('sessionKey')});return}var p={adid:op.adid,cmpid:op.cmpid,token:getToken(),msisdn:msisdn};p[CFG.pinParamName||'param1']=pin;done(p)}\n"
                + "function buildStatusParams(op,local){var msisdn=fullMsisdn(local);if(PROVIDER==='GECMP'||PROVIDER==='ZEEN')return{cid:op.adid||op.cmpid,msisdn:msisdn};return{adid:op.adid,cmpid:op.cmpid,token:getToken(),msisdn:msisdn}}\n"
                + "function portalHref(op,local){var msisdn=fullMsisdn(local);if(PROVIDER==='GECMP'){var qs='cid='+encodeURIComponent(op.adid||op.cmpid)+'&msisdn='+encodeURIComponent(msisdn);return useProxy?buildProxy(CFG.portalPath,qs):(API_BASE+'/'+CFG.portalPath+'?'+qs)}if(PROVIDER==='ZEEN'){return API_BASE+'/'+CFG.portalPath+(String(CFG.portalPath).indexOf('?')>=0?'&':'?')+'cid='+encodeURIComponent(op.adid)}var qs='adid='+encodeURIComponent(op.adid)+'&cmpid='+encodeURIComponent(op.cmpid)+'&token='+encodeURIComponent(getToken())+'&msisdn='+encodeURIComponent(msisdn);return useProxy?buildProxy(CFG.portalPath,qs):(API_BASE+'/'+CFG.portalPath+'?'+qs)}\n"
                + "function afterSendSuccess(data,next){if(data&&data.sessionKey)persist('sessionKey',data.sessionKey);next()}\n"
                + (googleStyle ? googleRuntime() : propellerRuntime(lp))
                + "})();\n";
    }

    private String googleRuntime() {
        return "initTracking();getUserIp(function(){});\n"
                + "var lang='en';\n"
                + "function showView(id){document.querySelectorAll('.view').forEach(function(v){v.classList.add('hide')});var el=document.getElementById(id);if(el)el.classList.remove('hide')}\n"
                + "function renderOps(){var box=document.getElementById('operatorList');if(!box)return;box.innerHTML='';(CFG.operators||[]).forEach(function(op){var b=document.createElement('button');b.type='button';b.className='op-btn';b.setAttribute('data-code',op.code);b.innerHTML='<span class=\"op-name\">'+op.name+'</span><span class=\"op-price\">'+(op.priceLabel||'')+'</span>';b.addEventListener('click',function(){sendPin(op)});box.appendChild(b)})}\n"
                + "function sendPin(op){var err=document.getElementById('errOperator');var load=document.getElementById('opLoad');err.textContent='';var local=normalizeLocal(track('phone'));persist('adid',op.adid);persist('cmpid',op.cmpid||op.adid);persist('operator',op.code);if(load)load.classList.add('show');getUserIp(function(ip){buildSendParams(op,local,ip,function(params){apiCall(CFG.sendPinPath,params,function(e,d){if(load)load.classList.remove('show');if(e||!isOk(d)){err.textContent=(d&&(d.errorMessage||d.msg))||'OTP could not be sent';return}afterSendSuccess(d,function(){showView('viewPin');var pin=document.getElementById('pin-input');if(pin)pin.focus()})})})})}\n"
                + "renderOps();\n"
                + "var phone=document.getElementById('phone-input');var btn=document.getElementById('msisdn-submit-button');\n"
                + "phone.addEventListener('input',function(){phone.value=normalizeLocal(phone.value);btn.disabled=!msisdnFormat.test(phone.value)});\n"
                + "document.getElementById('msisdnForm').addEventListener('submit',function(e){e.preventDefault();var local=normalizeLocal(phone.value);if(!msisdnFormat.test(local)){document.getElementById('errMsisdn').textContent='Invalid mobile number';return}persist('phone',local);if(CFG.requireOperator){showView('viewOperator')}else{var op=firstOp();if(op)sendPin(op)}});\n"
                + "var pinInput=document.getElementById('pin-input');var pinBtn=document.getElementById('pin-submit-button');\n"
                + "pinInput.addEventListener('input',function(){pinInput.value=String(pinInput.value||'').replace(/\\D/g,'').slice(0,PIN_LENGTH);pinBtn.disabled=pinInput.value.length!==PIN_LENGTH});\n"
                + "document.getElementById('pinForm').addEventListener('submit',function(e){e.preventDefault();var pin=String(pinInput.value||'').replace(/\\D/g,'');var err=document.getElementById('errPin');err.textContent='';var local=normalizeLocal(track('phone'));var op={adid:track('adid'),cmpid:track('cmpid')||track('adid')};pinBtn.disabled=true;getUserIp(function(ip){buildVerifyParams(op,local,pin,ip,function(params){apiCall(CFG.verifyPinPath,params,function(apiErr,data){if(apiErr||!isOk(data)){pinBtn.disabled=false;err.textContent=(data&&(data.errorMessage||data.msg))||'Invalid PIN';return}apiCall(CFG.statusPath,buildStatusParams(op,local),function(){var msisdn=fullMsisdn(local);if(PROVIDER==='GECMP'){location.href=portalHref(op,local);return}location.href='thankyou.html?adid='+encodeURIComponent(op.adid)+'&cmpid='+encodeURIComponent(op.cmpid)+'&token='+encodeURIComponent(getToken())+'&msisdn='+encodeURIComponent(PROVIDER==='ADPOKE'?local:msisdn)})})})})});\n"
                + "if(document.getElementById('langBtn')){document.getElementById('langBtn').addEventListener('click',function(){lang=lang==='en'?'ar':'en';document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.querySelectorAll('[data-i18n=\"disclaimer\"]').forEach(function(el){el.textContent=lang==='ar'?(CFG.disclaimerAr||CFG.disclaimerEn):CFG.disclaimerEn});document.querySelectorAll('[data-i18n=\"pricePoint\"]').forEach(function(el){el.textContent=lang==='ar'?(CFG.pricePointAr||CFG.pricePointEn):CFG.pricePointEn})})}\n";
    }

    private String propellerRuntime(LandingPage lp) {
        boolean hasPostback = lp.getPlatform() == PlatformType.PROPELLER
                || lp.getPlatform() == PlatformType.OTHER
                || (lp.getPropellerAid() != null && !lp.getPropellerAid().isBlank());
        return "initTracking();getUserIp(function(){});\n"
                + "function firePb(done){if(!CFG.propellerAid&&!CFG.propellerPostbackUrl){done();return}var vid=getToken();var qs='visitor_id='+encodeURIComponent(vid)+'&payout='+encodeURIComponent(CFG.propellerPayout||'1');try{fetch('propeller-pb.php?'+qs,{method:'GET',keepalive:true}).finally(function(){done()})}catch(e){done()}}\n"
                + "var mForm=document.getElementById('mboxform');\n"
                + "if(mForm){var mInput=document.getElementById('m');mInput.addEventListener('input',function(){mInput.value=normalizeLocal(mInput.value)});mForm.addEventListener('submit',function(e){e.preventDefault();var local=normalizeLocal(mInput.value);var err=document.querySelector('.errorBox');if(!msisdnFormat.test(local)){err.textContent='Invalid number';return}persist('phone',local);var op=firstOp();if(!op){err.textContent='No operator configured';return}persist('adid',op.adid);persist('cmpid',op.cmpid||op.adid);getUserIp(function(ip){buildSendParams(op,local,ip,function(params){apiCall(CFG.sendPinPath,params,function(apiErr,data){if(apiErr||!isOk(data)){err.textContent=(data&&(data.errorMessage||data.msg))||'PIN send failed';return}afterSendSuccess(data,function(){location.href='pin.html'})})})})})}\n"
                + "var pForm=document.getElementById('pboxform');\n"
                + "if(pForm){if(!track('phone')){location.href='index.html';return}var pInput=document.getElementById('p');pForm.addEventListener('submit',function(e){e.preventDefault();var pin=String(pInput.value||'').replace(/\\D/g,'');var err=document.querySelector('.errorBox');if(pin.length!==PIN_LENGTH){err.textContent='Enter PIN';return}var local=normalizeLocal(track('phone'));var op={adid:track('adid'),cmpid:track('cmpid')||track('adid')};getUserIp(function(ip){buildVerifyParams(op,local,pin,ip,function(params){apiCall(CFG.verifyPinPath,params,function(apiErr,data){if(apiErr||!isOk(data)){err.textContent=(data&&(data.errorMessage||data.msg))||'Invalid PIN';return}function goPortal(){location.href=portalHref(op,local)} " + (hasPostback ? "firePb(goPortal);" : "goPortal();") + "})})})}\n";
    }

    private String googleStylesCss() {
        return "*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:'DM Sans',system-ui,sans-serif;background:linear-gradient(160deg,#0b1b2b,#12324a 45%,#0b1b2b);color:#fff;min-height:100vh}.root{min-height:100vh}.container{max-width:480px;margin:0 auto;padding:20px 16px 40px}.hide{display:none!important}.mainTitle{font-size:1.45rem;margin:12px 0 18px;text-align:center}.switchLang{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.12);border:0;color:#fff;padding:8px 12px;border-radius:8px}.subscriptionArea{background:rgba(255,255,255,.06);border-radius:16px;padding:18px;margin-bottom:16px}.steps{display:flex;gap:8px;margin-bottom:14px;font-size:.78rem;opacity:.85}.step{display:flex;gap:6px;align-items:center}.step .num{width:20px;height:20px;border-radius:50%;background:#1f6feb;display:inline-flex;align-items:center;justify-content:center;font-size:.7rem}.msisdnLabel{font-size:1.05rem;margin:0 0 12px}.phone-input{display:flex;align-items:center;gap:8px;background:#fff;border-radius:12px;padding:10px 12px;color:#111}.phone-input input{border:0;outline:0;flex:1;font-size:1.05rem;width:100%}.cc{font-weight:700;color:#333}.btn{width:100%;margin-top:14px;border:0;border-radius:12px;padding:14px;background:linear-gradient(90deg,#19c37d,#0fa968);color:#fff;font-weight:700;cursor:pointer}.btn:disabled{opacity:.45;cursor:not-allowed}.btn__secondary{display:block;font-size:.75rem;font-weight:500;opacity:.9}.errorBox{color:#ff8e8e;min-height:1.2em;margin:8px 0 0;font-size:.9rem}.operator-list{display:grid;gap:10px}.op-btn{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:14px;text-align:left;cursor:pointer}.op-name{display:block;font-weight:700}.op-price{opacity:.8;font-size:.85rem}.legalArea{font-size:.78rem;opacity:.85;line-height:1.45;margin:16px 0}.disclaimer{white-space:pre-line}.agree-checkboxes{display:grid;gap:10px;font-size:.78rem}.checkbox-container{display:flex;gap:8px;align-items:flex-start}.pulse-field{animation:pulse 1.4s ease-in-out infinite}@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(25,195,125,.55)}50%{box-shadow:0 0 0 8px rgba(25,195,125,0)}}.btn-blink{animation:blink 1.2s ease-in-out infinite}@keyframes blink{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}\n";
    }

    private String propellerStylesCss() {
        return "*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#111;color:#fff}.wrapper{max-width:480px;margin:0 auto;min-height:100vh;background:linear-gradient(180deg,#1a1a1a,#0d0d0d)}.rightheader{display:flex;justify-content:space-between;align-items:center;padding:12px 14px}.langbtn{color:#fff;text-decoration:none;margin-left:8px;opacity:.7}.langbtn.active{opacity:1;font-weight:700}.videoframe{padding:16px}.loadbox{background:rgba(0,0,0,.55);border-radius:12px;padding:20px}.pntxt,.pintxt{margin-bottom:12px;font-size:1rem}.mobileBox,.pinBox{display:flex;align-items:center;background:#fff;border-radius:8px;padding:10px;color:#111}.prefixbox{font-weight:700;margin-right:8px}.mobileBox input,.pinBox input{border:0;outline:0;flex:1;font-size:1.1rem;width:100%}.button{width:100%;margin-top:14px;border:0;border-radius:8px;padding:14px;background:#00bb19;color:#fff;font-weight:700;cursor:pointer}.errorBox{color:#ff8e8e;min-height:1.1em;margin-top:8px}.tnc{padding:14px;font-size:.75rem;opacity:.85;line-height:1.4}.pulseflash{animation:pulse 1.4s ease-in-out infinite}@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,187,25,.5)}50%{box-shadow:0 0 0 8px rgba(0,187,25,0)}}\n";
    }

    private String apiProxyPhp(LandingPage lp) {
        String base = escPhp(lp.getApiBaseUrl());
        return "<?php\n"
                + "header('Content-Type: application/json; charset=UTF-8');\n"
                + "header('Access-Control-Allow-Origin: *');\n"
                + "header('Cache-Control: no-store');\n"
                + "if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }\n"
                + "$path = isset($_GET['path']) ? trim((string)$_GET['path'], '/') : '';\n"
                + "if ($path === '') { http_response_code(400); echo json_encode(['response'=>'FAIL','errorMessage'=>'Missing path']); exit; }\n"
                + "$params = $_GET; unset($params['path']);\n"
                + "$query = http_build_query($params);\n"
                + "$url = '" + base + "/' . $path . ($query !== '' ? ('?' . $query) : '');\n"
                + "if ($path === '" + escPhp(lp.getPortalPath()) + "' || strpos($path, 'portal') !== false || strpos($path, 'CPportal') !== false || strpos($path, 'redirect') !== false) {\n"
                + "  header('Location: ' . $url, true, 302); exit;\n"
                + "}\n"
                + "if (function_exists('curl_init')) {\n"
                + "  $ch = curl_init($url);\n"
                + "  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>30,CURLOPT_CONNECTTIMEOUT=>10]);\n"
                + "  $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);\n"
                + "  if ($body === false) { http_response_code(502); echo json_encode(['response'=>'FAIL','errorMessage'=>curl_error($ch)]); curl_close($ch); exit; }\n"
                + "  curl_close($ch); http_response_code($code > 0 ? $code : 200); echo $body; exit;\n"
                + "}\n"
                + "$body = @file_get_contents($url); if ($body === false) { http_response_code(502); echo json_encode(['response'=>'FAIL','errorMessage'=>'enable curl']); exit; }\n"
                + "echo $body;\n";
    }

    private String propellerPbPhp(LandingPage lp) {
        return "<?php\n"
                + "header('Content-Type: application/json; charset=UTF-8');\n"
                + "header('Access-Control-Allow-Origin: *');\n"
                + "$visitorId = isset($_GET['visitor_id']) ? trim($_GET['visitor_id']) : '';\n"
                + "$payout = isset($_GET['payout']) ? trim($_GET['payout']) : '" + escPhp(nullToEmpty(lp.getPropellerPayout())) + "';\n"
                + "if ($visitorId === '') { http_response_code(400); echo json_encode(['status'=>false,'msg'=>'Missing visitor_id']); exit; }\n"
                + "$pb = '" + escPhp(nullToEmpty(lp.getPropellerPostbackUrl())) + "?' . http_build_query([\n"
                + "  'aid' => '" + escPhp(nullToEmpty(lp.getPropellerAid())) + "',\n"
                + "  'pid' => '" + escPhp(nullToEmpty(lp.getPropellerPid())) + "',\n"
                + "  'tid' => '" + escPhp(nullToEmpty(lp.getPropellerTid())) + "',\n"
                + "  'visitor_id' => $visitorId,\n"
                + "  'payout' => $payout,\n"
                + "]);\n"
                + "$ch = curl_init($pb); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20]);\n"
                + "$body = curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);\n"
                + "echo json_encode(['status'=>$code>=200&&$code<400,'http_code'=>$code,'visitor_id'=>$visitorId]);\n";
    }

    private String phpTest(LandingPage lp) {
        return "<?php\nheader('Content-Type: text/plain; charset=UTF-8');\n"
                + "echo \"PHP is working\\n\";\n"
                + "echo \"slug=" + escPhp(lp.getSlug()) + "\\n\";\n"
                + "echo \"platform=" + lp.getPlatform().name() + "\\n\";\n"
                + "echo \"api=" + lp.getApiProvider().name() + "\\n\";\n";
    }

    private String deployReadme(LandingPage lp) {
        Map<String, String> urls = com.zeen.lpstudio.util.CampaignUrls.allUrls(lp);
        String host = com.zeen.lpstudio.util.CampaignUrls.normalizeHost(lp.getPublicDomain());
        if (host.isEmpty()) host = "yourdomain.com";
        String deploy = nullToEmpty(lp.getDeployPath()).trim();
        if (deploy.isEmpty()) deploy = "/var/www/.../" + lp.getSlug();
        return "LP Studio export\n"
                + "================\n"
                + "Name: " + lp.getName() + "\n"
                + "Slug: " + lp.getSlug() + "\n"
                + "Domain: " + host + "\n"
                + "Platform: " + lp.getPlatform() + "\n"
                + "Server path: " + deploy + "\n\n"
                + "1) Upload ALL files in this ZIP (except README) via FileZilla / Deploy button into:\n"
                + "   " + deploy + "\n"
                + "   Nginx root (or alias) for " + host + " must point at this folder (or parent + URL path).\n\n"
                + "2) Ensure PHP is enabled.\n"
                + "3) Test: " + urls.getOrDefault("testPhp", "") + "\n"
                + "4) Campaign URL (" + lp.getPlatform() + "):\n"
                + "   " + urls.getOrDefault("campaignUrl", "") + "\n"
                + "   Google example:    " + urls.getOrDefault("googleExample", "") + "\n"
                + "   Propeller example: " + urls.getOrDefault("propellerExample", "") + "\n";
    }

    private static byte[] bytes(String s) {
        return s.getBytes(StandardCharsets.UTF_8);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String esc(String s) {
        return nullToEmpty(s)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String escPhp(String s) {
        return nullToEmpty(s).replace("\\", "\\\\").replace("'", "\\'");
    }
}
