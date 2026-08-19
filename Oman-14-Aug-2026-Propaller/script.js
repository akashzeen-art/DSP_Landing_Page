(function () {
  "use strict";

  /**
   * Oman Omantel — ZD Gamez (Zeen Digital) + PropellerAds
   * UI: StreamPulse Lite / Gameonz style
   *
   * Campaign:
   *   https://click2funbox.com/oman14prop/?clickid=${SUBID}&zoneid={zone_id}
   *
   * APIs (cid=2203):
   *   sendpin / verifypin / checkstatus
   * Portal: /Promo/Api/CPportal?cid=388
   * Price: 0.25 OMR/day — unsub: UNSUB IVID → 92149
   * Propeller visitor_id = same clickid (${SUBID})
   */

  var msisdnFormat = /^[79][0-9]{7}$/;
  var COUNTRY = "968";
  var CID = "2203";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=388";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

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
    try { localStorage.setItem(k, v); } catch (e2) {}
  }

  function track(k) {
    try {
      var v = sessionStorage.getItem(k);
      if (v) return v;
    } catch (e) {}
    try {
      return localStorage.getItem(k) || "";
    } catch (e2) {
      return "";
    }
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
      params.get("clickId") ||
      params.get("token") ||
      "";
    if (clickId && clickId !== "${SUBID}" && String(clickId).toLowerCase() !== "clickid") {
      persist("click_id", clickId);
    }
    var zone = params.get("zoneid") || params.get("zone_id") || "";
    if (zone && zone !== "{zone_id}" && zone !== "{zoneid}") persist("zoneid", zone);

    var pub = params.get("pub_id") || params.get("pubid") || "";
    if (pub) persist("pub_id", pub);
    var subPub = params.get("sub_pub_id") || params.get("subpubid") || "";
    if (subPub) persist("sub_pub_id", subPub);
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
    if (cached) {
      cb(cached);
      return;
    }
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      if (ip) persist("user_ip", ip);
      cb(ip || "0.0.0.0");
    }
    var t = setTimeout(function () { finish("0.0.0.0"); }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(t);
        finish((d && d.ip) || "0.0.0.0");
      })
      .catch(function () {
        clearTimeout(t);
        finish("0.0.0.0");
      });
  }

  function buildApiUrl(path, qs) {
    var clean = String(path || "").replace(/^\//, "");
    if (useProxy) {
      return "zeen-api.php?path=" + encodeURIComponent(clean) + "&" + qs;
    }
    return ZEEN + "/" + clean + "?" + qs;
  }

  function apiCall(path, params, done) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== "" && params[k] != null; })
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");

    fetch(buildApiUrl(path, qs), { method: "GET" })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        if (/^\s*<\?php/i.test(text)) {
          done(new Error("php_not_running"));
          return;
        }
        if (/^\s*<!DOCTYPE html/i.test(text) || /^\s*<html/i.test(text)) {
          done(new Error("proxy_missing"));
          return;
        }
        try {
          done(null, JSON.parse(text));
        } catch (e) {
          done(new Error("bad_json"));
        }
      })
      .catch(function (err) {
        done(err);
      });
  }

  function isApiSuccess(data) {
    if (!data) return false;
    if (data.status === true || String(data.status).toLowerCase() === "true") return true;
    var m = String(data.msg || data.response || "").toUpperCase();
    return m.indexOf("SUCCESS") !== -1;
  }

  function firePropellerPostback(done) {
    var visitorId = getClickId();
    var finish = typeof done === "function" ? done : function () {};
    if (!visitorId) {
      finish(false);
      return;
    }

    var qs =
      "visitor_id=" + encodeURIComponent(visitorId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);
    var direct =
      POSTBACK.url +
      "?aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(visitorId) +
      "&payout=" + encodeURIComponent(POSTBACK.payout);

    try {
      var img = new Image();
      img.src = direct;
    } catch (e) {}
    try {
      fetch(direct, { method: "GET", mode: "no-cors", keepalive: true }).catch(function () {});
    } catch (e2) {}

    var settled = false;
    function once(ok) {
      if (settled) return;
      settled = true;
      finish(ok);
    }
    try {
      fetch("propeller-pb.php?" + qs, { method: "GET", keepalive: true })
        .then(function (r) {
          return r
            .json()
            .then(function (d) {
              once(!!(d && d.status));
            })
            .catch(function () {
              once(r.ok);
            });
        })
        .catch(function () {
          once(false);
        });
    } catch (e3) {
      once(false);
    }
    setTimeout(function () {
      once(false);
    }, 4000);
  }

  var lang = "ar";
  var t = {
    en: {
      navAll: "All",
      navSearch: "Search",
      serviceTxt:
        "Welcome to ZD Gamez<br>Access exclusive games<br>Subscription 0.25 OMR/day. To cancel, send UNSUB IVID to 92149.",
      pnTitle: "Please enter your mobile number to enjoy unlimited games",
      mExample: "(example: 7/9 xxxx xxxx)",
      mBtn: "Subscribe",
      exitBtn: "Exit",
      stnc:
        "Subscription is 0.25 OMR/day and renews automatically until you cancel. To unsubscribe, send UNSUB IVID to 92149.",
      mboxStnc: "By clicking Subscribe, you will receive an SMS with an activation code to confirm.",
      playlist: "Playlist:",
      ch1: "Channel 1",
      ch2: "Channel 2",
      ch3: "Channel 3",
      ch4: "Channel 4",
      ch5: "Channel 5",
      ch6: "Channel 6",
      comment: "Comment",
      playlistGroup: "Playlist group",
      pinSent: "Verification code sent to",
      pinTitle: "Enter the PIN to continue",
      pinResend: "Didn't get the code?",
      pinBack: "Back",
      pinBtn: "Confirm",
      footerNote:
        "Terms & Conditions:<ul><li>By clicking Subscribe you agree to the following terms:</li><li>ZD Gamez on Omantel costs 0.25 OMR per day</li><li>Subscription renews automatically until cancelled</li><li>To cancel, send UNSUB IVID to 92149</li><li>By continuing you agree to all service terms</li></ul>",
      copyright: "<span class=\"ltr\">2026&nbsp;&copy;&nbsp;All Rights Reserved</span>",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Oman mobile number (8 digits starting with 7 or 9).",
        p: "Please enter the 4-digit PIN",
        3: "Invalid PIN Code",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Upload zeen-api.php and enable PHP.",
        proxy: "API proxy not running. Locally use: python3 serve.py",
        send: "PIN could not be sent. Please try again."
      }
    },
    ar: {
      navAll: "الكل",
      navSearch: "بحث",
      serviceTxt:
        "أهلا بكم في خدمة ZD Gamez<br>وصول إلى الألعاب الحصرية<br>الاشتراك 0.25 ريال عماني يومياً. للإلغاء أرسل UNSUB IVID إلى 92149.",
      pnTitle: "يرجى إدخال رقم هاتفك للاستمتاع بألعاب غير محدودة",
      mExample: "(7/9 xxxx xxxx :<span class=\"rtl\">مثال</span>)",
      mBtn: "اشتراك",
      exitBtn: "خروج",
      stnc:
        "الاشتراك 0.25 ريال عماني يومياً ويتجدد تلقائياً حتى الإلغاء. للإلغاء أرسل UNSUB IVID إلى 92149.",
      mboxStnc: "بالضغط على 'اشترك'، سوف تتلقى رسالة تحتوي على رمز التفعيل لتأكيد اشتراكك",
      playlist: "قائمة التشغيل:",
      ch1: "قناة 1",
      ch2: "قناة 2",
      ch3: "قناة 3",
      ch4: "قناة 4",
      ch5: "قناة 5",
      ch6: "قناة 6",
      comment: "تعليق",
      playlistGroup: "مجموعة قوائم التشغيل",
      pinSent: "تم إرسال رمز التحقق إلى",
      pinTitle: "ادخل الرقم السري للمتابعة",
      pinResend: "لم يصلك الرقم السري ؟",
      pinBack: "رجوع",
      pinBtn: "قم بتأكيد",
      footerNote:
        "الشروط والأحكام:<ul><li>بالضغط على زر اشترك أعلاه، فأنت توافق على الشروط والأحكام التالية:</li><li>خدمة ZD Gamez عبر عمانتل بسعر 0.25 ريال عماني يومياً</li><li>يتجدد الاشتراك تلقائياً حتى تقوم بالإلغاء</li><li>للإلغاء أرسل UNSUB IVID إلى 92149</li><li>بالمتابعة، أنت توافق على جميع الشروط والأحكام الخاصة بالخدمة</li></ul>",
      copyright: "<span class=\"ltr\">2026&nbsp;©&nbsp;جميع الحقوق محفوظة</span>",
      errmsg: {
        m: "الرجاء إدخال رقم الجوال",
        o: "يرجى إدخال رقم عماني صحيح (8 أرقام يبدأ بـ 7 أو 9).",
        p: "الرجاء إدخال رمز PIN المكون من 4 أرقام",
        3: "الرقم السري غير صحيح",
        x: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        php: "PHP غير مفعل على الخادم.",
        proxy: "بروكسي API غير متوفر.",
        send: "تعذر إرسال PIN. حاول مرة أخرى."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || "";
  }

  function apiErrorMessage(err, data, fallbackKey) {
    if (err && err.message === "php_not_running") return errText("php");
    if (err && err.message === "proxy_missing") return errText("proxy");
    if (err) return errText("x");
    if (data && data.errorMessage) return data.errorMessage;
    if (data && data.msg) return data.msg;
    return errText(fallbackKey);
  }

  function showError(msg) {
    var box = document.querySelector(".errorBox");
    if (box) box.textContent = msg || "";
  }

  function applyLang() {
    var dict = t[lang] || t.ar;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.style.direction = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-value]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-value");
      if (dict[key] != null) el.value = dict[key];
    });
    document.querySelectorAll(".langbtn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  function setLoading(wrap, on) {
    var btn = wrap.querySelector(".button") || wrap.querySelector("input.button");
    var load = wrap.querySelector(".submitload");
    if (on) {
      if (load) load.classList.add("show");
      if (btn) {
        btn.classList.add("disabled_btn");
        btn.disabled = true;
      }
      wrap.classList.remove("pulseflash");
    } else {
      if (load) load.classList.remove("show");
      if (btn) {
        btn.classList.remove("disabled_btn");
        btn.disabled = false;
      }
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

  /* Channel playlist UI */
  (function initChannels() {
    var boxes = document.querySelectorAll(".channelbox");
    if (!boxes.length) return;
    try {
      var stored = localStorage.getItem("channel");
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed.expiration && Date.now() > parsed.expiration) {
          localStorage.removeItem("channel");
        } else if (parsed.channel) {
          boxes.forEach(function (b) {
            b.classList.toggle("active", String(b.getAttribute("data-channel")) === String(parsed.channel));
          });
        }
      }
    } catch (e) {}

    boxes.forEach(function (box) {
      box.addEventListener("click", function () {
        var channelNumber = box.getAttribute("data-channel");
        var expirationTime = Date.now() + 5 * 60 * 1000;
        try {
          localStorage.setItem(
            "channel",
            JSON.stringify({ channel: channelNumber, expiration: expirationTime })
          );
        } catch (e2) {}
        boxes.forEach(function (b) { b.classList.remove("active"); });
        box.classList.add("active");
      });
    });
  })();

  /* Mobile page */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var btnpn = document.querySelector(".btnpn");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      if (mInput.value.length >= 8) btnpn.classList.add("pulseflash");
      else btnpn.classList.remove("pulseflash");
    });

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = normalizeLocal(mInput.value);
      mInput.value = value;
      if (!value) {
        showError(errText("m"));
        return;
      }
      if (!msisdnFormat.test(value)) {
        showError(errText("o"));
        return;
      }

      showError("");
      setLoading(btnpn, true);
      var msisdn = fullMsisdn(value);
      persist("phone", msisdn);

      getUserIp(function (ip) {
        apiCall(
          "sendpin",
          {
            cid: CID,
            msisdn: msisdn,
            click_id: getClickId(),
            pub_id: track("pub_id") || "propeller",
            sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
            user_ip: ip,
            ua: navigator.userAgent || "",
            sessionKey: track("sessionKey")
          },
          function (err, data) {
            if (err || !isApiSuccess(data)) {
              setLoading(btnpn, false);
              showError(apiErrorMessage(err, data, "send"));
              return;
            }
            if (data && data.sessionKey) persist("sessionKey", data.sessionKey);
            window.location.href = "pin.html?lang=" + lang;
          }
        );
      });
    });
  }

  /* PIN page */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var btnpin = document.querySelector(".btnpin");
    var phone = track("phone");

    if (!phone) {
      window.location.href = "index.html?lang=" + lang;
      return;
    }

    var pre = document.getElementById("prefilledm");
    if (pre) pre.textContent = "+" + phone;

    var back = document.getElementById("btnBackPin");
    if (back) {
      back.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "index.html?lang=" + lang;
      });
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      showError("");
      if (pInput.value.length >= PIN_LENGTH) btnpin.classList.add("pulseflash");
      else btnpin.classList.remove("pulseflash");
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = String(pInput.value || "").replace(/\D/g, "");
      if (pin.length !== PIN_LENGTH) {
        showError(errText("p"));
        return;
      }

      showError("");
      setLoading(btnpin, true);
      var msisdn = track("phone");

      getUserIp(function (ip) {
        apiCall(
          "verifypin",
          {
            cid: CID,
            msisdn: msisdn,
            click_id: getClickId(),
            otp: pin,
            user_ip: ip,
            ua: navigator.userAgent || "",
            pub_id: track("pub_id") || "propeller",
            sub_pub_id: track("sub_pub_id") || track("zoneid") || "",
            sessionKey: track("sessionKey")
          },
          function (err, data) {
            if (err || !isApiSuccess(data)) {
              setLoading(btnpin, false);
              showError(apiErrorMessage(err, data, "3"));
              return;
            }

            firePropellerPostback(function () {
              apiCall(
                "checkstatus",
                { cid: CID, msisdn: msisdn },
                function () {
                  window.location.href = PORTAL;
                }
              );
            });
          }
        );
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
