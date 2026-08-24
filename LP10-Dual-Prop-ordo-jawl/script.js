(function () {
  "use strict";

  /**
   * Palestine Dual Operator — Gamify / AIgameopedia (PropellerAds)
   * UI: Theme-496 (same as LP10_UAE_Ethsal_Prop)
   *
   * Ooredoo — pingen id=113 — pinver/portal id=111 — PIN 4
   * Jawwal  — pingen id=115 — pinver/portal id=111 — PIN 4
   * API: https://wap.zeentec.com/pay/
   * MSISDN: +970, local 9 digits starting with 5
   * No antifraud
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "970";
  var PIN_LENGTH = 4;
  var CTA_BTN_ID = "btn-1";
  var API_BASE = "https://wap.zeentec.com/pay";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    ooredoo: {
      key: "ooredoo",
      name: "Ooredoo",
      pingenId: "113",
      pinverId: "111",
      portalId: "111",
      statusId: "180",
      payout: "1.5",
      footerEn: "Gamify — Ooredoo Palestine.",
      footerAr: "Gamify — أوريدو فلسطين."
    },
    jawwal: {
      key: "jawwal",
      name: "Jawwal",
      pingenId: "115",
      pinverId: "111",
      portalId: "111",
      statusId: "180",
      payout: "1.16",
      footerEn: "Gamify — Jawwal Palestine.",
      footerAr: "Gamify — جوال فلسطين."
    }
  };

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
    return API_BASE + "/" + path + "?" + q.toString();
  }

  function callApi(path, params) {
    return fetch(apiUrl(path, params), {
      method: "GET",
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        var trim = String(text || "").trim();
        /* checkstatus may return plain ACTIVE/INACTIVE */
        if (/^(ACTIVE|INACTIVE)$/i.test(trim)) {
          return { response: trim.toUpperCase(), errorMessage: trim };
        }
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
    });
  }

  function isOk(resp) {
    if (!resp) return false;
    var r = String(resp.response || "").toUpperCase();
    if (r === "SUCCESS" || r === "ACTIVE") return true;
    var m = String(resp.errorMessage || resp.msg || "").toLowerCase();
    return /success|pin sent|active/.test(m);
  }

  function errMsg(resp) {
    return String((resp && (resp.errorMessage || resp.msg || resp.message)) || "");
  }

  function portalUrl(op, msisdn) {
    return API_BASE + "/getportal?id=" + encodeURIComponent(op.portalId) +
      "&msisdn=" + encodeURIComponent(msisdn);
  }

  function firePostback(payout, done) {
    var clickId = getVisitorId();
    var once = false;
    function finish(ok) {
      if (once) return;
      once = true;
      if (typeof done === "function") done(ok);
    }
    if (!clickId) { finish(false); return; }

    var pay = payout || "1";
    var qs =
      "aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid) +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(pay);
    var direct = POSTBACK.url + "?" + qs;
    var proxy = "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) + "&payout=" + encodeURIComponent(pay);

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
      opTitle: "اختر المشغّل",
      opOoredoo: "أوريدو — Gamify",
      opJawwal: "جوال — Gamify",
      opOoredooPrice: "فلسطين",
      opJawwalPrice: "فلسطين",
      backBtn: "رجوع",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer:
        "Gamify خدمة اشتراك لمشتركي أوريدو وجوال في فلسطين.",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم فلسطيني صحيح (9 أرقام يبدأ بـ 5).",
        op: "يرجى اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
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
      opTitle: "Choose your operator",
      opOoredoo: "Ooredoo — Gamify",
      opJawwal: "Jawwal — Gamify",
      opOoredooPrice: "Palestine",
      opJawwalPrice: "Palestine",
      backBtn: "Back",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
      disclaimer:
        "Gamify is a subscription service for Ooredoo and Jawwal Palestine subscribers.",
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

  function showStep(id) {
    ["otp_div", "op_div", "vcode_div"].forEach(function (sid) {
      var el = document.getElementById(sid);
      if (!el) return;
      if (sid === id) el.classList.remove("hide");
      else el.classList.add("hide");
    });
    var langbar = document.getElementById("langbar");
    if (langbar) langbar.style.visibility = id === "vcode_div" ? "hidden" : "";
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
  var mInput = document.getElementById("phone");
  var submitBtn = document.getElementById("btn-1");

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
      if (!op) { showError(errText("op"), "errortextOp"); return; }

      var msisdn = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
      if (!msisdn) {
        showStep("otp_div");
        return;
      }

      showError("", "errortextOp");
      document.querySelectorAll(".opbtn").forEach(function (b) { b.disabled = true; });
      persist("operator", key);
      persist("pingen_id", op.pingenId);
      persist("pinver_id", op.pinverId);
      persist("portal_id", op.portalId);
      persist("pb_amount", op.payout);

      getUserIp(function (ip) {
        callApi("pingen", {
          id: op.pingenId,
          msisdn: msisdn,
          ua: navigator.userAgent || "",
          ip: ip || track("user_ip") || "",
          param1: CTA_BTN_ID,
          clickid: getClickId()
        })
          .then(function (resp) {
            document.querySelectorAll(".opbtn").forEach(function (b) { b.disabled = false; });
            if (!isOk(resp)) {
              showError(errMsg(resp) || errText("1001"), "errortextOp");
              return;
            }
            showStep("vcode_div");
            var pinEl = document.getElementById("pincode");
            if (pinEl) { pinEl.value = ""; pinEl.focus(); }
            document.getElementById("verifybtn").disabled = true;
          })
          .catch(function (err) {
            document.querySelectorAll(".opbtn").forEach(function (b) { b.disabled = false; });
            showError(errText((err && err.msg) || "x"), "errortextOp");
          });
      });
    });
  });

  var pForm = document.getElementById("pinForm");
  var pInput = document.getElementById("pincode");
  var confirmBtn = document.getElementById("verifybtn");

  if (pInput) {
    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      confirmBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", "errortext2");
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
        showError(errText("p"), "errortext2");
        return;
      }

      var opKey = track("operator");
      var op = OPERATORS[opKey];
      if (!op) {
        showStep("op_div");
        return;
      }

      showError("", "errortext2");
      setLoading(true);

      getUserIp(function (ip) {
        var msisdn = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
        callApi("pinver", {
          id: op.pinverId,
          msisdn: msisdn,
          otp: otp,
          ua: navigator.userAgent || "",
          ip: ip || track("user_ip") || ""
        })
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(false);
              confirmBtn.disabled = false;
              showError(errMsg(resp) || errText("1004"), "errortext2");
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalUrl(op, msisdn));
            persist("pb_amount", op.payout);
            /* best-effort status then postback */
            callApi("checkstatus", { id: op.statusId, msisdn: msisdn })
              .catch(function () { return null; })
              .then(function () {
                firePostback(op.payout, function () {
                  window.location.href = "thankyou.html?lang=" + lang;
                });
              });
          })
          .catch(function (err) {
            setLoading(false);
            confirmBtn.disabled = false;
            showError(errText((err && err.msg) || "x"), "errortext2");
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
