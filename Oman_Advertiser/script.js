(function () {
  "use strict";

  /**
   * Oman Omantel — ZD Game (Zeen Digital) + Advertizer
   * UI: loaderlite (FileShare)
   *
   * APIs (cid=3051): sendpin / verifypin / checkstatus
   * Portal: /Promo/Api/CPportal?cid=388
   * Price: 0.25 OMR/day — unsub: UNSUB IVID → 92149
   *
   * Postback:
   *   http://postback.advertizer.com/pb.php?clickid={clickid}&amount=1&advertiser_id=Zeen1041&key=...
   */

  var msisdnFormat = /^[79][0-9]{7}$/;
  var COUNTRY = "968";
  var CID = "3051";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=388";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var POSTBACK = {
    url: "http://postback.advertizer.com/pb.php",
    amount: "1",
    advertiser_id: "Zeen1041",
    key: "a5b193ada1cbd22a987bfe876496ac40"
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
    return digits.slice(0, 8);
  }

  function fullMsisdn(local) {
    return COUNTRY + normalizeLocal(local);
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var clickId =
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("clickId") ||
      params.get("CLICKID") ||
      params.get("subid") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    var zone = params.get("zoneid") || params.get("zone_id") || "";
    if (zone && zone.indexOf("{") === -1) persist("zoneid", zone);

    var pub = params.get("pub_id") || params.get("pubid") || "";
    if (pub) persist("pub_id", pub);
    var subPub = params.get("sub_pub_id") || params.get("subpubid") || "";
    if (subPub) persist("sub_pub_id", subPub);
  }

  function getClickId() {
    var existing = track("click_id");
    if (isRealClickId(existing)) return existing;
    var fallback = track("zeen_click_id");
    if (fallback) return fallback;
    fallback = "local_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    persist("zeen_click_id", fallback);
    return fallback;
  }

  function getVisitorId() {
    var existing = track("click_id");
    return isRealClickId(existing) ? existing : "";
  }

  function getUserIp(cb) {
    var cached = track("user_ip");
    if (cached) { cb(cached); return; }
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var ip = (d && d.ip) || "";
        if (ip) persist("user_ip", ip);
        cb(ip || "0.0.0.0");
      })
      .catch(function () { cb("0.0.0.0"); });
  }

  function buildApiUrl(path, qs) {
    var clean = String(path || "").replace(/^\//, "");
    if (useProxy) {
      return "zeen-api.php?path=" + encodeURIComponent(clean) + "&" + qs;
    }
    return ZEEN + "/" + clean + "?" + qs;
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
        if (/^\s*<!DOCTYPE html/i.test(text) || /^\s*<html/i.test(text)) {
          done(new Error("proxy_missing"));
          return;
        }
        try { done(null, JSON.parse(text)); }
        catch (e) { done(new Error("bad_json")); }
      })
      .catch(function (err) { done(err); });
  }

  function isApiSuccess(data) {
    if (!data) return false;
    if (data.status === true || String(data.status).toLowerCase() === "true") return true;
    var m = String(data.msg || data.response || "").toUpperCase();
    return m.indexOf("SUCCESS") !== -1;
  }

  function fireAdvertizerPostback(done) {
    var clickId = getVisitorId();
    var finish = typeof done === "function" ? done : function () {};
    if (!clickId) { finish(false); return; }
    if (track("pb_sent") === "1") { finish(true); return; }

    var proxy =
      "advertizer-pb.php?clickid=" + encodeURIComponent(clickId) +
      "&txn_id=" + encodeURIComponent(clickId) +
      "&amount=" + encodeURIComponent(POSTBACK.amount);

    var settled = false;
    function once(ok) {
      if (settled) return;
      settled = true;
      finish(ok);
    }
    fetch(proxy, { method: "GET", keepalive: true })
      .then(function (r) {
        return r.json().then(function (d) {
          if (d && d.status) persist("pb_sent", "1");
          once(!!(d && d.status));
        }).catch(function () {
          if (r.ok) persist("pb_sent", "1");
          once(r.ok);
        });
      })
      .catch(function () { once(false); });
    setTimeout(function () { once(true); }, 4000);
  }

  var lang = "ar";
  var t = {
    en: {
      fileName: "File Name",
      fileSize: "File Size",
      downloadSpeed: "Download speed",
      pnTitle: "Please enter your mobile number",
      mExample: "(example: +968 7XXX XXXX)",
      mBtn1: "Continue",
      mSecure: "Your personal data is protected and encrypted.",
      pinTitle: "Please enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn1: "Continue",
      pinSecure: "Do not share your verification code with anyone.",
      terms: "Terms & Condition",
      tncText:
        "By clicking Continue, you agree to subscribe to ZD Game. Price is 0.25 OMR per day. Subscription renews automatically until you unsubscribe. To cancel, send SMS UNSUB IVID to 92149.",
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
        proxy: "API proxy not running. Locally use: python3 serve.py",
        php: "PHP is not enabled. Upload zeen-api.php and enable PHP.",
        send: "PIN could not be sent. Please try again."
      }
    },
    ar: {
      fileName: "اسم الملف",
      fileSize: "حجم الملف",
      downloadSpeed: "سرعة التنزيل",
      pnTitle: "يرجى إدخال رقم الهاتف",
      mExample: "(مثال: +968 7XXX XXXX)",
      mBtn1: "متابعة",
      mSecure: "بياناتك الشخصية محمية ومشفرة.",
      pinTitle: "يرجى إدخال رمز PIN المكون من 4 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn1: "متابعة",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص.",
      terms: "الشروط والأحكام",
      tncText:
        "بالضغط على متابعة، فإنك توافق على الاشتراك في ZD Game. السعر 0.25 ريال عماني يومياً. يتجدد الاشتراك تلقائياً حتى الإلغاء. للإلغاء أرسل UNSUB IVID إلى 92149.",
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
        php: "PHP غير مفعل على الخادم.",
        send: "تعذر إرسال PIN. حاول مرة أخرى."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || "";
  }

  function apiErrorMessage(err, data, fallbackKey) {
    if (err && err.message === "php_not_running") return errText("php");
    if (err && err.message === "proxy_missing") return errText("proxy");
    if (err) return errText("x");
    if (data && data.err && data.err.errorMessage) return data.err.errorMessage;
    if (data && data.errorMessage) return data.errorMessage;
    var msg = (data && data.msg) || "";
    var match = String(msg).match(/\((\d+)\)/);
    if (match) {
      var mapped = errText(match[1]);
      if (mapped) return mapped;
    }
    return msg || errText(fallbackKey);
  }

  function showError(msg) {
    var box = document.querySelector(".errorBox");
    if (box) box.textContent = msg || "";
  }

  function applyLang() {
    var dict = t[lang] || t.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll(".langbtn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  function setLoading(wrap, on) {
    var btn = wrap.querySelector(".button");
    var txt = wrap.querySelector(".btntxt");
    var load = wrap.querySelector(".submitload");
    if (!btn) return;
    if (on) {
      if (load) load.style.display = "flex";
      if (txt) txt.classList.add("disabled_txt");
      btn.classList.add("disabled_btn");
      wrap.classList.remove("pulseflash");
    } else {
      if (load) load.style.display = "none";
      if (txt) txt.classList.remove("disabled_txt");
      btn.classList.remove("disabled_btn");
    }
  }

  initTracking();
  getUserIp(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  applyLang();

  document.querySelectorAll(".langbtn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      lang = btn.getAttribute("data-lang") || "ar";
      applyLang();
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    });
  });

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

  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");
    var sideCheck = document.querySelector(".sidebtncheck");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= 8) {
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
      if (!mInput.value) {
        mobileBox.classList.add("pulseflash", "pulseflash-delay");
        mobileBox.classList.remove("pulseflash-pause");
      }
    });

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = normalizeLocal(mInput.value);
      mInput.value = value;
      if (!value) { showError(errText("m")); return; }
      if (!msisdnFormat.test(value)) { showError(errText("o")); return; }

      showError("");
      setLoading(btnpn, true);
      var msisdn = fullMsisdn(value);
      persist("phone", msisdn);

      getUserIp(function (ip) {
        apiCall("sendpin", {
          cid: CID,
          msisdn: msisdn,
          click_id: getClickId(),
          pub_id: track("pub_id") || "advertizer",
          sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
          user_ip: ip,
          ua: navigator.userAgent || "",
          sessionKey: track("sessionKey")
        }, function (err, data) {
          if (err || !isApiSuccess(data)) {
            setLoading(btnpn, false);
            showError(apiErrorMessage(err, data, "send"));
            return;
          }
          if (data && data.sessionKey) persist("sessionKey", data.sessionKey);
          window.location.href = "pin.html?lang=" + lang;
        });
      });
    });
  }

  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var pinBox = document.querySelector(".pinBox") || document.querySelector(".mobileBox");
    var btnpin = document.querySelector(".btnpin") || document.querySelector(".btnpn");
    var pinCheck = document.querySelector(".pincheckicon") || document.querySelector(".sidebtncheck");

    if (!track("phone")) {
      window.location.href = "index.html?lang=" + lang;
      return;
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      var len = pInput.value.length;
      showError("");
      if (len >= PIN_LENGTH) {
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

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = String(pInput.value || "").replace(/\D/g, "");
      if (pin.length !== PIN_LENGTH) { showError(errText("p")); return; }

      showError("");
      setLoading(btnpin, true);
      var msisdn = track("phone");

      getUserIp(function (ip) {
        apiCall("verifypin", {
          cid: CID,
          msisdn: msisdn,
          click_id: getClickId(),
          otp: pin,
          user_ip: ip,
          ua: navigator.userAgent || "",
          pub_id: track("pub_id") || "advertizer",
          sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
          sessionKey: track("sessionKey")
        }, function (err, data) {
          if (err || !isApiSuccess(data)) {
            setLoading(btnpin, false);
            showError(apiErrorMessage(err, data, "3"));
            return;
          }
          fireAdvertizerPostback(function () {
            apiCall("checkstatus", { cid: CID, msisdn: msisdn }, function () {
              window.location.href = PORTAL;
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
