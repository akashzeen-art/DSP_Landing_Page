(function () {
  "use strict";

  /**
   * Kuwait 3-Operator — CuriousCubs UI (Google / fun-mediacontent.com)
   *
   * Ooredoo (cid=3149) portal 855 — Pro max — 800 fils/w — UNSUB 5 → 50908 — PIN 4
   * Zain    (cid=3150) portal 877 — Tape — 0.075 KWD/day — PIN 4
   * STC     (cid=3151) portal 885 — CD — 3000 FBf/month — STOP B4 → 50916 — PIN 4
   *           Antifraud: btnid on sendpin, jsurl inject from sendpin response
   *           Pass sendpin ti/sessionKey as data[req_id] (+ pubid=ZD1) on verifypin
   *
   * Google Ads: AW-18261487745
   * Flow: index → operator.html (sendpin) → pin.html (verifypin) → thankyou
   */

  var msisdnFormat = /^[569][0-9]{7}$/;
  var COUNTRY = "965";
  var PIN_LENGTH = 4;
  var PIN_BTN_ID = "confirmBtn";
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    ooredoo: {
      key: "ooredoo",
      cid: "3149",
      portalCid: "855",
      name: "Ooredoo",
      afType: "",
      footerEn: "Pro max — Ooredoo KW: 800 fils/week. To cancel, send UNSUB 5 to 50908.",
      footerAr: "Pro max — أوريدو الكويت: 800 فلس/أسبوع. للإلغاء أرسل UNSUB 5 إلى 50908."
    },
    zain: {
      key: "zain",
      cid: "3150",
      portalCid: "877",
      name: "Zain",
      afType: "",
      footerEn: "Tape — Zain KW: 0.075 KWD/day. Subscription renews until cancelled.",
      footerAr: "Tape — زين الكويت: 0.075 دينار/يوم. يتجدد الاشتراك حتى الإلغاء."
    },
    stc: {
      key: "stc",
      cid: "3151",
      portalCid: "885",
      name: "STC",
      afType: "stc",
      footerEn: "CD — STC KW: 3000 FBf/month. Opt-in B4. To cancel, send STOP B4 to 50916.",
      footerAr: "CD — STC الكويت: 3000 فلس بحريني/شهر. الاشتراك B4. للإلغاء أرسل STOP B4 إلى 50916."
    }
  };

  var FOOTER_ALL_EN =
    "Ooredoo Pro max: 800 fils/week (UNSUB 5 to 50908). Zain Tape: 0.075 KWD/day. STC CD: 3000 FBf/month (STOP B4 to 50916).";
  var FOOTER_ALL_AR =
    "أوريدو Pro max: 800 فلس/أسبوع (UNSUB 5 إلى 50908). زين Tape: 0.075 دينار/يوم. STC CD: 3000 فلس بحريني/شهر (STOP B4 إلى 50916).";

  function persist(k, v) {
    if (v == null || v === "") return;
    v = String(v);
    /* Guard: never store DOM objects / bad coercions */
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

  function cleanTiValue(v) {
    if (v == null) return "";
    if (typeof v === "object") {
      try {
        if (typeof v.value === "string") v = v.value;
        else return "";
      } catch (e) { return ""; }
    }
    v = String(v).trim();
    if (!v || v.indexOf("[object ") === 0 || v === "undefined" || v === "null") return "";
    return v;
  }

  function clearBadTiStorage() {
    ["zeen_ti", "cs_tid", "sessionKey"].forEach(function (k) {
      try {
        var v = sessionStorage.getItem(k);
        if (v && (String(v).indexOf("[object ") === 0)) sessionStorage.removeItem(k);
      } catch (e) {}
      try {
        var v2 = localStorage.getItem(k);
        if (v2 && (String(v2).indexOf("[object ") === 0)) localStorage.removeItem(k);
      } catch (e2) {}
    });
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
    return digits.slice(0, 8);
  }

  function fullMsisdn(local) {
    return COUNTRY + normalizeLocal(local);
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

  function getUserIp() {
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
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "855");
  }

  function injectInlineScript(code) {
    if (!code) return;
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.appendChild(document.createTextNode(code));
    document.head.appendChild(script);
  }

  /** STC antifraud: load script from sendpin jsurl into <head> */
  function injectJsUrl(jsurl) {
    if (!jsurl) return;
    var url = String(jsurl).trim();
    if (!url) return;
    persist("af_jsurl", url);

    if (/^https?:\/\//i.test(url) || url.indexOf("//") === 0) {
      var existing = document.querySelector('script[data-af-jsurl="' + url.replace(/"/g, "") + '"]');
      if (existing) return;
      var s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.setAttribute("data-af-jsurl", url);
      document.head.appendChild(s);
      return;
    }
    injectInlineScript(url);
  }

  function handleSendPinAf(resp) {
    if (!resp) return "";
    /* ONLY use ti from sendpin success (fallback sessionKey) */
    var ti = cleanTiValue(resp.ti) || cleanTiValue(resp.TI) || cleanTiValue(resp.sessionKey);

    if (ti) {
      persist("zeen_ti", ti);
      persist("cs_tid", ti);
      persist("sessionKey", ti);
      try { window.__zeen_ti = ti; } catch (e) {}
      try {
        if (window.ClkstrmAF && window.ClkstrmAF.setZeenTi) window.ClkstrmAF.setZeenTi(ti);
        else if (window.ClkstrmAF && window.ClkstrmAF.setTid) window.ClkstrmAF.setTid(ti);
      } catch (e2) {}
      var tidEl = document.getElementById("tid");
      if (tidEl) tidEl.value = ti;
      var reqEl = document.getElementById("req_id");
      if (reqEl) reqEl.value = ti;
    }

    var jsurl = resp.jsurl || resp.jsUrl || resp.JSURL || "";
    if (jsurl) injectJsUrl(jsurl);
    var inline = resp.script || resp.js || "";
    if (inline && !jsurl) injectInlineScript(inline);

    return ti;
  }

  /** verifypin + AF: pass sendpin ti as sessionKey / tid / data[tid] */
  function attachVerifyTiParams(params) {
    var ti = cleanTiValue(window.__BOOT_TI__) ||
      cleanTiValue(track("zeen_ti")) ||
      cleanTiValue(track("cs_tid")) ||
      cleanTiValue(track("sessionKey")) ||
      "";
    try {
      var qTi = cleanTiValue(new URLSearchParams(window.location.search).get("ti"));
      if (qTi) ti = qTi;
    } catch (e) {}
    if (!ti) return params;
    params.sessionKey = ti;
    params.ti = ti;
    params.tid = ti;
    params.pubid = "ZD1";
    params["data[req_id]"] = ti;
    params["data[tid]"] = ti;
    return params;
  }

  function syncZeenTiToDom() {
    var ti = "";
    try { ti = cleanTiValue(new URLSearchParams(window.location.search).get("ti")); } catch (e) {}
    if (!ti) {
      ti = cleanTiValue(window.__BOOT_TI__) ||
        cleanTiValue(track("zeen_ti")) ||
        cleanTiValue(track("cs_tid")) ||
        cleanTiValue(track("sessionKey")) ||
        "";
    }
    if (!ti) return "";
    persist("zeen_ti", ti);
    persist("cs_tid", ti);
    persist("sessionKey", ti);
    try { window.__zeen_ti = ti; } catch (e2) {}
    try {
      if (window.ClkstrmAF && window.ClkstrmAF.setZeenTi) window.ClkstrmAF.setZeenTi(ti);
      else if (window.ClkstrmAF && window.ClkstrmAF.setTid) window.ClkstrmAF.setTid(ti);
    } catch (e3) {}
    var tidEl = document.getElementById("tid");
    if (tidEl) tidEl.value = ti;
    var reqEl = document.getElementById("req_id");
    if (reqEl) reqEl.value = ti;
    return ti;
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
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      opOoredoo: "Ooredoo",
      opZain: "Zain",
      opStc: "STC",
      opOoredooPrice: "Pro max — 800 fils / week",
      opZainPrice: "Tape — 0.075 KWD / day",
      opStcPrice: "CD — 3000 FBf / month",
      termsLink: "Terms and Conditions",
      privacyLink: "Privacy Policy",
      disclaimer: FOOTER_ALL_EN,
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Kuwait mobile number (8 digits starting with 5, 6 or 9).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
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
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      opOoredoo: "أوريدو",
      opZain: "زين",
      opStc: "STC",
      opOoredooPrice: "Pro max — 800 فلس / أسبوع",
      opZainPrice: "Tape — 0.075 دينار / يوم",
      opStcPrice: "CD — 3000 فلس بحريني / شهر",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer: FOOTER_ALL_AR,
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم كويتي صحيح (8 أرقام يبدأ بـ 5 أو 6 أو 9).",
        op: "الرجاء اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
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
  clearBadTiStorage();
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

  /* —— index: MSISDN → operator —— */
  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    setActiveStep(2);
    var mInput = document.getElementById("telInput");
    var submitBtn = document.getElementById("evina_ctabutton");

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

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      refreshMsisdnBtn();
    });
    refreshMsisdnBtn();

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdnBtn();
      if (!state.value) { showError(errText("m")); return; }
      if (!state.ok) { showError(errText("o")); return; }
      showError("");
      persist("msisdn", fullMsisdn(state.value));
      persist("phone", state.value);
      window.location.href = "operator.html?lang=" + lang;
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

          var params = {
            cid: op.cid,
            msisdn: msisdn,
            click_id: getClickId(),
            pub_id: track("pub_id") || "google",
            sub_pub_id: track("sub_pub_id") || "0",
            user_ip: clientIp(),
            ua: navigator.userAgent || ""
          };
          var sk = cleanTiValue(track("sessionKey")) || cleanTiValue(track("zeen_ti"));
          if (sk) params.sessionKey = sk;
          /* STC: pass PIN-verify button id */
          if (op.afType === "stc") params.btnid = PIN_BTN_ID;

          callApi("sendpin", params)
            .then(function (resp) {
              var ti = handleSendPinAf(resp) || "";
              if (!isOk(resp)) {
                document.querySelectorAll(".opbtn").forEach(function (b) {
                  b.classList.remove("disabled_btn");
                  b.disabled = false;
                });
                if (opLoad) opLoad.classList.remove("show");
                showError(errText(errCode(resp)) || errText("1001"));
                return;
              }
              /* Pass ti in URL so PIN page / AF always have it for data[tid] */
              var pinUrl = "pin.html?lang=" + encodeURIComponent(lang);
              if (ti) pinUrl += "&ti=" + encodeURIComponent(ti);
              window.location.href = pinUrl;
            })
            .catch(function (err) {
              document.querySelectorAll(".opbtn").forEach(function (b) {
                b.classList.remove("disabled_btn");
                b.disabled = false;
              });
              if (opLoad) opLoad.classList.remove("show");
              showError(errText((err && err.msg) || "x"));
            });
        });
      });
    }
  }

  /* —— pin: verifypin —— */
  var pForm = document.getElementById("pinForm");
  if (pForm) {
    setActiveStep(3);
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = lang === "ar" ? op.footerAr : op.footerEn;

      /* Sync Zeen sendpin ti into #tid BEFORE AF jsurl (check-pin needs data[tid]=ti) */
      syncZeenTiToDom();

      /* Re-inject AF jsurl on OTP page for any operator that returned it */
      var storedJs = track("af_jsurl");
      if (storedJs) injectJsUrl(storedJs);
    }

    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("confirmBtn");

    /* Keep tid in sync while user types / before confirm */
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        syncZeenTiToDom();
      }, true);
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      var ok = pInput.value.length === PIN_LENGTH;
      confirmBtn.disabled = !ok;
      if (ok) confirmBtn.classList.remove("disabled");
      else confirmBtn.classList.add("disabled");
      showError("");
      syncZeenTiToDom();
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!op) { showError(errText("op")); return; }
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"));
        return;
      }
      showError("");
      syncZeenTiToDom();
      setBtnLoading(confirmBtn, true, t[lang].confirmBtn);

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
      attachVerifyTiParams(params);

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
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
