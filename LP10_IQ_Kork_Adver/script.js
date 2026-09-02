(function () {
  "use strict";

  /**
   * Iraq Korek — ZD Know Your Country (cid=3023) adnet — Advertizer
   * 300 IQD/day — unsub 0 → 2115 — PIN 4
   * AF: Evina via digitalapicalls.com (KnowYourCountry / windowtechnologies)
   * Advertizer: clickid=[[subid]] amount=1 advertiser_id=Zeen1041
   * UI: LP10 Theme-496
   */

  var msisdnFormat = /^75[0-9]{8}$/;
  var COUNTRY = "964";
  var PIN_LENGTH = 4;
  var CID = "3023";
  var PORTAL_CID = "326";
  var AMOUNT = "1";
  var ZEEN = "http://64.225.85.48/adnet";

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

    if (!track("pub_id")) persist("pub_id", "advertizer");
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

  function clientIp() {
    return track("user_ip") || "";
  }

  function getUserIp() {
    if (track("user_ip")) return;
    var done = false;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) try { controller.abort(); } catch (e) {}
    }, 1400);
    var opts = controller ? { signal: controller.signal } : {};
    fetch("https://api.ipify.org?format=json", opts)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        if (done) return;
        done = true;
        if (d && d.ip) persist("user_ip", d.ip);
      })
      .catch(function () { clearTimeout(timer); });
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
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) try { controller.abort(); } catch (e) {}
    }, 20000);
    var opts = {
      method: "GET",
      credentials: "omit",
      cache: "no-store"
    };
    if (controller) opts.signal = controller.signal;

    return fetch(apiUrl(path, params), opts).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.msg) throw err;
      throw { msg: "x" };
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

  function portalUrl() {
    return ZEEN + "/Promo/Api/CPportal?cid=" + PORTAL_CID;
  }

  /* ---------- Korek Evina (PIN page) — per API doc ---------- */
  function korekSecondsEpoch() {
    return Math.floor(Date.now() / 1000);
  }

  function korekGenerateTi() {
    return "1001-" + Math.floor(Math.random() * Date.now()) + "-" + Math.floor(Math.random() * Date.now());
  }

  function runKorekAntifraud(cb) {
    var ts = korekSecondsEpoch();
    var ti = korekGenerateTi();
    var tiEl = document.getElementById("tiParameter");
    var tsEl = document.getElementById("tsParameter");
    if (tiEl) tiEl.value = ti;
    if (tsEl) tsEl.value = String(ts);
    persist("af_ti", ti);
    persist("af_ts", String(ts));

    var params = new URLSearchParams({
      ti: ti,
      ts: String(ts),
      te: "#verifybtn",
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

  function applyKorekAfToParams(params) {
    var kTi = track("af_ti") || (document.getElementById("tiParameter") && document.getElementById("tiParameter").value);
    var kTs = track("af_ts") || (document.getElementById("tsParameter") && document.getElementById("tsParameter").value);
    if (kTi) {
      params.ti = String(kTi).trim();
      params.sessionKey = String(kTi).trim();
    }
    if (kTs) params.ts = String(kTs).trim();
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
    if (track("pb_sent") === "1") { finish(true); return; }

    var amount = track("pb_amount") || AMOUNT;
    var proxy =
      "advertizer-pb.php?clickid=" + encodeURIComponent(clickId) +
      "&txn_id=" + encodeURIComponent(clickId) +
      "&amount=" + encodeURIComponent(amount);

    fetch(proxy, { method: "GET", keepalive: true })
      .then(function (r) {
        if (r.ok) persist("pb_sent", "1");
        finish(r.ok);
      })
      .catch(function () { finish(false); });
    setTimeout(function () { finish(true); }, 4000);
  }

  var lang = "ar";
  var t = {
    ar: {
      heroTitle: "انت علي بعد خطوة واحدة للمشاهدة",
      formTitle: "أدخل رقم هاتفك",
      continueBtn: "متابعة",
      confirmBtn: "تأكيد",
      pinTitle: "أدخل رمز PIN",
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer:
        "ZD Know Your Country — كورك: 300 دينار عراقي يومياً. للإلغاء أرسل 0 إلى 2115.",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم كورك صحيح (10 أرقام يبدأ بـ 75).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        af: "جاري تحميل الحماية. حاول مرة أخرى.",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم."
      }
    },
    en: {
      heroTitle: "You're one step away from watching",
      formTitle: "Enter your phone number",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
      disclaimer:
        "ZD Know Your Country — Korek: 300 IQD per day. To cancel, send 0 to 2115.",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Korek number (10 digits starting with 75).",
        p: "Please enter the 4-digit PIN",
        af: "Security check loading. Please try again.",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP."
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
      if (dict[key] != null) el.textContent = dict[key];
    });
    var bar = document.getElementById("langbar");
    if (bar) bar.value = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errortext") || document.getElementById("errortext2");
    if (box) box.textContent = msg || "";
  }

  function setLoading(on) {
    var otpLoad = document.getElementById("otploading");
    var pinLoad = document.getElementById("vcodeloading");
    var btn1 = document.getElementById("btn-1");
    var verify = document.getElementById("verifybtn");
    if (on) {
      if (otpLoad) otpLoad.style.display = "inline-block";
      if (pinLoad) pinLoad.style.display = "inline-block";
      if (btn1) { btn1.classList.add("btn-loading"); btn1.disabled = true; }
      if (verify) { verify.classList.add("btn-loading"); verify.disabled = true; }
    } else {
      if (otpLoad) otpLoad.style.display = "none";
      if (pinLoad) pinLoad.style.display = "none";
      if (btn1) btn1.classList.remove("btn-loading");
      if (verify) verify.classList.remove("btn-loading");
    }
  }

  function showPinStep() {
    var otp = document.getElementById("otp_div");
    var pin = document.getElementById("vcode_div");
    if (otp) otp.classList.add("hide");
    if (pin) pin.classList.remove("hide");
    var langbar = document.getElementById("langbar");
    if (langbar) langbar.style.visibility = "hidden";
  }

  function openModal(id) {
    var src = document.getElementById(id);
    var box = document.getElementById("displayiframe");
    var modal = document.getElementById("myModal");
    if (!src || !box || !modal) return;
    box.innerHTML = src.innerHTML;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    var modal = document.getElementById("myModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  initTracking();
  getUserIp();
  getClickId();

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "ar"; } catch (e) { lang = "ar"; }
  }
  applyLang();

  var langbar = document.getElementById("langbar");
  if (langbar) {
    langbar.addEventListener("change", function () {
      lang = langbar.value === "en" ? "en" : "ar";
      applyLang();
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    });
  }

  document.querySelectorAll("[data-open]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var which = a.getAttribute("data-open");
      openModal(which === "privacy" ? "privacy-fetched-content" : "terms-fetched-content");
    });
  });
  var closeBtn = document.getElementById("closeModal");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  var modal = document.getElementById("myModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    var mInput = document.getElementById("phone");
    var submitBtn = document.getElementById("btn-1");

    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!submitBtn.classList.contains("btn-loading")) submitBtn.disabled = !ok;
      return { value: value, ok: ok };
    }

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      refreshMsisdnBtn();
    });
    refreshMsisdnBtn();

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdnBtn();
      if (!state.value) { showError(errText("m")); return; }
      if (!state.ok) { showError(errText("o")); return; }
      showError("");
      setLoading(true);

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      var params = {
        cid: CID,
        msisdn: msisdn,
        click_id: getClickId(),
        pub_id: track("pub_id") || "advertizer",
        sub_pub_id: track("sub_pub_id") || "0",
        user_ip: clientIp(),
        ua: navigator.userAgent || ""
      };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("sendpin", params)
        .then(function (resp) {
          setLoading(false);
          refreshMsisdnBtn();
          if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
          if (!isOk(resp)) {
            showError(errText(errCode(resp)) || errText("1001"));
            return;
          }
          showPinStep();
          runKorekAntifraud(function () {});
          var pinEl = document.getElementById("pincode");
          if (pinEl) { pinEl.value = ""; pinEl.focus(); }
          document.getElementById("verifybtn").disabled = true;
        })
        .catch(function (err) {
          setLoading(false);
          refreshMsisdnBtn();
          showError(errText((err && err.msg) || "x"));
        });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("verifybtn");
    var errId = "errortext2";
    var pinAfReady = false;

    runKorekAntifraud(function () { pinAfReady = true; });

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      confirmBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", errId);
    });

    var wrong = document.getElementById("wrongNumber");
    if (wrong) {
      wrong.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.reload();
      });
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"), errId);
        return;
      }
      showError("", errId);
      setLoading(true);

      function runVerify() {
        var kTi = track("af_ti") || (document.getElementById("tiParameter") && document.getElementById("tiParameter").value);
        if (!kTi) {
          setLoading(false);
          confirmBtn.disabled = false;
          showError(errText("af"), errId);
          return;
        }

        var params = {
          cid: CID,
          msisdn: track("msisdn") || fullMsisdn(track("phone")),
          click_id: getClickId(),
          otp: otp,
          pub_id: track("pub_id") || "advertizer",
          sub_pub_id: track("sub_pub_id") || "0",
          user_ip: clientIp(),
          ua: navigator.userAgent || ""
        };
        applyKorekAfToParams(params);

        callApi("verifypin", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(false);
              confirmBtn.disabled = false;
              showError(errText(errCode(resp)) || errText("1004"), errId);
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalUrl());
            persist("pb_amount", AMOUNT);
            callApi("checkstatus", { cid: CID, msisdn: params.msisdn }).catch(function () {});
            firePostback(function () {
              window.location.href = "thankyou.html?lang=" + lang;
            });
          })
          .catch(function (err) {
            setLoading(false);
            confirmBtn.disabled = false;
            showError(errText((err && err.msg) || "x"), errId);
          });
      }

      if (!pinAfReady && !track("af_ti")) {
        var waitN = 0;
        var waitIv = setInterval(function () {
          waitN += 1;
          if (track("af_ti") || waitN > 40) {
            clearInterval(waitIv);
            pinAfReady = !!track("af_ti");
            runVerify();
          }
        }, 250);
      } else {
        runVerify();
      }
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
