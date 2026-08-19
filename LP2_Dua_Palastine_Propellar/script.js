(function () {
  "use strict";

  /**
   * Palestine Dual Operator — Z Game + PropellerAds
   * UI: flashdownloadlite
   *
   * Jawwal  (cid=3008) portal 570 — 1.16 NIS/day — unsub 0257 → 37799
   * Ooredoo (cid=3007) portal 569 — 1.5 NIS/day  — unsub 08 → 6976
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "970";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    jawwal: {
      key: "jawwal",
      cid: "3008",
      portalCid: "570",
      name: "Jawwal",
      price: "1.16",
      footerEn: "Z Game — Jawwal PS: NIS 1.16/day. To cancel, send SMS 0257 to 37799.",
      footerAr: "Z Game — جوال: 1.16 شيكل يومياً. للإلغاء أرسل 0257 إلى 37799."
    },
    ooredoo: {
      key: "ooredoo",
      cid: "3007",
      portalCid: "569",
      name: "Ooredoo",
      price: "1.5",
      footerEn: "Z Game — Ooredoo PS: NIS 1.5/day. To cancel, send SMS 08 to 6976.",
      footerAr: "Z Game — أوريدو: 1.5 شيكل يومياً. للإلغاء أرسل 08 إلى 6976."
    }
  };

  var FOOTER_BOTH_EN =
    "Z Game — Jawwal PS: NIS 1.16/day (unsubscribe: SMS 0257 to 37799). Ooredoo PS: NIS 1.5/day (unsubscribe: SMS 08 to 6976).";
  var FOOTER_BOTH_AR =
    "Z Game — جوال: 1.16 شيكل يومياً (إلغاء: 0257 إلى 37799). أوريدو: 1.5 شيكل يومياً (إلغاء: 08 إلى 6976).";

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
      params.get("clickId") ||
      params.get("subid") ||
      params.get("token") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    ["pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"].forEach(function (k) {
      var v = params.get(k);
      if (v && String(v).indexOf("{") === -1) persist(k, v);
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
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "570");
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

    var opKey = track("operator") || "jawwal";
    var op = OPERATORS[opKey] || OPERATORS.jawwal;
    var payout = op.price || "1.16";

    var direct =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);
    var proxy =
      "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);

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
      pnTitle: "Enter your mobile number to start downloading",
      qHint: "Enter your correct mobile number:",
      mBtn1: "Continue",
      mBtn2Pre: "with",
      mSecure: "Your personal data is protected and encrypted",
      mPlaceholder: "X XXXX XXXX",
      opTitle: "Choose your operator",
      opOoredoo: "Ooredoo",
      opJawwal: "Jawwal",
      opOoredooPrice: "NIS 1.5 / day",
      opJawwalPrice: "NIS 1.16 / day",
      pinTitle: "Enter PIN number for verification",
      pinSubtitle: "Please do not share PIN with anyone.",
      pinBtn1: "Confirm",
      pinBtn2Pre: "with",
      pinSecure: "To safeguard your account, do not disclose your verification code to others!",
      pinPlaceholder: " PIN number ",
      footerNote: FOOTER_BOTH_EN,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Palestine mobile number (9 digits starting with 5).",
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
      pnTitle: "أدخل رقم هاتفك المحمول لبدء التنزيل",
      qHint: "أدخل أرقام هاتفك المحمول الصحيحة:",
      mBtn1: "يكمل",
      mBtn2Pre: "مع رمز",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      mPlaceholder: "X XXXX XXXX",
      opTitle: "اختر المشغّل",
      opOoredoo: "أوريدو",
      opJawwal: "جوال",
      opOoredooPrice: "1.5 شيكل / يوم",
      opJawwalPrice: "1.16 شيكل / يوم",
      pinTitle: "أدخل رمز PIN للتحقق",
      pinSubtitle: "يرجى عدم مشاركة رمز PIN مع أي شخص.",
      pinBtn1: "تأكيد",
      pinBtn2Pre: "مع رمز",
      pinSecure: "لحماية حسابك، لا تفصح عن رمز التحقق للآخرين!",
      pinPlaceholder: " PIN number ",
      footerNote: FOOTER_BOTH_AR,
      copyright: "<span class=\"ltr\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف فلسطيني صحيح (9 أرقام يبدأ بـ 5).",
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
    var arRadio = document.getElementById("langAr");
    var enRadio = document.getElementById("langEn");
    if (arRadio) arRadio.checked = lang === "ar";
    if (enRadio) enRadio.checked = lang === "en";

    var m = document.getElementById("m");
    if (m && dict.mPlaceholder) m.setAttribute("placeholder", dict.mPlaceholder);
    var p = document.getElementById("p");
    if (p && dict.pinPlaceholder) p.setAttribute("placeholder", dict.pinPlaceholder);

    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg) {
    var box = document.querySelector(".errorBox");
    if (box) box.textContent = msg || "";
  }

  function setLoading(wrap, on) {
    if (!wrap) return;
    var btn = wrap.querySelector(".button");
    var load = wrap.querySelector(".loadbtn");
    if (btn) btn.style.display = on ? "none" : "inline-block";
    if (load) load.style.display = on ? "block" : "none";
    if (on) wrap.classList.remove("pulseflash");
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

  var q = document.querySelector(".icnquestion");
  var qwrap = document.querySelector(".qwrapper");
  if (q && qwrap) {
    q.addEventListener("click", function (e) {
      e.stopPropagation();
      qwrap.style.display = qwrap.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", function (e) {
      if (!qwrap.contains(e.target) && e.target !== q) qwrap.style.display = "none";
    });
  }

  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var btnpn = document.querySelector(".btnpn");
    var checkNum = 9;

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
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
      persist("msisdn", msisdn);
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
          document.querySelectorAll(".opbtn").forEach(function (b) {
            b.classList.add("disabled_btn");
          });
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
                  document.querySelectorAll(".opbtn").forEach(function (b) {
                    b.classList.remove("disabled_btn");
                  });
                  if (opLoad) opLoad.classList.remove("show");
                  showError(errText(errCode(resp)) || errText("1001"));
                  return;
                }
                window.location.href = "pin.html?lang=" + lang;
              })
              .catch(function (err) {
                document.querySelectorAll(".opbtn").forEach(function (b) {
                  b.classList.remove("disabled_btn");
                });
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
    var btnpin = document.querySelector(".btnpin");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = lang === "ar" ? op.footerAr : op.footerEn;
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      var len = pInput.value.length;
      showError("");
      if (len >= PIN_LENGTH) {
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
