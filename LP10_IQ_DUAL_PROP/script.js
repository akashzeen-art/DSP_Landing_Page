(function () {
  "use strict";

  /**
   * Iraq Dual — Korek + Asiacell (PropellerAds)
   * UI: LP10_IQ_Kork_Adver Theme-496 — AR/EN
   *
   * Korek    cid=3022 portal=326 — ZD Know Your Country — IQD 300/day — 0→2115 — PIN 4
   *           AF: Evina digitalapicalls.com (PIN) — ti=windowtechnologies_{ts}_{hex}&ts={ts}
   * Asiacell cid=3175 portal=327 — ZD Distinguished — IQD 300/day — 0→2296 — PIN 4
   *           AF: Shield ChannelID=22737 Page1+2
   *           AntiFrauduniqid=Page AF id, uniqId=MCP id (MUST differ on pinval)
   *
   * Detect: 75→Korek, 77→Asiacell
   * Propeller: visitor_id=${SUBID} payout=300
   */

  var COUNTRY = "964";
  var PIN_LENGTH = 4;
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

  var OPERATORS = {
    korek: {
      key: "korek",
      cid: "3022",
      portalCid: "326",
      name: "Korek",
      prefix: /^75/,
      af: "evina",
      footerEn: "ZD Know Your Country — Korek: 300 IQD/day. To cancel, send 0 to 2115.",
      footerAr: "ZD Know Your Country — كورك: 300 دينار/يوم. للإلغاء أرسل 0 إلى 2115."
    },
    asiacell: {
      key: "asiacell",
      cid: "3175",
      portalCid: "327",
      name: "Asiacell",
      prefix: /^77/,
      af: "shield",
      footerEn: "ZD Distinguished — Asiacell: 300 IQD/day. To cancel, send 0 to 2296.",
      footerAr: "ZD Distinguished — آسياسيل: 300 دينار/يوم. للإلغاء أرسل 0 إلى 2296."
    }
  };

  var FOOTER_ALL_EN =
    "Korek — Know Your Country: 300 IQD/day (cancel: 0 to 2115). Asiacell — Distinguished: 300 IQD/day (cancel: 0 to 2296).";
  var FOOTER_ALL_AR =
    "Korek — Know Your Country: 300 دينار/يوم (إلغاء: 0 إلى 2115). Asiacell — Distinguished: 300 دينار/يوم (إلغاء: 0 إلى 2296).";

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

  function detectOperatorKey(localOrFull) {
    var d = normalizeLocal(localOrFull);
    if (d.indexOf("77") === 0) return "asiacell";
    if (d.indexOf("75") === 0) return "korek";
    return "";
  }

  function isValidMsisdn(local) {
    return /^(75|77)[0-9]{8}$/.test(local);
  }

  function currentOp() {
    return OPERATORS[track("operator")] || null;
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

    var uniq =
      params.get("uniqId") ||
      params.get("uniqid") ||
      params.get("mcpuniqid") ||
      params.get("MCPuniqid") ||
      "";
    if (uniq) {
      uniq = String(uniq).trim();
      persist("mcp_uniqid", uniq);
      persist("mcp_uniqid_p1", uniq);
    }
    var afParam = params.get("AntiFrauduniqid") || params.get("antifrauduniqid") || "";
    if (afParam) {
      afParam = String(afParam).trim();
      if (!uniq || afParam !== uniq) persist("asiacell_af_id", afParam);
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

  function apiUrl(path, params) {
    var q = new URLSearchParams(params || {});
    if (useProxy) {
      q.set("path", path);
      return "zeen-api.php?" + q.toString();
    }
    return ZEEN + "/" + path + "?" + q.toString();
  }

  function callApi(path, params) {
    return fetch(apiUrl(path, params), {
      method: "GET",
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
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

  function portalUrl(op) {
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "326");
  }

  function baseParams(op, extra) {
    var p = {
      cid: op.cid,
      msisdn: track("msisdn") || "",
      click_id: getClickId(),
      pub_id: track("pub_id") || "propeller",
      sub_pub_id: track("sub_pub_id") || "ZONE0",
      user_ip: track("user_ip") || "0.0.0.0",
      ua: navigator.userAgent || ""
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] != null && extra[k] !== "") p[k] = extra[k];
      });
    }
    return p;
  }

  /* ---------- Korek Evina (PIN) — ti=windowtechnologies_{ts}_{hex32} ---------- */
  function korekSecondsEpoch() {
    return Math.floor(Date.now() / 1000);
  }

  function korekRandomHex(len) {
    var chars = "0123456789abcdef";
    var out = "";
    for (var i = 0; i < len; i++) {
      out += chars.charAt(Math.floor(Math.random() * 16));
    }
    return out;
  }

  function korekGenerateTi(ts) {
    return "windowtechnologies_" + String(ts) + "_" + korekRandomHex(32);
  }

  function runKorekAntifraud(cb) {
    var ts = korekSecondsEpoch();
    var ti = korekGenerateTi(ts);
    var tiEl = document.getElementById("tiParameter");
    var tsEl = document.getElementById("tsParameter");
    if (tiEl) tiEl.value = ti;
    if (tsEl) tsEl.value = String(ts);
    persist("af_ti", ti);
    persist("af_ts", String(ts));

    var params = new URLSearchParams({
      ti: ti,
      ts: String(ts),
      te: "#confirm_btn",
      servicename: "KnowYourCountry",
      merchantname: "windowtechnologies",
      type: "pin"
    });
    var url = "https://www.digitalapicalls.com/antifraud/Iraq-Korek/Evina?action=script&" + params.toString();

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.s) {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.id = "korek_response";
          script.appendChild(document.createTextNode(data.s));
          document.head.appendChild(script);

          var tag = document.createElement("script");
          tag.type = "text/javascript";
          tag.appendChild(document.createTextNode("var event = new Event('DCBProtectRun');\ndocument.dispatchEvent(event);"));
          document.head.appendChild(tag);
        }
        if (typeof cb === "function") cb(null, ti, ts);
      })
      .catch(function (err) {
        if (typeof cb === "function") cb(err || {}, ti, ts);
      });
  }

  function applyKorekAfToParams(params) {
    var kTi = track("af_ti") || (document.getElementById("tiParameter") && document.getElementById("tiParameter").value);
    var kTs = track("af_ts") || (document.getElementById("tsParameter") && document.getElementById("tsParameter").value);
    if (kTi) {
      params.ti = String(kTi).trim();
      params.sessionKey = String(kTi).trim();
    }
    if (kTs) params.ts = String(kTs).trim();
    return params;
  }

  /* Asiacell pin validation (Bhanu): AntiFrauduniqid ≠ uniqId — MUST be different
   *   AntiFrauduniqid / sessionKey  = Shield AntiFrauduniqid (page1 send / page2 verify)
   *   uniqId / fraudCheckToken      = Shield MCPuniqid
   * Wrong (fails): AntiFrauduniqid=ssk…&uniqId=ssk…  (same value)
   * Right:         AntiFrauduniqid=2026…_31f9…&uniqId=sskb7155…
   */
  function applyAsiacellAfToParams(params, page) {
    var afId =
      page === 2
        ? (track("asiacell_af_otp") || track("asiacell_af_id"))
        : (track("asiacell_af_id") || track("asiacell_af_otp"));
    var mcp =
      page === 2
        ? (track("mcp_uniqid_otp") || track("mcp_uniqid") || track("mcp_uniqid_p1"))
        : (track("mcp_uniqid_p1") || track("mcp_uniqid") || track("mcp_uniqid_otp"));

    afId = afId ? String(afId).trim() : "";
    mcp = mcp ? String(mcp).trim() : "";

    /* Never allow duplicate — if MCP equals AF, drop MCP (do not copy AF into uniqId) */
    if (mcp && afId && mcp === afId) {
      mcp = "";
      var alt = String(track("mcp_uniqid_p1") || track("mcp_uniqid") || "").trim();
      if (alt && alt !== afId) mcp = alt;
    }

    if (afId) {
      params.sessionKey = afId;
      params.AntiFrauduniqid = afId;
    }
    if (mcp && mcp !== afId) {
      params.fraudCheckToken = mcp;
      params.uniqId = mcp;
    }
    return params;
  }

  /* ---------- Asiacell Shield Page=1 / Page=2 ---------- */
  function loadAsiacellAf(page, msisdn, cb) {
    var url =
      "asiacell-af.php?page=" + encodeURIComponent(String(page)) +
      "&click_id=" + encodeURIComponent(getClickId()) +
      "&msisdn=" + encodeURIComponent(msisdn || "");
    fetch(url, { method: "GET", credentials: "omit", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.script) injectScript(data.script);

        var af = data && data.antifrauduniqid ? String(data.antifrauduniqid).trim() : "";
        var mcp = data && data.mcpuniqid ? String(data.mcpuniqid).trim() : "";
        /* If Shield returns same string for both, keep AF only; retain prior MCP */
        if (mcp && af && mcp === af) mcp = "";

        if (af) {
          if (page === 1) persist("asiacell_af_id", af);
          else persist("asiacell_af_otp", af);
        }
        if (mcp) {
          persist("mcp_uniqid", mcp);
          if (page === 1) persist("mcp_uniqid_p1", mcp);
          else persist("mcp_uniqid_otp", mcp);
        }
        if (cb) cb(null, data);
      })
      .catch(function (err) {
        if (cb) cb(err || { msg: "af" });
      });
  }

  function setOtpUrlParams(msisdn) {
    try {
      var url = new URL(window.location.href);
      var afId = String(track("asiacell_af_id") || track("asiacell_af_otp") || "").trim();
      var mcp = String(
        track("mcp_uniqid_p1") || track("mcp_uniqid") || track("mcp_uniqid_otp") || ""
      ).trim();
      if (mcp && afId && mcp === afId) mcp = "";
      /* Doc: &uniqid=MCPUniqid (MCP only — not AntiFrauduniqid) */
      if (mcp) {
        url.searchParams.set("uniqid", mcp);
        url.searchParams.set("uniqId", mcp);
      }
      if (afId) url.searchParams.set("AntiFrauduniqid", afId);
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
      disclaimer: FOOTER_ALL_AR,
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم عراقي صحيح (10 أرقام يبدأ بـ 75 كورك أو 77 آسياسيل).",
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
      disclaimer: FOOTER_ALL_EN,
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Iraq number (10 digits starting with 75 Korek or 77 Asiacell).",
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
    updateOpDisclaimer();
  }

  function updateOpDisclaimer() {
    var op = currentOp();
    var el = document.getElementById("opDisclaimer");
    if (!el || !op) return;
    el.textContent = lang === "ar" ? op.footerAr : op.footerEn;
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errortext") || document.getElementById("errortext2");
    if (box) box.textContent = msg || "";
  }

  function confirmBtnEl() {
    return document.getElementById("confirm_btn") || document.getElementById("verifybtn");
  }

  function setLoading(on) {
    var otpLoad = document.getElementById("otploading");
    var pinLoad = document.getElementById("vcodeloading");
    var btn1 = document.getElementById("btn-1");
    var verify = confirmBtnEl();
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
    updateOpDisclaimer();
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

  /* Prefetch Asiacell AF page1 (safe no-op for Korek until number known) */
  if (document.getElementById("msisdnForm")) {
    loadAsiacellAf(1, "", function () {});
  }

  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    var mInput = document.getElementById("phone");
    var submitBtn = document.getElementById("btn-1");

    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = isValidMsisdn(value);
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

      var opKey = detectOperatorKey(state.value);
      var op = OPERATORS[opKey];
      if (!op) { showError(errText("o")); return; }

      showError("");
      setLoading(true);

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);
      persist("operator", op.key);

      function doSend() {
        getUserIp(function (ip) {
          if (ip) persist("user_ip", ip);
          var params = baseParams(op, {
            msisdn: msisdn,
            user_ip: ip || track("user_ip") || "0.0.0.0"
          });

          if (op.af === "shield") {
            applyAsiacellAfToParams(params, 1);
          } else {
            var sk = track("sessionKey");
            if (sk) params.sessionKey = sk;
          }

          callApi("sendpin", params)
            .then(function (resp) {
              setLoading(false);
              refreshMsisdnBtn();
              /* For Asiacell keep Shield AF ids; do not overwrite with optional sendpin sessionKey */
              if (op.af !== "shield" && resp && resp.sessionKey) {
                persist("sessionKey", String(resp.sessionKey).trim());
              }
              if (!isOk(resp)) {
                showError(errText(errCode(resp)) || errText("1001"));
                return;
              }
              showPinStep();
              var pinEl = document.getElementById("pincode");
              if (pinEl) { pinEl.value = ""; pinEl.focus(); }
              var cBtn = confirmBtnEl();
              if (cBtn) cBtn.disabled = true;

              if (op.af === "evina") {
                runKorekAntifraud(function () {});
              } else if (op.af === "shield") {
                if (cBtn) cBtn.classList.add("AFsubmitbtn");
                setOtpUrlParams(msisdn);
                loadAsiacellAf(2, msisdn, function () {});
              }
            })
            .catch(function (err) {
              setLoading(false);
              refreshMsisdnBtn();
              showError(errText((err && err.msg) || "x"));
            });
        });
      }

      if (op.af === "shield" && !track("asiacell_af_id")) {
        loadAsiacellAf(1, msisdn, function () { doSend(); });
      } else if (op.af === "shield") {
        loadAsiacellAf(1, msisdn, function () { doSend(); });
      } else {
        doSend();
      }
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pincode");
    var confirmBtn = confirmBtnEl();
    var errId = "errortext2";
    var pinAfReady = false;

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      if (confirmBtn) confirmBtn.disabled = pInput.value.length !== PIN_LENGTH;
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
      var op = currentOp();
      if (!op) {
        showError(errText("o"), errId);
        return;
      }
      showError("", errId);
      setLoading(true);

      function runVerify() {
        getUserIp(function (ip) {
          if (ip) persist("user_ip", ip);
          var msisdn = track("msisdn") || fullMsisdn(track("phone"));
          var params = baseParams(op, {
            msisdn: msisdn,
            otp: otp,
            user_ip: ip || track("user_ip") || "0.0.0.0"
          });

          if (op.af === "evina") {
            applyKorekAfToParams(params);
            if (!params.ti && !params.sessionKey) {
              setLoading(false);
              if (confirmBtn) confirmBtn.disabled = false;
              showError(errText("af"), errId);
              return;
            }
          } else if (op.af === "shield") {
            applyAsiacellAfToParams(params, 2);
            /* Pin validation MUST have different AntiFrauduniqid and uniqId */
            if (
              !params.AntiFrauduniqid ||
              !params.uniqId ||
              params.AntiFrauduniqid === params.uniqId
            ) {
              setLoading(false);
              if (confirmBtn) confirmBtn.disabled = false;
              showError(errText("af"), errId);
              return;
            }
          }

          callApi("verifypin", params)
            .then(function (resp) {
              if (!isOk(resp)) {
                setLoading(false);
                if (confirmBtn) confirmBtn.disabled = false;
                showError(errText(errCode(resp)) || errText("1004"), errId);
                return;
              }
              persist("converted", "1");
              persist("portal_url", portalUrl(op));
              persist("pb_amount", PAYOUT);
              callApi("checkstatus", { cid: op.cid, msisdn: msisdn }).catch(function () {});
              firePostback(function () {
                window.location.href = "thankyou.html?lang=" + lang;
              });
            })
            .catch(function (err) {
              setLoading(false);
              if (confirmBtn) confirmBtn.disabled = false;
              showError(errText((err && err.msg) || "x"), errId);
            });
        });
      }

      if (op.af === "evina") {
        if (!track("af_ti")) {
          runKorekAntifraud(function () { runVerify(); });
        } else {
          runVerify();
        }
      } else if (op.af === "shield") {
        if (!track("asiacell_af_otp")) {
          loadAsiacellAf(2, track("msisdn"), function () { runVerify(); });
        } else {
          runVerify();
        }
      } else {
        runVerify();
      }
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
