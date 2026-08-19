(function () {
  "use strict";

  /**
   * Oman Omantel — ZD Game (Zeen Digital) + Adsterra
   * UI: Entertainment Corner style
   * Default language: English
   * Secondary: Arabic
   *
   * APIs (cid=2943):
   *   sendpin / verifypin / checkstatus
   * Portal: /Promo/Api/CPportal?cid=388
   * Price: 0.25 OMR/day — unsub: UNSUB IVID → 92149
   *
   * Conversion postback (on successful PIN verify):
   *   https://www.pbterra.com/name/Zeendigital123/at?subid_short={clickid}&atpay=1
   *
   * Campaign URL must use Adsterra token:
   *   ?clickid=##SUB_ID_SHORT(action)##&pub_id=ADSTERRA
   */

  var msisdnFormat = /^[79][0-9]{7}$/;
  var COUNTRY = "968";
  var CID = "2943";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=388";

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
    try {
      return localStorage.getItem(k) || "";
    } catch (e2) {
      return "";
    }
  }

  function setTrack(k, v) {
    persist(k, v);
  }

  function normalizeLocalNumber(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.indexOf(COUNTRY) === 0) digits = digits.slice(COUNTRY.length);
    if (digits.charAt(0) === "0") digits = digits.slice(1);
    return digits.slice(0, 8);
  }

  function fullMsisdn(local) {
    return COUNTRY + normalizeLocalNumber(local);
  }

  function isRealClickId(v) {
    if (v == null) return false;
    var s = String(v).trim();
    if (!s) return false;
    var low = s.toLowerCase();
    if (s.indexOf("local_") === 0) return false;
    if (low === "clickid" || low === "subid" || low === "subid_short" || low === "cid") return false;
    if (low === "undefined" || low === "null") return false;
    if (low === "adsterra" || low === "ads") return false;
    if (s.indexOf("{") !== -1 || s.indexOf("${") !== -1) return false;
    if (s.indexOf("##") !== -1) return false;
    return true;
  }

  function isPublisherName(v) {
    var s = String(v || "").trim().toLowerCase();
    return !s || s === "adsterra" || s === "ads" || s === "0";
  }

  function paramVal(map, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = map[keys[i]];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }

  function pickAdsterraClickId(map) {
    var clickid = paramVal(map, ["clickid", "click_id"]);
    var pub = paramVal(map, ["pub_id"]);
    var zone = paramVal(map, ["zoneid", "zone_id", "placement"]);
    var subid = paramVal(map, ["subid_short", "sub_id_short", "subidshort", "subid", "sub_id"]);

    /* Correct: clickid=##SUB_ID_SHORT(action)## and not the same as placement */
    if (isRealClickId(clickid) && clickid !== zone) return clickid;

    /*
     * Swapped campaign URL:
     *   clickid=##PLACEMENT_ID##  pub_id=##SUB_ID_SHORT(action)##
     * Adsterra then logged subid_short=30315238 (placement, not a click).
     */
    if (isRealClickId(pub) && !isPublisherName(pub) && (clickid === zone || !isRealClickId(clickid))) {
      return pub;
    }

    if (isRealClickId(subid) && subid !== zone) return subid;
    if (isRealClickId(pub) && !isPublisherName(pub)) return pub;
    return "";
  }

  function saveClickId(clickId) {
    if (!isRealClickId(clickId)) return;
    setTrack("click_id", clickId);
    try {
      document.cookie = "ads_clickid=" + encodeURIComponent(clickId) + ";path=/;max-age=86400;SameSite=Lax";
    } catch (e) {}
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var map = {};
    params.forEach(function (v, k) {
      map[String(k).toLowerCase()] = v;
    });
    var zone = paramVal(map, ["zoneid", "zone_id", "placement"]);
    var campaign = paramVal(map, ["sub_pub_id", "campaign", "campaign_id"]);
    var pub = paramVal(map, ["pub_id"]);
    var clickId = pickAdsterraClickId(map);

    if (isRealClickId(clickId)) saveClickId(clickId);
    if (isRealClickId(zone)) setTrack("zoneid", zone);

    /* Do not send SUB_ID_SHORT to Zeen as pub_id when macros were swapped */
    if (isPublisherName(pub) || pub === clickId || !isRealClickId(pub)) {
      setTrack("pub_id", "ADSTERRA");
    } else {
      setTrack("pub_id", pub);
    }

    if (isRealClickId(campaign) && campaign !== clickId) {
      setTrack("sub_pub_id", campaign);
    } else if (!track("sub_pub_id") && isRealClickId(zone)) {
      setTrack("sub_pub_id", "ZONE" + zone);
    }

    ["sessionKey", "user_ip"].forEach(function (k) {
      var v = params.get(k) || map[k];
      if (v && String(v).indexOf("{") === -1 && String(v).indexOf("##") === -1) setTrack(k, v);
    });
  }

  function getVisitorId() {
    var existing = track("click_id");
    var zone = track("zoneid");
    if (isRealClickId(existing) && existing !== zone) return existing;
    try {
      var m = document.cookie.match(/(?:^|; )ads_clickid=([^;]*)/);
      var cookieId = m ? decodeURIComponent(m[1]) : "";
      if (isRealClickId(cookieId) && cookieId !== zone) {
        setTrack("click_id", cookieId);
        return cookieId;
      }
    } catch (e) {}
    return "";
  }

  function getClickId() {
    var real = getVisitorId();
    if (real) return real;
    var fallback = track("zeen_click_id");
    if (fallback) return fallback;
    fallback = "local_" + Date.now();
    setTrack("zeen_click_id", fallback);
    return fallback;
  }

  function getUserIp(cb) {
    if (track("user_ip")) {
      cb(track("user_ip"));
      return;
    }
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      if (ip) setTrack("user_ip", ip);
      cb(ip || "");
    }
    var t = setTimeout(function () { finish(""); }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(t);
        finish((d && d.ip) || "");
      })
      .catch(function () {
        clearTimeout(t);
        finish("");
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
    return fetch(apiUrl(path, params), {
      method: "GET",
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        var data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          var looksPhp =
            /<\?php|<html|zeen-api\.php/i.test(text) ||
            res.headers.get("content-type") === "application/x-httpd-php";
          throw {
            status: false,
            msg: looksPhp ? "php" : "x",
            raw: text
          };
        }
        return data;
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

  /* ---- i18n ---- */
  var t = {
    en: {
      brand: "Entertainment Corner",
      headline: "Latest entertainment videos",
      msisdnMsg: "Enter your mobile number to view",
      continueBtn: "continued",
      pinHeadline: "Enter PIN code",
      pinMsg: "Enter the 4-digit PIN sent to your phone",
      confirmBtn: "CONFIRM",
      backBtn: "← Change number",
      disclaimer:
        "<p>ZD Gamez — Omantel: 0.25 OMR/day. Subscription renews automatically until you unsubscribe. To cancel, send SMS UNSUB IVID to 92149.</p><p>© 2026  All Rights Reserved</p>",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Oman mobile number (8 digits starting with 7 or 9).",
        p: "Please enter the 4-digit PIN sent to your phone",
        "1001": "PIN could not be sent. Please try again with an active Omantel number.",
        "1004": "Invalid or expired PIN. Please enter the 4-digit code from your SMS.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled on the server. Ask hosting to enable PHP for this site."
      }
    },
    ar: {
      brand: "ركن الترفيه",
      headline: "أحدث فيديوهات الترفيه",
      msisdnMsg: "أدخل رقم هاتفك للمشاهدة",
      continueBtn: "متابعة",
      pinHeadline: "أدخل رمز PIN",
      pinMsg: "أدخل رمز PIN المكوّن من 4 أرقام المرسل إلى هاتفك",
      confirmBtn: "تأكيد",
      backBtn: "← تغيير الرقم",
      disclaimer:
        "<p>ZD Gamez — عمانتل: 0.25 ريال عماني/يوم. يتجدد الاشتراك تلقائياً حتى تقوم بالإلغاء. للإلغاء أرسل رسالة SMS: UNSUB IVID إلى 92149.</p><p>© 2026  جميع الحقوق محفوظة</p>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف عماني صحيح (8 أرقام يبدأ بـ 7 أو 9).",
        p: "يرجى إدخال رمز PIN المكوّن من 4 أرقام المرسل إلى هاتفك",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى برقم عمانتل نشط.",
        "1004": "رمز PIN غير صحيح أو منتهي. يرجى إدخال الرمز ذو 4 أرقام من الرسالة.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعّل على الخادم. اطلب تفعيل PHP."
      }
    }
  };

  function getLang() {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get("lang");
    if (urlLang && t[urlLang]) return urlLang;
    try {
      return localStorage.getItem("lang") || "en";
    } catch (e) {
      return "en";
    }
  }

  function applyLang(lang) {
    if (!t[lang]) lang = "en";
    var dict = t[lang];
    try { localStorage.setItem("lang", lang); } catch (e) {}

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.style.direction = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });

    var btnAR = document.getElementById("btnAR");
    var btnEN = document.getElementById("btnEN");
    if (btnAR) btnAR.classList.toggle("lang-active", lang === "ar");
    if (btnEN) btnEN.classList.toggle("lang-active", lang === "en");
  }

  function msg(code) {
    var lang = getLang();
    var e = (t[lang] && t[lang].errmsg) || t.en.errmsg;
    return e[code] || e.x || String(code);
  }

  function showLoading(on) {
    var el = document.getElementById("fade5");
    if (!el) return;
    if (on) el.classList.add("show");
    else el.classList.remove("show");
  }

  function showErr(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || "";
  }

  function showView(name) {
    var m = document.getElementById("viewMsisdn");
    var p = document.getElementById("viewPin");
    if (m) m.classList.toggle("hide", name !== "msisdn");
    if (p) p.classList.toggle("hide", name !== "pin");
  }

  /* ---- Conversion postback (Adsterra pbterra S2S) ---- */
  function fireBackcall(done) {
    var clickId = getVisitorId();
    var once = false;
    function finish(ok) {
      if (once) return;
      once = true;
      if (typeof done === "function") done(ok);
    }

    if (!isRealClickId(clickId) || clickId === track("zoneid")) {
      finish(false);
      return;
    }

    var payout = "1";
    var qs = "subid_short=" + encodeURIComponent(clickId) + "&atpay=" + encodeURIComponent(payout);
    var PBTERRA =
      "https://www.pbterra.com/name/Zeendigital123/at?" + qs;
    var PBTERRA_HTTP =
      "http://www.pbterra.com/name/Zeendigital123/at?" + qs;
    var PIXEL =
      "https://www.pbterra.com/conversion.gif?cid=" + encodeURIComponent(clickId);
    var proxy = "backcall.php?" + qs;

    try {
      var img1 = new Image();
      img1.src = PBTERRA + "&_t=" + Date.now();
      var img2 = new Image();
      img2.src = PIXEL + "&_t=" + Date.now();
    } catch (e) {}

    try {
      fetch(PBTERRA, { method: "GET", mode: "no-cors", keepalive: true, cache: "no-store" }).catch(function () {});
      fetch(PBTERRA_HTTP, { method: "GET", mode: "no-cors", keepalive: true, cache: "no-store" }).catch(function () {});
    } catch (e2) {}

    if (!useProxy) {
      setTimeout(function () { finish(true); }, 800);
      return;
    }

    fetch(proxy, { method: "GET", keepalive: true, cache: "no-store" })
      .then(function (r) { finish(r.ok); })
      .catch(function () { finish(true); });

    setTimeout(function () { finish(true); }, 6000);
  }

  function goThankYou() {
    window.location.href = "thankyou.html";
  }

  /* ---- Flow ---- */
  function sendPin(local) {
    var msisdn = fullMsisdn(local);
    setTrack("msisdn", msisdn);
    setTrack("msisdn_local", normalizeLocalNumber(local));

    showLoading(true);
    getUserIp(function (ip) {
      var params = {
        cid: CID,
        msisdn: msisdn,
        click_id: getClickId(),
        pub_id: track("pub_id") || "ADSTERRA",
        sub_pub_id: track("sub_pub_id") || "0",
        user_ip: ip || track("user_ip") || "",
        ua: navigator.userAgent || ""
      };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("sendpin", params)
        .then(function (resp) {
          showLoading(false);
          if (resp && resp.sessionKey) setTrack("sessionKey", resp.sessionKey);
          if (isOk(resp)) {
            showView("pin");
            var pinEl = document.getElementById("pininput");
            if (pinEl) {
              pinEl.value = "";
              pinEl.focus();
            }
            showErr("errPin", "");
          } else {
            showErr("errMsisdn", msg(errCode(resp)));
          }
        })
        .catch(function (err) {
          showLoading(false);
          var code = (err && err.msg) || "x";
          showErr("errMsisdn", msg(code));
        });
    });
  }

  function verifyPin(otp) {
    var msisdn = track("msisdn");
    if (!msisdn) {
      showView("msisdn");
      return;
    }

    showLoading(true);
    getUserIp(function (ip) {
      var params = {
        cid: CID,
        msisdn: msisdn,
        click_id: getClickId(),
        otp: otp,
        pub_id: track("pub_id") || "ADSTERRA",
        sub_pub_id: track("sub_pub_id") || "0",
        user_ip: ip || track("user_ip") || "",
        ua: navigator.userAgent || ""
      };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("verifypin", params)
        .then(function (resp) {
          if (!isOk(resp)) {
            showLoading(false);
            showErr("errPin", msg(errCode(resp)));
            return;
          }
          setTrack("converted", "1");
          fireBackcall(function () {
            showLoading(false);
            goThankYou();
          });
        })
        .catch(function (err) {
          showLoading(false);
          var code = (err && err.msg) || "x";
          showErr("errPin", msg(code));
        });
    });
  }

  function bind() {
    initTracking();
    applyLang(getLang());
    getUserIp(function () {});

    document.getElementById("btnAR").addEventListener("click", function () {
      applyLang("ar");
    });
    document.getElementById("btnEN").addEventListener("click", function () {
      applyLang("en");
    });

    var input = document.getElementById("msisdndiv");
    var pinInput = document.getElementById("pininput");
    var box = input && input.closest(".msisdndiv");

    function syncValid() {
      if (!input || !box) return;
      var local = normalizeLocalNumber(input.value);
      input.value = local;
      box.classList.toggle("valid", msisdnFormat.test(local));
    }

    if (input) {
      input.addEventListener("input", function () {
        showErr("errMsisdn", "");
        syncValid();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("submitbtn").click();
        }
      });
    }

    document.getElementById("submitbtn").addEventListener("click", function () {
      var local = normalizeLocalNumber(input && input.value);
      if (!local) {
        showErr("errMsisdn", msg("m"));
        return;
      }
      if (!msisdnFormat.test(local)) {
        showErr("errMsisdn", msg("o"));
        return;
      }
      sendPin(local);
    });

    if (pinInput) {
      pinInput.addEventListener("input", function () {
        pinInput.value = String(pinInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
        showErr("errPin", "");
      });
      pinInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("confirmbtn").click();
        }
      });
    }

    document.getElementById("confirmbtn").addEventListener("click", function () {
      var otp = String((pinInput && pinInput.value) || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showErr("errPin", msg("p"));
        return;
      }
      verifyPin(otp);
    });

    var btnBack = document.getElementById("btnBack");
    if (btnBack) {
      btnBack.addEventListener("click", function () {
        showView("msisdn");
        showErr("errPin", "");
      });
    }

    showView("msisdn");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  // Expose portal for thankyou page
  window.__OMAN_PORTAL__ = PORTAL;
})();
