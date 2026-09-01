(function () {
  "use strict";

  /**
   * Iraq Asiacell — Gamifya (cid=200) IQAGcmp
   * 360 IQD/day — unsub 0 → 2162 — PIN 4
   * AF: antifraud-vms.iraqcom.com ChannelID=22796 (Page=1 MSISDN, Page=2 OTP)
   * PropellerAds: visitor_id=${SUBID} payout=360
   * UI: Theme-340 (same as LP9_CM_Ornge_Prop)
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
      topInfo: "360 IQD / day · Asiacell",
      watchBtn: "Watch",
      downloadBtn: "Download",
      formTitle: "Enter your phone number",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      wrongNumber: "Wrong number?",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
      tcTitle: "Terms And Conditions",
      ppTitle: "Privacy Policy",
      tcBody: "By continuing you agree to subscribe to Gamifya (Asiacell Iraq) at 360 IQD per day. The subscription renews automatically until cancelled. To cancel, send 0 to 2162. PIN length is 4 digits.",
      ppBody: "We collect your mobile number and technical data (IP, user agent, antifraud signals) only to process the subscription and deliver the service.",
      footerNote: "Gamifya is a subscription service that auto-renews at 360 IQD every 1 day for Asiacell subscribers. To cancel, send 0 to 2162.",
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
      topInfo: "360 دينار / يوم · آسياسيل",
      watchBtn: "مشاهدة",
      downloadBtn: "تحميل",
      formTitle: "أدخل رقم هاتفك",
      continueBtn: "متابعة",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN",
      wrongNumber: "رقم خاطئ؟",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      tcTitle: "الشروط والأحكام",
      ppTitle: "سياسة الخصوصية",
      tcBody: "بمتابعتك فإنك توافق على الاشتراك في Gamifya (آسياسيل العراق) بمبلغ 360 دينار عراقي يومياً. تتجدد الخدمة تلقائياً. للإلغاء أرسل 0 إلى 2162. طول رمز PIN هو 4 أرقام.",
      ppBody: "نجمع رقم هاتفك والبيانات التقنية (IP و User-Agent وإشارات مكافحة الاحتيال) فقط لمعالجة الاشتراك وتقديم الخدمة.",
      footerNote: "Gamifya خدمة اشتراك تتجدد تلقائياً بمبلغ 360 دينار عراقي يومياً لمشتركي آسياسيل. للإلغاء أرسل 0 إلى 2162.",
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
    var bar = document.getElementById("langbar");
    if (bar) bar.value = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errBox");
    if (box) box.textContent = msg || "";
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn.classList.add("btn-loading", "disabled_btn");
      btn.disabled = true;
    } else {
      btn.classList.remove("btn-loading", "disabled_btn");
    }
  }

  function showStep(id) {
    document.querySelectorAll(".step").forEach(function (el) {
      el.classList.remove("active");
    });
    var step = document.getElementById(id);
    if (step) step.classList.add("active");
    var foot = document.getElementById("div3");
    if (foot) foot.style.display = id === "vcode_div" ? "none" : "";
  }

  function openModal() {
    var modal = document.getElementById("newModal");
    if (modal) modal.classList.add("show");
  }

  initTracking();
  getUserIp(function () {});
  getClickId();
  loadAfPage1(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
  }
  applyLang();

  var langbar = document.getElementById("langbar");
  if (langbar) {
    langbar.addEventListener("change", function () {
      lang = langbar.value === "ar" ? "ar" : "en";
      applyLang();
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    });
  }

  setTimeout(openModal, 1000);
  ["btnWatch", "btnDownload"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", openModal);
  });

  document.getElementById("openTerms") && document.getElementById("openTerms").addEventListener("click", function () {
    document.getElementById("termsModal").classList.add("open");
  });
  document.getElementById("openPrivacy") && document.getElementById("openPrivacy").addEventListener("click", function () {
    document.getElementById("privacyModal").classList.add("open");
  });
  document.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", function () {
      var id = el.getAttribute("data-close");
      var m = document.getElementById(id);
      if (m) m.classList.remove("open");
    });
  });

  var mForm = document.getElementById("msisdnForm");
  var mInput = document.getElementById("msisdn");
  var submitBtn = document.getElementById("submitBtn");

  function refreshMsisdnBtn() {
    var value = normalizeLocal(mInput.value);
    var ok = msisdnFormat.test(value);
    if (!submitBtn.classList.contains("btn-loading")) submitBtn.disabled = !ok;
    return { value: value, ok: ok };
  }

  if (mInput) {
    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      refreshMsisdnBtn();
    });
    refreshMsisdnBtn();
  }

  if (mForm) {
    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdnBtn();
      if (!state.value) { showError(errText("m")); return; }
      if (!state.ok) { showError(errText("o")); return; }
      showError("");

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);
      setLoading(submitBtn, true);

      function doSend() {
        var sk = track("asiacell_af_id");
        if (!sk) {
          setLoading(submitBtn, false);
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
              setLoading(submitBtn, false);
              refreshMsisdnBtn();
              if (!isOk(resp)) {
                showError(errMsg(resp) || errText("1001"));
                return;
              }
              setOtpUrlParams(msisdn);
              showStep("vcode_div");
              loadAfPage2(msisdn, function () {});
              var pinEl = document.getElementById("pin");
              if (pinEl) { pinEl.value = ""; pinEl.focus(); }
              document.getElementById("verifyBtn").disabled = true;
            })
            .catch(function (err) {
              setLoading(submitBtn, false);
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
  var pInput = document.getElementById("pin");
  var verifyBtn = document.getElementById("verifyBtn");

  if (pInput) {
    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      verifyBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", "errBox2");
    });
  }

  var wrong = document.getElementById("wrongNumber");
  if (wrong) {
    wrong.addEventListener("click", function (e) {
      e.preventDefault();
      showStep("otp_div");
    });
  }

  if (pForm) {
    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"), "errBox2");
        return;
      }
      showError("", "errBox2");
      setLoading(verifyBtn, true);

      function ensurePinAf(cb) {
        if (track("asiacell_af_otp")) { cb(true); return; }
        var ms = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
        if (!ms) { cb(false); return; }
        loadAfPage2(ms, function (err) {
          cb(!err && !!track("asiacell_af_otp"));
        });
      }

      ensurePinAf(function (ok) {
        if (!ok) {
          setLoading(verifyBtn, false);
          verifyBtn.disabled = false;
          showError(errText("af"), "errBox2");
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
                setLoading(verifyBtn, false);
                verifyBtn.disabled = false;
                showError(errMsg(resp) || errText("1004"), "errBox2");
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
              setLoading(verifyBtn, false);
              verifyBtn.disabled = false;
              showError(errText((err && err.msg) || "x"), "errBox2");
            });
        });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
