(function () {
  "use strict";

  /**
   * Palestine Dual Operator — Z Game + PropellerAds
   * UI: Theme 340 (same as LP9_CM_Ornge_Prop / LP9_Onck_MTN_Prop)
   *
   * Jawwal  (cid=3008) portal 570 — 1.16 NIS/day — unsub 0257 → 37799
   * Ooredoo (cid=3007) portal 569 — 1.5 NIS/day  — unsub 08 → 6976
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "970";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    jawwal: {
      key: "jawwal",
      cid: "3008",
      portalCid: "570",
      name: "Jawwal",
      price: "1.16",
      footerEn: "Z Game — Jawwal PS: NIS 1.16/day. To cancel, send SMS 0257 to 37799.",
      footerAr: "Z Game — جوال: 1.16 شيكل يومياً. للإلغاء أرسل 0257 إلى 37799."
    },
    ooredoo: {
      key: "ooredoo",
      cid: "3007",
      portalCid: "569",
      name: "Ooredoo",
      price: "1.5",
      footerEn: "Z Game — Ooredoo PS: NIS 1.5/day. To cancel, send SMS 08 to 6976.",
      footerAr: "Z Game — أوريدو: 1.5 شيكل يومياً. للإلغاء أرسل 08 إلى 6976."
    }
  };

  var FOOTER_BOTH_EN =
    "Z Game — Jawwal PS: NIS 1.16/day (unsubscribe: SMS 0257 to 37799). Ooredoo PS: NIS 1.5/day (unsubscribe: SMS 08 to 6976).";
  var FOOTER_BOTH_AR =
    "Z Game — جوال: 1.16 شيكل يومياً (إلغاء: 0257 إلى 37799). أوريدو: 1.5 شيكل يومياً (إلغاء: 08 إلى 6976).";

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
    return digits.slice(0, 9);
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

  function portalFor(op) {
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "570");
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

    var opKey = track("operator") || "jawwal";
    var op = OPERATORS[opKey] || OPERATORS.jawwal;
    var payout = op.price || "1.16";

    var direct =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);
    var proxy =
      "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);

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
      topInfo: "جوال 1.16 · أوريدو 1.5 شيكل / يوم",
      watchBtn: "مشاهدة",
      downloadBtn: "تحميل",
      formTitle: "أدخل رقم هاتفك",
      continueBtn: "متابعة",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN",
      wrongNumber: "رقم خاطئ؟",
      opTitle: "اختر المشغّل",
      opJawwal: "جوال — Z Game",
      opOoredoo: "أوريدو — Z Game",
      opJawwalPrice: "1.16 شيكل / يوم",
      opOoredooPrice: "1.5 شيكل / يوم",
      backBtn: "رجوع",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      tcTitle: "الشروط والأحكام",
      ppTitle: "سياسة الخصوصية",
      tcBody: "بمتابعتك فإنك توافق على الاشتراك في Z Game لجوال (1.16 شيكل/يوم) أو أوريدو (1.5 شيكل/يوم). طول رمز PIN هو 4 أرقام.",
      ppBody: "نجمع رقم هاتفك والبيانات التقنية (IP و User-Agent) فقط لمعالجة الاشتراك وتقديم الخدمة.",
      footerNote: FOOTER_BOTH_AR,
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف فلسطيني صحيح (9 أرقام يبدأ بـ 5).",
        op: "يرجى اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم."
      }
    },
    en: {
      topInfo: "Jawwal 1.16 · Ooredoo 1.5 NIS / day",
      watchBtn: "Watch",
      downloadBtn: "Download",
      formTitle: "Enter your phone number",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      wrongNumber: "Wrong number?",
      opTitle: "Choose your operator",
      opJawwal: "Jawwal — Z Game",
      opOoredoo: "Ooredoo — Z Game",
      opJawwalPrice: "1.16 NIS / day",
      opOoredooPrice: "1.5 NIS / day",
      backBtn: "Back",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
      tcTitle: "Terms And Conditions",
      ppTitle: "Privacy Policy",
      tcBody: "By continuing you agree to subscribe to Z Game for Jawwal (NIS 1.16/day) or Ooredoo (NIS 1.5/day). PIN length is 4 digits.",
      ppBody: "We collect your mobile number and technical data (IP, user agent) only to process the subscription and deliver the service.",
      footerNote: FOOTER_BOTH_EN,
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Palestine mobile number (9 digits starting with 5).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
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
    submitBtn.disabled = !ok;
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
      persist("phone", msisdn);
      showStep("op_div");
    });
  }

  var backBtn = document.getElementById("backToPhone");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      showStep("otp_div");
    });
  }

  document.querySelectorAll(".opbtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-operator");
      var op = OPERATORS[key];
      if (!op) { showError(errText("op"), "errBoxOp"); return; }

      var msisdn = track("msisdn") || track("phone");
      if (!msisdn) {
        showStep("otp_div");
        return;
      }

      showError("", "errBoxOp");
      document.querySelectorAll(".opbtn").forEach(function (b) { b.disabled = true; });

      persist("operator", key);
      persist("zeen_cid", op.cid);
      persist("portal_cid", op.portalCid);

      getUserIp(function (ip) {
        var params = {
          cid: op.cid,
          msisdn: msisdn,
          click_id: getClickId(),
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || "0",
          user_ip: ip || track("user_ip") || "",
          ua: navigator.userAgent || ""
        };
        var sk = track("sessionKey");
        if (sk) params.sessionKey = sk;

        callApi("sendpin", params)
          .then(function (resp) {
            if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
            document.querySelectorAll(".opbtn").forEach(function (b) { b.disabled = false; });
            if (!isOk(resp)) {
              showError(errText(errCode(resp)) || errText("1001"), "errBoxOp");
              return;
            }
            showStep("vcode_div");
            var pinEl = document.getElementById("pin");
            if (pinEl) { pinEl.value = ""; pinEl.focus(); }
            document.getElementById("verifyBtn").disabled = true;
          })
          .catch(function (err) {
            document.querySelectorAll(".opbtn").forEach(function (b) { b.disabled = false; });
            showError(errText((err && err.msg) || "x"), "errBoxOp");
          });
      });
    });
  });

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
      if (otp.length !== PIN_LENGTH) { showError(errText("p"), "errBox2"); return; }

      var opKey = track("operator");
      var op = OPERATORS[opKey];
      if (!op) {
        showStep("op_div");
        return;
      }

      showError("", "errBox2");
      setLoading(verifyBtn, true);

      getUserIp(function (ip) {
        var params = {
          cid: op.cid,
          msisdn: track("msisdn") || track("phone"),
          click_id: getClickId(),
          otp: otp,
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || "0",
          user_ip: ip || track("user_ip") || "",
          ua: navigator.userAgent || ""
        };
        var sk = track("sessionKey");
        if (sk) params.sessionKey = sk;

        callApi("verifypin", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(verifyBtn, false);
              verifyBtn.disabled = false;
              showError(errText(errCode(resp)) || errText("1004"), "errBox2");
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalFor(op));
            persist("pb_amount", op.price);
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
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
