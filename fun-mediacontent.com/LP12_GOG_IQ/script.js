(function () {
  "use strict";

  /**
   * Iraq 3-Operator GameX — CuriousCubs UI (Google / fun-mediacontent.com)
   *
   * Zain     (cid=3157) portal 917 — IQD 400/day — unsub 94 → 4089 — PIN 5
   *           AF: apicalling.com offId=2369 (page=2 PIN only)
   * Korek    (cid=3158) portal 916 — IQD 300/day — unsub 02 → 3999 — PIN 4
   *           AF: apicalling.com offId=2368 (page=2 PIN only)
   * Asiacell (cid=3159) portal 915 — IQD 360/day — unsub 0 → 2348 — PIN 4
   *           AF: apicalling.com offId=2367 (page=1 MSISDN + page=2 PIN)
   *
   * AF ti → sessionKey + transactionId + ti on verifypin (and sendpin for Asiacell).
   * AF ts → ?uniqid= on OTP URL (value = AF ts) + subsequent requests when present.
   * If ti empty but script returned: do NOT pass ti/sessionKey.
   *
   * Google Ads: AW-18261487745
   * Flow: index → operator (sendpin) → pin (verifypin) → thankyou
   */

  var msisdnFormat = /^7[0-9]{9}$/;
  var COUNTRY = "964";
  var ZEEN = "http://64.225.85.48/adnet";
  var MSISDN_BTN = "evina_ctabutton";
  var PIN_BTN = "confirmBtn";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    zain: {
      key: "zain",
      cid: "3157",
      portalCid: "917",
      name: "Zain",
      pinLen: 5,
      afType: "zain",
      offId: "2369",
      afPages: [2],
      footerEn: "GameX — Zain IQ: IQD 400/day. To cancel, send 94 to 4089.",
      footerAr: "GameX — زين العراق: 400 دينار/يوم. للإلغاء أرسل 94 إلى 4089."
    },
    korek: {
      key: "korek",
      cid: "3158",
      portalCid: "916",
      name: "Korek",
      pinLen: 4,
      afType: "korek",
      offId: "2368",
      afPages: [2],
      footerEn: "GameX — Korek IQ: IQD 300/day. To cancel, send 02 to 3999.",
      footerAr: "GameX — كورك: 300 دينار/يوم. للإلغاء أرسل 02 إلى 3999."
    },
    asiacell: {
      key: "asiacell",
      cid: "3159",
      portalCid: "915",
      name: "Asiacell",
      pinLen: 4,
      afType: "asiacell",
      offId: "2367",
      afPages: [1, 2],
      footerEn: "GameX — Asiacell IQ: IQD 360/day. To cancel, send 0 to 2348.",
      footerAr: "GameX — آسياسيل: 360 دينار/يوم. للإلغاء أرسل 0 إلى 2348."
    }
  };

  var FOOTER_ALL_EN =
    "GameX — Zain: IQD 400/day (94→4089). Korek: IQD 300/day (02→3999). Asiacell: IQD 360/day (0→2348).";
  var FOOTER_ALL_AR =
    "GameX — زين: 400 دينار/يوم (94→4089). كورك: 300 دينار/يوم (02→3999). آسياسيل: 360 دينار/يوم (0→2348).";

  function persist(k, v) {
    if (v == null || v === "") return;
    v = String(v);
    if (v.indexOf("[object ") === 0 || v === "undefined" || v === "null") return;
    try { sessionStorage.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e2) {}
  }

  function track(k) {
    try {
      var v = sessionStorage.getItem(k);
      if (v && String(v).indexOf("[object ") !== 0) return v;
    } catch (e) {}
    try {
      var v2 = localStorage.getItem(k) || "";
      if (v2 && String(v2).indexOf("[object ") !== 0) return v2;
      return "";
    } catch (e2) { return ""; }
  }

  function isRealClickId(v) {
    if (!v) return false;
    var s = String(v).trim();
    if (!s) return false;
    var low = s.toLowerCase();
    if (s.indexOf("local_") === 0) return false;
    if (low === "clickid" || low === "subid" || low === "visitor_id") return false;
    if (s.indexOf("{") !== -1 || s.indexOf("${") !== -1 || s.indexOf("[[") !== -1) return false;
    return true;
  }

  function normalizeLocal(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.indexOf(COUNTRY) === 0) digits = digits.slice(COUNTRY.length);
    if (digits.charAt(0) === "0") digits = digits.slice(1);
    return digits.slice(0, 10);
  }

  function fullMsisdn(local) {
    return COUNTRY + normalizeLocal(local);
  }

  /** Asiacell 77, Zain 78/79, Korek 75 */
  function detectOperatorKey(localOrFull) {
    var d = String(localOrFull || "").replace(/\D/g, "");
    if (d.indexOf(COUNTRY) === 0) d = d.slice(COUNTRY.length);
    if (d.charAt(0) === "0") d = d.slice(1);
    if (d.indexOf("77") === 0) return "asiacell";
    if (d.indexOf("78") === 0 || d.indexOf("79") === 0) return "zain";
    if (d.indexOf("75") === 0) return "korek";
    return "";
  }

  function clearAfState() {
    ["af_ti", "af_ts", "af_page1", "af_msisdn", "af_script"].forEach(function (k) {
      try { sessionStorage.removeItem(k); } catch (e) {}
      try { localStorage.removeItem(k); } catch (e2) {}
    });
  }

  /** Page-1 AF OK when script loaded and/or ti present (empty ti + script is valid per doc). */
  function page1AfOk(msisdn) {
    if (track("af_page1") !== "1") return false;
    if (msisdn && track("af_msisdn") !== msisdn) return false;
    return !!(track("af_ti") || track("af_script") === "1");
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var clickId =
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("subid") ||
      params.get("gclid") ||
      params.get("token") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    ["pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"].forEach(function (k) {
      var v = params.get(k);
      if (v && String(v).indexOf("{") === -1 && String(v).indexOf("$") === -1) persist(k, v);
    });

    /* OTP URL uses uniqid=<AF ts>; accept legacy ?ts= too */
    var urlUniq = params.get("uniqid") || params.get("ts");
    if (urlUniq && String(urlUniq).indexOf("{") === -1) persist("af_ts", urlUniq);

    if (!track("pub_id")) persist("pub_id", "google");
    if (!track("sub_pub_id")) {
      var zone = params.get("zoneid") || params.get("zone_id") || params.get("campaignid") || "0";
      if (zone && String(zone).indexOf("{") === -1) persist("sub_pub_id", "ZONE" + zone);
    }
  }

  function getClickId() {
    var existing = track("click_id");
    if (isRealClickId(existing)) return existing;
    var fallback = track("zeen_click_id");
    if (fallback) return fallback;
    fallback = "local_" + Date.now();
    persist("zeen_click_id", fallback);
    return fallback;
  }

  function clientIp() {
    return track("user_ip") || "";
  }

  function getUserIp(cb) {
    if (typeof cb !== "function") {
      if (track("user_ip")) return;
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (controller) try { controller.abort(); } catch (e) {}
      }, 1400);
      var opts = controller ? { signal: controller.signal } : {};
      fetch("https://api.ipify.org?format=json", opts)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          clearTimeout(timer);
          if (d && d.ip) persist("user_ip", d.ip);
        })
        .catch(function () { clearTimeout(timer); });
      return;
    }
    if (track("user_ip")) { cb(track("user_ip")); return; }
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      if (ip) persist("user_ip", ip);
      cb(ip || "");
    }
    var t = setTimeout(function () { finish(""); }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) { clearTimeout(t); finish((d && d.ip) || ""); })
      .catch(function () { clearTimeout(t); finish(""); });
  }

  function apiUrl(path, params) {
    var q = new URLSearchParams(params || {});
    if (useProxy) {
      q.set("path", path);
      return "zeen-api.php?" + q.toString();
    }
    return ZEEN + "/" + path + "?" + q.toString();
  }

  function callApi(path, params) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) try { controller.abort(); } catch (e) {}
    }, 20000);
    var opts = { method: "GET", credentials: "omit", cache: "no-store" };
    if (controller) opts.signal = controller.signal;

    return fetch(apiUrl(path, params), opts).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.msg) throw err;
      throw { msg: "x" };
    });
  }

  function isOk(resp) {
    if (!resp) return false;
    if (resp.status === true || resp.status === "true" || resp.status === 1) return true;
    var m = String(resp.msg || resp.message || "").toLowerCase();
    return /success|2001|2003|2005|active/.test(m);
  }

  function errCode(resp) {
    var m = String((resp && (resp.msg || resp.message)) || "");
    var match = m.match(/\((\d{4})\)/);
    if (match) return match[1];
    if (/invalid|expire|1004/i.test(m)) return "1004";
    if (/fail|1001|could not/i.test(m)) return "1001";
    return "x";
  }

  function portalFor(op) {
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "917");
  }

  function injectAfScript(scriptBody) {
    if (!scriptBody) return false;
    var s = String(scriptBody).trim();
    if (!s) return false;
    try {
      /* Strip wrapping <script> tags if API returns HTML */
      var m = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (m && m[1]) s = m[1].trim();
      if (/^https?:\/\//i.test(s) || /^\/\/[^\/]/.test(s)) {
        var ext = document.createElement("script");
        ext.src = s.indexOf("//") === 0 ? "https:" + s : s;
        ext.async = true;
        document.head.appendChild(ext);
        return true;
      }
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.setAttribute("data-af", "gulfpay");
      script.text = s;
      (document.head || document.documentElement || document.body).appendChild(script);
      return true;
    } catch (e) {
      try {
        (0, eval)(s);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function runGulfpayAntifraud(offId, page, buttonId, msisdn, cb) {
    var ip = track("user_ip") || "";
    var headerObj = {
      "User-Agent": navigator.userAgent || "",
      "Accept-Language": navigator.language || "",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    };
    var headerB64 = "";
    try { headerB64 = btoa(unescape(encodeURIComponent(JSON.stringify(headerObj)))); }
    catch (e2) {
      try { headerB64 = btoa(JSON.stringify(headerObj)); } catch (e3) { headerB64 = ""; }
    }

    var params = new URLSearchParams({
      offId: String(offId),
      msisdn: msisdn || "",
      page: String(page),
      header: headerB64,
      ip: ip,
      buttonid: buttonId || PIN_BTN
    });
    var url = "http://apicalling.com/gulfpay/getAfScript?" + params.toString();
    if (useProxy) url = "af-proxy.php?url=" + encodeURIComponent(url);

    var finished = false;
    function done(data) {
      if (finished) return;
      finished = true;
      if (typeof cb === "function") cb(data || null);
    }
    var to = setTimeout(function () { done(null); }, 12000);

    fetch(url, { method: "GET", cache: "no-store", credentials: "omit" })
      .then(function (r) {
        return r.text().then(function (text) {
          try { return JSON.parse(text); } catch (e) { return null; }
        });
      })
      .then(function (data) {
        clearTimeout(to);
        if (data) {
          var tiVal = data.ti != null ? String(data.ti).trim() : "";
          var tsVal = data.ts != null ? String(data.ts).trim() : "";
          /* Doc: if ti empty and script returned, do NOT pass ti */
          if (tiVal) {
            persist("af_ti", tiVal);
          } else if (data.script && String(page) === "2") {
            try { sessionStorage.removeItem("af_ti"); } catch (eClr) {}
            try { localStorage.removeItem("af_ti"); } catch (eClr2) {}
          }
          if (tsVal) persist("af_ts", tsVal);
          var scriptOk = false;
          if (data.script) scriptOk = injectAfScript(data.script);
          if (scriptOk) persist("af_script", "1");
          if (data.requestApi && /^https?:\/\//i.test(String(data.requestApi))) {
            try {
              fetch(String(data.requestApi), { method: "GET", mode: "no-cors", cache: "no-store" }).catch(function () {});
            } catch (e4) {}
          }
          if (String(page) === "1" && (tiVal || scriptOk || data.script)) {
            persist("af_page1", "1");
            persist("af_msisdn", msisdn || "");
          }
          var waitMs = (data.script || scriptOk) ? 900 : 150;
          setTimeout(function () { done(data); }, waitMs);
          return;
        }
        done(null);
      })
      .catch(function () {
        clearTimeout(to);
        done(null);
      });
  }

  /** Pass AF ti as sessionKey + transactionId + ti; AF ts as ts + uniqid */
  function applyAfToParams(params) {
    var afTi = track("af_ti");
    var afTs = track("af_ts");
    if (afTi && String(afTi).trim() !== "") {
      var ti = String(afTi).trim();
      params.sessionKey = ti;
      params.transactionId = ti;
      params.ti = ti;
    }
    if (afTs && String(afTs).trim() !== "") {
      var ts = String(afTs).trim();
      params.ts = ts;
      params.uniqid = ts;
    }
    return params;
  }

  function pinPageUrl() {
    var url = "pin.html?lang=" + encodeURIComponent(lang);
    var afTs = track("af_ts");
    /* Team: append AF ts value as uniqid (not ts) on PIN page URL */
    if (afTs) url += "&uniqid=" + encodeURIComponent(afTs);
    return url;
  }

  var lang = "en";
  var t = {
    en: {
      pageTitle: "We need your phone number to continue",
      pageTitlePin: "Enter your PIN to continue",
      opTitle: "Choose your operator",
      step1: "Enter the Website",
      step2: "Enter your number",
      step3: "Enter your pincode",
      guidePhone: "Phone Number Here",
      guideOp: "Select Operator",
      guidePin: "PIN Code Here",
      ctaPhone: "Enter your Mobile Number to Access",
      ctaOp: "Choose your mobile operator",
      ctaPin: "Enter the PIN sent to your phone",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pleaseWait: "Please Wait...",
      pinHint: "A PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      opZain: "Zain",
      opKorek: "Korek",
      opAsiacell: "Asiacell",
      opZainPrice: "GameX — IQD 400 / day",
      opKorekPrice: "GameX — IQD 300 / day",
      opAsiacellPrice: "GameX — IQD 360 / day",
      termsLink: "Terms and Conditions",
      privacyLink: "Privacy Policy",
      disclaimer: FOOTER_ALL_EN,
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Iraq mobile number (10 digits starting with 7).",
        op: "Please choose an operator",
        p4: "Please enter the 4-digit PIN",
        p5: "Please enter the 5-digit PIN",
        af: "Antifraud failed to load. Please try again.",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP."
      }
    },
    ar: {
      pageTitle: "نحتاج رقم هاتفك للمتابعة",
      pageTitlePin: "أدخل رمز PIN للمتابعة",
      opTitle: "اختر المشغّل",
      step1: "دخول الموقع",
      step2: "أدخل رقمك",
      step3: "أدخل رمز PIN",
      guidePhone: "رقم الهاتف هنا",
      guideOp: "اختر المشغّل",
      guidePin: "رمز PIN هنا",
      ctaPhone: "أدخل رقم جوالك للوصول",
      ctaOp: "اختر مشغّل الجوال",
      ctaPin: "أدخل رمز PIN المرسل إلى هاتفك",
      continueBtn: "متابعة",
      confirmBtn: "تأكيد",
      pleaseWait: "يرجى الانتظار...",
      pinHint: "تم إرسال رمز PIN إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      opZain: "زين",
      opKorek: "كورك",
      opAsiacell: "آسياسيل",
      opZainPrice: "GameX — 400 دينار / يوم",
      opKorekPrice: "GameX — 300 دينار / يوم",
      opAsiacellPrice: "GameX — 360 دينار / يوم",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer: FOOTER_ALL_AR,
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم عراقي صحيح (10 أرقام يبدأ بـ 7).",
        op: "الرجاء اختيار المشغّل",
        p4: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        p5: "الرجاء إدخال رمز PIN المكون من 5 أرقام",
        af: "فشل التحقق الأمني. حاول مرة أخرى.",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || t.en.errmsg[key] || "";
  }

  function applyLang() {
    var dict = t[lang] || t.en;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.textContent = dict[key];
    });
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errortext");
    if (box) box.textContent = msg || "";
  }

  function setBtnLoading(btn, on, idleText) {
    if (!btn) return;
    if (on) {
      btn.classList.add("btn-loading", "disabled");
      btn.disabled = true;
      btn.setAttribute("data-idle", idleText || btn.textContent);
      btn.innerHTML = "<span>" + ((t[lang] && t[lang].pleaseWait) || "Please Wait...") + "</span>";
    } else {
      btn.classList.remove("btn-loading");
      var idle = btn.getAttribute("data-idle") || idleText || "";
      if (idle) btn.innerHTML = "<span>" + idle + "</span>";
    }
  }

  function setActiveStep(n) {
    [1, 2, 3].forEach(function (i) {
      var el = document.getElementById("step" + i);
      if (!el) return;
      if (i === n) el.classList.add("active");
      else el.classList.remove("active");
    });
  }

  function openModal(id) {
    var src = document.getElementById(id);
    var box = document.getElementById("displayiframe");
    var modal = document.getElementById("myModal");
    if (!src || !box || !modal) return;
    box.innerHTML = src.innerHTML;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    var modal = document.getElementById("myModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  initTracking();
  getUserIp();
  getClickId();

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
  }
  applyLang();

  var dropdown = document.getElementById("dropdown");
  var dropdownContent = document.getElementById("dropdown-content");
  if (dropdown && dropdownContent) {
    dropdown.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdownContent.style.display =
        window.getComputedStyle(dropdownContent).display === "none" ? "block" : "none";
    });
    document.addEventListener("click", function () {
      dropdownContent.style.display = "none";
    });
    document.querySelectorAll("[data-lang-set]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        lang = btn.getAttribute("data-lang-set") === "ar" ? "ar" : "en";
        applyLang();
        dropdownContent.style.display = "none";
        var url = new URL(window.location.href);
        url.searchParams.set("lang", lang);
        window.history.replaceState({}, "", url);
      });
    });
  }

  document.querySelectorAll("[data-open]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var which = a.getAttribute("data-open");
      openModal(which === "privacy" ? "privacy-fetched-content" : "terms-fetched-content");
    });
  });
  var closeBtn = document.getElementById("closeModal");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  var modal = document.getElementById("myModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  /* —— index: MSISDN → operator (Asiacell page=1 AF on first page) —— */
  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    setActiveStep(2);
    var mInput = document.getElementById("telInput");
    var submitBtn = document.getElementById("evina_ctabutton");
    var page1AfStarted = false;
    var page1AfInflight = false;
    var page1AfDebounce = null;

    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!submitBtn.classList.contains("btn-loading")) {
        submitBtn.disabled = !ok;
        if (ok) submitBtn.classList.remove("disabled");
        else submitBtn.classList.add("disabled");
      }
      return { value: value, ok: ok };
    }

    /** Load Asiacell AF script on MSISDN page as soon as a valid 77… number is entered */
    function preloadAsiacellPage1Af(localDigits) {
      if (detectOperatorKey(localDigits) !== "asiacell") return;
      if (!msisdnFormat.test(localDigits)) return;
      var msisdn = fullMsisdn(localDigits);
      if (page1AfOk(msisdn) || page1AfInflight) return;
      page1AfInflight = true;
      getUserIp(function () {
        runGulfpayAntifraud("2367", 1, MSISDN_BTN, msisdn, function () {
          page1AfInflight = false;
        });
      });
    }

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      refreshMsisdnBtn();
      if (page1AfDebounce) clearTimeout(page1AfDebounce);
      page1AfDebounce = setTimeout(function () {
        preloadAsiacellPage1Af(mInput.value);
      }, 350);
    });
    refreshMsisdnBtn();
    if (mInput.value) preloadAsiacellPage1Af(normalizeLocal(mInput.value));

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdnBtn();
      if (!state.value) { showError(errText("m")); return; }
      if (!state.ok) { showError(errText("o")); return; }
      if (page1AfStarted) return;
      showError("");

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      var guessed = detectOperatorKey(state.value);
      function goOperator() {
        window.location.href = "operator.html?lang=" + lang;
      }

      if (guessed === "asiacell") {
        page1AfStarted = true;
        setBtnLoading(submitBtn, true, t[lang].continueBtn);
        getUserIp(function () {
          function afterAf() {
            if (!page1AfOk(msisdn)) {
              setBtnLoading(submitBtn, false, t[lang].continueBtn);
              refreshMsisdnBtn();
              page1AfStarted = false;
              showError(errText("af"));
              return;
            }
            goOperator();
          }
          if (page1AfOk(msisdn)) {
            afterAf();
          } else {
            clearAfState();
            runGulfpayAntifraud("2367", 1, MSISDN_BTN, msisdn, afterAf);
          }
        });
      } else {
        clearAfState();
        goOperator();
      }
    });
  }

  /* —— operator: choose → sendpin → pin —— */
  var obox = document.getElementById("obox");
  if (obox) {
    setActiveStep(2);
    if (!track("phone") && !track("msisdn")) {
      window.location.href = "index.html?lang=" + lang;
    } else {
      document.querySelectorAll(".opbtn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-operator");
          var op = OPERATORS[key];
          if (!op) { showError(errText("op")); return; }

          var msisdn = track("msisdn") || fullMsisdn(track("phone"));
          showError("");
          document.querySelectorAll(".opbtn").forEach(function (b) {
            b.classList.add("disabled_btn");
            b.disabled = true;
          });
          var opLoad = document.getElementById("opLoad");
          if (opLoad) opLoad.classList.add("show");

          persist("operator", key);
          persist("zeen_cid", op.cid);
          persist("portal_cid", op.portalCid);

          if (op.afType !== "asiacell") clearAfState();

          function unlockOp() {
            document.querySelectorAll(".opbtn").forEach(function (b) {
              b.classList.remove("disabled_btn");
              b.disabled = false;
            });
            if (opLoad) opLoad.classList.remove("show");
          }

          function doSendPin() {
            var params = {
              cid: op.cid,
              msisdn: msisdn,
              click_id: getClickId(),
              pub_id: track("pub_id") || "google",
              sub_pub_id: track("sub_pub_id") || "0",
              user_ip: clientIp(),
              ua: navigator.userAgent || ""
            };

            if (op.afType === "asiacell") {
              applyAfToParams(params);
              /* Empty ti + script OK — only block if page1 AF never succeeded */
              if (!page1AfOk(msisdn)) {
                unlockOp();
                showError(errText("af"));
                return;
              }
            } else {
              var sk = track("sessionKey");
              if (sk) params.sessionKey = sk;
            }

            callApi("sendpin", params)
              .then(function (resp) {
                if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
                if (resp && (resp.ti || resp.transactionId || (resp.data && resp.data.tid))) {
                  var tid =
                    resp.ti ||
                    resp.transactionId ||
                    (resp.data && resp.data.tid) ||
                    "";
                  if (tid) persist("af_ti", String(tid).trim());
                }
                if (!isOk(resp)) {
                  unlockOp();
                  showError(errText(errCode(resp)) || errText("1001"));
                  return;
                }
                window.location.href = pinPageUrl();
              })
              .catch(function (err) {
                unlockOp();
                showError(errText((err && err.msg) || "x"));
              });
          }

          if (op.afType === "asiacell") {
            if (page1AfOk(msisdn)) {
              doSendPin();
            } else {
              getUserIp(function () {
                runGulfpayAntifraud("2367", 1, MSISDN_BTN, msisdn, function () {
                  if (!page1AfOk(msisdn)) {
                    unlockOp();
                    showError(errText("af"));
                    return;
                  }
                  doSendPin();
                });
              });
            }
          } else {
            doSendPin();
          }
        });
      });
    }
  }

  /* —— pin: AF page=2 → verifypin —— */
  var pForm = document.getElementById("pinForm");
  if (pForm) {
    setActiveStep(3);
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];
    var pinAfReady = true;
    var pinLen = (op && op.pinLen) || 4;

    try {
      var q = new URLSearchParams(window.location.search);
      var urlUniqPin = q.get("uniqid") || q.get("ts");
      if (urlUniqPin) persist("af_ts", urlUniqPin);
    } catch (eTs) {}

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
      return;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
      return;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = lang === "ar" ? op.footerAr : op.footerEn;

      var pInput = document.getElementById("pincode");
      var confirmBtn = document.getElementById("confirmBtn");
      pinLen = op.pinLen || 4;
      pInput.maxLength = pinLen;
      pInput.placeholder = pinLen === 5 ? "XXXXX" : "XXXX";

      pinAfReady = false;
      var msForAf = track("msisdn") || fullMsisdn(track("phone")) || "";
      getUserIp(function () {
        runGulfpayAntifraud(op.offId, 2, PIN_BTN, msForAf, function (afData) {
          /* Page-2 ti overwrites page-1 ti for verify (transaction ID) */
          if (afData && afData.ti != null && String(afData.ti).trim() !== "") {
            persist("af_ti", String(afData.ti).trim());
          }
          pinAfReady = true;
        });
      });

      pInput.addEventListener("input", function () {
        pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, pinLen);
        var ok = pInput.value.length === pinLen;
        confirmBtn.disabled = !ok;
        if (ok) confirmBtn.classList.remove("disabled");
        else confirmBtn.classList.add("disabled");
        showError("");
      });

      pForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!op) { showError(errText("op")); return; }
        var otp = String(pInput.value || "").replace(/\D/g, "");
        if (otp.length !== pinLen) {
          showError(errText(pinLen === 5 ? "p5" : "p4"));
          return;
        }
        showError("");
        setBtnLoading(confirmBtn, true, t[lang].confirmBtn);

        function runVerify() {
          var params = {
            cid: op.cid,
            msisdn: track("msisdn") || fullMsisdn(track("phone")),
            click_id: getClickId(),
            otp: otp,
            pub_id: track("pub_id") || "google",
            sub_pub_id: track("sub_pub_id") || "0",
            user_ip: clientIp(),
            ua: navigator.userAgent || ""
          };
          applyAfToParams(params);

          /* Doc: if ti empty, do not pass sessionKey from AF — may still have sendpin sessionKey */
          if (!params.sessionKey) {
            var sk = track("sessionKey");
            if (sk) params.sessionKey = sk;
          }

          callApi("verifypin", params)
            .then(function (resp) {
              if (!isOk(resp)) {
                setBtnLoading(confirmBtn, false, t[lang].confirmBtn);
                confirmBtn.disabled = false;
                confirmBtn.classList.remove("disabled");
                showError(errText(errCode(resp)) || errText("1004"));
                return;
              }
              persist("converted", "1");
              persist("portal_url", portalFor(op));
              callApi("checkstatus", { cid: op.cid, msisdn: params.msisdn }).catch(function () {});
              window.location.href = "thankyou.html?lang=" + lang;
            })
            .catch(function (err) {
              setBtnLoading(confirmBtn, false, t[lang].confirmBtn);
              confirmBtn.disabled = false;
              confirmBtn.classList.remove("disabled");
              showError(errText((err && err.msg) || "x"));
            });
        }

        if (!pinAfReady) {
          var waitN = 0;
          var waitIv = setInterval(function () {
            waitN += 1;
            if (pinAfReady || waitN > 40) {
              clearInterval(waitIv);
              runVerify();
            }
          }, 250);
        } else {
          runVerify();
        }
      });
    }
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
