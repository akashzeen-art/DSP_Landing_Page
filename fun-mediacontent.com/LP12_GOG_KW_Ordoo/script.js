(function () {
  "use strict";

  /**
   * Kuwait Ooredoo — Pro max (cid=3149) adnet
   * 800 fils/week — UNSUB 5 → 50908 — PIN 4
   * Portal cid=855
   * UI: LP12_GOG_UAE CuriousCubs steps (phone → PIN page)
   * Domain: fun-mediacontent.com
   * Google Ads: AW-18261487745
   */

  var msisdnFormat = /^[569][0-9]{7}$/;
  var COUNTRY = "965";
  var PIN_LENGTH = 4;
  var CID = "3149";
  var PORTAL_CID = "855";
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=" + PORTAL_CID;

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
      params.get("gclid") ||
      params.get("token") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    ["pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"].forEach(function (k) {
      var v = params.get(k);
      if (v && String(v).indexOf("{") === -1 && String(v).indexOf("$") === -1) persist(k, v);
    });

    if (!track("pub_id")) persist("pub_id", "google");
    if (!track("sub_pub_id")) {
      var zone = params.get("zoneid") || params.get("zone_id") || params.get("campaignid") || "0";
      if (zone && String(zone).indexOf("{") === -1) persist("sub_pub_id", "ZONE" + zone);
    }

    persist("zeen_cid", CID);
    persist("operator", "ooredoo");
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

  function clientIp() {
    return track("user_ip") || "";
  }

  function getUserIp() {
    if (track("user_ip")) return;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) try { controller.abort(); } catch (e) {}
    }, 1400);
    var opts = controller ? { signal: controller.signal } : {};
    fetch("https://api.ipify.org?format=json", opts)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
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
    }, 90000);
    var opts = { method: "GET", credentials: "omit", cache: "no-store" };
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

  var lang = "en";
  var t = {
    en: {
      pageTitle: "We need your phone number to continue",
      pageTitlePin: "Enter your PIN to continue",
      step1: "Enter the Website",
      step2: "Enter your number",
      step3: "Enter your pincode",
      guidePhone: "Phone Number Here",
      guidePin: "PIN Code Here",
      ctaPhone: "Enter your Mobile Number to Access",
      ctaPin: "Enter the PIN sent to your phone",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pleaseWait: "Please Wait...",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      termsLink: "Terms and Conditions",
      privacyLink: "Privacy Policy",
      disclaimer:
        "Pro max is a subscription service for Ooredoo Kuwait at 800 fils per week. To cancel, send UNSUB 5 to 50908. Your subscription renews automatically until cancelled.",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Kuwait mobile number (8 digits starting with 5, 6 or 9).",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP."
      }
    },
    ar: {
      pageTitle: "نحتاج رقم هاتفك للمتابعة",
      pageTitlePin: "أدخل رمز PIN للمتابعة",
      step1: "دخول الموقع",
      step2: "أدخل رقمك",
      step3: "أدخل رمز PIN",
      guidePhone: "رقم الهاتف هنا",
      guidePin: "رمز PIN هنا",
      ctaPhone: "أدخل رقم جوالك للوصول",
      ctaPin: "أدخل رمز PIN المرسل إلى هاتفك",
      continueBtn: "متابعة",
      confirmBtn: "تأكيد",
      pleaseWait: "يرجى الانتظار...",
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer:
        "Pro max خدمة اشتراك لأوريدو الكويت بسعر 800 فلس أسبوعياً. للإلغاء أرسل UNSUB 5 إلى 50908. يتجدد الاشتراك تلقائياً حتى الإلغاء.",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم كويتي صحيح (8 أرقام يبدأ بـ 5 أو 6 أو 9).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || t.en.errmsg[key] || "";
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
      if (dict[key] != null) el.textContent = dict[key];
    });
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errortext") || document.getElementById("errortext2");
    if (box) box.textContent = msg || "";
  }

  function setBtnLoading(btn, on, idleText) {
    if (!btn) return;
    if (on) {
      btn.classList.add("btn-loading", "disabled");
      btn.disabled = true;
      btn.setAttribute("data-idle", idleText || btn.textContent);
      btn.innerHTML = "<span>" + ((t[lang] && t[lang].pleaseWait) || "Please Wait...") + "</span>";
    } else {
      btn.classList.remove("btn-loading");
      var idle = btn.getAttribute("data-idle") || idleText || "";
      if (idle) btn.innerHTML = "<span>" + idle + "</span>";
    }
  }

  function setActiveStep(n) {
    [1, 2, 3].forEach(function (i) {
      var el = document.getElementById("step" + i);
      if (!el) return;
      if (i === n) el.classList.add("active");
      else el.classList.remove("active");
    });
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
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
  }
  applyLang();

  var dropdown = document.getElementById("dropdown");
  var dropdownContent = document.getElementById("dropdown-content");
  if (dropdown && dropdownContent) {
    dropdown.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdownContent.style.display =
        window.getComputedStyle(dropdownContent).display === "none" ? "block" : "none";
    });
    document.addEventListener("click", function () {
      dropdownContent.style.display = "none";
    });
    document.querySelectorAll("[data-lang-set]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        lang = btn.getAttribute("data-lang-set") === "ar" ? "ar" : "en";
        applyLang();
        dropdownContent.style.display = "none";
        var url = new URL(window.location.href);
        url.searchParams.set("lang", lang);
        window.history.replaceState({}, "", url);
      });
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
  var pinOnly = !mForm && !!document.getElementById("pinForm");

  if (mForm) {
    var mInput = document.getElementById("telInput");
    var submitBtn = document.getElementById("evina_ctabutton");

    function refreshMsisdnBtn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!submitBtn.classList.contains("btn-loading")) {
        submitBtn.disabled = !ok;
        if (ok) submitBtn.classList.remove("disabled");
        else submitBtn.classList.add("disabled");
      }
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
      setBtnLoading(submitBtn, true, t[lang].continueBtn);

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      var params = {
        cid: CID,
        msisdn: msisdn,
        click_id: getClickId(),
        pub_id: track("pub_id") || "google",
        sub_pub_id: track("sub_pub_id") || "0",
        user_ip: clientIp(),
        ua: navigator.userAgent || ""
      };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("sendpin", params)
        .then(function (resp) {
          setBtnLoading(submitBtn, false, t[lang].continueBtn);
          refreshMsisdnBtn();
          if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
          if (!isOk(resp)) {
            showError(errText(errCode(resp)) || errText("1001"));
            return;
          }
          window.location.href = "pin.html?lang=" + lang;
        })
        .catch(function (err) {
          setBtnLoading(submitBtn, false, t[lang].continueBtn);
          refreshMsisdnBtn();
          showError(errText((err && err.msg) || "x"));
        });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    if (pinOnly && !track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    }
    if (pinOnly) setActiveStep(3);

    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("confirmBtn");
    var errId = pinOnly ? "errortext" : "errortext2";

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      var ok = pInput.value.length === PIN_LENGTH;
      confirmBtn.disabled = !ok;
      if (ok) confirmBtn.classList.remove("disabled");
      else confirmBtn.classList.add("disabled");
      showError("", errId);
    });

    var wrong = document.getElementById("wrongNumber");
    if (wrong && !pinOnly) {
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
      setBtnLoading(confirmBtn, true, t[lang].confirmBtn);

      var params = {
        cid: CID,
        msisdn: track("msisdn") || fullMsisdn(track("phone")),
        click_id: getClickId(),
        otp: otp,
        pub_id: track("pub_id") || "google",
        sub_pub_id: track("sub_pub_id") || "0",
        user_ip: clientIp(),
        ua: navigator.userAgent || ""
      };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("verifypin", params)
        .then(function (resp) {
          if (!isOk(resp)) {
            setBtnLoading(confirmBtn, false, t[lang].confirmBtn);
            confirmBtn.disabled = false;
            confirmBtn.classList.remove("disabled");
            showError(errText(errCode(resp)) || errText("1004"), errId);
            return;
          }
          persist("converted", "1");
          persist("portal_url", PORTAL);
          callApi("checkstatus", { cid: CID, msisdn: params.msisdn }).catch(function () {});
          window.location.href = "thankyou.html?lang=" + lang;
        })
        .catch(function (err) {
          setBtnLoading(confirmBtn, false, t[lang].confirmBtn);
          confirmBtn.disabled = false;
          confirmBtn.classList.remove("disabled");
          showError(errText((err && err.msg) || "x"), errId);
        });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
