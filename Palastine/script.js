(function () {
  "use strict";

  // Palestine (+970). Local mobile: 9 digits starting with 5 (e.g. 59xxxxxxx / 56xxxxxxx)
  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "970";

  var ADPOKE = "http://64.225.87.221/adpoke/cnt/inapp";
  // Always use same-origin proxy (adpoke-api.php). Direct browser calls to Adpoke
  // fail CORS; plain `python3 -m http.server` cannot run PHP — use `python3 serve.py`.
  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    ooredoo: {
      key: "ooredoo",
      adid: "231",
      cmpid: "466",
      name: "Ooredoo",
      payout: "1.5",
      footerEn: "Ooredoo PS — NIS 1.5 per day. To cancel, send SMS NS to 7902 (toll-free).",
      footerAr: "Ooredoo PS — 1.5 شيكل يومياً. للإلغاء أرسل NS إلى 7902."
    },
    jawwal: {
      key: "jawwal",
      adid: "231",
      cmpid: "465",
      name: "Jawwal",
      payout: "1.16",
      footerEn: "Jawwal PS — NIS 1.16 per day. To cancel, send SMS SP to 37637 (toll-free).",
      footerAr: "Jawwal PS — 1.16 شيكل يومياً. للإلغاء أرسل SP إلى 37637."
    }
  };

  // PropellerAds — visitor_id = token (= clickid / ${SUBID})
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
    // token === clickid === Propeller ${SUBID}
    var token =
      params.get("token") ||
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("clickId") ||
      "";
    if (token && token !== "${SUBID}" && String(token).toLowerCase() !== "clickid") {
      persist("token", token);
    }
    var zone = params.get("zoneid") || params.get("zone_id") || "";
    if (zone && zone !== "{zone_id}" && zone !== "{zoneid}") persist("zoneid", zone);
  }

  function getToken() {
    var existing = track("token");
    if (existing) return existing;
    // Adpoke requires token; without Propeller clickid use a local test id
    var fallback =
      "local_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10);
    persist("token", fallback);
    return fallback;
  }

  function buildApiUrl(path, qs) {
    if (useProxy) {
      return "adpoke-api.php?path=" + encodeURIComponent(path.replace(/^\//, "")) + "&" + qs;
    }
    return ADPOKE + path + "?" + qs;
  }

  function portalUrl(adid, cmpid, token, msisdn) {
    var qs =
      "adid=" + encodeURIComponent(adid) +
      "&cmpid=" + encodeURIComponent(cmpid) +
      "&token=" + encodeURIComponent(token) +
      "&msisdn=" + encodeURIComponent(msisdn);
    if (useProxy) return "adpoke-api.php?path=portal&" + qs;
    return ADPOKE + "/portal?" + qs;
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
        // Upstream Adpoke sometimes returns a tiny HTML "Error" page (e.g. missing token)
        if (/^\s*<!DOCTYPE html/i.test(text) || /^\s*<html/i.test(text)) {
          if (/<body>\s*Error\s*<\/body>/i.test(text) || />\s*Error\s*</i.test(text)) {
            done(null, { response: "FAIL", msg: "API Error", errorMessage: "Request rejected by API (check token / msisdn)." });
            return;
          }
          // Plain http.server 404 page when PHP/proxy is not running
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
    var r = String(data.response || data.msg || "").toUpperCase();
    if (r.indexOf("SUCCESS") !== -1) return true;
    if (data.status === true || String(data.status).toLowerCase() === "true") return true;
    return false;
  }

  function firePropellerPostback(done) {
    var token = getToken();
    var finish = typeof done === "function" ? done : function () {};
    if (!token) { finish(false); return; }

    var opKey = track("operator") || "ooredoo";
    var op = OPERATORS[opKey] || OPERATORS.ooredoo;
    var payout = op.payout || POSTBACK.payout;

    var qs = "visitor_id=" + encodeURIComponent(token) + "&payout=" + encodeURIComponent(payout);
    var direct =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(token) +
      "&payout=" + encodeURIComponent(payout);

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

  initTracking();

  /* i18n */
  var t = {
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy unlimited videos",
      mExample: "(example: +970 5X XXX XXXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      opTitle: "Choose your operator",
      opOoredoo: "Ooredoo",
      opJawwal: "Jawwal",
      opOoredooPrice: "NIS 1.5 / day",
      opJawwalPrice: "NIS 1.16 / day",
      pinTitle: "Enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
      footerNote: "Gamers Paradise — Ooredoo PS: NIS 1.5/day (unsubscribe: SMS NS to 7902). Jawwal PS: NIS 1.16/day (unsubscribe: SMS SP to 37637).",
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Palestine mobile number (9 digits starting with 5).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
        3: "Invalid PIN Code",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP.",
        proxy: "API proxy not running. Locally use: python3 serve.py (not http.server).",
        send: "PIN could not be sent. Please try again.",
        phone: "Please enter your number first."
      }
    },
    ar: {
      headerTitle: "شاهد الآن",
      pnTitle: "يرجى إدخال رقم هاتفك للاستمتاع بمقاطع فيديو غير محدودة",
      mExample: "(مثال: +970 5X XXX XXXX)",
      mBtn: "اشترك",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      opTitle: "اختر المشغّل",
      opOoredoo: "أوريدو",
      opJawwal: "جوال",
      opOoredooPrice: "1.5 شيكل / يوم",
      opJawwalPrice: "1.16 شيكل / يوم",
      pinTitle: "أدخل رمز PIN المكون من 4 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn: "تأكيد",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص",
      footerNote: "Gamers Paradise — أوريدو: 1.5 شيكل يومياً (إلغاء: NS إلى 7902). جوال: 1.16 شيكل يومياً (إلغاء: SP إلى 37637).",
      copyright: "<span class=\"rtl\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف فلسطيني صحيح (9 أرقام يبدأ بـ 5).",
        op: "يرجى اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        3: "الرقم السري غير صحيح",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        proxy: "بروكسي API غير متوفر.",
        send: "تعذر إرسال PIN. حاول مرة أخرى.",
        phone: "يرجى إدخال رقم الهاتف أولاً."
      }
    }
  };

  function getLang() {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get("lang");
    if (urlLang && t[urlLang]) return urlLang;
    try { return localStorage.getItem("lang") || "ar"; } catch (e) { return "ar"; }
  }

  function applyLang(lang) {
    if (!t[lang]) lang = "ar";
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
    if (err && err.message === "proxy_missing") return errText("proxy");
    if (err) return errText("x");
    if (data && data.errorMessage) return data.errorMessage;
    if (data && data.MessageEn) return data.MessageEn;
    if (data && data.err && data.err.errorMessage) return data.err.errorMessage;
    return (data && data.msg) || errText(fallbackKey);
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

  /* Intro animation on index */
  if (document.getElementById("myBar") && document.getElementById("mbox")) {
    var bar = document.getElementById("myBar");
    var w = 1;
    var timer = setInterval(function () {
      if (w >= 100) clearInterval(timer);
      else { w++; bar.style.width = w + "%"; }
    }, 10);
    setTimeout(function () {
      var bg = document.getElementById("screenbg");
      if (bg) bg.style.opacity = "1";
    }, 800);
    setTimeout(function () {
      var box = document.getElementById("loadbox");
      if (box) {
        box.style.display = "block";
        box.classList.add("resetloadbox");
      }
    }, 1500);
  }

  /* Mobile page */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var checkNum = 9;
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= checkNum) {
        mobileBox.classList.remove("pulseflash");
        mobileBox.classList.add("pulseflash-pause");
        btnpn.classList.add("pulseflash");
      } else if (len > 0) {
        mobileBox.classList.remove("pulseflash");
        mobileBox.classList.add("pulseflash-pause");
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
      persist("phone", fullMsisdn(value));
      window.location.href = "operator.html?lang=" + currentLang;
    });
  }

  /* Operator page */
  var obox = document.getElementById("obox");
  if (obox) {
    if (!track("phone")) {
      window.location.href = "index.html?lang=" + currentLang;
    } else {
      document.querySelectorAll(".opbtn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-operator");
          var op = OPERATORS[key];
          if (!op) { showError(errText("op")); return; }

          var msisdn = track("phone");
          var token = getToken();
          showError("");
          document.querySelectorAll(".opbtn").forEach(function (b) { b.classList.add("disabled_btn"); });
          var opLoad = document.getElementById("opLoad");
          if (opLoad) opLoad.classList.add("show");

          persist("operator", key);
          persist("cmpid", op.cmpid);
          persist("adid", op.adid);

          // Send OTP
          apiCall("/sendotp", {
            adid: op.adid,
            cmpid: op.cmpid,
            token: token,
            msisdn: msisdn
          }, function (err, data) {
            if (err || !isApiSuccess(data)) {
              document.querySelectorAll(".opbtn").forEach(function (b) { b.classList.remove("disabled_btn"); });
              if (opLoad) opLoad.classList.remove("show");
              showError(apiErrorMessage(err, data, "send"));
              return;
            }
            window.location.href = "pin.html?lang=" + currentLang;
          });
        });
      });
    }
  }

  /* PIN page */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var checkPin = 4;
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("phone") || !op) {
      window.location.href = "index.html?lang=" + currentLang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = currentLang === "ar" ? op.footerAr : op.footerEn;
    }

    pInput.addEventListener("input", function () {
      pInput.value = pInput.value.replace(/\D/g, "").slice(0, checkPin);
      var len = pInput.value.length;
      showError("");
      if (len >= checkPin) {
        pinBox.classList.remove("pulseflash");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.add("pulseflash");
      } else if (len > 0) {
        pinBox.classList.remove("pulseflash");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      } else {
        pinBox.classList.add("pulseflash");
        pinBox.classList.remove("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      }
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = pInput.value.trim();
      if (pin.length !== checkPin) { showError(errText("p")); return; }
      showError("");
      setLoading(btnpin, true);

      var msisdn = track("phone");
      var token = getToken();
      var adid = track("adid") || (op && op.adid) || "231";
      var cmpid = track("cmpid") || (op && op.cmpid) || "";

      apiCall("/validateotp", {
        adid: adid,
        cmpid: cmpid,
        token: token,
        msisdn: msisdn,
        param1: pin
      }, function (err, data) {
        if (err || !isApiSuccess(data)) {
          setLoading(btnpin, false);
          showError(apiErrorMessage(err, data, "3"));
          return;
        }

        // Propeller postback with same token as visitor_id
        firePropellerPostback(function () {
          apiCall("/statuscheck", {
            adid: adid,
            cmpid: cmpid,
            token: token,
            msisdn: msisdn
          }, function () {
            window.location.href = portalUrl(adid, cmpid, token, msisdn);
          });
        });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
