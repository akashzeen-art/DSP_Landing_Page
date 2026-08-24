(function () {
  "use strict";

  /**
   * Iraq Asiacell — Gamifya (cid=200) IQAGcmp
   * 360 IQD/day — unsub 0 → 2162 — PIN 4
   * AF: antifraud-vms.iraqcom.com ChannelID=22796 (Page=1 MSISDN, Page=2 OTP)
   * Clickadu: visitor_id=${SUBID} aid=307904
   * UI: Theme-496 (same as LP10_KSA_mobly_prop)
   */

  var msisdnFormat = /^77[0-9]{8}$/;
  var COUNTRY = "964";
  var PIN_LENGTH = 4;
  var CID = "200";
  var PAYOUT = "360";
  var API_BASE = "http://143.198.213.74/prod/IQAGcmp";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var POSTBACK = {
    url: "https://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/",
    aid: "307904"
  };

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

  function isRealClickId(v) {
    if (!v) return false;
    var s = String(v).trim();
    if (!s) return false;
    var low = s.toLowerCase();
    if (s.indexOf("local_") === 0) return false;
    if (low === "clickid" || low === "subid" || low === "visitor_id") return false;
    if (s.indexOf("{") !== -1 || s.indexOf("${") !== -1) return false;
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

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var clickId =
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("subid") ||
      params.get("token") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    ["pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"].forEach(function (k) {
      var v = params.get(k);
      if (v && String(v).indexOf("{") === -1 && String(v).indexOf("$") === -1) persist(k, v);
    });

    /* Doc: OTP page URL carries uniqid (mcpuniqid) + MSISDN */
    var uniq = params.get("uniqid") || params.get("mcpuniqid") || "";
    if (uniq) persist("mcp_uniqid", uniq);
    var af1 = params.get("antifraudUniqId") || params.get("antifrauduniqid") || "";
    if (af1) persist("asiacell_af_id", af1);
    var ms = params.get("MSISDN") || params.get("msisdn") || "";
    if (ms) {
      var local = normalizeLocal(ms);
      if (local) {
        persist("phone", local);
        persist("msisdn", COUNTRY + local);
      }
    }

    if (!track("pub_id")) persist("pub_id", "clickadu");
    if (!track("sub_pub_id")) {
      var zone = params.get("zoneid") || params.get("zone_id") || "0";
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

  function getVisitorId() {
    var existing = track("click_id");
    return isRealClickId(existing) ? existing : "";
  }

  function getUserIp(cb) {
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

  function injectScript(src) {
    if (!src) return;
    try {
      var s = document.createElement("script");
      s.type = "text/javascript";
      s.text = src;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function fetchJson(url) {
    return fetch(url, { method: "GET", credentials: "omit", cache: "no-store" }).then(function (res) {
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
    });
  }

  function apiUrl(path, params) {
    var q = new URLSearchParams(params || {});
    if (useProxy) {
      q.set("path", path);
      return "iq-api.php?" + q.toString();
    }
    return API_BASE + "/" + path + "?" + q.toString();
  }

  function callApi(path, params) {
    return fetchJson(apiUrl(path, params));
  }

  function isOk(resp) {
    if (!resp) return false;
    var r = String(resp.response || "").toUpperCase();
    if (r === "SUCCESS" || r === "ACTIVE") return true;
    var m = String(resp.errorMessage || resp.msg || "").toLowerCase();
    return /success|otp sent|otp verified|active/.test(m);
  }

  function errMsg(resp) {
    return String((resp && (resp.errorMessage || resp.msg || resp.message)) || "");
  }

  function portalUrl(msisdn) {
    return API_BASE + "/redirect?cid=" + CID + "&msisdn=" + encodeURIComponent(msisdn);
  }

  /* ---------- Asiacell AF Page=1 (MSISDN) ---------- */
  function loadAfPage1(done) {
    var url =
      "asiacell-af.php?page=1&clickid=" + encodeURIComponent(getClickId());
    fetchJson(url)
      .then(function (data) {
        if (data && data.script) injectScript(data.script);
        if (data && data.antifrauduniqid) persist("asiacell_af_id", data.antifrauduniqid);
        if (data && data.mcpuniqid) persist("mcp_uniqid", data.mcpuniqid);
        if (done) done(null, data);
      })
      .catch(function (err) {
        if (done) done(err || { msg: "af" });
      });
  }

  /* ---------- Asiacell AF Page=2 (OTP) ---------- */
  function loadAfPage2(msisdn, done) {
    var url =
      "asiacell-af.php?page=2&clickid=" + encodeURIComponent(getClickId()) +
      "&msisdn=" + encodeURIComponent(msisdn || "");
    fetchJson(url)
      .then(function (data) {
        if (data && data.script) injectScript(data.script);
        if (data && data.antifrauduniqid) persist("asiacell_af_otp", data.antifrauduniqid);
        if (data && data.mcpuniqid) persist("mcp_uniqid", data.mcpuniqid);
        if (done) done(null, data);
      })
      .catch(function (err) {
        if (done) done(err || { msg: "af" });
      });
  }

  function setOtpUrlParams(msisdn) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("uniqid", track("mcp_uniqid") || "");
      url.searchParams.set("MSISDN", msisdn || "");
      window.history.replaceState({}, "", url);
    } catch (e) {}
  }

  function firePostback(done) {
    var clickId = getVisitorId();
    var once = false;
    function finish(ok) {
      if (once) return;
      once = true;
      if (typeof done === "function") done(ok);
    }
    if (!clickId) { finish(false); return; }

    var qs =
      "visitor_id=" + encodeURIComponent(clickId) +
      "&aid=" + encodeURIComponent(POSTBACK.aid);
    var direct = POSTBACK.url + "?" + qs;
    var proxy = "clickadu-pb.php?visitor_id=" + encodeURIComponent(clickId);

    try { var img = new Image(); img.src = direct + "&_t=" + Date.now(); } catch (e) {}
    try { fetch(direct, { method: "GET", mode: "no-cors", keepalive: true }).catch(function () {}); } catch (e2) {}
    if (navigator.sendBeacon) { try { navigator.sendBeacon(proxy); } catch (e3) {} }

    if (useProxy) {
      fetch(proxy, { method: "GET", keepalive: true })
        .then(function (r) { finish(r.ok); })
        .catch(function () { finish(true); });
    } else {
      setTimeout(function () { finish(true); }, 800);
      return;
    }
    setTimeout(function () { finish(true); }, 4000);
  }

  var lang = "ar";
  var t = {
    ar: {
      heroTitle: "انت علي بعد خطوة واحدة للمشاهدة",
      formTitle: "أدخل رقم هاتفك",
      continueBtn: "متابعة",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN",
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer:
        "Gamifya خدمة اشتراك تتجدد تلقائياً بمبلغ 360 دينار عراقي يومياً لمشتركي آسياسيل. للإلغاء أرسل 0 إلى 2162.",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم آسياسيل صحيح (10 أرقام يبدأ بـ 77).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        af: "جاري تحميل الحماية. حاول مرة أخرى.",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم."
      }
    },
    en: {
      heroTitle: "You're one step away from watching",
      formTitle: "Enter your phone number",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
      disclaimer:
        "Gamifya is a subscription service that auto-renews at 360 IQD every 1 Day(s) for Asiacell subscribers. To cancel, send 0 to 2162.",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Asiacell number (10 digits starting with 77).",
        p: "Please enter the 4-digit PIN",
        af: "Security check loading. Please try again.",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || t.en.errmsg[key] || "";
  }

  function applyLang() {
    var dict = t[lang] || t.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.textContent = dict[key];
    });
    var bar = document.getElementById("langbar");
    if (bar) bar.value = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errortext") || document.getElementById("errortext2");
    if (box) box.textContent = msg || "";
  }

  function setLoading(on) {
    var otpLoad = document.getElementById("otploading");
    var pinLoad = document.getElementById("vcodeloading");
    var btn1 = document.getElementById("btn-1");
    var verify = document.getElementById("verifybtn");
    if (on) {
      if (otpLoad) otpLoad.style.display = "inline-block";
      if (pinLoad) pinLoad.style.display = "inline-block";
      if (btn1) { btn1.classList.add("btn-loading"); btn1.disabled = true; }
      if (verify) { verify.classList.add("btn-loading"); verify.disabled = true; }
    } else {
      if (otpLoad) otpLoad.style.display = "none";
      if (pinLoad) pinLoad.style.display = "none";
      if (btn1) btn1.classList.remove("btn-loading");
      if (verify) verify.classList.remove("btn-loading");
    }
  }

  function showPinStep() {
    var otp = document.getElementById("otp_div");
    var pin = document.getElementById("vcode_div");
    if (otp) otp.classList.add("hide");
    if (pin) pin.classList.remove("hide");
    var langbar = document.getElementById("langbar");
    if (langbar) langbar.style.visibility = "hidden";
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
  getUserIp(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "ar"; } catch (e) { lang = "ar"; }
  }
  applyLang();

  var langbar = document.getElementById("langbar");
  if (langbar) {
    langbar.addEventListener("change", function () {
      lang = langbar.value === "en" ? "en" : "ar";
      applyLang();
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
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

  var mForm = document.getElementById("msisdnForm");
  var pinOnly = !mForm && !!document.getElementById("pinForm");

  /* AF Page=1 on MSISDN page load */
  if (mForm) {
    loadAfPage1(function () {});
  }

  if (mForm) {
    var mInput = document.getElementById("phone");
    var submitBtn = document.getElementById("btn-1");

    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!submitBtn.classList.contains("btn-loading")) submitBtn.disabled = !ok;
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
      setLoading(true);

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      function doSend() {
        var sk = track("asiacell_af_id");
        if (!sk) {
          setLoading(false);
          refreshMsisdnBtn();
          showError(errText("af"));
          return;
        }
        getUserIp(function (ip) {
          callApi("sendPIN", {
            cid: CID,
            msisdn: msisdn,
            ip: ip || track("user_ip") || "0.0.0.0",
            sessionKey: sk
          })
            .then(function (resp) {
              setLoading(false);
              refreshMsisdnBtn();
              if (!isOk(resp)) {
                showError(errMsg(resp) || errText("1001"));
                return;
              }
              /* Doc: add mcpuniqid + MSISDN to OTP URL */
              setOtpUrlParams(msisdn);
              showPinStep();
              loadAfPage2(msisdn, function () {});
              var pinEl = document.getElementById("pincode");
              if (pinEl) { pinEl.value = ""; pinEl.focus(); }
              document.getElementById("verifybtn").disabled = true;
            })
            .catch(function (err) {
              setLoading(false);
              refreshMsisdnBtn();
              showError(errText((err && err.msg) || "x"));
            });
        });
      }

      if (!track("asiacell_af_id")) {
        loadAfPage1(function () { doSend(); });
      } else {
        doSend();
      }
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    if (pinOnly && !track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    }

    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("verifybtn");
    var errId = pinOnly ? "errortext" : "errortext2";
    var pinAfReady = false;

    /* AF Page=2 when landing on PIN (same-page after send or pin.html) */
    var msForAf = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
    if (document.getElementById("vcode_div") &&
        (!document.getElementById("otp_div") || document.getElementById("otp_div").classList.contains("hide") || pinOnly)) {
      if (msForAf) {
        loadAfPage2(msForAf, function (err) {
          pinAfReady = !err && !!track("asiacell_af_otp");
        });
      }
    }

    /* After same-page transition AF is loaded in sendPIN success; mark ready when id appears */
    function ensurePinAf(cb) {
      if (track("asiacell_af_otp")) { cb(true); return; }
      var ms = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
      if (!ms) { cb(false); return; }
      loadAfPage2(ms, function (err) {
        cb(!err && !!track("asiacell_af_otp"));
      });
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      confirmBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", errId);
    });

    var wrong = document.getElementById("wrongNumber");
    if (wrong && !pinOnly) {
      wrong.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.reload();
      });
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"), errId);
        return;
      }
      showError("", errId);
      setLoading(true);

      ensurePinAf(function (ok) {
        if (!ok) {
          setLoading(false);
          confirmBtn.disabled = false;
          showError(errText("af"), errId);
          return;
        }
        getUserIp(function (ip) {
          var msisdn = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
          callApi("verifyPIN", {
            cid: CID,
            msisdn: msisdn,
            pin: otp,
            ip: ip || track("user_ip") || "0.0.0.0",
            sessionKey: track("asiacell_af_otp")
          })
            .then(function (resp) {
              if (!isOk(resp)) {
                setLoading(false);
                confirmBtn.disabled = false;
                showError(errMsg(resp) || errText("1004"), errId);
                return;
              }
              persist("converted", "1");
              persist("portal_url", portalUrl(msisdn));
              persist("pb_amount", PAYOUT);
              firePostback(function () {
                window.location.href = "thankyou.html?lang=" + lang;
              });
            })
            .catch(function (err) {
              setLoading(false);
              confirmBtn.disabled = false;
              showError(errText((err && err.msg) || "x"), errId);
            });
        });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
