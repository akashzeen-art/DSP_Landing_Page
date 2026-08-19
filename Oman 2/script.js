(function () {
  "use strict";

  // Oman local mobile: 8 digits. Country code 968 is always fixed.
  var msisdnFormat = /^[79][0-9]{7}$/;

  var ZEEN_API = "http://64.225.85.48/adnet";
  var isHttps = typeof location !== "undefined" && location.protocol === "https:";
  var API = {
    cid: "2203",
    countryCode: "968",
    portalUrl: ZEEN_API + "/Promo/Api/CPportal?cid=388"
  };

  // Campaign: ?clickid=${SUBID}&zoneid={zone_id}
  // Postback visitor_id = same ${SUBID}
  var POSTBACK = {
    url: "https://ad.propellerads.com/conversion.php",
    aid: "3898869",
    pid: "",
    tid: "154120",
    payout: "1"
  };

  var TRACK_KEYS = ["click_id", "pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"];

  function persist(k, v) {
    if (v == null || v === "") return;
    try { sessionStorage.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function track(k) {
    try {
      var v = sessionStorage.getItem(k);
      if (v) return v;
    } catch (e) {}
    try { return localStorage.getItem(k) || ""; } catch (e2) { return ""; }
  }

  function setTrack(k, v) { persist(k, v); }

  function normalizeLocalNumber(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.indexOf(API.countryCode) === 0) digits = digits.slice(API.countryCode.length);
    if (digits.charAt(0) === "0") digits = digits.slice(1);
    return digits.slice(0, 8);
  }

  function fullMsisdn(local) {
    return API.countryCode + normalizeLocalNumber(local);
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var subid = params.get("clickid") || params.get("click_id") || params.get("clickId") || params.get("CLICKID") || "";
    if (subid && subid !== "${SUBID}") persist("click_id", subid);

    var zone = params.get("zoneid") || params.get("zone_id") || params.get("zoneId") || "";
    if (zone && zone !== "{zone_id}" && zone !== "{zoneid}") persist("zoneid", zone);

    TRACK_KEYS.forEach(function (k) {
      if (k === "click_id" || k === "zoneid") return;
      var v = params.get(k);
      if (v) persist(k, v);
    });
  }

  function getUserIp(cb) {
    var cached = track("user_ip");
    if (cached) { cb(cached); return; }
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var ip = (d && d.ip) || "";
        if (ip) setTrack("user_ip", ip);
        cb(ip);
      })
      .catch(function () { cb(""); });
  }

  function buildApiUrl(path, qs) {
    var apiPath = path.replace(/^\//, "");
    if (isHttps) {
      // Always use site-root PHP proxy (already working on click2funbox.com)
      return "/zeen-api.php?path=" + encodeURIComponent(apiPath) + "&" + qs;
    }
    return ZEEN_API + path + "?" + qs;
  }

  function apiCall(path, params, done) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== "" && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    fetch(buildApiUrl(path, qs), { method: "GET" })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        if (/^\s*<\?php/i.test(text)) { done(new Error("php_not_running")); return; }
        if (/^\s*<!DOCTYPE html/i.test(text)) { done(new Error("proxy_not_configured")); return; }
        try { done(null, JSON.parse(text)); }
        catch (e) { done(new Error("bad_json")); }
      })
      .catch(function (err) { done(err); });
  }

  function firePropellerPostback(done) {
    var clickId = track("click_id");
    var finish = typeof done === "function" ? done : function () {};
    if (!clickId || clickId === "${SUBID}" || String(clickId).toLowerCase() === "clickid") {
      finish(false);
      return;
    }

    var qs = "visitor_id=" + encodeURIComponent(clickId) + "&payout=" + encodeURIComponent(POSTBACK.payout);
    var directUrl =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);

    try { var img = new Image(); img.src = directUrl; } catch (e) {}
    try { fetch(directUrl, { method: "GET", mode: "no-cors", keepalive: true }).catch(function () {}); } catch (e2) {}

    var settled = false;
    function once(ok) {
      if (settled) return;
      settled = true;
      finish(ok);
    }

    try {
      fetch("/propeller-pb.php?" + qs, { method: "GET", keepalive: true })
        .then(function (r) {
          return r.json().then(function (d) { once(!!(d && d.status)); }).catch(function () { once(r.ok); });
        })
        .catch(function () { once(false); });
    } catch (e3) {
      once(false);
    }
    setTimeout(function () { once(false); }, 4000);
  }

  initTracking();
  getUserIp(function () {});

  var t = {
    en: {
      fileName: "File Name",
      fileSize: "File Size",
      downloadSpeed: "Download speed",
      pnTitle: "Please enter your mobile number",
      mExample: "(example: +968 XXXX XXXX)",
      mBtn1: "Continue",
      mSecure: "Your personal data are secured and encrypted.",
      pinTitle: "Please enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn1: "Continue",
      pinSecure: "Your personal data are secured and encrypted.",
      terms: "Terms & Condition",
      tncText: "By clicking Continue, you agree to subscribe to ZD Gamez. Price is 0.25 OMR per day. To cancel, send an SMS with the text “UNSUB IVID” to the designated Omantel service number.",
      close: "Close",
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Oman mobile number (8 digits starting with 7 or 9).",
        p: "Please enter the 4-digit PIN sent to your phone",
        3: "Invalid PIN Code",
        "1001": "PIN could not be sent. Please try again with an active Omantel number.",
        "1004": "Invalid or expired PIN. Please enter the 4-digit code from your SMS.",
        x: "Connection error. Please try again.",
        proxy: "API proxy not available on this host.",
        php: "PHP is not enabled on the server. Ask hosting to enable PHP for this site."
      }
    },
    ar: {
      fileName: "اسم الملف",
      fileSize: "حجم الملف",
      downloadSpeed: "سرعة التنزيل",
      pnTitle: "يرجى إدخال رقم الهاتف",
      mExample: "(مثال: +968 XXXX XXXX)",
      mBtn1: "متابعة",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      pinTitle: "يرجى إدخال رمز PIN المكون من 4 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn1: "متابعة",
      pinSecure: "بياناتك الشخصية محمية ومشفرة",
      terms: "الشروط والأحكام",
      tncText: "بالضغط على متابعة، فإنك توافق على الاشتراك في ZD Gamez. السعر 0.25 ريال عماني يومياً. للإلغاء أرسل رسالة SMS بالنص “UNSUB IVID” إلى رقم خدمة عمانتل.",
      close: "إغلاق",
      copyright: "<span class=\"ltr\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف عماني صحيح (8 أرقام يبدأ بـ 7 أو 9).",
        p: "يرجى إدخال رمز PIN المكون من 4 أرقام المرسل إلى هاتفك",
        3: "الرقم السري غير صحيح",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى برقم عمانتل نشط.",
        "1004": "رمز PIN غير صحيح أو منتهي. يرجى إدخال الرمز ذو 4 أرقام من الرسالة.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        proxy: "بروكسي API غير متوفر.",
        php: "PHP غير مفعل على الخادم. اطلب تفعيل PHP."
      }
    }
  };

  function getLang() {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get("lang");
    if (urlLang && t[urlLang]) return urlLang;
    try { return localStorage.getItem("lang") || "en"; } catch (e) { return "en"; }
  }

  function applyLang(lang) {
    if (!t[lang]) lang = "en";
    var dict = t[lang];

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });

    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    document.querySelectorAll(".langbtn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    try { localStorage.setItem("lang", lang); } catch (e) {}
    return dict;
  }

  var currentLang = getLang();
  applyLang(currentLang);

  document.querySelectorAll(".langbtn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      currentLang = btn.getAttribute("data-lang");
      applyLang(currentLang);
      var url = new URL(window.location.href);
      url.searchParams.set("lang", currentLang);
      window.history.replaceState({}, "", url);
    });
  });

  function errText(key) {
    return (t[currentLang].errmsg && t[currentLang].errmsg[key]) || "";
  }
  function showError(msg) {
    var box = document.querySelector(".errorBox");
    if (box) box.textContent = msg || "";
  }
  function apiErrorMessage(err, data, fallbackKey) {
    if (err && err.message === "php_not_running") return errText("php");
    if (err && (err.message === "proxy_not_configured" || String(err.message || "").indexOf("http_404") === 0)) {
      return errText("proxy");
    }
    if (err) return errText("x");
    if (data && data.err && data.err.errorMessage) return data.err.errorMessage;
    var msg = (data && data.msg) || "";
    var match = msg.match(/\((\d+)\)/);
    if (match) {
      var mapped = errText(match[1]);
      if (mapped) return mapped;
    }
    return msg || errText(fallbackKey);
  }

  /* Terms toggle */
  var terms = document.querySelector(".terms");
  var tncbox = document.querySelector(".tncbox");
  var closetnc = document.querySelector(".closetnc");
  if (terms && tncbox) {
    terms.addEventListener("click", function () {
      tncbox.classList.remove("hide");
      terms.style.display = "none";
    });
  }
  if (closetnc && tncbox && terms) {
    closetnc.addEventListener("click", function () {
      tncbox.classList.add("hide");
      terms.style.display = "";
    });
  }

  function setLoading(btnWrap, on) {
    var btn = btnWrap.querySelector(".button");
    var txt = btnWrap.querySelector(".btntxt");
    var load = btnWrap.querySelector(".submitload");
    if (!btn) return;
    if (on) {
      if (load) load.style.display = "flex";
      if (txt) txt.classList.add("disabled_txt");
      btn.classList.add("disabled_btn");
      btnWrap.classList.remove("pulseflash");
    } else {
      if (load) load.style.display = "none";
      if (txt) txt.classList.remove("disabled_txt");
      btn.classList.remove("disabled_btn");
    }
  }

  /* Mobile page */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var checkNum = 8;
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");
    var sideCheck = document.querySelector(".sidebtncheck");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocalNumber(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= checkNum) {
        if (sideCheck) sideCheck.classList.add("show");
        mobileBox.classList.remove("pulseflash", "pulseflash-delay");
        mobileBox.classList.add("pulseflash-pause");
        btnpn.classList.add("pulseflash");
      } else if (len > 0) {
        if (sideCheck) sideCheck.classList.remove("show");
        mobileBox.classList.remove("pulseflash", "pulseflash-delay");
        mobileBox.classList.add("pulseflash-pause");
        btnpn.classList.remove("pulseflash");
      } else {
        if (sideCheck) sideCheck.classList.remove("show");
        mobileBox.classList.add("pulseflash", "pulseflash-delay");
        mobileBox.classList.remove("pulseflash-pause");
        btnpn.classList.remove("pulseflash");
      }
    });

    mInput.addEventListener("focus", function () {
      mobileBox.classList.remove("pulseflash", "pulseflash-delay");
      mobileBox.classList.add("pulseflash-pause");
    });
    mInput.addEventListener("blur", function () {
      if (mInput.value.length === 0) {
        mobileBox.classList.add("pulseflash", "pulseflash-delay");
        mobileBox.classList.remove("pulseflash-pause");
      }
    });

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = normalizeLocalNumber(mInput.value);
      mInput.value = value;
      if (value.length === 0) { showError(errText("m")); return; }
      if (!msisdnFormat.test(value)) { showError(errText("o")); return; }
      showError("");
      btnpn.classList.remove("pulseflash");
      setLoading(btnpn, true);

      var msisdn = fullMsisdn(value);
      try { localStorage.setItem("phone", msisdn); } catch (err) {}

      getUserIp(function (ip) {
        apiCall("/sendpin", {
          cid: API.cid,
          msisdn: msisdn,
          click_id: track("click_id"),
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
          user_ip: ip,
          ua: navigator.userAgent,
          sessionKey: track("sessionKey")
        }, function (err, data) {
          if (err || !data || data.status !== true) {
            setLoading(btnpn, false);
            showError(apiErrorMessage(err, data, "1001"));
            return;
          }
          if (data.sessionKey) setTrack("sessionKey", data.sessionKey);
          window.location.href = "pin.html?lang=" + currentLang;
        });
      });
    });
  }

  /* PIN page */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var checkPin = 4;
    var pinBox = document.querySelector(".pinBox") || document.querySelector(".mobileBox");
    var btnpin = document.querySelector(".btnpin") || document.querySelector(".btnpn");
    var pinCheck = document.querySelector(".pincheckicon") || document.querySelector(".sidebtncheck");

    pInput.addEventListener("input", function () {
      pInput.value = pInput.value.replace(/\D/g, "").slice(0, checkPin);
      var len = pInput.value.length;
      showError("");
      if (len >= checkPin) {
        if (pinCheck) pinCheck.classList.add("show");
        pinBox.classList.remove("pulseflash", "pulseflash-delay");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.add("pulseflash");
      } else if (len > 0) {
        if (pinCheck) pinCheck.classList.remove("show");
        pinBox.classList.remove("pulseflash", "pulseflash-delay");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      } else {
        if (pinCheck) pinCheck.classList.remove("show");
        pinBox.classList.add("pulseflash", "pulseflash-delay");
        pinBox.classList.remove("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      }
    });

    pInput.addEventListener("focus", function () {
      pinBox.classList.remove("pulseflash", "pulseflash-delay");
      pinBox.classList.add("pulseflash-pause");
    });
    pInput.addEventListener("blur", function () {
      if (pInput.value.length === 0) {
        pinBox.classList.add("pulseflash", "pulseflash-delay");
        pinBox.classList.remove("pulseflash-pause");
      }
    });

    function storedMsisdn() {
      var phone = "";
      try { phone = localStorage.getItem("phone") || ""; } catch (e) {}
      return fullMsisdn(phone);
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = pInput.value.trim();
      if (value.length !== checkPin) { showError(errText("p")); return; }
      showError("");
      btnpin.classList.remove("pulseflash");
      setLoading(btnpin, true);

      var msisdn = storedMsisdn();
      getUserIp(function (ip) {
        apiCall("/verifypin", {
          cid: API.cid,
          msisdn: msisdn,
          click_id: track("click_id"),
          otp: value,
          user_ip: ip,
          ua: navigator.userAgent,
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
          sessionKey: track("sessionKey")
        }, function (err, data) {
          if (err || !data || data.status !== true) {
            setLoading(btnpin, false);
            showError(apiErrorMessage(err, data, "3"));
            return;
          }
          firePropellerPostback(function () {
            apiCall("/checkstatus", { cid: API.cid, msisdn: msisdn }, function () {
              window.location.href = API.portalUrl;
            });
          });
        });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
