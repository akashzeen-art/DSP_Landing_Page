(function () {
  "use strict";

  /**
   * Iraq Propeller LP — Asiacell / Korek / Zain + antifraud
   *
   * Campaign:
   *   https://click2funbox.com/iqprop3op/?clickid=${SUBID}&zoneid={zone_id}
   *
   * Antifraud placement:
   *   Asiacell Gamifya     → MSISDN page (Page=1) + OTP page (Page=2)
   *   Korek Gamifya        → OTP page only (ti/ts/te)
   *   Zain Global Recipes  → OTP page only (Shield uniqid + source)
   */

  var COUNTRY = "964";
  var msisdnFormat = /^7[0-9]{9}$/; // Iraq local 10 digits starting with 7

  var OPERATORS = {
    asiacell: {
      key: "asiacell",
      name: "Asiacell",
      provider: "iqag",
      cid: "200",
      pinLength: 4,
      service: "Gamifya"
    },
    korek: {
      key: "korek",
      name: "Korek",
      provider: "iqkg",
      cid: "199",
      pinLength: 4,
      service: "Gamifya"
    },
    zain: {
      key: "zain",
      name: "Zain",
      provider: "iqzain",
      cid: "490",
      pinLength: 5,
      service: "Global Recipes"
    }
  };

  var POSTBACK = {
    url: "https://ad.propellerads.com/conversion.php",
    aid: "3898869",
    pid: "",
    tid: "154120",
    payout: "1"
  };

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
    try { return localStorage.getItem(k) || ""; } catch (e2) { return ""; }
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
      params.get("clickId") ||
      params.get("token") ||
      "";
    if (clickId && clickId !== "${SUBID}" && String(clickId).toLowerCase() !== "clickid") {
      persist("click_id", clickId);
    }
    var zone = params.get("zoneid") || params.get("zone_id") || "";
    if (zone && zone !== "{zone_id}" && zone !== "{zoneid}") persist("zoneid", zone);

    // Carry OTP URL params if present
    ["operator", "msisdn", "MSISDN", "uniqid", "antifraudUniqId", "mcpUniqId"].forEach(function (k) {
      var v = params.get(k);
      if (v) {
        if (k === "MSISDN" || k === "msisdn") persist("phone", normalizeLocal(v));
        else if (k === "antifraudUniqId") persist("asiacell_af_id", v);
        else if (k === "mcpUniqId" || k === "uniqid") persist("mcp_uniqid", v);
        else if (k === "operator") persist("operator", String(v).toLowerCase());
      }
    });
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
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      persist("user_ip", ip || "0.0.0.0");
      cb(ip || "0.0.0.0");
    }
    var timer = setTimeout(function () { finish("0.0.0.0"); }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        finish((d && d.ip) || "0.0.0.0");
      })
      .catch(function () {
        clearTimeout(timer);
        finish("0.0.0.0");
      });
  }

  function injectScript(source) {
    if (!source) return;
    try {
      var s = document.createElement("script");
      s.type = "text/javascript";
      s.text = source;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  function classifyText(text, status) {
    if (status === 404) return "proxy_missing";
    if (/^\s*<\?php/i.test(text)) return "php_not_running";
    if (/^\s*<!DOCTYPE html/i.test(text) || /^\s*<html/i.test(text)) return "proxy_missing";
    try { JSON.parse(text); return "ok"; } catch (e) { return "bad_json"; }
  }

  function fetchJson(url, done) {
    fetch(url, { method: "GET", cache: "no-store" })
      .then(function (r) {
        return r.text().then(function (text) {
          var kind = classifyText(text, r.status);
          if (kind !== "ok") {
            done(new Error(kind));
            return;
          }
          try { done(null, JSON.parse(text)); }
          catch (e) { done(new Error("bad_json")); }
        });
      })
      .catch(function (err) { done(err || new Error("network")); });
  }

  function cmpUrl(provider, path, params) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== "" && params[k] != null; })
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");
    if (useProxy) {
      return "iq-api.php?provider=" + encodeURIComponent(provider) +
        "&path=" + encodeURIComponent(path) + "&" + qs;
    }
    return qs;
  }

  function apiCall(provider, path, params, done) {
    fetchJson(cmpUrl(provider, path, params), done);
  }

  function isOk(data) {
    if (!data) return false;
    var r = String(data.response || data.msg || "").toUpperCase();
    return r.indexOf("SUCCESS") !== -1;
  }

  function genTi() {
    var s = Date.now().toString(36) + Math.random().toString(36).slice(2);
    return s.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  }

  function genTs() {
    return String(Math.floor(Date.now() / 1000));
  }

  /* ---------- Asiacell AF Page=1 (MSISDN page) ---------- */
  function loadAsiacellAfPage1(done) {
    var url =
      "asiacell-af.php?page=1&clickid=" + encodeURIComponent(getClickId());
    fetchJson(url, function (err, data) {
      if (err || !data) {
        if (done) done(err || new Error("af_fail"));
        return;
      }
      if (data.script) injectScript(data.script);
      if (data.antifrauduniqid) persist("asiacell_af_id", data.antifrauduniqid);
      if (data.mcpuniqid) persist("mcp_uniqid", data.mcpuniqid);
      if (done) done(null, data);
    });
  }

  /* ---------- Asiacell AF Page=2 (OTP) ---------- */
  function loadAsiacellAfPage2(msisdn, done) {
    var url =
      "asiacell-af.php?page=2&clickid=" + encodeURIComponent(getClickId()) +
      "&msisdn=" + encodeURIComponent(msisdn);
    fetchJson(url, function (err, data) {
      if (err || !data) {
        if (done) done(err || new Error("af_fail"));
        return;
      }
      if (data.script) injectScript(data.script);
      if (data.antifrauduniqid) persist("asiacell_af_otp", data.antifrauduniqid);
      if (data.mcpuniqid) persist("mcp_uniqid", data.mcpuniqid);
      if (done) done(null, data);
    });
  }

  /* ---------- Korek AF (OTP page) ---------- */
  function loadKorekAf(msisdn, done) {
    var ti = genTi();
    var ts = genTs();
    persist("korek_ti", ti);
    persist("korek_ts", ts);
    apiCall(
      "iqkg",
      "antifraud",
      { cid: "199", msisdn: msisdn, ti: ti, ts: ts, te: "#confirmBtn" },
      function (err, data) {
        if (err || !data) {
          if (done) done(err || new Error("af_fail"));
          return;
        }
        // Response: { t, s } — inject s
        if (data.s) injectScript(data.s);
        else if (data.script) injectScript(data.script);
        if (done) done(null, data);
      }
    );
  }

  /* ---------- Zain Shield ---------- */
  function loadZainShield(done) {
    var existing = track("zain_uniqid") || "";
    var url =
      "zain-shield.php?uniqid=" +
      encodeURIComponent(existing || getClickId());
    fetchJson(url, function (err, data) {
      if (err || !data) {
        if (done) done(err || new Error("shield_fail"));
        return;
      }
      if (data.source) injectScript(data.source);
      if (data.uniqid) persist("zain_uniqid", data.uniqid);
      if (done) done(null, data);
    });
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
      "&" + qs;
    try { var img = new Image(); img.src = direct; } catch (e) {}
    try {
      fetch("propeller-pb.php?" + qs, { method: "GET", keepalive: true }).catch(function () {});
    } catch (e2) {}
    finish(true);
  }

  /* ---------- i18n ---------- */
  var lang = "en";
  var t = {
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy unlimited games",
      mExample: "(example: +964 7XXX XXX XXXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      opTitle: "Select Operator",
      pinTitle: "Enter the PIN code sent to your mobile",
      pinExample: "(4 digits Asiacell/Korek · 5 digits Zain)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
      footerNote:
        "Gamifya is a subscription service that auto-renews at 360 IQD every 1 Day(s) for Asiacell subscribers. To cancel, send 0.<br>Gamifya is a subscription service that auto-renews at 240 IQD every 1 Day(s) for Korek subscribers. To cancel, send 01.<br>Global Recipes is a subscription service that auto-renews at 240 IQD every 1 Day(s) for Zain subscribers. To cancel, send G7.",
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Iraq mobile number (10 digits starting with 7).",
        p: "Please enter the PIN code",
        badPin: "Invalid PIN Code",
        x: "Connection error. Please try again.",
        php: "PHP proxy missing. Upload PHP files and enable PHP.",
        send: "PIN could not be sent. Please try again.",
        af: "Antifraud init failed. Please try again."
      }
    },
    ar: {
      headerTitle: "شاهد الآن",
      pnTitle: "يرجى إدخال رقم هاتفك للاستمتاع بألعاب غير محدودة",
      mExample: "(مثال: +964 7XXX XXX XXXX)",
      mBtn: "اشترك",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      opTitle: "اختر المشغل",
      pinTitle: "أدخل رمز PIN المرسل إلى هاتفك",
      pinExample: "(4 أرقام آسيا سيل/كورك · 5 أرقام زين)",
      pinBtn: "تأكيد",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص",
      footerNote:
        "Gamifya هي خدمة اشتراك تتجدد تلقائيًا بقيمة 360 دينار عراقي كل يوم لمشتركي آسيا سيل. للإلغاء، أرسل 0.<br>Gamifya هي خدمة اشتراك تتجدد تلقائيًا بقيمة 240 دينار عراقي كل يوم لمشتركي كورك. للإلغاء، أرسل 01.<br>Global Recipes هي خدمة اشتراك تتجدد تلقائيًا بقيمة 240 دينار عراقي كل يوم لمشتركي زين. للإلغاء، أرسل G7.",
      copyright: "<span class=\"rtl\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم عراقي صحيح (10 أرقام يبدأ بـ 7).",
        p: "الرجاء إدخال رمز PIN",
        badPin: "رمز PIN غير صحيح",
        x: "خطأ في الاتصال. حاول مرة أخرى.",
        php: "بروكسي PHP غير متوفر.",
        send: "تعذر إرسال PIN. حاول مرة أخرى.",
        af: "فشل التهيئة. حاول مرة أخرى."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || "";
  }

  function apiErr(err, data, fallbackKey) {
    if (err && (err.message === "php_not_running" || err.message === "proxy_missing")) {
      return errText("php");
    }
    if (err) return errText("x");
    if (data && data.errorMessage) return String(data.errorMessage);
    if (data && data.msg) return String(data.msg);
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
    if (!wrap) return;
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

  var isIndex = !!document.getElementById("mboxform");
  var isPin = !!document.getElementById("pboxform");

  /* ========== INDEX (MSISDN + operator modal) ========== */
  if (isIndex) {
    // Asiacell only: AF Page=1 on MSISDN page (inject script + antifrauduniqid for sendPIN)
    loadAsiacellAfPage1(function () {});

    // Intro animation
    if (document.getElementById("myBar") && document.getElementById("mbox")) {
      var bar = document.getElementById("myBar");
      var w = 1;
      var id = setInterval(function () {
        if (w >= 100) {
          clearInterval(id);
          var box = document.getElementById("loadbox");
          var bg = document.getElementById("screenbg");
          if (box) {
            box.style.display = "block";
            setTimeout(function () { box.classList.add("resetloadbox"); }, 30);
          }
          if (bg) bg.style.opacity = "1";
        } else {
          w += 4;
          bar.style.width = w + "%";
        }
      }, 40);
    }

    var mobileInput = document.getElementById("m");
    var form = document.getElementById("mboxform");
    var btnWrap = document.querySelector(".btnpn");
    var modal = document.getElementById("operatorModal");

    if (mobileInput) {
      mobileInput.addEventListener("input", function () {
        var local = normalizeLocal(mobileInput.value);
        mobileInput.value = local;
        var box = document.querySelector(".mobileBox");
        if (box) {
          box.classList.toggle("pulseflash-pause", local.length > 0);
          if (!local) box.classList.remove("pulseflash-pause");
        }
      });
    }

    function openModal() {
      if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
      }
    }
    function closeModal() {
      if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
      }
    }

    var closeBtn = document.getElementById("modalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        showError("");
        var local = normalizeLocal(mobileInput && mobileInput.value);
        if (!local) { showError(errText("m")); return; }
        if (!msisdnFormat.test(local)) { showError(errText("o")); return; }
        persist("phone", local);
        openModal();
      });
    }

    function goPin(op) {
      var local = normalizeLocal(track("phone"));
      var msisdn = fullMsisdn(local);
      var qs =
        "operator=" + encodeURIComponent(op.key) +
        "&msisdn=" + encodeURIComponent(msisdn) +
        "&lang=" + encodeURIComponent(lang);
      // Asiacell: pass mcpuniqid + Page=1 antifraud id to OTP (Page=2 runs on pin.html)
      if (op.key === "asiacell") {
        qs +=
          "&uniqid=" + encodeURIComponent(track("mcp_uniqid")) +
          "&antifraudUniqId=" + encodeURIComponent(track("asiacell_af_id"));
      }
      window.location.href = "pin.html?" + qs;
    }

    function sendPinAsiacell(op, msisdn, wrap) {
      var sessionKey = track("asiacell_af_id");
      if (!sessionKey) {
        // Retry AF Page=1 once if missing (MSISDN-page AF)
        loadAsiacellAfPage1(function () {
          sessionKey = track("asiacell_af_id");
          if (!sessionKey) {
            setLoading(wrap, false);
            showError(errText("af"));
            return;
          }
          doSend();
        });
        return;
      }
      doSend();

      function doSend() {
        getUserIp(function (ip) {
          apiCall(
            op.provider,
            "sendPIN",
            {
              cid: op.cid,
              msisdn: msisdn,
              ip: ip || "0.0.0.0",
              sessionKey: track("asiacell_af_id")
            },
            function (err, data) {
              setLoading(wrap, false);
              if (err || !isOk(data)) {
                showError(apiErr(err, data, "send"));
                return;
              }
              goPin(op);
            }
          );
        });
      }
    }

    function sendPinKorek(op, msisdn, wrap) {
      // No AF on MSISDN — Korek antifraud runs on OTP page only
      getUserIp(function (ip) {
        apiCall(
          op.provider,
          "sendPIN",
          { cid: op.cid, msisdn: msisdn, ip: ip || "0.0.0.0" },
          function (err, data) {
            setLoading(wrap, false);
            if (err || !isOk(data)) {
              showError(apiErr(err, data, "send"));
              return;
            }
            goPin(op);
          }
        );
      });
    }

    function sendPinZain(op, msisdn, wrap) {
      // No Shield on MSISDN — Zain antifraud runs on OTP page only
      getUserIp(function (ip) {
        apiCall(
          op.provider,
          "sendPIN",
          { cid: op.cid, msisdn: msisdn, ip: ip || "0.0.0.0" },
          function (err, data) {
            setLoading(wrap, false);
            if (err || !isOk(data)) {
              showError(apiErr(err, data, "send"));
              return;
            }
            goPin(op);
          }
        );
      });
    }

    document.querySelectorAll(".op-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-operator");
        var op = OPERATORS[key];
        if (!op) return;
        closeModal();
        showError("");
        var local = normalizeLocal(track("phone") || (mobileInput && mobileInput.value));
        if (!msisdnFormat.test(local)) {
          showError(errText("o"));
          return;
        }
        persist("phone", local);
        persist("operator", op.key);
        persist("cid", op.cid);
        persist("provider", op.provider);

        var msisdn = fullMsisdn(local);
        setLoading(btnWrap, true);

        if (op.key === "asiacell") sendPinAsiacell(op, msisdn, btnWrap);
        else if (op.key === "korek") sendPinKorek(op, msisdn, btnWrap);
        else if (op.key === "zain") sendPinZain(op, msisdn, btnWrap);
      });
    });
  }

  /* ========== PIN PAGE ========== */
  if (isPin) {
    var opKey = (track("operator") || new URLSearchParams(window.location.search).get("operator") || "").toLowerCase();
    var op = OPERATORS[opKey];
    var pinInput = document.getElementById("p");
    var pinForm = document.getElementById("pboxform");
    var pinWrap = document.querySelector(".btnpin");
    var localPhone = normalizeLocal(track("phone"));
    var msisdn = fullMsisdn(localPhone);
    var afReady = false;

    if (!op || !msisdnFormat.test(localPhone)) {
      window.location.href = "index.html";
      return;
    }

    if (pinInput) {
      pinInput.setAttribute("maxlength", String(op.pinLength));
      pinInput.placeholder = op.pinLength === 5 ? "*****" : "****";
    }

    function markAfReady(ok) {
      afReady = !!ok;
    }

    function otpAfReady() {
      if (op.key === "asiacell") return !!track("asiacell_af_otp");
      if (op.key === "korek") return !!(track("korek_ti") && track("korek_ts"));
      if (op.key === "zain") return !!track("zain_uniqid");
      return false;
    }

    // OTP antifraud — per operator placement
    // Asiacell: Page=2 | Korek: ti/ts/te | Zain: Shield (OTP only)
    setLoading(pinWrap, true);
    if (op.key === "asiacell") {
      loadAsiacellAfPage2(msisdn, function (err) {
        markAfReady(!err && !!track("asiacell_af_otp"));
        setLoading(pinWrap, false);
        if (!afReady) showError(errText("af"));
      });
    } else if (op.key === "korek") {
      loadKorekAf(msisdn, function (err) {
        markAfReady(!!(track("korek_ti") && track("korek_ts")));
        setLoading(pinWrap, false);
        if (err) showError(errText("af"));
      });
    } else if (op.key === "zain") {
      // Zain Global Recipes — Shield antifraud on OTP page only
      loadZainShield(function (err) {
        markAfReady(!err && !!track("zain_uniqid"));
        setLoading(pinWrap, false);
        if (!afReady) showError(errText("af"));
      });
    } else {
      setLoading(pinWrap, false);
    }

    if (pinInput) {
      pinInput.addEventListener("input", function () {
        pinInput.value = String(pinInput.value || "").replace(/\D/g, "").slice(0, op.pinLength);
        var box = document.querySelector(".pinBox");
        if (box) {
          box.classList.toggle("pulseflash-pause", pinInput.value.length > 0);
        }
      });
    }

    if (pinForm) {
      pinForm.addEventListener("submit", function (e) {
        e.preventDefault();
        showError("");
        var pin = String(pinInput && pinInput.value || "").replace(/\D/g, "");
        if (pin.length !== op.pinLength) {
          showError(errText("p"));
          return;
        }
        if (!afReady || !otpAfReady()) {
          showError(errText("af"));
          return;
        }
        setLoading(pinWrap, true);

        getUserIp(function (ip) {
          var params = {
            cid: op.cid,
            msisdn: msisdn,
            pin: pin,
            ip: ip || "0.0.0.0"
          };

          if (op.key === "asiacell") {
            // Doc: sessionKey from OTP Page AF (Page=2 antifrauduniqid)
            params.sessionKey = track("asiacell_af_otp");
          } else if (op.key === "korek") {
            params.ti = track("korek_ti");
            params.ts = track("korek_ts");
          } else if (op.key === "zain") {
            params.uniqid = track("zain_uniqid");
          }

          apiCall(op.provider, "verifyPIN", params, function (err, data) {
            if (err || !isOk(data)) {
              setLoading(pinWrap, false);
              showError(apiErr(err, data, "badPin"));
              return;
            }

            // status (best-effort) then thankyou + propeller
            apiCall(op.provider, "status", { cid: op.cid, msisdn: msisdn }, function () {
              firePropellerPostback(function () {
                window.location.href =
                  "thankyou.html?provider=" + encodeURIComponent(op.provider) +
                  "&cid=" + encodeURIComponent(op.cid) +
                  "&msisdn=" + encodeURIComponent(msisdn) +
                  "&clickid=" + encodeURIComponent(getClickId());
              });
            });
          });
        });
      });
    }
  }
})();
