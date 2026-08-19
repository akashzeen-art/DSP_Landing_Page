(function () {
  "use strict";

  /**
   * Kuwait Ooredoo — Premium Movie (cid=3084) portal 855
   * 800 fils/week — unsub: UNSUB 5 → 50908 — PIN 4
   * PropellerAds: visitor_id=${SUBID} payout=0.8
   */

  var msisdnFormat = /^[569][0-9]{7}$/;
  var COUNTRY = "965";
  var PIN_LENGTH = 4;
  var CID = "3084";
  var PORTAL_CID = "855";
  var PAYOUT = "0.8";
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

  function saveZeenSession(resp) {
    if (!resp) return;
    var sk = resp.sessionKey || resp.ti || resp.TI || "";
    if (sk) {
      persist("sessionKey", sk);
      persist("zeen_ti", sk);
      persist("cs_tid", sk);
      try { window.tid = sk; } catch (e) {}
      try { if (window.ClkstrmAF && window.ClkstrmAF.setTid) window.ClkstrmAF.setTid(sk); } catch (e2) {}
      var tidEl = document.getElementById("tid");
      if (tidEl) tidEl.value = sk;
      var reqEl = document.getElementById("req_id");
      if (reqEl) reqEl.value = sk;
    }
    var af = resp.AFScript || resp.afscript || resp.script || "";
    if (af && typeof af === "string") persist("af_script", af);
  }

  function injectSavedAf() {
    var code = track("af_script");
    if (!code) return;
    try {
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.appendChild(document.createTextNode(code));
      document.head.appendChild(script);
    } catch (e) {}
  }

  function readClkstrmTid() {
    return track("sessionKey") || track("zeen_ti") || track("cs_tid") || "";
  }

  function patchEmptyClkstrmTid() {
    if (window.__clkstrmTidPatch) return;
    window.__clkstrmTidPatch = true;
    function fillTid(url) {
      if (!url || url.indexOf("clkstrm.com") === -1 || url.indexOf("check-pin") === -1) return url;
      var tid = readClkstrmTid();
      if (tid) {
        if (/data%5Btid%5D=/.test(url)) return url.replace(/data%5Btid%5D=[^&]*/, "data%5Btid%5D=" + encodeURIComponent(tid));
        if (/data\[tid\]=/.test(url)) return url.replace(/data\[tid\]=[^&]*/, "data[tid]=" + encodeURIComponent(tid));
      }
      if (/data(?:%5B|\[)tid(?:%5D|\])=(?:&|$)/.test(url) || /data%5Btid%5D=$/.test(url) || /data\[tid\]=$/.test(url)) {
        return null;
      }
      return url;
    }
    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.indexOf("clkstrm.com") !== -1 && url.indexOf("check-pin") !== -1) {
          var next = fillTid(url);
          if (!next) {
            return Promise.resolve(new Response(JSON.stringify({ status: "skipped", error: "empty tid" }), { status: 200 }));
          }
          if (typeof input === "string") input = next;
        }
        return origFetch.call(this, input, init);
      };
    }
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      if (typeof url === "string" && url.indexOf("clkstrm.com") !== -1 && url.indexOf("check-pin") !== -1) {
        var next = fillTid(url);
        if (!next) url = "data:application/json,{\"status\":\"skipped\"}";
        else url = next;
      }
      return origOpen.apply(this, arguments);
    };
  }

  function zeenBaseParams(ip) {
    var params = {
      cid: CID,
      msisdn: track("msisdn") || track("phone") || "",
      click_id: getClickId(),
      pub_id: track("pub_id") || "propeller",
      sub_pub_id: track("sub_pub_id") || "0",
      user_ip: ip || track("user_ip") || "",
      ua: navigator.userAgent || ""
    };
    var sk = track("sessionKey") || track("zeen_ti");
    if (sk) params.sessionKey = sk;
    return params;
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
      topInfo: "مجاني لمدة 24 ساعة، ثم 800 فلس أسبوعيًا (شامل ضريبة القيمة المضافة)",
      logo: "Premium Movies",
      langSwitch: "English",
      promo: "أفلام بوليوود بلا حدود",
      formTitle: "أدخل رقم هاتف أوريدو الخاص بك لتلقي رمز التحقق (OTP).",
      phonePlaceholder: "أدخل رقمك",
      subscribeBtn: "اشترك عبر OTP",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN المكون من 4 أرقام",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص.",
      exitBtn: "خروج",
      f1: "أفلام بوليوود بلا حدود",
      f2: "بث فيديو عالي الدقة",
      f3: "أحدث الإصدارات والأفلام الكبيرة",
      f4: "شاهد في أي وقت وأي مكان",
      t1: "بعد الضغط على اشترك ستصلك رسالة PIN لتأكيد الاشتراك.",
      t2: "مجاني لمدة 24 ساعة ثم 800 فلس أسبوعيًا (شامل ضريبة القيمة المضافة)",
      t3: "الشروط والأحكام:",
      t4: "بالضغط على اشترك، فإنك توافق على الشروط والأحكام أدناه.",
      t5: "سيبدأ الاشتراك المدفوع تلقائيًا بعد الفترة المجانية.",
      t6: "بدون التزام. للإلغاء أرسل UNSUB 5 إلى 50908.",
      t7: "الفترة المجانية صالحة للمشتركين الجدد فقط.",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم هاتف كويتي صحيح (8 أرقام يبدأ بـ 5 أو 6 أو 9).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        phone: "يرجى إدخال رقم الهاتف أولاً."
      }
    },
    en: {
      topInfo: "Free for 24 hours, then 800 fils/week (VAT included)",
      logo: "Premium Movies",
      langSwitch: "عربي",
      promo: "Unlimited Bollywood Movies",
      formTitle: "Enter your number to receive otp",
      phonePlaceholder: "Enter your number",
      subscribeBtn: "Subscribe via OTP",
      confirmBtn: "Confirm",
      pinTitle: "Enter the 4-digit PIN",
      pinSecure: "Do not share your verification code with anyone.",
      exitBtn: "Exit",
      f1: "Unlimited Bollywood Movies",
      f2: "HD Video Streaming",
      f3: "New Releases & Blockbusters",
      f4: "Watch Anytime, Anywhere",
      t1: "After clicking Subscribe you will receive a PIN message to confirm your subscription.",
      t2: "Free for 24 hours then 800 FILS/Weekly (VAT Included)",
      t3: "TERMS AND CONDITIONS:",
      t4: "By clicking Subscribe, you agree to the below terms and conditions.",
      t5: "You will start the paid subscription after the free period automatically.",
      t6: "No commitment. Cancel anytime by sending UNSUB 5 to 50908.",
      t7: "The free trial is valid only for new subscribers.",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Kuwait mobile number (8 digits starting with 5, 6 or 9).",
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
    document.body.style.direction = lang === "en" ? "ltr" : "rtl";
    document.body.style.textAlign = lang === "en" ? "left" : "right";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (dict[key] != null) el.setAttribute("placeholder", dict[key]);
    });
    var sw = document.getElementById("langSwitch");
    if (sw) sw.setAttribute("href", "?lang=" + (lang === "ar" ? "en" : "ar"));
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg) {
    var box = document.getElementById("errBox");
    if (box) box.textContent = msg || "";
  }

  function setLoading(btn, on) {
    if (!btn) return;
    var txt = btn.querySelector(".btntxt");
    var load = btn.querySelector(".submitload");
    if (on) {
      if (load) load.classList.add("show");
      if (txt) txt.classList.add("disabled_txt");
      btn.classList.add("disabled_btn");
    } else {
      if (load) load.classList.remove("show");
      if (txt) txt.classList.remove("disabled_txt");
      btn.classList.remove("disabled_btn");
    }
  }

  initTracking();
  getUserIp(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  applyLang();

  var langSwitch = document.getElementById("langSwitch");
  if (langSwitch) {
    langSwitch.addEventListener("click", function (e) {
      e.preventDefault();
      lang = lang === "ar" ? "en" : "ar";
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
    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
    });
    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = normalizeLocal(mInput.value);
      mInput.value = value;
      if (!value) { showError(errText("m")); return; }
      if (!msisdnFormat.test(value)) { showError(errText("o")); return; }
      showError("");
      setLoading(submitBtn, true);
      var msisdn = fullMsisdn(value);
      persist("msisdn", msisdn);
      persist("phone", msisdn);

      getUserIp(function (ip) {
        persist("msisdn", msisdn);
        persist("phone", msisdn);
        var params = zeenBaseParams(ip);
        params.msisdn = msisdn;

        callApi("sendpin", params)
          .then(function (resp) {
            saveZeenSession(resp);
            if (!isOk(resp)) {
              setLoading(submitBtn, false);
              showError(errText(errCode(resp)) || errText("1001"));
              return;
            }
            try { if (window.ClkstrmAF && window.ClkstrmAF.load) window.ClkstrmAF.load(); } catch (e) {}
            window.location.href = "pin.html?lang=" + lang;
          })
          .catch(function (err) {
            setLoading(submitBtn, false);
            showError(errText((err && err.msg) || "x"));
          });
      });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    patchEmptyClkstrmTid();
    injectSavedAf();
    var sessionTid = track("sessionKey") || track("zeen_ti") || "";
    var reqEl = document.getElementById("req_id");
    var tidEl = document.getElementById("tid");
    if (reqEl) reqEl.value = sessionTid;
    if (tidEl) tidEl.value = sessionTid;
    try { if (window.ClkstrmAF && window.ClkstrmAF.setTid) window.ClkstrmAF.setTid(sessionTid); } catch (e) {}
    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    }
    var pInput = document.getElementById("pin");
    var confirmBtn = document.getElementById("confirm_btn");
    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      showError("");
    });
    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) { showError(errText("p")); return; }
      showError("");
      setLoading(confirmBtn, true);
      var sessionTid = track("sessionKey") || track("zeen_ti") || "";
      if (tidEl) tidEl.value = sessionTid;
      if (reqEl) reqEl.value = sessionTid;

      function doVerify() {
        getUserIp(function (ip) {
          var params = zeenBaseParams(ip);
          params.otp = otp;
          if (sessionTid) {
            params.sessionKey = sessionTid;
            params.ti = sessionTid;
          }

          callApi("verifypin", params)
            .then(function (resp) {
              saveZeenSession(resp);
              if (!isOk(resp)) {
                setLoading(confirmBtn, false);
                showError(errText(errCode(resp)) || errText("1004"));
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
              showError(errText((err && err.msg) || "x"));
            });
        });
      }

      var afUrl = "";
      try {
        if (sessionTid && window.ClkstrmAF && window.ClkstrmAF.checkPinUrl) {
          afUrl = window.ClkstrmAF.checkPinUrl(otp);
        }
      } catch (e) {}
      if (afUrl) {
        fetch(afUrl, { method: "GET", credentials: "omit", cache: "no-store" })
          .catch(function () {})
          .then(function () { doVerify(); });
      } else {
        doVerify();
      }
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
