(function () {
  "use strict";

  /**
   * Palestine — Gamify / AIgameopedia (Google / all-smartcontent.com)
   * UI: LP13_GOG_UAE light Holaa-style
   *
   * Docs (pingen dual offers):
   *   pingen  id=116 or id=117  (+ ua, ip, param1=cta, clickid)
   *   pinver  id=111
   *   checkstatus / getportal  id=111 (Required Details Service ID)
   * PIN: 4 | Antifraud: None
   * API: https://zeentec.com/pay/
   * MSISDN: +970, local 9 digits starting with 5
   * Google Ads: AW-18322603599
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "970";
  var PIN_LENGTH = 4;
  var CTA_BTN_ID = "msisdnBtn";
  var SERVICE_ID = "111";
  var API_BASE = "https://zeentec.com/pay";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OFFERS = {
    "116": { id: "116", nameKey: "op116" },
    "117": { id: "117", nameKey: "op117" }
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
    if (s.indexOf("{") !== -1 || s.indexOf("${") !== -1 || s.indexOf("[[") !== -1) return false;
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
      params.get("gclid") ||
      params.get("token") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    ["pub_id", "sub_pub_id", "user_ip", "zoneid"].forEach(function (k) {
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

  function getUa() {
    return (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "unknown";
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
        if (/^(ACTIVE|INACTIVE)$/i.test(trim)) {
          return { response: trim.toUpperCase(), errorMessage: trim };
        }
        try { return JSON.parse(trim); }
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

  function portalUrl(msisdn) {
    return API_BASE + "/getportal?id=" + encodeURIComponent(SERVICE_ID) +
      "&msisdn=" + encodeURIComponent(msisdn || track("msisdn") || "");
  }

  var lang = "en";
  var t = {
    en: {
      navService: "Gamify",
      navTerms: "Terms and conditions",
      navPrivacy: "Privacy policy",
      offerTitle: "Gamify",
      formSteps:
        '<span class="label-bull">1</span> Enter your mobile number <br>' +
        '<span class="label-bull">2</span> Introduce your code to verify your account<br>' +
        '<span class="label-bull">3</span> Access now',
      formLabel: "Mobile number",
      formError: "Please insert your phone number",
      btnContinue: "CONTINUE",
      btnConfirm: "CONTINUE",
      price: "Gamify subscription service",
      checkbox: "I accept the Gamify service terms. I consent to the subscription starting immediately.",
      opLabel: "Choose your offer to continue",
      op116: "Gamify Offer A",
      op117: "Gamify Offer B",
      pinLabel: "Please enter the confirmation code received to activate your subscription.",
      pinError: "Incorrect PIN! Please try again",
      wrongNumber: "Wrong number?",
      footer: "Gamify is a subscription service for Palestine. By clicking Continue you agree to the Terms & Conditions.",
      termsBody: "Gamify is a subscription service. You must be 18+ or have permission from the bill payer. Data charges may apply.",
      privacyBody: "We collect your mobile number and technical data (IP, user agent) only to process the subscription.",
      errAgree: "Please accept the terms to continue.",
      errOp: "Please choose an offer.",
      errSend: "PIN could not be sent. Please try again.",
      errConn: "Connection error. Please try again.",
      errPhp: "PHP is not enabled. Ask hosting to enable PHP.",
      errNum: "Please enter a valid Palestine mobile number (9 digits starting with 5)."
    },
    ar: {
      navService: "Gamify",
      navTerms: "الشروط والأحكام",
      navPrivacy: "سياسة الخصوصية",
      offerTitle: "Gamify",
      formSteps:
        '<span class="label-bull">1</span> أدخل رقم هاتفك <br>' +
        '<span class="label-bull">2</span> أدخل رمز التحقق لحسابك<br>' +
        '<span class="label-bull">3</span> ابدأ الآن',
      formLabel: "رقم الجوال",
      formError: "الرجاء إدخال رقم هاتفك",
      btnContinue: "متابعة",
      btnConfirm: "متابعة",
      price: "خدمة اشتراك Gamify",
      checkbox: "أوافق على شروط خدمة Gamify. أوافق على بدء الاشتراك فوراً.",
      opLabel: "اختر العرض للمتابعة",
      op116: "عرض Gamify أ",
      op117: "عرض Gamify ب",
      pinLabel: "الرجاء إدخال رمز التأكيد الذي وصلك لتفعيل الاشتراك.",
      pinError: "رمز PIN غير صحيح! حاول مرة أخرى",
      wrongNumber: "رقم خاطئ؟",
      footer: "Gamify خدمة اشتراك لفلسطين. بالضغط على متابعة فإنك توافق على الشروط والأحكام.",
      termsBody: "Gamify خدمة اشتراك. يجب أن يكون عمرك 18+ أو لديك إذن دافع الفاتورة. قد تُطبق رسوم بيانات.",
      privacyBody: "نجمع رقم جوالك والبيانات التقنية فقط لمعالجة الاشتراك.",
      errAgree: "الرجاء الموافقة على الشروط للمتابعة.",
      errOp: "الرجاء اختيار عرض.",
      errSend: "تعذر إرسال PIN. حاول مرة أخرى.",
      errConn: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
      errPhp: "PHP غير مفعّل. اطلب من الاستضافة تفعيله.",
      errNum: "يرجى إدخال رقم فلسطيني صحيح (9 أرقام يبدأ بـ 5)."
    }
  };

  function applyLang() {
    var dict = t[lang] || t.en;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", lang === "ar");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll(".lang").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-lang") === lang);
    });
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function setLoading(on) {
    var overlay = document.getElementById("loading");
    if (overlay) overlay.classList.toggle("show", !!on);
  }

  function setBtnLoading(btn, on) {
    if (!btn) return;
    btn.classList.toggle("btn-loading", !!on);
    if (on) btn.disabled = true;
  }

  function openModal(id) {
    var src = document.getElementById(id);
    var box = document.getElementById("displayiframe");
    var modal = document.getElementById("myModal");
    if (!src || !box || !modal) return;
    box.innerHTML = src.innerHTML;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    var modal = document.getElementById("myModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function showPanel(which) {
    var m = document.getElementById("msisdnForm");
    var o = document.getElementById("opPanel");
    var p = document.getElementById("pinForm");
    if (m) m.classList.toggle("d-none", which !== "msisdn");
    if (o) o.classList.toggle("d-none", which !== "op");
    if (p) p.classList.toggle("d-none", which !== "pin");
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

  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");
  var navClose = document.getElementById("navClose");
  if (menuBtn && nav) menuBtn.addEventListener("click", function () { nav.classList.add("open"); });
  if (navClose && nav) navClose.addEventListener("click", function () { nav.classList.remove("open"); });

  document.querySelectorAll(".lang").forEach(function (el) {
    el.addEventListener("click", function () {
      lang = el.getAttribute("data-lang") === "ar" ? "ar" : "en";
      applyLang();
    });
  });

  document.querySelectorAll("[data-open]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      if (nav) nav.classList.remove("open");
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

  /* MSISDN → operator */
  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    var mInput = document.getElementById("msisdn");
    var mField = document.getElementById("msisdnField");
    var mAlert = document.getElementById("msisdnAlert");
    var mBtn = document.getElementById("msisdnBtn");
    var agree = document.getElementById("agree");

    function refreshMsisdn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      mField.classList.toggle("valid", ok);
      mAlert.classList.remove("active");
      if (!mBtn.classList.contains("btn-loading")) {
        mBtn.disabled = !ok;
        mBtn.classList.toggle("disabled", !ok);
      }
      return { value: value, ok: ok };
    }

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      refreshMsisdn();
    });
    refreshMsisdn();

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdn();
      if (!state.ok) {
        mAlert.classList.add("active");
        mAlert.textContent = (t[lang] || t.en).errNum;
        return;
      }
      if (agree && !agree.checked) {
        mAlert.classList.add("active");
        mAlert.textContent = (t[lang] || t.en).errAgree;
        return;
      }
      persist("msisdn", fullMsisdn(state.value));
      persist("phone", state.value);
      showPanel("op");
    });
  }

  /* Operator → pingen → PIN */
  var opPanel = document.getElementById("opPanel");
  if (opPanel) {
    var opAlert = document.getElementById("opAlert");
    var opLoad = document.getElementById("opLoad");
    var backNumber = document.getElementById("backNumber");
    if (backNumber) {
      backNumber.addEventListener("click", function (e) {
        e.preventDefault();
        showPanel("msisdn");
      });
    }

    function showOpErr(msg) {
      if (!opAlert) return;
      opAlert.style.display = msg ? "block" : "none";
      opAlert.textContent = msg || "";
      opAlert.classList.toggle("active", !!msg);
    }

    document.querySelectorAll(".opbtn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var opId = btn.getAttribute("data-op");
        if (!OFFERS[opId]) {
          showOpErr((t[lang] || t.en).errOp);
          return;
        }
        showOpErr("");
        document.querySelectorAll(".opbtn").forEach(function (b) {
          b.disabled = true;
          b.classList.add("disabled_btn");
        });
        if (opLoad) opLoad.classList.add("show");
        setLoading(true);
        persist("pingen_id", opId);
        persist("service_id", SERVICE_ID);

        getUserIp(function (ip) {
          if (ip) persist("user_ip", ip);
          var msisdn = track("msisdn") || fullMsisdn(track("phone"));
          callApi("pingen", {
            id: opId,
            msisdn: msisdn,
            ua: getUa(),
            ip: ip || track("user_ip") || "0.0.0.0",
            param1: CTA_BTN_ID,
            clickid: getClickId()
          })
            .then(function (resp) {
              setLoading(false);
              if (opLoad) opLoad.classList.remove("show");
              document.querySelectorAll(".opbtn").forEach(function (b) {
                b.disabled = false;
                b.classList.remove("disabled_btn");
              });
              if (!isOk(resp)) {
                showOpErr(errMsg(resp) || (t[lang] || t.en).errSend);
                return;
              }
              showPanel("pin");
              var pin = document.getElementById("pin");
              if (pin) { pin.value = ""; pin.focus(); }
              document.getElementById("pinBtn").disabled = true;
            })
            .catch(function (err) {
              setLoading(false);
              if (opLoad) opLoad.classList.remove("show");
              document.querySelectorAll(".opbtn").forEach(function (b) {
                b.disabled = false;
                b.classList.remove("disabled_btn");
              });
              var key = (err && err.msg) || "errConn";
              showOpErr((t[lang] || t.en)[key] || (t[lang] || t.en).errConn);
            });
        });
      });
    });
  }

  /* PIN → pinver id=111 */
  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pin");
    var pAlert = document.getElementById("pinAlert");
    var pBtn = document.getElementById("pinBtn");

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      pBtn.disabled = pInput.value.length !== PIN_LENGTH;
      pAlert.classList.remove("active");
    });

    var wrong = document.getElementById("wrongNumber");
    if (wrong) {
      wrong.addEventListener("click", function (e) {
        e.preventDefault();
        showPanel("msisdn");
      });
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        pAlert.classList.add("active");
        return;
      }
      pAlert.classList.remove("active");
      setBtnLoading(pBtn, true);
      setLoading(true);

      getUserIp(function (ip) {
        if (ip) persist("user_ip", ip);
        var msisdn = track("msisdn") || fullMsisdn(track("phone"));
        callApi("pinver", {
          id: SERVICE_ID,
          msisdn: msisdn,
          otp: otp,
          ua: getUa(),
          ip: ip || track("user_ip") || "0.0.0.0"
        })
          .then(function (resp) {
            if (!isOk(resp)) {
              setBtnLoading(pBtn, false);
              setLoading(false);
              pBtn.disabled = false;
              pAlert.classList.add("active");
              pAlert.textContent = errMsg(resp) || (t[lang] || t.en).pinError;
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalUrl(msisdn));
            callApi("checkstatus", { id: SERVICE_ID, msisdn: msisdn }).catch(function () {});
            window.location.href = "thankyou.html?lang=" + encodeURIComponent(lang);
          })
          .catch(function (err) {
            setBtnLoading(pBtn, false);
            setLoading(false);
            pBtn.disabled = false;
            pAlert.classList.add("active");
            var key = (err && err.msg) || "errConn";
            pAlert.textContent = (t[lang] || t.en)[key] || (t[lang] || t.en).errConn;
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
