(function () {
  "use strict";

  // Oman local mobile: 8 digits. Country code 968 is always fixed.
  // Live API accepts both 7xxxxxxx and 9xxxxxxx for cid 2203.
  var msisdnFormat = /^[79][0-9]{7}$/;

  /* ---------------- Zeen Digital API (OMAN OMANTEL / ZD Gamez) ---------------- */
  // FileZilla HTTPS hosting: call same-origin zeen-api.php (needs PHP enabled once).
  // Local HTTP: call Zeen API directly.
  var ZEEN_API = "http://64.225.85.48/adnet";
  var isHttps = typeof location !== "undefined" && location.protocol === "https:";
  var API = {
    cid: "2203",
    countryCode: "968",
    portalUrl: ZEEN_API + "/Promo/Api/CPportal?cid=388"
  };

  // PropellerAds S2S postback — fired only after successful PIN verification.
  // Campaign URL (exact):
  //   https://click2funbox.com/?clickid=${SUBID}&zoneid={zone_id}
  // Postback URL (visitor_id = same ${SUBID} from clickid):
  //   https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}
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
    try {
      return localStorage.getItem(k) || "";
    } catch (e2) {
      return "";
    }
  }

  function setTrack(k, v) {
    persist(k, v);
  }

  // Always build msisdn as fixed 968 + local 8 digits (never trust typed country code).
  function normalizeLocalNumber(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.indexOf(API.countryCode) === 0) {
      digits = digits.slice(API.countryCode.length);
    }
    if (digits.charAt(0) === "0") {
      digits = digits.slice(1);
    }
    return digits.slice(0, 8);
  }

  function fullMsisdn(local) {
    return API.countryCode + normalizeLocalNumber(local);
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);

    // Propeller campaign: ?clickid=${SUBID}&zoneid={zone_id}
    // Same SUBID is used as Zeen click_id AND Propeller visitor_id.
    var subid =
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("clickId") ||
      params.get("CLICKID") ||
      "";

    if (subid && subid !== "${SUBID}") {
      persist("click_id", subid);
    }

    var zone =
      params.get("zoneid") ||
      params.get("zone_id") ||
      params.get("zoneId") ||
      "";
    if (zone && zone !== "{zone_id}" && zone !== "{zoneid}") {
      persist("zoneid", zone);
    }

    TRACK_KEYS.forEach(function (k) {
      if (k === "click_id" || k === "zoneid") return;
      var v = params.get(k);
      if (v) persist(k, v);
    });
  }

  // The API requires user_ip, so resolve and cache it, then run the callback.
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
      return "zeen-api.php?path=" + encodeURIComponent(apiPath) + "&" + qs;
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
        if (/^\s*<\?php/i.test(text)) {
          done(new Error("php_not_running"));
          return;
        }
        if (/^\s*<!DOCTYPE html/i.test(text)) {
          done(new Error("proxy_not_configured"));
          return;
        }
        var data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          done(new Error("bad_json"));
          return;
        }
        done(null, data);
      })
      .catch(function (err) { done(err); });
  }

  // Fire PropellerAds conversion: visitor_id = same ${SUBID} from ?clickid=
  // Uses server PHP (S2S) first so redirect does not cancel the postback.
  function firePropellerPostback(done) {
    var clickId = track("click_id");
    var finish = typeof done === "function" ? done : function () {};

    if (!clickId || clickId === "${SUBID}" || String(clickId).toLowerCase() === "clickid") {
      finish(false);
      return;
    }

    var qs =
      "visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);

    var directUrl =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);

    // Browser backup (Image + fetch)
    try {
      var img = new Image();
      img.src = directUrl;
    } catch (e) {}
    try {
      fetch(directUrl, { method: "GET", mode: "no-cors", keepalive: true }).catch(function () {});
    } catch (e2) {}

    // Server S2S postback (reliable) — wait before portal redirect
    var pbEndpoint = "propeller-pb.php?" + qs;
    var settled = false;
    function once(ok) {
      if (settled) return;
      settled = true;
      finish(ok);
    }

    try {
      fetch(pbEndpoint, { method: "GET", keepalive: true })
        .then(function (r) { return r.json().then(function (d) { once(!!(d && d.status)); }).catch(function () { once(r.ok); }); })
        .catch(function () { once(false); });
    } catch (e3) {
      once(false);
    }

    // Safety timeout so user is not stuck if Propeller is slow
    setTimeout(function () { once(false); }, 4000);
  }

  initTracking();
  getUserIp(function () {});

  /* ---------------- Translations ---------------- */
  var t = {
    en: {
      pnTitle: "Enter your mobile number to start downloading",
      qHint: "Enter your correct mobile number:",
      mBtn1: "Continue",
      mBtn2Pre: "with",
      mBtn2Post: "Code",
      mSecure: "Your personal data is protected and encrypted",
      mPlaceholder: "XXXX XXXX",

      pinTitle: "Enter PIN number for verification",
      pinSubtitle: "Please do not share PIN with anyone.",
      pinBtn1: "Confirm",
      pinBtn2Pre: "with",
      pinBtn2Post: "Code",
      pinSecure: "To safeguard your property, do not disclose your verification code to others!",
      pinPlaceholder: " PIN number ",

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
      pnTitle: "\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641\u0643 \u0627\u0644\u0645\u062D\u0645\u0648\u0644 \u0644\u0628\u062F\u0621 \u0627\u0644\u062A\u0646\u0632\u064A\u0644",
      qHint: "\u0623\u062F\u062E\u0644 \u0623\u0631\u0642\u0627\u0645 \u0647\u0627\u062A\u0641\u0643 \u0627\u0644\u0645\u062D\u0645\u0648\u0644 \u0627\u0644\u0635\u062D\u064A\u062D\u0629:",
      mBtn1: "\u064A\u0643\u0645\u0644",
      mBtn2Pre: "\u0645\u0639 \u0631\u0645\u0632",
      mBtn2Post: "",
      mSecure: "\u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0645\u062D\u0645\u064A\u0629 \u0648\u0645\u0634\u0641\u0631\u0629",
      mPlaceholder: "XXXX XXXX",

      pinTitle: "\u0623\u062F\u062E\u0644 \u0631\u0642\u0645 PIN \u0644\u0644\u062A\u062D\u0642\u0642",
      pinSubtitle: "\u064A\u0631\u062C\u0649 \u0639\u062F\u0645 \u0645\u0634\u0627\u0631\u0643\u0629 \u0631\u0645\u0632 PIN \u0645\u0639 \u0623\u064A \u0634\u062E\u0635.",
      pinBtn1: "\u062A\u0623\u0643\u064A\u062F",
      pinBtn2Pre: "\u0645\u0639 \u0631\u0645\u0632",
      pinBtn2Post: "",
      pinSecure: "\u0644\u062D\u0645\u0627\u064A\u0629 \u0645\u0645\u062A\u0644\u0643\u0627\u062A\u0643\u060C \u0644\u0627 \u062A\u0641\u0635\u062D \u0639\u0646 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0644\u0644\u0622\u062E\u0631\u064A\u0646!",
      pinPlaceholder: " \u0631\u0642\u0645 PIN ",

      copyright: "<span class=\"ltr\">2026&nbsp;&copy;&nbsp;\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629</span>",

      errmsg: {
        m: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644",
        o: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0639\u0645\u0627\u0646\u064A \u0635\u062D\u064A\u062D (8 \u0623\u0631\u0642\u0627\u0645 \u064A\u0628\u062F\u0623 \u0628\u0640 7 \u0623\u0648 9).",
        p: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0645\u0632 PIN \u0627\u0644\u0645\u0643\u0648\u0646 \u0645\u0646 4 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u0649 \u0647\u0627\u062A\u0641\u0643",
        3: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0633\u0631\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
        "1001": "\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 PIN. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0628\u0631\u0642\u0645 \u0639\u0645\u0627\u0646\u062A\u0644 \u0646\u0634\u0637.",
        "1004": "\u0631\u0645\u0632 PIN \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0631\u0645\u0632 \u0630\u0648 4 \u0623\u0631\u0642\u0627\u0645 \u0645\u0646 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.",
        x: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        proxy: "\u0628\u0631\u0648\u0643\u0633\u064A API \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631.",
        php: "PHP \u063A\u064A\u0631 \u0645\u0641\u0639\u0644 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645. \u0627\u0637\u0644\u0628 \u062A\u0641\u0639\u064A\u0644 PHP."
      }
    }
  };

  /* ---------------- Language handling ---------------- */
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

    var m = document.getElementById("m");
    if (m) m.setAttribute("placeholder", dict.mPlaceholder);
    var p = document.getElementById("p");
    if (p) p.setAttribute("placeholder", dict.pinPlaceholder);

    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    document.querySelectorAll(".langbtn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
    var arRadio = document.getElementById("langAr");
    var enRadio = document.getElementById("langEn");
    if (arRadio) arRadio.checked = lang === "ar";
    if (enRadio) enRadio.checked = lang === "en";

    try { localStorage.setItem("lang", lang); } catch (e) {}
    return dict;
  }

  var currentLang = getLang();
  var dict = applyLang(currentLang);

  document.querySelectorAll(".langbtn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      currentLang = btn.getAttribute("data-lang");
      dict = applyLang(currentLang);
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
    if (box) box.textContent = msg;
  }
  function apiErrorMessage(err, data, fallbackKey) {
    if (err && err.message === "php_not_running") return errText("php");
    if (err && (err.message === "proxy_not_configured" || String(err.message || "").indexOf("http_404") === 0)) {
      return errText("proxy");
    }
    if (err) return errText("x");
    if (data && data.err && data.err.errorMessage) {
      return data.err.errorMessage;
    }
    var msg = (data && data.msg) || "";
    var match = msg.match(/\((\d+)\)/);
    if (match) {
      var mapped = errText(match[1]);
      if (mapped) return mapped;
    }
    return msg || errText(fallbackKey);
  }

  /* ---------------- Question tooltip toggle ---------------- */
  var q = document.querySelector(".icnquestion");
  var qwrap = document.querySelector(".qwrapper");
  if (q && qwrap) {
    q.addEventListener("click", function (e) {
      e.stopPropagation();
      qwrap.style.display = qwrap.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", function (e) {
      if (!qwrap.contains(e.target) && e.target !== q) {
        qwrap.style.display = "none";
      }
    });
  }

  /* ---------------- Mobile number page (mbox) ---------------- */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var checkNum = 8;
    var btnpn = document.querySelector(".btnpn");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocalNumber(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= checkNum) {
        mInput.classList.remove("pulseflash");
        mInput.classList.add("pulseflash-pause");
        btnpn.classList.add("pulseflash");
      } else if (len > 0) {
        mInput.classList.add("pulseflash-pause");
        mInput.classList.remove("pulseflash");
        btnpn.classList.remove("pulseflash");
      } else {
        mInput.classList.add("pulseflash");
        mInput.classList.remove("pulseflash-pause");
        btnpn.classList.remove("pulseflash");
      }
    });

    mInput.addEventListener("focus", function () {
      mInput.classList.remove("pulseflash");
    });
    mInput.addEventListener("blur", function () {
      if (mInput.value.length === 0) mInput.classList.add("pulseflash");
    });

    var mBtn = mForm.querySelector(".button");
    var mLoad = mForm.querySelector(".loadbtn");

    function mSetLoading(on) {
      mBtn.style.display = on ? "none" : "inline-block";
      mLoad.style.display = on ? "block" : "none";
    }

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = normalizeLocalNumber(mInput.value);
      mInput.value = value;
      if (value.length === 0) {
        showError(errText("m"));
        return;
      }
      if (!msisdnFormat.test(value)) {
        showError(errText("o"));
        return;
      }
      showError("");
      btnpn.classList.remove("pulseflash");
      mSetLoading(true);

      // Country code is always fixed: 968 + local number
      var msisdn = fullMsisdn(value);
      try { localStorage.setItem("phone", msisdn); } catch (err) {}

      getUserIp(function (ip) {
        // Send Pin API (Zeen DOC)
        // http://64.225.85.48/adnet/sendpin?cid=2203&msisdn={msisdn}&click_id={click_id}&pub_id={pub_id}&sub_pub_id={sub_pub_id}&user_ip={user_ip}&ua={ua}&sessionKey={sessionKey}
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
            mSetLoading(false);
            showError(apiErrorMessage(err, data, "1001"));
            return;
          }
          if (data.sessionKey) setTrack("sessionKey", data.sessionKey);
          window.location.href = "pin.html?lang=" + currentLang;
        });
      });
    });
  }

  /* ---------------- PIN page (pbox) ---------------- */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var checkPin = 4;
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin");

    pInput.addEventListener("input", function () {
      pInput.value = pInput.value.replace(/\D/g, "");
      var len = pInput.value.length;
      showError("");
      if (len >= checkPin) {
        pinBox.classList.remove("pulseflash");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.add("pulseflash");
      } else if (len > 0) {
        pinBox.classList.add("pulseflash-pause");
        pinBox.classList.remove("pulseflash");
        btnpin.classList.remove("pulseflash");
      } else {
        pinBox.classList.add("pulseflash");
        pinBox.classList.remove("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      }
    });

    pInput.addEventListener("focus", function () {
      pinBox.classList.remove("pulseflash");
    });
    pInput.addEventListener("blur", function () {
      if (pInput.value.length === 0) pinBox.classList.add("pulseflash");
    });

    var pBtn = pForm.querySelector(".button");
    var pLoad = pForm.querySelector(".loadbtn");

    function pSetLoading(on) {
      pBtn.style.display = on ? "none" : "inline-block";
      pLoad.style.display = on ? "block" : "none";
    }

    function storedMsisdn() {
      var phone = "";
      try { phone = localStorage.getItem("phone") || ""; } catch (e) {}
      return fullMsisdn(phone);
    }

    function goToPortal() {
      window.location.href = API.portalUrl;
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = pInput.value.trim();
      if (value.length !== checkPin) {
        showError(errText("p"));
        return;
      }
      showError("");
      btnpin.classList.remove("pulseflash");
      pSetLoading(true);

      var msisdn = storedMsisdn();

      getUserIp(function (ip) {
        // Verify Pin API (Zeen DOC)
        // http://64.225.85.48/adnet/verifypin?cid=2203&msisdn={msisdn}&click_id={click_id}&otp={otp}&user_ip={user_ip}&ua={ua}&pub_id={pub_id}&sub_pub_id={sub_pub_id}&sessionKey={sessionKey}
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
            pSetLoading(false);
            showError(apiErrorMessage(err, data, "3"));
            return;
          }

          // Successful PIN → return same Propeller ${SUBID} as visitor_id, then portal
          firePropellerPostback(function () {
            apiCall("/checkstatus", {
              cid: API.cid,
              msisdn: msisdn
            }, function () {
              goToPortal();
            });
          });
        });
      });
    });
  }

  /* reload on back/forward cache restore, like the original */
  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
