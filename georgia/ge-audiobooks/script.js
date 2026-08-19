(function () {
  "use strict";

  /**
   * AudioBooks — Georgia Beeline (GEcmp)
   *
   * Campaign: https://ge-playcontent.com/ge-audiobooks/?clickid={gclid}
   *
   * Beeline GE: cid=489 · 1 GEL/day · +995 · local 9 digits (5XXXXXXXX) · PIN 4
   *
   * Flow (same pattern as Google Palestine G01):
   *   1) sendPIN  → sessionKey
   *   2) verifyPIN (+ sessionKey)
   *   3) status
   *   4) thankyou.html (conversion) → redirect
   *
   * Upstream: http://159.89.163.174/prod/GEcmp
   * Proxy:    ge-api.php?path=sendPIN|verifyPIN|status|redirect
   */

  var PIN_LENGTH = 4;
  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "995";
  var CID = "489";
  var API_BASE = "http://159.89.163.174/prod/GEcmp";
  var ADS_ID = "AW-18322602807";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  function isLocalHost() {
    if (typeof location === "undefined") return false;
    var h = location.hostname || "";
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "0.0.0.0";
  }

  function sameFolderProxyHref() {
    try {
      if (isLocalHost()) {
        return new URL("ge-api-proxy", window.location.href).href;
      }
      return new URL("ge-api.php", window.location.href).href;
    } catch (e) {
      return isLocalHost() ? "ge-api-proxy" : "ge-api.php";
    }
  }

  function proxyCandidates() {
    if (isLocalHost()) {
      var list = [];
      try {
        list.push(new URL("ge-api-proxy", window.location.href).href);
        list.push(new URL("ge-api.php", window.location.href).href);
      } catch (e) {
        list = ["ge-api-proxy", "ge-api.php"];
      }
      return list;
    }
    return [sameFolderProxyHref()];
  }

  function buildProxyUrl(base, path, qs) {
    var sep = base.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + "path=" + encodeURIComponent(path) + "&" + qs;
  }

  var i18n = {
    en: {
      title: "Get Access For Your Mobile",
      step1: "Enter your mobile number to start download now",
      continueBtn: "CONTINUE",
      subscribeSub: "TO SUBSCRIBE",
      step2: "Enter the 4-digit PIN",
      pinHint: "We sent a verification code to your Beeline mobile",
      confirm: "CONFIRM",
      confirmSub: "TO CONTINUE",
      back: "← Change number",
      errMsisdn: "Enter a valid Beeline number (9 digits starting with 5).",
      errSend: "OTP could not be sent. Please try again.",
      errPin: "Please enter the 4-digit PIN",
      errBadPin: "Invalid PIN Code",
      errConn: "Connection error. Please try again.",
      errPhp: "Local: run python3 serve.py. Live: upload ge-api.php and enable PHP.",
      descP1:
        "On subscribing to AudioBooks, you will be charged 1 GEL per day. Your subscription will automatically renew every day until you unsubscribe.",
      descP2:
        "Enjoy unlimited access to a premium collection of audiobooks across a variety of categories, including Fiction, Business, Self-Development, Education, Romance, Mystery, and more. Listen anytime, anywhere on your mobile device.",
      descTitle: "Subscription Details",
      descOp: "Operator: Beeline Georgia",
      descPrice: "Price: 1 GEL per day",
      descBilling: "Billing: Auto-renews daily until cancelled."
    },
    ka: {
      title: "მიიღეთ წვდომა თქვენს მობილურზე",
      step1: "შეიყვანეთ მობილურის ნომერი ჩამოსაწერად",
      continueBtn: "გაგრძელება",
      subscribeSub: "გამოწერისთვის",
      step2: "შეიყვანეთ 4-ნიშნა PIN",
      pinHint: "ვერიფიკაციის კოდი გაიგზავნა Beeline ნომერზე",
      confirm: "დადასტურება",
      confirmSub: "გასაგრძელებლად",
      back: "← ნომრის შეცვლა",
      errMsisdn: "შეიყვანეთ სწორი Beeline ნომერი (9 ციფრი, იწყება 5-ით).",
      errSend: "OTP ვერ გაიგზავნა. სცადეთ თავიდან.",
      errPin: "შეიყვანეთ 4-ნიშნა PIN",
      errBadPin: "არასწორი PIN",
      errConn: "კავშირის შეცდომა. სცადეთ თავიდან.",
      errPhp: "ლოკალურად: python3 serve.py. Live: ატვირთეთ ge-api.php.",
      descP1:
        "AudioBooks-ზე გამოწერისას დაგერიცხებათ 1 ლარი დღეში. გამოწერა ავტომატურად განახლდება ყოველდღე გაუქმებამდე.",
      descP2:
        "ისიამოვნეთ აუდიოწიგნების პრემიუმ კოლექციით — Fiction, Business, Self-Development, Education, Romance, Mystery და სხვა. მოუსმინეთ ნებისმიერ დროს, მობილურზე.",
      descTitle: "გამოწერის დეტალები",
      descOp: "ოპერატორი: Beeline საქართველო",
      descPrice: "ფასი: 1 ლარი დღეში",
      descBilling: "ბილინგი: ყოველდღიური ავტო-განახლება გაუქმებამდე."
    }
  };

  var lang = "en";

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
    return digits.slice(0, 9);
  }

  /** Docs: msisdn=995xxxxxxxx */
  function fullMsisdn(local) {
    return COUNTRY + normalizeLocal(local);
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var keys = ["clickid", "click_id", "gclid", "token", "clickId"];
    var token = "";
    for (var i = 0; i < keys.length; i++) {
      var v = params.get(keys[i]);
      if (v) {
        token = v;
        break;
      }
    }
    if (
      token &&
      token !== "${SUBID}" &&
      String(token).toLowerCase() !== "clickid" &&
      token !== "{gclid}"
    ) {
      persist("token", token);
    }
    var qLang = params.get("lang");
    if (qLang === "ka" || qLang === "en") lang = qLang;
  }

  function getUserIp(cb) {
    var cached = track("user_ip");
    if (cached) {
      cb(cached);
      return;
    }
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      persist("user_ip", ip || "0.0.0.0");
      cb(ip || "0.0.0.0");
    }
    var timer = setTimeout(function () {
      finish("0.0.0.0");
    }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        clearTimeout(timer);
        finish((d && d.ip) || "0.0.0.0");
      })
      .catch(function () {
        clearTimeout(timer);
        finish("0.0.0.0");
      });
  }

  function classifyProxyText(text, httpStatus) {
    if (httpStatus === 404) return "proxy_missing";
    if (/^\s*<\?php/i.test(text)) return "php_not_running";
    if (/^\s*<!DOCTYPE html/i.test(text) || /^\s*<html/i.test(text)) return "proxy_missing";
    try {
      JSON.parse(text);
      return "ok";
    } catch (e) {
      return "bad_json";
    }
  }

  function parseApiText(text, done, httpStatus) {
    var kind = classifyProxyText(text, httpStatus);
    if (kind === "php_not_running") {
      done(new Error("php_not_running"));
      return;
    }
    if (kind === "proxy_missing") {
      done(new Error("proxy_missing"));
      return;
    }
    if (kind === "bad_json") {
      done(new Error("bad_json"));
      return;
    }
    try {
      done(null, JSON.parse(text));
    } catch (e) {
      done(new Error("bad_json"));
    }
  }

  function apiCall(path, params, done) {
    var qs = Object.keys(params)
      .filter(function (k) {
        return params[k] !== "" && params[k] != null;
      })
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");

    var clean = String(path || "").replace(/^\//, "");
    var bases = useProxy || isLocalHost() ? proxyCandidates() : [];
    var lastKind = "proxy_missing";

    function tryNext(i) {
      if (!useProxy && !isLocalHost()) {
        var direct = API_BASE + "/" + clean + "?" + qs;
        fetch(direct, { method: "GET", cache: "no-store" })
          .then(function (r) {
            return r.text().then(function (text) {
              parseApiText(text, done, r.status);
            });
          })
          .catch(function (err) {
            done(err || new Error("network"));
          });
        return;
      }

      if (i >= bases.length) {
        done(new Error(lastKind === "php_not_running" ? "php_not_running" : "proxy_missing"));
        return;
      }

      var url = buildProxyUrl(bases[i], clean, qs);
      fetch(url, { method: "GET", cache: "no-store" })
        .then(function (r) {
          return r.text().then(function (text) {
            var kind = classifyProxyText(text, r.status);
            lastKind = kind;
            if (kind === "ok") {
              parseApiText(text, done, r.status);
              return;
            }
            // Local serve.py returns JSON even for PHP path; try next candidate
            tryNext(i + 1);
          });
        })
        .catch(function () {
          lastKind = "proxy_missing";
          tryNext(i + 1);
        });
    }

    tryNext(0);
  }

  /** Success: {"response":"SUCCESS",...} */
  function isApiSuccess(data) {
    if (!data) return false;
    var r = String(data.response || data.msg || "").toUpperCase();
    return r.indexOf("SUCCESS") !== -1;
  }

  function t() {
    return i18n[lang] || i18n.en;
  }

  function apiErrMsg(err, data, fallback) {
    if (err && (err.message === "php_not_running" || err.message === "proxy_missing")) {
      return t().errPhp;
    }
    if (err) return t().errConn;
    var raw = (data && (data.errorMessage || data.msg)) || "";
    if (
      raw &&
      String(raw).toUpperCase() !== "FAIL" &&
      String(raw).toUpperCase() !== "FAILED" &&
      String(raw).toLowerCase() !== "null"
    ) {
      return String(raw);
    }
    return fallback;
  }

  function gtagSafe() {
    try {
      if (typeof window.gtag === "function") {
        return window.gtag.apply(window, arguments);
      }
    } catch (e) {}
  }

  function trackOtpPage() {
    gtagSafe("config", ADS_ID, { page_title: "OTP / PIN", page_path: "/otp" });
    gtagSafe("event", "page_view", { page_title: "OTP / PIN", page_path: "/otp" });
  }

  function showView(step) {
    document.querySelectorAll(".step-content").forEach(function (el) {
      el.classList.remove("current-visible");
    });
    var el = document.getElementById("view-" + step);
    if (el) el.classList.add("current-visible");
    if (step === "step2") trackOtpPage();
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  }

  function applyLang() {
    var d = t();
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    var btnEN = document.getElementById("btnEN");
    var btnKA = document.getElementById("btnKA");
    if (btnEN) btnEN.classList.toggle("lang-active", lang === "en");
    if (btnKA) btnKA.classList.toggle("lang-active", lang === "ka");
    setText("txt-title", d.title);
    setText("txt-step1-heading", d.step1);
    setText("txt-continue", d.continueBtn);
    setText("txt-subscribe", d.subscribeSub);
    setText("txt-step2-heading", d.step2);
    setText("txt-pin-hint", d.pinHint);
    setText("txt-confirm", d.confirm);
    setText("txt-confirm-sub", d.confirmSub);
    setText("btnBack", d.back);
    setText("desc-p1", d.descP1);
    setText("desc-p2", d.descP2);
    var title = document.getElementById("desc-details-title");
    if (title) title.innerHTML = "<strong>" + d.descTitle + "</strong>";
    setText("desc-op", d.descOp);
    setText("desc-price", d.descPrice);
    setText("desc-billing", d.descBilling);
  }

  initTracking();
  getUserIp(function () {});
  applyLang();

  document.getElementById("btnEN").addEventListener("click", function () {
    lang = "en";
    applyLang();
  });
  document.getElementById("btnKA").addEventListener("click", function () {
    lang = "ka";
    applyLang();
  });

  var mobileInput = document.getElementById("mobile");
  var continueBtn = document.getElementById("continueBtn");
  var phoneBox = document.getElementById("phoneBox");
  var errMsisdn = document.getElementById("errMsisdn");
  var msisdnForm = document.getElementById("msisdnForm");
  var sendingPin = false;

  /** Never use HTML disabled — always clickable; green when 9 digits. */
  function paintContinueBtn() {
    if (!continueBtn || !mobileInput) return;
    var local = normalizeLocal(mobileInput.value);
    var ready = local.length === 9 && !sendingPin;
    continueBtn.removeAttribute("disabled");
    continueBtn.classList.toggle("active", ready);
    continueBtn.classList.toggle("loading", sendingPin);
    continueBtn.setAttribute("aria-disabled", ready ? "false" : "true");
    if (phoneBox) {
      phoneBox.classList.toggle("typing", local.length > 0);
      phoneBox.classList.toggle("valid", local.length === 9);
    }
  }

  function refreshMsisdnBtn() {
    if (!mobileInput) return;
    var local = normalizeLocal(mobileInput.value);
    mobileInput.value = local;
    paintContinueBtn();
    if (errMsisdn && local.length === 9) errMsisdn.textContent = "";
  }

  /** 1) Generate PIN — sendPIN?cid=489&msisdn=995…&ip= */
  function onContinue() {
    if (sendingPin || !mobileInput) return;
    var local = normalizeLocal(mobileInput.value);
    mobileInput.value = local;
    if (errMsisdn) errMsisdn.textContent = "";

    if (local.length !== 9) {
      if (errMsisdn) errMsisdn.textContent = t().errMsisdn;
      paintContinueBtn();
      return;
    }

    sendingPin = true;
    paintContinueBtn();

    getUserIp(function (ip) {
      apiCall(
        "sendPIN",
        {
          cid: CID,
          msisdn: fullMsisdn(local),
          ip: ip || "0.0.0.0"
        },
        function (apiErr, data) {
          sendingPin = false;
          paintContinueBtn();

          if (apiErr || !isApiSuccess(data)) {
            if (errMsisdn) errMsisdn.textContent = apiErrMsg(apiErr, data, t().errSend);
            return;
          }

          if (data && data.sessionKey) persist("sessionKey", data.sessionKey);
          persist("phone", local);
          persist("cid", CID);
          showView("step2");
          var pinEl = document.getElementById("pin");
          if (pinEl) {
            pinEl.value = "";
            pinEl.focus();
          }
          refreshPinBtn();
        }
      );
    });
  }

  if (mobileInput) {
    mobileInput.addEventListener("input", refreshMsisdnBtn);
    mobileInput.addEventListener("keyup", refreshMsisdnBtn);
    mobileInput.addEventListener("change", refreshMsisdnBtn);
    mobileInput.addEventListener("blur", refreshMsisdnBtn);
    mobileInput.addEventListener("paste", function () {
      setTimeout(refreshMsisdnBtn, 0);
    });
    refreshMsisdnBtn();
  }

  if (msisdnForm) {
    msisdnForm.addEventListener("submit", function (e) {
      e.preventDefault();
      onContinue();
    });
  }
  if (continueBtn) {
    continueBtn.removeAttribute("disabled");
    continueBtn.addEventListener("click", function (e) {
      e.preventDefault();
      onContinue();
    });
  }

  var pinInput = document.getElementById("pin");
  var confirmBtn = document.getElementById("confirmBtn");
  var pinBox = document.getElementById("pinBox");
  var errPin = document.getElementById("errPin");
  var pinForm = document.getElementById("pinForm");
  var verifying = false;

  function refreshPinBtn() {
    if (!pinInput || !confirmBtn) return;
    pinInput.value = String(pinInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
    var ok = pinInput.value.length === PIN_LENGTH && !verifying;
    confirmBtn.disabled = !ok;
    confirmBtn.classList.toggle("active", ok);
    if (pinBox) pinBox.classList.toggle("typing", pinInput.value.length > 0);
  }

  if (pinInput) {
    pinInput.addEventListener("input", refreshPinBtn);
  }

  document.getElementById("btnBack").addEventListener("click", function () {
    if (errPin) errPin.textContent = "";
    verifying = false;
    showView("step1");
    refreshMsisdnBtn();
  });

  /** 2) verifyPIN → 3) status → thankyou → 4) redirect */
  function onConfirmPin() {
    if (verifying || !pinInput) return;
    var pin = String(pinInput.value || "").replace(/\D/g, "");
    if (errPin) errPin.textContent = "";

    if (pin.length !== PIN_LENGTH) {
      if (errPin) errPin.textContent = t().errPin;
      return;
    }

    var local = normalizeLocal(track("phone"));
    if (!msisdnFormat.test(local)) {
      if (errPin) errPin.textContent = t().errMsisdn;
      showView("step1");
      return;
    }

    var sessionKey = track("sessionKey");
    if (!sessionKey) {
      if (errPin) errPin.textContent = t().errSend;
      showView("step1");
      return;
    }

    verifying = true;
    if (confirmBtn) {
      confirmBtn.classList.add("loading");
      confirmBtn.disabled = true;
    }

    getUserIp(function (ip) {
      var msisdn = fullMsisdn(local);

      apiCall(
        "verifyPIN",
        {
          cid: CID,
          msisdn: msisdn,
          pin: pin,
          ip: ip || "0.0.0.0",
          sessionKey: sessionKey
        },
        function (apiErr, data) {
          if (apiErr || !isApiSuccess(data)) {
            verifying = false;
            if (confirmBtn) {
              confirmBtn.classList.remove("loading");
              refreshPinBtn();
            }
            if (errPin) errPin.textContent = apiErrMsg(apiErr, data, t().errBadPin);
            return;
          }

          // Status check (best-effort), then thank-you + conversion + portal redirect
          apiCall("status", { cid: CID, msisdn: msisdn }, function () {
            window.location.href =
              "thankyou.html?cid=" +
              encodeURIComponent(CID) +
              "&msisdn=" +
              encodeURIComponent(msisdn);
          });
        }
      );
    });
  }

  if (pinForm) {
    pinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      onConfirmPin();
    });
  } else if (confirmBtn) {
    confirmBtn.addEventListener("click", function (e) {
      e.preventDefault();
      onConfirmPin();
    });
  }
})();
