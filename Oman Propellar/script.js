(function () {
  "use strict";

  /**
   * Oman Omantel — ZD Gamez (Zeen Digital) + PropellerAds
   * Same UI as Palestine LP; Oman APIs + description.
   *
   * Campaign:
   *   https://click2funbox.com/omanprop/?clickid=${SUBID}&zoneid={zone_id}
   *
   * APIs (cid=2203):
   *   sendpin / verifypin / checkstatus
   * Portal: /Promo/Api/CPportal?cid=388
   * Price: 0.25 OMR/day — unsub: UNSUB IVID → 92149
   * Propeller visitor_id = same clickid (${SUBID})
   */

  var msisdnFormat = /^[79][0-9]{7}$/;
  var COUNTRY = "968";
  var CID = "2203";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=388";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var POSTBACK = {
    url: "https://ad.propellerads.com/conversion.php",
    aid: "3898869",
    pid: "",
    tid: "154120",
    payout: "1"
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
      params.get("token") ||
      "";
    if (clickId && clickId !== "${SUBID}" && String(clickId).toLowerCase() !== "clickid") {
      persist("click_id", clickId);
    }
    var zone = params.get("zoneid") || params.get("zone_id") || "";
    if (zone && zone !== "{zone_id}" && zone !== "{zoneid}") persist("zoneid", zone);

    var pub = params.get("pub_id") || params.get("pubid") || "";
    if (pub) persist("pub_id", pub);
    var subPub = params.get("sub_pub_id") || params.get("subpubid") || "";
    if (subPub) persist("sub_pub_id", subPub);
  }

  function getClickId() {
    var existing = track("click_id");
    if (existing) return existing;
    var fallback =
      "local_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    persist("click_id", fallback);
    return fallback;
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

  function firePropellerPostback(done) {
    var visitorId = getClickId();
    var finish = typeof done === "function" ? done : function () {};
    if (!visitorId) { finish(false); return; }

    var qs =
      "visitor_id=" + encodeURIComponent(visitorId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);
    var direct =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(visitorId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);

    try { var img = new Image(); img.src = direct; } catch (e) {}
    try { fetch(direct, { method: "GET", mode: "no-cors", keepalive: true }).catch(function () {}); } catch (e2) {}

    var settled = false;
    function once(ok) {
      if (settled) return;
      settled = true;
      finish(ok);
    }
    try {
      fetch("propeller-pb.php?" + qs, { method: "GET", keepalive: true })
        .then(function (r) {
          return r.json().then(function (d) { once(!!(d && d.status)); }).catch(function () { once(r.ok); });
        })
        .catch(function () { once(false); });
    } catch (e3) { once(false); }
    setTimeout(function () { once(false); }, 4000);
  }

  var lang = "en";
  var t = {
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy unlimited games",
      mExample: "(example: +968 7XXX XXXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      pinTitle: "Enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
      footerNote:
        "ZD Gamez — Omantel: 0.25 OMR/day. Subscription renews automatically until you unsubscribe. To cancel, send SMS UNSUB IVID to 92149.",
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Oman mobile number (8 digits starting with 7 or 9).",
        p: "Please enter the 4-digit PIN",
        3: "Invalid PIN Code",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Upload zeen-api.php and enable PHP.",
        proxy: "API proxy not running. Locally use: python3 serve.py",
        send: "PIN could not be sent. Please try again."
      }
    },
    ar: {
      headerTitle: "شاهد الآن",
      pnTitle: "يرجى إدخال رقم هاتفك للاستمتاع بألعاب غير محدودة",
      mExample: "(مثال: +968 7XXX XXXX)",
      mBtn: "اشترك",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      pinTitle: "أدخل رمز PIN المكون من 4 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn: "تأكيد",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص",
      footerNote:
        "ZD Gamez — عمانتل: 0.25 ريال يومياً. يتجدد الاشتراك تلقائياً حتى الإلغاء. للإلغاء أرسل UNSUB IVID إلى 92149.",
      copyright: "<span class=\"rtl\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم عماني صحيح (8 أرقام يبدأ بـ 7 أو 9).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        3: "الرقم السري غير صحيح",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        proxy: "بروكسي API غير متوفر.",
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
    if (data && data.errorMessage) return data.errorMessage;
    if (data && data.msg) return data.msg;
    return errText(fallbackKey);
  }

  function showError(msg) {
    var box = document.querySelector(".errorBox");
    if (box) box.textContent = msg || "";
  }

  function applyLang() {
    var dict = t[lang] || t.en;
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
    var btn = wrap.querySelector(".button") || wrap;
    var txt = wrap.querySelector(".btntxt");
    var load = wrap.querySelector(".submitload");
    if (on) {
      if (load) load.classList.add("show");
      if (txt) txt.classList.add("disabled_txt");
      if (btn && btn.classList) btn.classList.add("disabled_btn");
      wrap.classList.remove("pulseflash");
    } else {
      if (load) load.classList.remove("show");
      if (txt) txt.classList.remove("disabled_txt");
      if (btn && btn.classList) btn.classList.remove("disabled_btn");
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
      lang = btn.getAttribute("data-lang") || "en";
      applyLang();
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    });
  });

  /* Intro animation */
  if (document.getElementById("myBar") && document.getElementById("mbox")) {
    var bar = document.getElementById("myBar");
    var w = 1;
    var timer = setInterval(function () {
      if (w >= 100) {
        clearInterval(timer);
        var bg = document.getElementById("screenbg");
        var box = document.getElementById("loadbox");
        if (bg) bg.style.opacity = "1";
        if (box) box.classList.add("resetloadbox");
      } else {
        w += 2;
        bar.style.width = w + "%";
      }
    }, 30);
  }

  /* Mobile page */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var mobileBox = document.querySelector(".mobileBox");
    var btnpn = document.querySelector(".btnpn");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      if (mInput.value.length >= 8) {
        mobileBox.classList.remove("pulseflash");
        mobileBox.classList.add("pulseflash-pause");
        btnpn.classList.add("pulseflash");
      } else if (mInput.value.length > 0) {
        mobileBox.classList.add("pulseflash-pause");
        mobileBox.classList.remove("pulseflash");
        btnpn.classList.remove("pulseflash");
      } else {
        mobileBox.classList.add("pulseflash");
        mobileBox.classList.remove("pulseflash-pause");
        btnpn.classList.remove("pulseflash");
      }
    });
    mInput.addEventListener("focus", function () {
      mobileBox.classList.remove("pulseflash");
      mobileBox.classList.add("pulseflash-pause");
    });
    mInput.addEventListener("blur", function () {
      if (!mInput.value) {
        mobileBox.classList.add("pulseflash");
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
          pub_id: track("pub_id") || "propeller",
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

  /* PIN page */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin");

    if (!track("phone")) {
      window.location.href = "index.html?lang=" + lang;
      return;
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      showError("");
      if (pInput.value.length >= PIN_LENGTH) {
        pinBox.classList.remove("pulseflash");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.add("pulseflash");
      } else if (pInput.value.length > 0) {
        pinBox.classList.add("pulseflash-pause");
        pinBox.classList.remove("pulseflash");
        btnpin.classList.remove("pulseflash");
      } else {
        pinBox.classList.add("pulseflash");
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
          pub_id: track("pub_id") || "propeller",
          sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
          sessionKey: track("sessionKey")
        }, function (err, data) {
          if (err || !isApiSuccess(data)) {
            setLoading(btnpin, false);
            showError(apiErrorMessage(err, data, "3"));
            return;
          }

          firePropellerPostback(function () {
            apiCall("checkstatus", {
              cid: CID,
              msisdn: msisdn
            }, function () {
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
