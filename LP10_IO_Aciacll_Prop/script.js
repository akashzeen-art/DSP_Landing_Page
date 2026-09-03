(function () {
  "use strict";

  /**
   * Iraq Asiacell — Student AI (cid=3025) adnet
   * 300 IQD/day — unsub 0 → 2019 — PIN 4
   * AF: ua.od-integrations.com provider_script carrierId=10009
   * PropellerAds: visitor_id=${SUBID} payout=300
   * UI: LP10 Theme-496 (LP10_KSA_mobly_prop)
   */

  var msisdnFormat = /^77[0-9]{8}$/;
  var COUNTRY = "964";
  var PIN_LENGTH = 4;
  var CID = "3025";
  var PORTAL_CID = "861";
  var PAYOUT = "300";
  var ZEEN = "http://64.225.85.48/adnet";

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

  function clientIp() {
    return track("user_ip") || "";
  }

  function getUserIp() {
    if (track("user_ip")) return;
    var done = false;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) try { controller.abort(); } catch (e) {}
    }, 1400);
    var opts = controller ? { signal: controller.signal } : {};
    fetch("https://api.ipify.org?format=json", opts)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        if (done) return;
        done = true;
        if (d && d.ip) persist("user_ip", d.ip);
      })
      .catch(function () { clearTimeout(timer); });
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

  function portalUrl() {
    return ZEEN + "/Promo/Api/CPportal?cid=" + PORTAL_CID;
  }

  function getAfClickId() {
    return track("af_clickid") || track("clk_id") || "";
  }

  function afUrl(page, msisdn) {
    var url = "asiacell-af.php?page=" + encodeURIComponent(String(page));
    var afClk = getAfClickId();
    if (afClk) url += "&af_clickid=" + encodeURIComponent(afClk);
    if (page === 2 && msisdn) url += "&msisdn=" + encodeURIComponent(msisdn);
    return url;
  }

  /* ---------- Asiacell AF Page 1 (MSISDN) ---------- */
  function loadAfPage1(done) {
    fetchJson(afUrl(1))
      .then(function (data) {
        if (data && data.af_clickid) {
          persist("af_clickid", data.af_clickid);
          persist("clk_id", data.af_clickid);
        }
        if (data && data.script) injectScript(data.script);
        if (data && data.antifrauduniqid) {
          persist("asiacell_af_id", data.antifrauduniqid);
          persist("antiFrauduniqid", data.antifrauduniqid);
        }
        if (data && data.mcpuniqid) {
          persist("mcp_uniqid", data.mcpuniqid);
          try {
            var u = new URL(window.location.href);
            if (!u.searchParams.get("uniqid")) {
              u.searchParams.set("uniqid", data.mcpuniqid);
              window.history.replaceState({}, "", u.toString());
            }
          } catch (e) {}
        }
        window.AF_DATA = window.AF_DATA || {};
        if (data && data.antifrauduniqid) window.AF_DATA.antiFrauduniqid = data.antifrauduniqid;
        if (done) done(null, data);
      })
      .catch(function (err) {
        if (done) done(err || { msg: "af" });
      });
  }

  /* ---------- Asiacell AF Page 2 (PIN) ---------- */
  function loadAfPage2(msisdn, done) {
    var btn = document.getElementById("submitterButton");
    if (btn) btn.classList.add("AFsubmitbtn");

    fetchJson(afUrl(2, msisdn))
      .then(function (data) {
        if (data && data.script) injectScript(data.script);
        if (data && data.antifrauduniqid) {
          persist("asiacell_af_otp", data.antifrauduniqid);
          persist("antiFrauduniqid_pin", data.antifrauduniqid);
        }
        window.AF_DATA = window.AF_DATA || {};
        if (data && data.antifrauduniqid) window.AF_DATA.antiFrauduniqid = data.antifrauduniqid;
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
        "Student AI خدمة اشتراك تتجدد تلقائياً بمبلغ 300 دينار عراقي يومياً لمشتركي آسياسيل. للإلغاء أرسل 0 إلى 2019.",
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
        "Student AI is a subscription service that auto-renews at 300 IQD every 1 Day(s) for Asiacell subscribers. To cancel, send 0 to 2019.",
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
    var verify = document.getElementById("submitterButton");
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
  getUserIp();
  getClickId();

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
        var sk = track("asiacell_af_id") || track("antiFrauduniqid");
        if (!sk) {
          setLoading(false);
          refreshMsisdnBtn();
          showError(errText("af"));
          return;
        }

        var params = {
          cid: CID,
          msisdn: msisdn,
          click_id: getClickId(),
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || "0",
          user_ip: clientIp(),
          ua: navigator.userAgent || "",
          sessionKey: sk
        };

        callApi("sendpin", params)
          .then(function (resp) {
            setLoading(false);
            refreshMsisdnBtn();
            if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
            if (!isOk(resp)) {
              showError(errText(errCode(resp)) || errText("1001"));
              return;
            }
            setOtpUrlParams(msisdn);
            showPinStep();
            loadAfPage2(msisdn, function () {});
            var pinEl = document.getElementById("pincode");
            if (pinEl) { pinEl.value = ""; pinEl.focus(); }
            var confirmBtn = document.getElementById("submitterButton");
            if (confirmBtn) confirmBtn.disabled = true;
          })
          .catch(function (err) {
            setLoading(false);
            refreshMsisdnBtn();
            showError(errText((err && err.msg) || "x"));
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
    var confirmBtn = document.getElementById("submitterButton");
    var errId = pinOnly ? "errortext" : "errortext2";

    var msForAf = track("msisdn") || (track("phone") ? fullMsisdn(track("phone")) : "");
    if (msForAf && (pinOnly || (document.getElementById("vcode_div") && !document.getElementById("otp_div")) ||
        (document.getElementById("otp_div") && document.getElementById("otp_div").classList.contains("hide")))) {
      loadAfPage2(msForAf, function () {});
    }

    function ensurePinAf(cb) {
      if (track("asiacell_af_otp") || (window.AF_DATA && window.AF_DATA.antiFrauduniqid)) {
        cb(true);
        return;
      }
      var ms = track("msisdn") || (track("phone") ? fullMsisdn(track("phone")) : "");
      if (!ms) { cb(false); return; }
      loadAfPage2(ms, function (err, data) {
        cb(!err && !!(track("asiacell_af_otp") || (data && data.antifrauduniqid)));
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

        var sk = track("asiacell_af_otp") ||
          track("antiFrauduniqid_pin") ||
          (window.AF_DATA && window.AF_DATA.antiFrauduniqid) ||
          track("sessionKey") ||
          "";

        var params = {
          cid: CID,
          msisdn: track("msisdn") || fullMsisdn(track("phone")),
          click_id: getClickId(),
          otp: otp,
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || "0",
          user_ip: clientIp(),
          ua: navigator.userAgent || "",
          sessionKey: sk
        };

        callApi("verifypin", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(false);
              confirmBtn.disabled = false;
              showError(errText(errCode(resp)) || errText("1004"), errId);
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalUrl());
            persist("pb_amount", PAYOUT);
            callApi("checkstatus", { cid: CID, msisdn: params.msisdn }).catch(function () {});
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
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
