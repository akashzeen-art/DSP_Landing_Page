(function () {
  "use strict";

  /**
   * Gamers Paradise — Palestine (Adpoke)
   *
   * Ooredoo PS: adid=231, cmpid=466, NIS 1.5/day, unsub NS → 7902
   * Jawwal PS:  adid=231, cmpid=465, NIS 1.16/day, unsub SP → 37637
   *
   * sendotp / validateotp (param1=PIN) / statuscheck / portal
   * Base: http://64.225.87.221/adpoke/cnt/inapp
   * Success: { "response": "SUCCESS", ... } (also accepts msg/status variants)
   * No postback.
   */

  var PIN_LENGTH = 4;
  var msisdnFormat = /^5[0-9]{8}$/; // local 9 digits
  var COUNTRY = "970";
  var ADPOKE = "http://64.225.87.221/adpoke/cnt/inapp";

  // Working PHP proxy on click2funbox (backup when this host has no PHP / no Netlify proxy)
  var REMOTE_ADPOKE_PROXY = "https://click2funbox.com/palestine/adpoke-api.php";

  function isLocalHost() {
    if (typeof location === "undefined") return false;
    var h = location.hostname || "";
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h === "0.0.0.0" ||
      h === "::1"
    );
  }

  function isNetlifyHost() {
    if (typeof location === "undefined") return false;
    return /\.netlify\.app$/i.test(location.hostname || "");
  }

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  // Reset proxy cache so old broken paths are not stuck
  try {
    sessionStorage.removeItem("adpoke_proxy_base");
  } catch (e) {}

  /** Same-folder proxy URL (works when PHP is enabled on this domain). */
  function sameFolderProxyHref() {
    try {
      if (isLocalHost()) {
        return new URL("adpoke-proxy", window.location.href).href;
      }
      return new URL("adpoke-api.php", window.location.href).href;
    } catch (e2) {
      return isLocalHost() ? "adpoke-proxy" : "adpoke-api.php";
    }
  }

  function proxyCandidates() {
    if (isLocalHost()) {
      var local = sameFolderProxyHref();
      var phpLocal = "";
      try {
        phpLocal = new URL("adpoke-api.php", window.location.href).href;
      } catch (e3) {}
      return phpLocal && phpLocal !== local ? [local, phpLocal] : [local];
    }
    // Netlify: edge rewrite /adpoke/* → Adpoke (see netlify.toml)
    if (isNetlifyHost()) {
      return ["/adpoke", REMOTE_ADPOKE_PROXY];
    }
    // Other production hosts: remote PHP first, then same-folder PHP
    return [REMOTE_ADPOKE_PROXY, sameFolderProxyHref()];
  }

  function getCachedProxy() {
    try {
      return sessionStorage.getItem("adpoke_proxy_base") || "";
    } catch (e) {
      return "";
    }
  }

  function setCachedProxy(base) {
    try {
      sessionStorage.setItem("adpoke_proxy_base", base);
    } catch (e) {}
  }

  function proxyBase() {
    return getCachedProxy() || proxyCandidates()[0];
  }

  function buildProxyUrl(base, path, qs) {
    var clean = String(path || "").replace(/^\//, "");
    // Netlify: /adpoke/sendotp?adid=...
    if (base === "/adpoke" || base.indexOf("/adpoke/") === 0) {
      return "/adpoke/" + clean + (qs ? ("?" + qs) : "");
    }
    var sep = base.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + "path=" + encodeURIComponent(clean) + "&" + qs;
  }

  function classifyProxyText(text, httpStatus) {
    if (httpStatus === 404) return "proxy_missing";
    if (/^\s*<\?php/i.test(text)) return "php_not_running";
    if (/^\s*<!DOCTYPE html/i.test(text) || /^\s*<html/i.test(text)) {
      if (/<body>\s*Error\s*<\/body>/i.test(text) || />\s*Error\s*</i.test(text)) {
        return "api_html_error";
      }
      return "proxy_missing";
    }
    try {
      JSON.parse(text);
      return "ok";
    } catch (e) {
      return "bad_json";
    }
  }

  var OPERATORS = {
    ooredoo: {
      key: "ooredoo",
      name: "Ooredoo PS",
      adid: "231",
      cmpid: "466",
      price: "NIS 1.5 / day",
      unsub: "NS → 7902"
    },
    jawwal: {
      key: "jawwal",
      name: "Jawwal PS",
      adid: "231",
      cmpid: "465",
      price: "NIS 1.16 / day",
      unsub: "SP → 37637"
    }
  };

  var i18n = {
    en: {
      mainTitle: "Get Access On Your Mobile",
      step1: "Enter your mobile number",
      step2: "Enter PIN Code",
      msisdnLabel: "Enter your mobile number to access now",
      opLabel: "Choose your operator",
      pinLabel: "Enter the 4-digit PIN",
      pinHint: "We sent a verification code to your mobile",
      btnContinue: "Continue",
      btnSub: "to Subscribe",
      btnConfirm: "Confirm",
      btnPinSub: "to Continue",
      pricePoint: "Ooredoo PS: NIS 1.5 / day — Jawwal PS: NIS 1.16 / day",
      disclaimer:
        "On subscribing to Gamers Paradise, you will be charged according to your mobile operator. Your subscription will automatically renew until you unsubscribe.\n\nOoredoo Palestine: You will be charged NIS 1.5 per day. You can unsubscribe at any time by sending NS via a toll-free SMS to 7902.\nJawwal Palestine: You will be charged NIS 1.16 per day. You can unsubscribe at any time by sending SP via a toll-free SMS to 37637.\n\nEnjoy unlimited access to Gamers Paradise and discover a wide selection of exciting games across multiple genres, available anytime on your mobile device.",
      agreeRenew:
        "I agree that my subscription will automatically renew at the stated rate and frequency for the service unless I cancel my subscription.",
      agreeTerms:
        'I hereby confirm that I am 18 years of age or older and that I accept the <a href="#legal">Terms of Service</a> and the <a href="#legal">Privacy Policy</a>.',
      langBtn: "عربى",
      err: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Palestine mobile number (9 digits starting with 5).",
        agree: "Please accept the required agreements to continue.",
        send: "OTP could not be sent. Please try again.",
        pin: "Please enter the 4-digit PIN",
        badPin: "Invalid PIN Code",
        msisdn: "Please check the mobile number (use a real Palestine MSISDN).",
        x: "Connection error. Please try again.",
        php: "Connecting via backup API… if this persists, hard-refresh. Local: python3 serve.py",
        proxy: "API proxy unavailable. Hard-refresh, or locally run: python3 serve.py",
      }
    },
    ar: {
      mainTitle: "احصل على الوصول عبر جوالك",
      step1: "أدخل رقم هاتفك",
      step2: "أدخل رمز PIN",
      msisdnLabel: "أدخل رقم هاتفك للوصول الآن",
      opLabel: "اختر المشغّل",
      pinLabel: "أدخل رمز PIN المكوّن من 4 أرقام",
      pinHint: "أرسلنا رمز التحقق إلى هاتفك",
      btnContinue: "متابعة",
      btnSub: "للاشتراك",
      btnConfirm: "تأكيد",
      btnPinSub: "للمتابعة",
      pricePoint: "أوريدو PS: 1.5 شيكل / يوم — جوال PS: 1.16 شيكل / يوم",
      disclaimer:
        "عند الاشتراك في Gamers Paradise سيتم محاسبتك حسب مشغّل هاتفك. يتجدد الاشتراك تلقائياً حتى تقوم بإلغائه.\n\nأوريدو فلسطين: يتم محاسبتك 1.5 شيكل يومياً. يمكنك الإلغاء في أي وقت بإرسال NS عبر رسالة SMS مجانية إلى 7902.\nجوال فلسطين: يتم محاسبتك 1.16 شيكل يومياً. يمكنك الإلغاء في أي وقت بإرسال SP عبر رسالة SMS مجانية إلى 37637.\n\nاستمتع بوصول غير محدود إلى Gamers Paradise واكتشف مجموعة واسعة من الألعاب المثيرة بمختلف الأنواع، في أي وقت على جهازك المحمول.",
      agreeRenew:
        "أوافق على تجديد اشتراكي تلقائياً بالسعر والتكرار المذكورين ما لم أقم بإلغاء الاشتراك.",
      agreeTerms:
        'أؤكد أن عمري 18 سنة أو أكثر وأنني أوافق على <a href="#legal">شروط الخدمة</a> و<a href="#legal">سياسة الخصوصية</a>.',
      langBtn: "EN",
      err: {
        m: "يرجى إدخال رقم هاتفك",
        o: "يرجى إدخال رقم فلسطيني صالح (9 أرقام تبدأ بـ 5).",
        agree: "يرجى الموافقة على الشروط للمتابعة.",
        send: "تعذر إرسال رمز OTP. حاول مرة أخرى.",
        pin: "يرجى إدخال رمز PIN المكوّن من 4 أرقام",
        badPin: "رمز PIN غير صحيح",
        msisdn: "يرجى التحقق من رقم الجوال (استخدم رقماً فلسطينياً صالحاً).",
        x: "خطأ في الاتصال. حاول مرة أخرى.",
        php: "ارفع adpoke-api.php في نفس مجلد index.html وتأكد أن PHP يعمل.",
        proxy: "ملف adpoke-api.php غير موجود في هذا المجلد. ارفعه بجانب index.html."
      }
    }
  };

  var lang = "en";

  function persist(k, v) {
    if (v == null || v === "") return;
    try { sessionStorage.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e2) {}
  }

  function track(k) {
    try {
      var v = sessionStorage.getItem(k);
      if (v) return v;
    } catch (e) {}
    try { return localStorage.getItem(k) || ""; } catch (e2) { return ""; }
  }

  /** Normalize to local 9-digit MSISDN for Adpoke (`msisdn=<num_msisdn>`). */
  function normalizeLocal(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.indexOf(COUNTRY) === 0) digits = digits.slice(COUNTRY.length);
    if (digits.charAt(0) === "0") digits = digits.slice(1);
    return digits.slice(0, 9);
  }

  function apiMsisdn() {
    return normalizeLocal(track("phone") || "");
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var token =
      params.get("token") ||
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("gclid") ||
      params.get("clickId") ||
      "";
    if (token && token !== "${SUBID}" && String(token).toLowerCase() !== "clickid") {
      persist("token", token);
    }
    var qLang = params.get("lang");
    if (qLang === "ar" || qLang === "en") lang = qLang;
  }

  /** `token` required by Adpoke on every call. */
  function getToken() {
    var existing = track("token");
    if (existing) return existing;
    var fallback =
      "g_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    persist("token", fallback);
    return fallback;
  }

  function buildApiUrl(path, qs) {
    var clean = String(path || "").replace(/^\//, "");
    if (useProxy) {
      return buildProxyUrl(proxyBase(), clean, qs);
    }
    return ADPOKE + "/" + clean + "?" + qs;
  }

  /**
   * Portal:
   * /portal?adid=&cmpid=&token=&msisdn=
   */
  function portalUrl(adid, cmpid, token, msisdn) {
    var qs =
      "adid=" + encodeURIComponent(adid) +
      "&cmpid=" + encodeURIComponent(cmpid) +
      "&token=" + encodeURIComponent(token) +
      "&msisdn=" + encodeURIComponent(msisdn);
    if (useProxy) return buildProxyUrl(proxyBase(), "portal", qs);
    return ADPOKE + "/portal?" + qs;
  }

  function parseApiText(text, done, httpStatus) {
    var kind = classifyProxyText(text, httpStatus);
    if (kind === "php_not_running") {
      done(new Error("php_not_running"));
      return;
    }
    if (kind === "api_html_error") {
      done(null, { response: "FAIL", errorMessage: "Please check Inserted MSISDN" });
      return;
    }
    if (kind === "proxy_missing") {
      done(new Error("proxy_missing"));
      return;
    }
    if (kind === "bad_json") {
      done(new Error("bad_json"));
      return;
    }
    try {
      done(null, JSON.parse(text));
    } catch (e) {
      done(new Error("bad_json"));
    }
  }

  function apiCall(path, params, done) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== "" && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");

    if (!useProxy) {
      fetch(ADPOKE + "/" + String(path || "").replace(/^\//, "") + "?" + qs, { method: "GET" })
        .then(function (r) {
          return r.text().then(function (text) {
            parseApiText(text, done, r.status);
          });
        })
        .catch(function (err) { done(err); });
      return;
    }

    var bases = proxyCandidates().slice();
    var cached = getCachedProxy();
    if (cached) {
      bases = [cached].concat(bases.filter(function (b) { return b !== cached; }));
    }

    var lastKind = "proxy_missing";

    function tryNext(i) {
      if (i >= bases.length) {
        done(new Error(lastKind === "php_not_running" ? "php_not_running" : "proxy_missing"));
        return;
      }
      var base = bases[i];
      var url = buildProxyUrl(base, path, qs);
      fetch(url, { method: "GET" })
        .then(function (r) {
          return r.text().then(function (text) {
            var kind = classifyProxyText(text, r.status);
            lastKind = kind;
            if (kind === "ok" || kind === "api_html_error") {
              setCachedProxy(base);
              parseApiText(text, done, r.status);
              return;
            }
            tryNext(i + 1);
          });
        })
        .catch(function () {
          lastKind = "proxy_missing";
          tryNext(i + 1);
        });
    }

    tryNext(0);
  }

  /** Docs: { "response": "SUCCESS", "errorMessage": "OTP Sent..." } */
  function isApiSuccess(data) {
    if (!data) return false;
    var r = String(data.response || data.msg || "").toUpperCase();
    if (r.indexOf("SUCCESS") !== -1) return true;
    if (data.status === true || String(data.status).toLowerCase() === "true") return true;
    return false;
  }

  function t() {
    return i18n[lang] || i18n.en;
  }

  function errText(key) {
    return (t().err && t().err[key]) || "";
  }

  function apiErrorMessage(err, data, fallbackKey) {
    if (err && err.message === "php_not_running") return errText("php");
    if (err && err.message === "proxy_missing") return errText("proxy");
    if (err) return errText("x");

    var raw =
      (data && data.errorMessage) ||
      (lang === "ar" && data && data.MessageAr) ||
      (data && data.MessageEn) ||
      (data && data.msg) ||
      "";

    if (/inserted msisdn|invalid msisdn|check.*msisdn|only 9 digits/i.test(String(raw))) {
      return errText("msisdn");
    }
    if (
      raw &&
      String(raw).toUpperCase() !== "FAILED" &&
      String(raw).toUpperCase() !== "FAIL" &&
      String(raw).toLowerCase() !== "null"
    ) {
      return String(raw);
    }
    return errText(fallbackKey);
  }

  function applyLang() {
    var dict = t();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });

    var langBtn = document.getElementById("langBtn");
    if (langBtn) langBtn.textContent = dict.langBtn;
  }

  function gtagSafe() {
    try {
      if (typeof window.gtag === "function") {
        return window.gtag.apply(window, arguments);
      }
    } catch (e) {}
  }

  /** Intermediate pages (operator / OTP): ensure Google Ads tag is active */
  function trackIntermediatePage(name, path) {
    gtagSafe("config", "AW-18322570229", {
      page_title: name,
      page_path: path
    });
    gtagSafe("event", "page_view", {
      page_title: name,
      page_path: path
    });
  }

  function showView(id) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.add("hide");
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove("hide");

    if (id === "viewOperator") {
      trackIntermediatePage("Choose operator", "/operator");
    } else if (id === "viewPin") {
      trackIntermediatePage("OTP / PIN", "/otp");
    }
  }

  function agreementsOk() {
    var a = document.getElementById("agreeAutoRenew");
    var b = document.getElementById("agreeTerms");
    return !!(a && a.checked && b && b.checked);
  }

  initTracking();
  applyLang();

  document.getElementById("langBtn").addEventListener("click", function () {
    lang = lang === "en" ? "ar" : "en";
    applyLang();
    var url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState({}, "", url);
  });

  var phoneInput = document.getElementById("phone-input");
  var msisdnBtn = document.getElementById("msisdn-submit-button");
  var phoneField = document.getElementById("phoneField") || document.querySelector("#viewMsisdn .phone-input");

  function blinkPhoneField() {
    if (!phoneField) return;
    phoneField.classList.remove("blink-once");
    // restart animation
    void phoneField.offsetWidth;
    phoneField.classList.add("blink-once");
    setTimeout(function () {
      phoneField.classList.remove("blink-once");
    }, 1200);
  }

  function refreshMsisdnBtn() {
    var local = normalizeLocal(phoneInput.value);
    phoneInput.value = local;
    var valid = msisdnFormat.test(local);
    var empty = !local;

    msisdnBtn.disabled = !valid;
    if (phoneField) {
      phoneField.classList.toggle("valid", valid);
      phoneField.classList.toggle("pulse-pause", !empty && !valid);
      if (empty) phoneField.classList.remove("pulse-pause");
    }
  }

  phoneInput.addEventListener("input", refreshMsisdnBtn);
  phoneInput.addEventListener("focus", function () {
    if (phoneField) phoneField.classList.add("pulse-pause");
  });
  phoneInput.addEventListener("blur", function () {
    refreshMsisdnBtn();
  });
  refreshMsisdnBtn();

  document.getElementById("msisdnForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var local = normalizeLocal(phoneInput.value);
    var err = document.getElementById("errMsisdn");
    err.textContent = "";

    if (!local) {
      err.textContent = errText("m");
      blinkPhoneField();
      phoneInput.focus();
      return;
    }
    if (!msisdnFormat.test(local)) {
      err.textContent = errText("o");
      blinkPhoneField();
      phoneInput.focus();
      return;
    }
    if (!agreementsOk()) {
      err.textContent = errText("agree");
      return;
    }

    if (phoneField) {
      phoneField.classList.remove("pulse-field");
      phoneField.classList.add("pulse-pause");
    }
    msisdnBtn.classList.remove("btn-blink");
    persist("phone", local);
    showView("viewOperator");
  });

  document.querySelectorAll(".op-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-operator");
      var op = OPERATORS[key];
      var err = document.getElementById("errOperator");
      var load = document.getElementById("opLoad");
      err.textContent = "";
      if (!op) return;
      if (!agreementsOk()) {
        err.textContent = errText("agree");
        return;
      }

      var msisdn = apiMsisdn();
      if (!msisdnFormat.test(msisdn)) {
        err.textContent = errText("o");
        showView("viewMsisdn");
        return;
      }

      var token = getToken();
      persist("operator", key);
      persist("adid", op.adid);
      persist("cmpid", op.cmpid);

      document.querySelectorAll(".op-btn").forEach(function (b) {
        b.disabled = true;
      });
      if (load) load.classList.add("show");

      // Pin Send: sendotp?adid=&cmpid=&token=&msisdn=
      apiCall(
        "sendotp",
        {
          adid: op.adid,
          cmpid: op.cmpid,
          token: token,
          msisdn: msisdn
        },
        function (apiErr, data) {
          document.querySelectorAll(".op-btn").forEach(function (b) {
            b.disabled = false;
          });
          if (load) load.classList.remove("show");

          if (apiErr || !isApiSuccess(data)) {
            err.textContent = apiErrorMessage(apiErr, data, "send");
            return;
          }
          showView("viewPin");
          var pinEl = document.getElementById("pin-input");
          if (pinEl) pinEl.focus();
        }
      );
    });
  });

  var pinInput = document.getElementById("pin-input");
  var pinBtn = document.getElementById("pin-submit-button");

  pinInput.addEventListener("input", function () {
    pinInput.value = String(pinInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
    pinBtn.disabled = pinInput.value.length !== PIN_LENGTH;
  });

  document.getElementById("pinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var pin = String(pinInput.value || "").replace(/\D/g, "");
    var err = document.getElementById("errPin");
    err.textContent = "";

    if (pin.length !== PIN_LENGTH) {
      err.textContent = errText("pin");
      return;
    }
    if (!agreementsOk()) {
      err.textContent = errText("agree");
      return;
    }

    var msisdn = apiMsisdn();
    var token = getToken();
    var adid = track("adid") || "231";
    var cmpid = track("cmpid") || "";

    if (!msisdnFormat.test(msisdn) || !cmpid) {
      err.textContent = errText("o");
      showView("viewMsisdn");
      return;
    }

    pinBtn.disabled = true;
    pinBtn.classList.add("loading");

    // Validate OTP: validateotp?...&param1=<num_pin>
    apiCall(
      "validateotp",
      {
        adid: adid,
        cmpid: cmpid,
        token: token,
        msisdn: msisdn,
        param1: pin
      },
      function (apiErr, data) {
        if (apiErr || !isApiSuccess(data)) {
          pinBtn.disabled = false;
          pinBtn.classList.remove("loading");
          err.textContent = apiErrorMessage(apiErr, data, "badPin");
          return;
        }

        // LOOKUP then Thank You (Google Ads conversion) → portal
        apiCall(
          "statuscheck",
          {
            adid: adid,
            cmpid: cmpid,
            token: token,
            msisdn: msisdn
          },
          function () {
            window.location.href =
              "thankyou.html?adid=" + encodeURIComponent(adid) +
              "&cmpid=" + encodeURIComponent(cmpid) +
              "&token=" + encodeURIComponent(token) +
              "&msisdn=" + encodeURIComponent(msisdn);
          }
        );
      }
    );
  });
})();
