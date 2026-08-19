(function () {
  "use strict";

  /**
   * Iraq 3-Operator — Z Game + PropellerAds
   *
   * Korek    (cid=3022) portal 326 — IQD 300/day — unsub 0 → 2115   — PIN 4
   *   Antifraud: Evina via digitalapicalls.com (servicename=KnowYourCountry, merchantname=windowtechnologies)
   *
   * Zain     (cid=3070) portal 917 — IQD 400/day — unsub 94 → 4089  — PIN 5
   *   Antifraud: apicalling.com offId=2369 (page=2 PIN only)
   *
   * Asiacell (cid=3069) portal 915 — IQD 360/day — unsub 0 → 2348   — PIN 4
   *   Antifraud: apicalling.com offId=2367 (page=1 MSISDN + page=2 PIN)
   *
   * PropellerAds postback:
   *   https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id={clickid}&payout={payout}
   */

  var msisdnFormat = /^7[0-9]{9}$/;
  var COUNTRY = "964";
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    korek: {
      key: "korek",
      cid: "3022",
      portalCid: "326",
      name: "Korek",
      price: "300",
      pinLen: 4,
      unsub: "0",
      shortCode: "2115",
      payout: "0.25",
      afType: "korek",
      footerEn: "Z Game — Korek IQ: IQD 300/day. To cancel, send 0 to 2115.",
      footerAr: "Z Game — كورك: 300 دينار/يوم. للإلغاء أرسل 0 إلى 2115.",
      footerKu: "Z Game — کۆرەک: 300 دینار/ڕۆژ. بۆ هەڵوەشاندنەوە 0 بنێرە بۆ 2115."
    },
    zain: {
      key: "zain",
      cid: "3070",
      portalCid: "917",
      name: "Zain",
      price: "400",
      pinLen: 5,
      unsub: "94",
      shortCode: "4089",
      payout: "0.25",
      afType: "zain",
      footerEn: "Z Game — Zain IQ: IQD 400/day. To cancel, send 94 to 4089.",
      footerAr: "Z Game — زين: 400 دينار/يوم. للإلغاء أرسل 94 إلى 4089.",
      footerKu: "Z Game — زەین: 400 دینار/ڕۆژ. بۆ هەڵوەشاندنەوە 94 بنێرە بۆ 4089."
    },
    asiacell: {
      key: "asiacell",
      cid: "3069",
      portalCid: "915",
      name: "Asiacell",
      price: "360",
      pinLen: 4,
      unsub: "0",
      shortCode: "2348",
      payout: "0.25",
      afType: "asiacell",
      footerEn: "Z Game — Asiacell IQ: IQD 360/day. To cancel, send 0 to 2348.",
      footerAr: "Z Game — آسياسيل: 360 دينار/يوم. للإلغاء أرسل 0 إلى 2348.",
      footerKu: "Z Game — ئاسیاسێل: 360 دینار/ڕۆژ. بۆ هەڵوەشاندنەوە 0 بنێرە بۆ 2348."
    }
  };

  var FOOTER_ALL_EN = "Z Game — Korek: IQD 300/day (unsub: 0 to 2115). Zain: IQD 400/day (unsub: 94 to 4089). Asiacell: IQD 360/day (unsub: 0 to 2348).";
  var FOOTER_ALL_AR = "Z Game — كورك: 300 دينار/يوم (إلغاء: 0 إلى 2115). زين: 400 دينار/يوم (إلغاء: 94 إلى 4089). آسياسيل: 360 دينار/يوم (إلغاء: 0 إلى 2348).";
  var FOOTER_ALL_KU = "Z Game — کۆرەک: 300 دینار/ڕۆژ (هەڵوەشاندنەوە: 0 بۆ 2115). زەین: 400 دینار/ڕۆژ (هەڵوەشاندنەوە: 94 بۆ 4089). ئاسیاسێل: 360 دینار/ڕۆژ (هەڵوەشاندنەوە: 0 بۆ 2348).";

  var PROPELLER = {
    aid: "3898869",
    pid: "",
    tid: "154120"
  };

  /* ---- Storage helpers ---- */
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
    return digits.slice(0, 10);
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
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "326");
  }

  /* ---- Antifraud integrations ---- */

  /* Korek Evina (digitalapicalls.com) — runs on PIN page only */
  function korekGenerateValue() {
    return "1001-" + Math.floor(Math.random() * Date.now()) + "-" + Math.floor(Math.random() * Date.now());
  }
  function korekSecondsEpoch() {
    return Math.floor(Date.now() / 1000);
  }

  function runKorekAntifraud(cb) {
    var ti = korekGenerateValue();
    var ts = korekSecondsEpoch();
    document.getElementById("tiParameter").value = ti;
    document.getElementById("tsParameter").value = ts;
    persist("af_ti", ti);
    persist("af_ts", String(ts));

    var params = new URLSearchParams({
      ti: ti,
      ts: String(ts),
      te: "#confirm_btn",
      servicename: "KnowYourCountry",
      merchantname: "windowtechnologies",
      type: "pin"
    });
    var url = "https://www.digitalapicalls.com/antifraud/Iraq-Korek/Evina?action=script&" + params.toString();

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.s) {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.id = "korek_response";
          script.appendChild(document.createTextNode(data.s));
          document.head.appendChild(script);

          var tag = document.createElement("script");
          tag.type = "text/javascript";
          tag.appendChild(document.createTextNode("var event = new Event('DCBProtectRun');\ndocument.dispatchEvent(event);"));
          document.head.appendChild(tag);
        }
        if (typeof cb === "function") cb(ti, ts);
      })
      .catch(function () {
        if (typeof cb === "function") cb(ti, ts);
      });
  }

  /* Zain / Asiacell antifraud (apicalling.com/gulfpay/getAfScript) */
  function runGulfpayAntifraud(offId, page, buttonId, msisdn, cb) {
    var ip = track("user_ip") || "";
    var headerObj = {};
    try {
      headerObj = {
        "User-Agent": navigator.userAgent || "",
        "Accept-Language": navigator.language || ""
      };
    } catch (e) {}
    var headerB64 = "";
    try { headerB64 = btoa(JSON.stringify(headerObj)); } catch (e) { headerB64 = ""; }

    var params = new URLSearchParams({
      offId: offId,
      msisdn: msisdn || "",
      page: String(page),
      header: headerB64,
      ip: ip,
      buttonid: buttonId
    });
    var url = "http://apicalling.com/gulfpay/getAfScript?" + params.toString();

    if (useProxy) {
      url = "af-proxy.php?url=" + encodeURIComponent(url);
    }

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ti) persist("af_ti", data.ti);
        if (data && data.ts) persist("af_ts", data.ts);

        if (data && data.script) {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.appendChild(document.createTextNode(data.script));
          document.head.appendChild(script);
        }

        if (typeof cb === "function") cb(data);
      })
      .catch(function () {
        if (typeof cb === "function") cb(null);
      });
  }

  /* ---- PropellerAds Postback ---- */
  function firePostback(done) {
    var clickId = getVisitorId();
    var once = false;
    function finish(ok) {
      if (once) return;
      once = true;
      if (typeof done === "function") done(ok);
    }
    if (!clickId) { finish(false); return; }

    var opKey = track("operator") || "korek";
    var op = OPERATORS[opKey] || OPERATORS.korek;
    var payout = op.payout || "0.25";

    var qs =
      "aid=" + encodeURIComponent(PROPELLER.aid) +
      "&pid=" + encodeURIComponent(PROPELLER.pid) +
      "&tid=" + encodeURIComponent(PROPELLER.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);
    var direct = "https://ad.propellerads.com/conversion.php?" + qs;
    var proxy = "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) + "&payout=" + encodeURIComponent(payout);

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

  /* ---- i18n ---- */
  var lang = "ar";
  var t = {
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy unlimited videos",
      mExample: "(example: +964 7XX XXX XXXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      opTitle: "Choose your operator",
      opKorek: "Korek",
      opZain: "Zain",
      opAsiacell: "Asiacell",
      opKorekPrice: "IQD 300 / day",
      opZainPrice: "IQD 400 / day",
      opAsiacellPrice: "IQD 360 / day",
      pinTitle4: "Enter the 4-digit PIN",
      pinTitle5: "Enter the 5-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
      footerNote: FOOTER_ALL_EN,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Iraq mobile number (10 digits starting with 7).",
        op: "Please choose an operator",
        p4: "Please enter the 4-digit PIN",
        p5: "Please enter the 5-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP.",
        phone: "Please enter your number first."
      }
    },
    ar: {
      headerTitle: "شاهد الآن",
      pnTitle: "يرجى إدخال رقم هاتفك للاستمتاع بمقاطع فيديو غير محدودة",
      mExample: "(مثال: +964 7XX XXX XXXX)",
      mBtn: "اشترك",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      opTitle: "اختر المشغّل",
      opKorek: "كورك",
      opZain: "زين",
      opAsiacell: "آسياسيل",
      opKorekPrice: "300 دينار / يوم",
      opZainPrice: "400 دينار / يوم",
      opAsiacellPrice: "360 دينار / يوم",
      pinTitle4: "أدخل رمز PIN المكون من 4 أرقام",
      pinTitle5: "أدخل رمز PIN المكون من 5 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn: "تأكيد",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص",
      footerNote: FOOTER_ALL_AR,
      copyright: "<span class=\"rtl\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف عراقي صحيح (10 أرقام يبدأ بـ 7).",
        op: "يرجى اختيار المشغّل",
        p4: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        p5: "الرجاء إدخال رمز PIN المكون من 5 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        phone: "يرجى إدخال رقم الهاتف أولاً."
      }
    },
    ku: {
      headerTitle: "ئێستا تەماشا بکە",
      pnTitle: "تکایە ژمارەی مۆبایلت بنووسە بۆ چاوبکردنی ڤیدیۆ بەبێ سنوور",
      mExample: "(نموونە: +964 7XX XXX XXXX)",
      mBtn: "بەشداربە",
      mSecure: "زانیاریەکانت پارێزراون و شفرکراون",
      opTitle: "ئۆپەراتۆرەکەت هەڵبژێرە",
      opKorek: "کۆرەک",
      opZain: "زەین",
      opAsiacell: "ئاسیاسێل",
      opKorekPrice: "300 دینار / ڕۆژ",
      opZainPrice: "400 دینار / ڕۆژ",
      opAsiacellPrice: "360 دینار / ڕۆژ",
      pinTitle4: "کۆدی PIN ی 4 ژمارەیی بنووسە",
      pinTitle5: "کۆدی PIN ی 5 ژمارەیی بنووسە",
      pinExample: "(نموونە: 1234)",
      pinBtn: "دڵنیابوونەوە",
      pinSecure: "کۆدی تاقیکردنەوەکەت لەگەڵ کەس نەبەشکە",
      footerNote: FOOTER_ALL_KU,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;هەموو مافەکان پارێزراون",
      errmsg: {
        m: "تکایە ژمارەی مۆبایل بنووسە",
        o: "تکایە ژمارەیەکی مۆبایلی عێراقی دروست بنووسە (10 ژمارە بە 7 دەست پێدەکات).",
        op: "تکایە ئۆپەراتۆر هەڵبژێرە",
        p4: "تکایە کۆدی PIN ی 4 ژمارەیی بنووسە",
        p5: "تکایە کۆدی PIN ی 5 ژمارەیی بنووسە",
        "1001": "نەتوانرا PIN بنێردرێت. دووبارە هەوڵبدەرەوە.",
        "1004": "PIN هەڵەیە یان بەسەرچووە.",
        x: "هەڵەی پەیوەندی. دووبارە هەوڵبدەرەوە.",
        php: "PHP چالاک نییە.",
        phone: "تکایە ژمارە بنووسە سەرەتا."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || t.en.errmsg[key] || "";
  }

  function applyLang() {
    var dict = t[lang] || t.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === "en") ? "ltr" : "rtl";
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

  /* ---- Init ---- */
  initTracking();
  getUserIp(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en" || qLang === "ku") lang = qLang;
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

  /* ---- index.html: MSISDN entry with progress bar animation ---- */
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
      if (box) { box.style.display = "block"; box.classList.add("resetloadbox"); }
    }, 1500);
  }

  /* Asiacell page=1 antifraud on MSISDN page */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= 10) {
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

  /* ---- operator.html: choose operator + sendpin ---- */
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

          function doSendPin() {
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
              var afTi = track("af_ti");
              if (afTi) params.sessionKey = afTi;

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
          }

          if (op.afType === "asiacell") {
            runGulfpayAntifraud("2367", 1, "confirm_btn", msisdn, function () {
              doSendPin();
            });
          } else {
            doSendPin();
          }
        });
      });
    }
  }

  /* ---- pin.html: PIN verify with antifraud ---- */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin") || document.querySelector(".btnpn");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
    } else {
      var pinLen = op.pinLen || 4;
      pInput.maxLength = pinLen;
      pInput.placeholder = pinLen === 5 ? "*****" : "****";

      var pinTitleEl = document.getElementById("pinTitle");
      if (pinTitleEl) {
        var pinKey = pinLen === 5 ? "pinTitle5" : "pinTitle4";
        pinTitleEl.textContent = (t[lang] && t[lang][pinKey]) || t.en[pinKey];
        pinTitleEl.setAttribute("data-i18n", pinKey);
      }

      var foot = document.getElementById("opFooterNote");
      if (foot) {
        var fKey = lang === "ku" ? "footerKu" : (lang === "ar" ? "footerAr" : "footerEn");
        foot.textContent = op[fKey] || op.footerEn;
      }

      /* Run antifraud on PIN page load */
      if (op.afType === "korek") {
        runKorekAntifraud(function (ti, ts) {
          persist("af_ti", ti);
          persist("af_ts", String(ts));
        });
      } else if (op.afType === "zain") {
        var msForAf = track("msisdn") || track("phone") || "";
        runGulfpayAntifraud("2369", 2, "confirm_btn", msForAf, function () {});
      } else if (op.afType === "asiacell") {
        var msForAf2 = track("msisdn") || track("phone") || "";
        runGulfpayAntifraud("2367", 2, "confirm_btn", msForAf2, function () {});
      }
    }

    pInput.addEventListener("input", function () {
      var pl = (op && op.pinLen) || 4;
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, pl);
      showError("");
      if (pInput.value.length >= pl) {
        pinBox.classList.remove("pulseflash");
        btnpin.classList.add("pulseflash");
      } else {
        btnpin.classList.remove("pulseflash");
        if (pInput.value.length === 0) pinBox.classList.add("pulseflash");
      }
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!op) { showError(errText("op")); return; }
      var pl = op.pinLen || 4;
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== pl) { showError(errText("p" + pl)); return; }

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

        /* Pass antifraud ti/ts to verifypin */
        var afTi = track("af_ti");
        var afTs = track("af_ts");
        if (afTi) params.sessionKey = afTi;
        if (afTs) params.ts = afTs;

        var sk = track("sessionKey");
        if (sk && !afTi) params.sessionKey = sk;

        callApi("verifypin", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(btnpin, false);
              showError(errText(errCode(resp)) || errText("1004"));
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalFor(op));
            persist("pb_payout", op.payout || "0.25");
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
