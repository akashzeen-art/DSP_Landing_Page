(function () {
  "use strict";

  /**
   * UAE Etisalat — foodie (cid=3186) Zeen adnet
   * AED 3.25/day — C FODD → 1111 — PIN 4
   * Portal: CPportal?cid=948
   * UI: Gubbare-style (top-bar / main-container / terms)
   * Domain: all-smartcontent.com
   * Google Ads: AW-18322603599
   * No antifraud
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "971";
  var PIN_LENGTH = 4;
  var CID = "3186";
  var PORTAL_CID = "948";
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=" + PORTAL_CID;

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

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
    var r = String(resp.response || "").toUpperCase();
    if (r === "SUCCESS" || r === "ACTIVE") return true;
    var m = String(resp.msg || resp.errorMessage || "").toLowerCase();
    return /success|pin sent|pin verified|active|2001|2003|2005/.test(m);
  }

  function errCode(resp) {
    var m = String((resp && (resp.msg || resp.errorMessage || resp.message)) || "");
    var match = m.match(/\((\d{4})\)/);
    if (match) return match[1];
    if (/invalid|expire|1004/i.test(m)) return "1004";
    if (/1002|pin_generation|try again/i.test(m)) return "1002";
    if (/fail|1001|could not/i.test(m)) return "1001";
    return "";
  }

  function errMsg(resp) {
    var code = errCode(resp);
    var dict = t[lang] || t.en;
    if (code && dict["err" + code]) return dict["err" + code];
    return String((resp && (resp.msg || resp.errorMessage || resp.message)) || "");
  }

  function baseParams(extra) {
    var p = {
      cid: CID,
      msisdn: track("msisdn") || "",
      click_id: getClickId(),
      pub_id: track("pub_id") || "google",
      sub_pub_id: track("sub_pub_id") || "ZONE0",
      user_ip: track("user_ip") || "0.0.0.0",
      ua: getUa()
    };
    var sk = track("sessionKey");
    if (sk) p.sessionKey = sk;
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] != null && extra[k] !== "") p[k] = extra[k];
      });
    }
    return p;
  }

  var lang = "en";
  var t = {
    en: {
      langSwitch: "Arabic",
      topOffer: "Free for 24 hours, then 3.25 AED / Daily (VAT Inclusive).",
      formTitle: "Enter your Etisalat Mobile Number to receive OTP",
      planDaily: "3.25 AED / Daily",
      btnSubscribe: "SUBSCRIBE",
      btnExit: "EXIT",
      btnConfirm: "CONFIRM",
      wrongNumber: "Wrong number?",
      noteHtml:
        "Free for 24 hours, then 3.25 AED / Daily (VAT Inclusive).<br><br>" +
        "After clicking 'Subscribe' you will receive PIN message to Confirm your subscription.",
      pinTitle: "Enter the PIN sent to your phone",
      pinNote: "Enter the 4-digit PIN to confirm your subscription.",
      termsHeading: "TERMS AND CONDITIONS:",
      termsIntro: "By Clicking on Subscribe, you agree to the below terms and conditions:",
      t1: "You will start the paid subscription after the free period automatically.",
      t2: "No commitment, you can cancel your subscription at any time by sending <b>C FODD</b> to <b>1111</b>.",
      t3: 'To get support, please contact <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>',
      t4: "The free trial is valid only for new subscribers.",
      t5: "Enjoy Your Free trial for 24 hours.",
      t6: "Please make sure that your browser is not using any 3rd-party blocking technologies and you have a healthy internet connection for swift access to the content.",
      t7: "By proceeding, you are accepting all Terms and Conditions of the service and agree to receive updates about your subscription on your registered mobile number.",
      t8: "Further Terms and Conditions — foodie Etisalat UAE service terms apply.",
      t9: "Further Privacy Policy — mobile number and technical data are used only to process the subscription.",
      formError: "Please insert your phone number",
      errNum: "Please enter a valid Etisalat UAE number (9 digits starting with 5).",
      errSend: "PIN could not be sent. Please try again.",
      err1001: "PIN could not be sent. Please try again.",
      err1002: "Unable to send PIN. Use a valid Etisalat UAE number and try again.",
      err1004: "Invalid or expired PIN. Please try again.",
      pinError: "Incorrect PIN! Please try again",
      errConn: "Connection error. Please try again.",
      errPhp: "PHP is not enabled. Ask hosting to enable PHP."
    },
    ar: {
      langSwitch: "English",
      topOffer: "مجانًا لمدة 24 ساعة، ثم 3.25 درهم إماراتي / يوميًا (شامل الضريبة).",
      formTitle: "أدخل رقم اتصالات لتلقي رمز OTP",
      planDaily: "3.25 درهم / يوميًا",
      btnSubscribe: "اشترك",
      btnExit: "خروج",
      btnConfirm: "تأكيد",
      wrongNumber: "رقم خاطئ؟",
      noteHtml:
        "مجانًا لمدة 24 ساعة، ثم 3.25 درهم إماراتي / يوميًا (شامل الضريبة).<br><br>" +
        "بعد الضغط على 'اشترك' ستصلك رسالة PIN لتأكيد الاشتراك.",
      pinTitle: "أدخل رمز PIN المرسل إلى هاتفك",
      pinNote: "أدخل رمز PIN المكون من 4 أرقام لتأكيد الاشتراك.",
      termsHeading: "الشروط والأحكام:",
      termsIntro: "بالضغط على اشترك، فإنك توافق على الشروط والأحكام التالية:",
      t1: "سيبدأ الاشتراك المدفوع تلقائيًا بعد الفترة المجانية.",
      t2: "بدون التزام، يمكنك إلغاء الاشتراك في أي وقت بإرسال <b>C FODD</b> إلى <b>1111</b>.",
      t3: 'للحصول على الدعم، يرجى التواصل عبر <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>',
      t4: "الفترة التجريبية المجانية صالحة فقط للمشتركين الجدد.",
      t5: "استمتع بالفترة التجريبية المجانية لمدة 24 ساعة.",
      t6: "يرجى التأكد من عدم استخدام تقنيات حجب من طرف ثالث ومن وجود اتصال إنترنت جيد للوصول السريع للمحتوى.",
      t7: "بالمتابعة، أنت توافق على جميع شروط وأحكام الخدمة وتوافق على استلام تحديثات الاشتراك على رقم جوالك المسجل.",
      t8: "مزيد من الشروط والأحكام — تطبق شروط خدمة foodie اتصالات الإمارات.",
      t9: "مزيد من سياسة الخصوصية — يُستخدم رقم الجوال والبيانات التقنية فقط لمعالجة الاشتراك.",
      formError: "الرجاء إدخال رقم هاتفك",
      errNum: "يرجى إدخال رقم اتصالات إماراتي صحيح (9 أرقام يبدأ بـ 5).",
      errSend: "تعذر إرسال PIN. حاول مرة أخرى.",
      err1001: "تعذر إرسال PIN. حاول مرة أخرى.",
      err1002: "تعذر إرسال PIN. استخدم رقم اتصالات إماراتي صحيح وحاول مرة أخرى.",
      err1004: "رمز PIN غير صحيح أو منتهي. حاول مرة أخرى.",
      pinError: "رمز PIN غير صحيح! حاول مرة أخرى",
      errConn: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
      errPhp: "PHP غير مفعّل. اطلب من الاستضافة تفعيله."
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

  function showPinStep() {
    var m = document.getElementById("msisdnPanel");
    var p = document.getElementById("pinPanel");
    if (m) m.classList.add("d-none");
    if (p) p.classList.remove("d-none");
    var pin = document.getElementById("pin");
    if (pin) { pin.value = ""; pin.focus(); }
    var pinBtn = document.getElementById("pinBtn");
    if (pinBtn) pinBtn.disabled = true;
  }

  function showMsisdnStep() {
    var m = document.getElementById("msisdnPanel");
    var p = document.getElementById("pinPanel");
    if (p) p.classList.add("d-none");
    if (m) m.classList.remove("d-none");
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
    langToggle.addEventListener("click", function (e) {
      e.preventDefault();
      lang = lang === "ar" ? "en" : "ar";
      applyLang();
    });
  }

  var exitBtn = document.getElementById("exitBtn");
  if (exitBtn) {
    exitBtn.addEventListener("click", function () {
      window.location.href = "https://www.google.com/";
    });
  }

  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    var mInput = document.getElementById("msisdn");
    var mAlert = document.getElementById("msisdnAlert");
    var mBtn = document.getElementById("msisdnBtn");

    function refreshMsisdn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!mBtn.classList.contains("btn-loading")) mBtn.disabled = !ok;
      return { value: value, ok: ok };
    }

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      if (mAlert) mAlert.textContent = "";
      refreshMsisdn();
    });
    refreshMsisdn();

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdn();
      if (!state.ok) {
        mAlert.textContent = (t[lang] || t.en).errNum;
        return;
      }
      mAlert.textContent = "";
      setBtnLoading(mBtn, true);
      setLoading(true);

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      getUserIp(function (ip) {
        if (ip) persist("user_ip", ip);
        callApi("sendpin", baseParams({
          msisdn: msisdn,
          user_ip: ip || track("user_ip") || "0.0.0.0"
        }))
          .then(function (resp) {
            if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
            setBtnLoading(mBtn, false);
            setLoading(false);
            refreshMsisdn();
            if (!isOk(resp)) {
              mAlert.textContent = errMsg(resp) || (t[lang] || t.en).errSend;
              return;
            }
            showPinStep();
          })
          .catch(function (err) {
            setBtnLoading(mBtn, false);
            setLoading(false);
            refreshMsisdn();
            var key = (err && err.msg) || "errConn";
            mAlert.textContent = (t[lang] || t.en)[key] || (t[lang] || t.en).errConn;
          });
      });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pin");
    var pAlert = document.getElementById("pinAlert");
    var pBtn = document.getElementById("pinBtn");

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      pBtn.disabled = pInput.value.length !== PIN_LENGTH;
      pAlert.textContent = "";
    });

    var wrong = document.getElementById("wrongNumber");
    if (wrong) {
      wrong.addEventListener("click", function () {
        showMsisdnStep();
      });
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        pAlert.textContent = (t[lang] || t.en).pinError;
        return;
      }
      pAlert.textContent = "";
      setBtnLoading(pBtn, true);
      setLoading(true);

      getUserIp(function (ip) {
        if (ip) persist("user_ip", ip);
        var msisdn = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
        callApi("verifypin", baseParams({
          msisdn: msisdn,
          otp: otp,
          user_ip: ip || track("user_ip") || "0.0.0.0"
        }))
          .then(function (resp) {
            if (!isOk(resp)) {
              setBtnLoading(pBtn, false);
              setLoading(false);
              pBtn.disabled = false;
              pAlert.textContent = errMsg(resp) || (t[lang] || t.en).pinError;
              return;
            }
            persist("converted", "1");
            persist("portal_url", PORTAL);
            callApi("checkstatus", { cid: CID, msisdn: msisdn }).catch(function () {});
            window.location.href = "thankyou.html?lang=" + encodeURIComponent(lang);
          })
          .catch(function (err) {
            setBtnLoading(pBtn, false);
            setLoading(false);
            pBtn.disabled = false;
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
