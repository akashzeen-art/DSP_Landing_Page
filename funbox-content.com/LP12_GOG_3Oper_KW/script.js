(function () {
  "use strict";

  /**
   * Kuwait 3-Operator — ZD GameMedias (Google / funbox-content.com)
   * UI: LP12_GOG_IQ CuriousCubs steps
   *
   * Ooredoo (cid=3172) portal 458 — STOP2 → 1695 — PIN 4
   *   prepaid 1 KWD/week · postpaid 3.5 KWD/month
   * Zain    (cid=3173) portal 942 — unsub W7 → 95456 — 0.8 KWD/week — PIN 4
   * STC     (cid=3174) portal 943 — Stop1 → 50650 — prepaid 0.8 KWD/week — PIN 4
   *
   * Disclaimer: Zain & Ooredoo terms (EN/AR) — support cs@netmediasleashares.com
   * Google Ads: AW-18261554290
   * Flow: index → operator.html (sendpin) → pin.html (verifypin) → thankyou
   */

  var msisdnFormat = /^[569][0-9]{7}$/;
  var COUNTRY = "965";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var FOOTER_ALL_EN =
    "GameMedias are a subscription service which you would receive gaming contents by subscribing to the service. You are accepting all Terms & Conditions of the service for Zain & Ooredoo. For Zain users, 0.8 KWD/week. For Pre-paid Ooredoo users, 1KWD/ Week. For Post-paid Ooredoo users, 3.5 KWD/ month. To unsubscribe kindly send unsub W7 to 95456 for Zain users. For Ooredoo users, to unsubscribe from this service anytime, by sending STOP2 to 1695. To make use of this service you must be more than 18 years old or have received permission from your parents or a person who is authorized to pay your bill. Data charges apply for browsing and downloading contents on this portal. For assistance, please send an email to customer care: cs@netmediasleashares.com";

  var FOOTER_ALL_AR =
    "تُعد GameMedias و خدمات اشتراك تتيح للمشتركين الحصول على محتوى الألعاب عند الاشتراك في الخدمة. وباشتراكك، فإنك توافق على جميع الشروط والأحكام الخاصة بالخدمة لمشغلي Zain وOoredoo. تبلغ رسوم الاشتراك لمشتركي Zain مبلغ 0.8 دينار كويتي أسبوعيًا. ولمشتركي Ooredoo بنظام الدفع المسبق، تبلغ الرسوم 1 دينار كويتي أسبوعيًا، بينما تبلغ رسوم الاشتراك لمشتركي Ooredoo بنظام الدفع الآجل 3.5 دنانير كويتية شهريًا. لإلغاء الاشتراك، يرجى إرسال كلمة \"unsub W7\" إلى الرقم 95456 لمشتركي Zain. ولمشتركي Ooredoo، يمكن إلغاء الاشتراك في أي وقت عن طريق إرسال كلمة \"STOP2\" إلى الرقم 1695. لاستخدام هذه الخدمة، يجب أن يكون عمرك أكثر من 18 عامًا أو أن تكون قد حصلت على إذن من والديك أو من الشخص المخوّل بدفع فاتورة الهاتف. تُطبق رسوم البيانات عند تصفح أو تنزيل المحتوى من هذه البوابة. للمساعدة، يرجى التواصل مع خدمة العملاء عبر البريد الإلكتروني: cs@netmediasleashares.com";

  var OPERATORS = {
    ooredoo: {
      key: "ooredoo",
      cid: "3172",
      portalCid: "458",
      name: "Ooredoo",
      footerEn: FOOTER_ALL_EN,
      footerAr: FOOTER_ALL_AR
    },
    zain: {
      key: "zain",
      cid: "3173",
      portalCid: "942",
      name: "Zain",
      footerEn: FOOTER_ALL_EN,
      footerAr: FOOTER_ALL_AR
    },
    stc: {
      key: "stc",
      cid: "3174",
      portalCid: "943",
      name: "STC",
      footerEn: FOOTER_ALL_EN,
      footerAr: FOOTER_ALL_AR
    }
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

  /**
   * funbox-content.com nginx currently returns 502 for .php (PHP-FPM socket wrong).
   * Prefer same-origin proxy; fall back to a working Zeen proxy on the same infra (CORS *).
   */
  function proxyBases() {
    if (!useProxy) return [];
    var local = "zeen-api.php";
    var host = (typeof location !== "undefined" && location.hostname) || "";
    if (/funbox-content\.com$/i.test(host)) {
      return [
        "https://fun-mediacontent.com/LP12_GOG_KW_Ordoo/zeen-api.php",
        local
      ];
    }
    return [local];
  }

  function apiUrl(path, params, proxyBase) {
    var q = new URLSearchParams(params || {});
    if (proxyBase) {
      q.set("path", path);
      return proxyBase + (proxyBase.indexOf("?") >= 0 ? "&" : "?") + q.toString();
    }
    return ZEEN + "/" + path + "?" + q.toString();
  }

  function looksLikeBadProxy(text) {
    if (!text) return true;
    var s = String(text).trim();
    if (/^\s*<\?php/i.test(s)) return true;
    if (/^\s*<!DOCTYPE/i.test(s) || /^\s*<html/i.test(s)) return true;
    if (/502 Bad Gateway/i.test(s) || /404 Not Found/i.test(s)) return true;
    return false;
  }

  function parseApiText(text) {
    if (looksLikeBadProxy(text)) throw { msg: "php", raw: text };
    try { return JSON.parse(text); }
    catch (e) { throw { msg: "x", raw: text }; }
  }

  function callApi(path, params) {
    var bases = proxyBases();
    if (!bases.length) {
      return fetch(apiUrl(path, params, null), {
        method: "GET",
        credentials: "omit",
        cache: "no-store"
      }).then(function (res) {
        return res.text().then(parseApiText);
      }).catch(function (err) {
        if (err && err.msg) throw err;
        throw { msg: "x" };
      });
    }

    function attempt(i) {
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (controller) try { controller.abort(); } catch (e) {}
      }, 90000);
      var opts = { method: "GET", credentials: "omit", cache: "no-store" };
      if (controller) opts.signal = controller.signal;

      return fetch(apiUrl(path, params, bases[i]), opts).then(function (res) {
        clearTimeout(timer);
        return res.text().then(function (text) {
          if (looksLikeBadProxy(text) && i + 1 < bases.length) {
            return attempt(i + 1);
          }
          return parseApiText(text);
        });
      }).catch(function (err) {
        clearTimeout(timer);
        if (err && err.msg) {
          if (i + 1 < bases.length) return attempt(i + 1);
          throw err;
        }
        if (i + 1 < bases.length) return attempt(i + 1);
        throw { msg: "x" };
      });
    }

    return attempt(0);
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
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "458");
  }

  var lang = "en";
  var t = {
    en: {
      pageTitle: "We need your phone number to continue",
      pageTitlePin: "Enter your PIN to continue",
      opTitle: "Choose your operator",
      step1: "Enter the Website",
      step2: "Enter your number",
      step3: "Enter your pincode",
      guidePhone: "Phone Number Here",
      guideOp: "Select Operator",
      guidePin: "PIN Code Here",
      ctaPhone: "Enter your Mobile Number to Access",
      ctaOp: "Choose your mobile operator",
      ctaPin: "Enter the PIN sent to your phone",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pleaseWait: "Please Wait...",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      opOoredoo: "Ooredoo",
      opZain: "Zain",
      opStc: "STC",
      opOoredooPrice: "1 KWD/week prepaid · 3.5 KWD/month postpaid",
      opZainPrice: "0.8 KWD / week",
      opStcPrice: "0.8 KWD / week",
      termsLink: "Terms and Conditions",
      privacyLink: "Privacy Policy",
      disclaimer: FOOTER_ALL_EN,
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Kuwait mobile number (8 digits starting with 5, 6 or 9).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "Server PHP proxy error (502). Please try again.",
      }
    },
    ar: {
      pageTitle: "نحتاج رقم هاتفك للمتابعة",
      pageTitlePin: "أدخل رمز PIN للمتابعة",
      opTitle: "اختر المشغّل",
      step1: "دخول الموقع",
      step2: "أدخل رقمك",
      step3: "أدخل رمز PIN",
      guidePhone: "رقم الهاتف هنا",
      guideOp: "اختر المشغّل",
      guidePin: "رمز PIN هنا",
      ctaPhone: "أدخل رقم جوالك للوصول",
      ctaOp: "اختر مشغّل الجوال",
      ctaPin: "أدخل رمز PIN المرسل إلى هاتفك",
      continueBtn: "أشترك",
      confirmBtn: "أشترك",
      pleaseWait: "يرجى الانتظار...",
      pinHint: "تم إرسال رمز PIN المكون من 4 أرقام إلى هاتفك.",
      wrongNumber: "رقم خاطئ؟",
      opOoredoo: "أوريدو",
      opZain: "زين",
      opStc: "STC",
      opOoredooPrice: "1 دينار/أسبوع مسبقاً · 3.5 دينار/شهر آجل",
      opZainPrice: "0.8 دينار / أسبوع",
      opStcPrice: "0.8 دينار / أسبوع",
      termsLink: "الشروط والأحكام",
      privacyLink: "سياسة الخصوصية",
      disclaimer: FOOTER_ALL_AR,
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم كويتي صحيح (8 أرقام يبدأ بـ 5 أو 6 أو 9).",
        op: "الرجاء اختيار المشغّل",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        "1001": "تعذر إرسال PIN. حاول مرة أخرى.",
        "1004": "رمز PIN غير صحيح أو منتهي.",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "خطأ في خادم PHP (502). حاول مرة أخرى."
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
    var box = document.getElementById(id || "errortext");
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

  /* —— index: MSISDN → operator —— */
  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    setActiveStep(2);
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
      persist("msisdn", fullMsisdn(state.value));
      persist("phone", state.value);
      window.location.href = "operator.html?lang=" + lang;
    });
  }

  /* —— operator: choose → sendpin → pin —— */
  var obox = document.getElementById("obox");
  if (obox) {
    setActiveStep(2);
    if (!track("phone") && !track("msisdn")) {
      window.location.href = "index.html?lang=" + lang;
    } else {
      document.querySelectorAll(".opbtn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-operator");
          var op = OPERATORS[key];
          if (!op) { showError(errText("op")); return; }

          var msisdn = track("msisdn") || fullMsisdn(track("phone"));
          showError("");
          document.querySelectorAll(".opbtn").forEach(function (b) {
            b.classList.add("disabled_btn");
            b.disabled = true;
          });
          var opLoad = document.getElementById("opLoad");
          if (opLoad) opLoad.classList.add("show");

          persist("operator", key);
          persist("zeen_cid", op.cid);
          persist("portal_cid", op.portalCid);

          var params = {
            cid: op.cid,
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
              if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
              if (!isOk(resp)) {
                document.querySelectorAll(".opbtn").forEach(function (b) {
                  b.classList.remove("disabled_btn");
                  b.disabled = false;
                });
                if (opLoad) opLoad.classList.remove("show");
                showError(errText(errCode(resp)) || errText("1001"));
                return;
              }
              window.location.href = "pin.html?lang=" + encodeURIComponent(lang);
            })
            .catch(function (err) {
              document.querySelectorAll(".opbtn").forEach(function (b) {
                b.classList.remove("disabled_btn");
                b.disabled = false;
              });
              if (opLoad) opLoad.classList.remove("show");
              showError(errText((err && err.msg) || "x"));
            });
        });
      });
    }
  }

  /* —— pin: verifypin —— */
  var pForm = document.getElementById("pinForm");
  if (pForm) {
    setActiveStep(3);
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

    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("confirmBtn");

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      var ok = pInput.value.length === PIN_LENGTH;
      confirmBtn.disabled = !ok;
      if (ok) confirmBtn.classList.remove("disabled");
      else confirmBtn.classList.add("disabled");
      showError("");
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!op) { showError(errText("op")); return; }
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"));
        return;
      }
      showError("");
      setBtnLoading(confirmBtn, true, t[lang].confirmBtn);

      var params = {
        cid: op.cid,
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
            showError(errText(errCode(resp)) || errText("1004"));
            return;
          }
          persist("converted", "1");
          persist("portal_url", portalFor(op));
          callApi("checkstatus", { cid: op.cid, msisdn: params.msisdn }).catch(function () {});
          window.location.href = "thankyou.html?lang=" + lang;
        })
        .catch(function (err) {
          setBtnLoading(confirmBtn, false, t[lang].confirmBtn);
          confirmBtn.disabled = false;
          confirmBtn.classList.remove("disabled");
          showError(errText((err && err.msg) || "x"));
        });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
