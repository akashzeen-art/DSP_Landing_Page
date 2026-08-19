(function () {
  "use strict";

  /**
   * UAE Etisalat — Super Funbox (cid=3085) portal 919
   * AED 3.25/day — unsub: STOP SUPER → 1156 — PIN 4
   * PropellerAds: visitor_id=${SUBID} payout=3.25
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "971";
  var PIN_LENGTH = 4;
  var CID = "3085";
  var PORTAL_CID = "919";
  var PAYOUT = "3.25";
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=" + PORTAL_CID;

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
      topInfo: "مجانًا لمدة 24 ساعة ! ثم ستُفرض على الخدمة 3.25 درهمًا إماراتياً في اليوم شاملاً ضريبة القيمة المضافة.",
      formTitle: "أدخل رقم هاتفك",
      subscribeBtn: "اشترك",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN",
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      exitBtn: "مخرج",
      tcTitle: "الشروط والأحكام",
      tcAgree: "بالضغط على زر اشترك أعلاه، فأنت توافق على الشروط والأحكام التالية",
      t1: "● سوف يبدأ الاشتراك المدفوع تلقائياً بعد فترة التجربة المجانية",
      t2: "● بدون أي التزامات، يمكنك إلغاء اشتراكك في أي وقت عن طريق إرسال STOP SUPER إلى 1156",
      t3a: "للحصول على الدعم ، يرجى الاتصال علي",
      t4: "● التجربة المجانية صالحة فقط للمشتركين لأول مرة",
      t5: "● استمتع بفترة التجربة المجانية لمدة 24 ساعة",
      t6: "● يرجى التأكد من عدم استخدام أي تقنيات حجب من الطرف الثالث على متصفحك والتأكد من وجود اتصال إنترنت جيد لضمان الوصول السريع للمحتوى",
      t7: "● بالمتابعة، أنت توافق على جميع الشروط والأحكام الخاصة بالخدمة وتوافق على استلام تحديثات حول اشتراكك على رقم الجوال المسجل",
      t8a: "للمزيد من الشروط والأحكام",
      t8b: "انقر هنا",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم إماراتي صحيح (9 أرقام يبدأ بـ 5).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        phone: "يرجى إدخال رقم الهاتف أولاً."
      }
    },
    en: {
      topInfo: "Free for 24 hours! Then the service is charged AED 3.25/day including VAT.",
      formTitle: "Enter your number to receive otp",
      subscribeBtn: "Subscribe",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      exitBtn: "Exit",
      tcTitle: "Terms and Conditions",
      tcAgree: "By tapping Subscribe above, you agree to the following terms and conditions",
      t1: "● Paid subscription starts automatically after the free trial",
      t2: "● No commitment. Cancel anytime by sending STOP SUPER to 1156",
      t3a: "For support, please contact",
      t4: "● Free trial is valid for first-time subscribers only",
      t5: "● Enjoy a 24-hour free trial",
      t6: "● Please make sure you are not using third-party blocking tools and have a good internet connection for fast content access",
      t7: "● By continuing you agree to all service terms and to receive subscription updates on your registered mobile number",
      t8a: "For more terms and conditions",
      t8b: "click here",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid UAE mobile number (9 digits starting with 5).",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP.",
        phone: "Please enter your number first."
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
    var box = document.getElementById(id || "errBox") || document.getElementById("errBox2");
    if (box) box.textContent = msg || "";
  }

  function setLoading(btn, on) {
    if (!btn) return;
    var load = btn.querySelector(".submitload");
    if (on) {
      if (load) load.classList.add("show");
      btn.classList.add("btn-loading", "disabled_btn");
      btn.disabled = true;
    } else {
      if (load) load.classList.remove("show");
      btn.classList.remove("btn-loading", "disabled_btn");
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

  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    var mInput = document.getElementById("msisdn");
    var submitBtn = document.getElementById("submitBtn");
    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      submitBtn.disabled = !ok;
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
      setLoading(submitBtn, true);
      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", msisdn);

      getUserIp(function (ip) {
        var params = {
          cid: CID,
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
            if (!isOk(resp)) {
              setLoading(submitBtn, false);
              refreshMsisdnBtn();
              showError(errText(errCode(resp)) || errText("1001"));
              return;
            }
            showPinStep();
          })
          .catch(function (err) {
            setLoading(submitBtn, false);
            refreshMsisdnBtn();
            showError(errText((err && err.msg) || "x"));
          });
      });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var standalonePin = !document.getElementById("msisdnForm");
    if (standalonePin && !track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    }
    var pInput = document.getElementById("pin");
    var confirmBtn = document.getElementById("verifybtn");
    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      confirmBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", "errBox2");
      showError("");
    });
    var wrong = document.getElementById("wrongNumber");
    if (wrong && !standalonePin) {
      wrong.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.reload();
      });
    }
    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"), standalonePin ? "errBox" : "errBox2");
        return;
      }
      showError("", "errBox2");
      showError("");
      setLoading(confirmBtn, true);

      getUserIp(function (ip) {
        var params = {
          cid: CID,
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
              setLoading(confirmBtn, false);
              confirmBtn.disabled = false;
              showError(errText(errCode(resp)) || errText("1004"), standalonePin ? "errBox" : "errBox2");
              return;
            }
            persist("converted", "1");
            persist("portal_url", PORTAL);
            persist("pb_amount", PAYOUT);
            firePostback(function () {
              window.location.href = "thankyou.html?lang=" + lang;
            });
          })
          .catch(function (err) {
            setLoading(confirmBtn, false);
            confirmBtn.disabled = false;
            showError(errText((err && err.msg) || "x"), standalonePin ? "errBox" : "errBox2");
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
