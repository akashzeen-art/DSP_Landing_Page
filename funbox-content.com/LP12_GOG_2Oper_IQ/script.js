(function () {
  "use strict";

  /**
   * Iraq 2-Operator — funbox-content.com / LP12_GOG_2Oper_IQ
   * UI: LP12_GOG_3Oper_KW CuriousCubs
   *
   * Korek    (cid=3158) portal 916 — GameX — IQD 300/day — 02→3999 — PIN 4
   *           AF: apicalling.com offId=2368 (page=2 PIN only)
   *           ti → sessionKey on verifypin; ts on OTP URL when present
   *
   * Asiacell (cid=3175) portal 327 — ZD Distinguished — IQD 300/day — 0→2296 — PIN 4
   *           AF: sdp.salasto.dev Shield ChannelID=22737 (page 1 + page 2)
   *           AntiFrauduniqid → sessionKey; MCPuniqid → fraudCheckToken + ?uniqid=
   *           confirmBtn gets class AFsubmitbtn on PIN page
   *
   * Google Ads: AW-18261554290
   * Flow: index → operator (sendpin) → pin (verifypin) → thankyou
   */

  var msisdnFormat = /^7[0-9]{9}$/;
  var COUNTRY = "964";
  var ZEEN = "http://64.225.85.48/adnet";
  var MSISDN_BTN = "evina_ctabutton";
  var PIN_BTN = "confirmBtn";
  var ASIA_CHANNEL = "22737";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    korek: {
      key: "korek",
      cid: "3158",
      portalCid: "916",
      name: "Korek",
      pinLen: 4,
      afType: "korek",
      offId: "2368",
      footerEn: "GameX — Korek IQ: IQD 300/day. To cancel, send 02 to 3999.",
      footerAr: "GameX — كورك: 300 دينار/يوم. للإلغاء أرسل 02 إلى 3999."
    },
    asiacell: {
      key: "asiacell",
      cid: "3175",
      portalCid: "327",
      name: "Asiacell",
      pinLen: 4,
      afType: "asiacell",
      footerEn: "ZD Distinguished — Asiacell IQ: IQD 300/day. To cancel, send 0 to 2296.",
      footerAr: "ZD Distinguished — آسياسيل: 300 دينار/يوم. للإلغاء أرسل 0 إلى 2296."
    }
  };

  var FOOTER_ALL_EN =
    "Korek GameX: IQD 300/day (02→3999). Asiacell ZD Distinguished: IQD 300/day (0→2296).";
  var FOOTER_ALL_AR =
    "كورك GameX: 300 دينار/يوم (02→3999). آسياسيل ZD Distinguished: 300 دينار/يوم (0→2296).";

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

  /** Asiacell 77, Korek 75 */
  function detectOperatorKey(localOrFull) {
    var d = String(localOrFull || "").replace(/\D/g, "");
    if (d.indexOf(COUNTRY) === 0) d = d.slice(COUNTRY.length);
    if (d.charAt(0) === "0") d = d.slice(1);
    if (d.indexOf("77") === 0) return "asiacell";
    if (d.indexOf("75") === 0) return "korek";
    return "";
  }

  function clearKorekAf() {
    ["af_ti", "af_ts"].forEach(function (k) {
      try { sessionStorage.removeItem(k); } catch (e) {}
      try { localStorage.removeItem(k); } catch (e2) {}
    });
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

    var urlTs = params.get("ts");
    if (urlTs && String(urlTs).indexOf("{") === -1) persist("af_ts", urlTs);

    var uniq = params.get("uniqid") || params.get("mcpuniqid") || "";
    if (uniq && String(uniq).indexOf("{") === -1) persist("mcp_uniqid", uniq);

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
      fetch("https://api.ipify.org?format=json")
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.ip) persist("user_ip", d.ip); })
        .catch(function () {});
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
    }, 90000);
    var opts = { method: "GET", credentials: "omit", cache: "no-store" };
    if (controller) opts.signal = controller.signal;

    return fetch(apiUrl(path, params), opts).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text) || /^\s*<!DOCTYPE/i.test(text) || /502 Bad Gateway/i.test(text)) {
          throw { msg: "php" };
        }
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
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "916");
  }

  function injectAfScript(scriptBody) {
    if (!scriptBody) return;
    var s = String(scriptBody).trim();
    if (!s) return;
    try {
      if (/^https?:\/\//i.test(s)) {
        var ext = document.createElement("script");
        ext.src = s;
        ext.async = true;
        document.head.appendChild(ext);
        return;
      }
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.setAttribute("data-af", "1");
      script.text = s;
      document.head.appendChild(script);
    } catch (e) {}
  }

  /* —— Korek gulfpay AF (page 2) —— */
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
          if (tiVal) persist("af_ti", tiVal);
          if (tsVal) persist("af_ts", tsVal);
          if (data.script) injectAfScript(data.script);
          setTimeout(function () { done(data); }, 150);
          return;
        }
        done(null);
      })
      .catch(function () {
        clearTimeout(to);
        done(null);
      });
  }

  function applyKorekAfToParams(params) {
    var afTi = track("af_ti");
    var afTs = track("af_ts");
    if (afTi && String(afTi).trim() !== "") params.sessionKey = String(afTi).trim();
    if (afTs && String(afTs).trim() !== "") params.ts = String(afTs).trim();
    return params;
  }

  /* —— Asiacell Shield AF —— */
  function asiacellAfUrl(page, msisdn) {
    var url =
      "asiacell-af.php?page=" + encodeURIComponent(String(page)) +
      "&click_id=" + encodeURIComponent(getClickId()) +
      "&channel=" + encodeURIComponent(ASIA_CHANNEL);
    if (msisdn) url += "&msisdn=" + encodeURIComponent(msisdn);
    return url;
  }

  function loadAsiacellAf(page, msisdn, done) {
    fetch(asiacellAfUrl(page, msisdn), { method: "GET", cache: "no-store", credentials: "omit" })
      .then(function (r) {
        return r.text().then(function (text) {
          try { return JSON.parse(text); } catch (e) { return null; }
        });
      })
      .then(function (data) {
        if (!data) {
          if (done) done(null);
          return;
        }
        if (data.script) injectAfScript(data.script);
        if (data.antifrauduniqid) {
          if (page === 1) {
            persist("asiacell_af_id", data.antifrauduniqid);
            persist("antiFrauduniqid", data.antifrauduniqid);
          } else {
            persist("asiacell_af_otp", data.antifrauduniqid);
            persist("antiFrauduniqid_pin", data.antifrauduniqid);
          }
          window.AF_DATA = window.AF_DATA || {};
          window.AF_DATA.antiFrauduniqid = data.antifrauduniqid;
        }
        if (data.mcpuniqid) {
          persist("mcp_uniqid", data.mcpuniqid);
          try {
            var u = new URL(window.location.href);
            if (!u.searchParams.get("uniqid")) {
              u.searchParams.set("uniqid", data.mcpuniqid);
              window.history.replaceState({}, "", u.toString());
            }
          } catch (e2) {}
        }
        if (page === 1 && data.antifrauduniqid) persist("af_page1", "1");
        if (done) done(data);
      })
      .catch(function () {
        if (done) done(null);
      });
  }

  function pinPageUrl(extra) {
    var url = "pin.html?lang=" + encodeURIComponent(lang);
    var afTs = track("af_ts");
    if (afTs) url += "&ts=" + encodeURIComponent(afTs);
    var mcp = track("mcp_uniqid");
    if (mcp) url += "&uniqid=" + encodeURIComponent(mcp);
    if (extra) url += extra;
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
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      opKorek: "Korek",
      opAsiacell: "Asiacell",
      opKorekPrice: "GameX — IQD 300 / day",
      opAsiacellPrice: "ZD Distinguished — IQD 300 / day",
      termsLink: "Terms and Conditions",
      privacyLink: "Privacy Policy",
      disclaimer: FOOTER_ALL_EN,
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Iraq mobile number (10 digits starting with 7).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
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
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      opKorek: "كورك",
      opAsiacell: "آسياسيل",
      opKorekPrice: "GameX — 300 دينار / يوم",
      opAsiacellPrice: "ZD Distinguished — 300 دينار / يوم",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer: FOOTER_ALL_AR,
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم عراقي صحيح (10 أرقام يبدأ بـ 7).",
        op: "الرجاء اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
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

  /* —— index: MSISDN → operator (+ Asiacell Shield page 1) —— */
  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    setActiveStep(2);
    var mInput = document.getElementById("telInput");
    var submitBtn = document.getElementById("evina_ctabutton");
    var page1Busy = false;

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
      if (page1Busy) return;
      showError("");

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      var guessed = detectOperatorKey(state.value);
      function goOperator() {
        window.location.href = "operator.html?lang=" + lang;
      }

      if (guessed === "asiacell") {
        page1Busy = true;
        setBtnLoading(submitBtn, true, t[lang].continueBtn);
        clearKorekAf();
        getUserIp(function () {
          loadAsiacellAf(1, msisdn, function (data) {
            setBtnLoading(submitBtn, false, t[lang].continueBtn);
            refreshMsisdnBtn();
            page1Busy = false;
            if (!data || !track("asiacell_af_id")) {
              showError(errText("af"));
              return;
            }
            goOperator();
          });
        });
      } else {
        clearKorekAf();
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
              var sk = track("asiacell_af_id") || track("antiFrauduniqid");
              if (!sk) {
                unlockOp();
                showError(errText("af"));
                return;
              }
              params.sessionKey = sk;
              var mcp = track("mcp_uniqid");
              if (mcp) params.fraudCheckToken = mcp;
            } else {
              clearKorekAf();
              var sk2 = track("sessionKey");
              if (sk2) params.sessionKey = sk2;
            }

            callApi("sendpin", params)
              .then(function (resp) {
                if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
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
            if (track("af_page1") === "1" && track("asiacell_af_id")) {
              doSendPin();
            } else {
              getUserIp(function () {
                loadAsiacellAf(1, msisdn, function (data) {
                  if (!data || !track("asiacell_af_id")) {
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

  /* —— pin: AF → verifypin —— */
  var pForm = document.getElementById("pinForm");
  if (pForm) {
    setActiveStep(3);
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];
    var pinAfReady = true;

    try {
      var urlTs = new URLSearchParams(window.location.search).get("ts");
      if (urlTs) persist("af_ts", urlTs);
      var urlUniq = new URLSearchParams(window.location.search).get("uniqid");
      if (urlUniq) persist("mcp_uniqid", urlUniq);
    } catch (eTs) {}

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
      return;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
      return;
    }

    var foot = document.getElementById("opFooterNote");
    if (foot) foot.textContent = lang === "ar" ? op.footerAr : op.footerEn;

    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("confirmBtn");
    var pinLen = op.pinLen || 4;
    pInput.maxLength = pinLen;

    pinAfReady = false;
    var msForAf = track("msisdn") || fullMsisdn(track("phone")) || "";

    if (op.afType === "asiacell") {
      if (confirmBtn) confirmBtn.classList.add("AFsubmitbtn");
      getUserIp(function () {
        loadAsiacellAf(2, msForAf, function () {
          pinAfReady = true;
        });
      });
    } else {
      getUserIp(function () {
        runGulfpayAntifraud(op.offId, 2, PIN_BTN, msForAf, function () {
          pinAfReady = true;
        });
      });
    }

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
        showError(errText("p"));
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

        if (op.afType === "asiacell") {
          var sk =
            track("asiacell_af_otp") ||
            track("antiFrauduniqid_pin") ||
            (window.AF_DATA && window.AF_DATA.antiFrauduniqid) ||
            "";
          if (sk) params.sessionKey = sk;
          var mcp = track("mcp_uniqid");
          if (mcp) params.fraudCheckToken = mcp;
        } else {
          applyKorekAfToParams(params);
          if (!params.sessionKey) {
            var sk2 = track("sessionKey");
            if (sk2) params.sessionKey = sk2;
          }
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

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
