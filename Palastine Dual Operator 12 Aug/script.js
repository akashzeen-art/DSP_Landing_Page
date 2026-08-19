(function () {
  "use strict";

  /**
   * Palestine Dual Operator — Zeen Digital Z Game + PropellerAds postback
   *
   * Jawwal  (PS JAWAL):  cid=3008, portal cid=570, 1.16 NIS/day, unsub 0257 → 37799
   * Ooredoo (PS OREDOO): cid=3007, portal cid=569, 1.5 NIS/day,  unsub 08 → 6976
   * PIN length: 4
   *
   * Flow: MSISDN → choose operator → sendpin → pin → verifypin → Propeller → thankyou → portal
   *
   * Campaign:
   *   https://click2funbox.com/ps-dual/?clickid=${SUBID}&zoneid={zone_id}
   *
   * Postback (on verify success):
   *   https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}
   *   visitor_id = same clickid (${SUBID})
   *   payout = 1.16 (Jawwal) or 1.5 (Ooredoo)
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
      footerEn:
        "Z Game — Jawwal PS: NIS 1.16/day. To cancel, send SMS 0257 to 37799.",
      footerAr:
        "Z Game — جوال: 1.16 شيكل يومياً. للإلغاء أرسل 0257 إلى 37799."
    },
    ooredoo: {
      key: "ooredoo",
      cid: "3007",
      portalCid: "569",
      name: "Ooredoo",
      price: "1.5",
      footerEn:
        "Z Game — Ooredoo PS: NIS 1.5/day. To cancel, send SMS 08 to 6976.",
      footerAr:
        "Z Game — أوريدو: 1.5 شيكل يومياً. للإلغاء أرسل 08 إلى 6976."
    }
  };

  var FOOTER_BOTH_EN =
    "Z Game — Jawwal PS: NIS 1.16/day (unsubscribe: SMS 0257 to 37799). Ooredoo PS: NIS 1.5/day (unsubscribe: SMS 08 to 6976).";
  var FOOTER_BOTH_AR =
    "Z Game — جوال: 1.16 شيكل يومياً (إلغاء: 0257 إلى 37799). أوريدو: 1.5 شيكل يومياً (إلغاء: 08 إلى 6976).";

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

  function setTrack(k, v) {
    persist(k, v);
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
      params.get("sub_id") ||
      params.get("token") ||
      "";
    if (clickId && clickId !== "${SUBID}" && String(clickId).toLowerCase() !== "clickid") {
      setTrack("click_id", clickId);
    }

    ["pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"].forEach(function (k) {
      var v = params.get(k);
      if (v) setTrack(k, v);
    });

    if (!track("pub_id")) setTrack("pub_id", "ADSTERRA");
    if (!track("sub_pub_id")) {
      var zone = params.get("zoneid") || params.get("zone_id") || "0";
      setTrack("sub_pub_id", "ZONE" + zone);
    }
    if (!track("click_id")) {
      setTrack("click_id", "local_" + Date.now());
    }
  }

  function getUserIp(cb) {
    if (track("user_ip")) {
      cb(track("user_ip"));
      return;
    }
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      if (ip) setTrack("user_ip", ip);
      cb(ip || "");
    }
    var t = setTimeout(function () { finish(""); }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        clearTimeout(t);
        finish((d && d.ip) || "");
      })
      .catch(function () {
        clearTimeout(t);
        finish("");
      });
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
        if (/^\s*<\?php/i.test(text)) {
          throw { status: false, msg: "php" };
        }
        try {
          return JSON.parse(text);
        } catch (e) {
          throw { status: false, msg: "x", raw: text };
        }
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

  var POSTBACK = {
    url: "https://ad.propellerads.com/conversion.php",
    aid: "3898869",
    pid: "",
    tid: "154120"
  };

  /* ---- PropellerAds postback ---- */
  function firePostback(done) {
    var clickId = track("click_id");
    var once = false;
    function finish(ok) {
      if (once) return;
      once = true;
      if (typeof done === "function") done(ok);
    }

    if (!clickId || String(clickId).indexOf("local_") === 0) {
      finish(false);
      return;
    }

    var opKey = track("operator") || "jawwal";
    var op = OPERATORS[opKey] || OPERATORS.jawwal;
    var payout = op.price || "1";

    var qs =
      "aid=" + encodeURIComponent(POSTBACK.aid) +
      "&pid=" + encodeURIComponent(POSTBACK.pid || "") +
      "&tid=" + encodeURIComponent(POSTBACK.tid) +
      "&visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);

    var direct = POSTBACK.url + "?" + qs;
    var proxy = "propeller-pb.php?visitor_id=" + encodeURIComponent(clickId) +
      "&payout=" + encodeURIComponent(payout);

    try {
      var img = new Image();
      img.onload = function () { finish(true); };
      img.onerror = function () { finish(true); };
      img.src = direct + "&_t=" + Date.now();
    } catch (e) {}

    try {
      fetch(direct, { method: "GET", mode: "no-cors", cache: "no-store" })
        .then(function () { finish(true); })
        .catch(function () { finish(true); });
    } catch (e2) {}

    if (useProxy) {
      try {
        fetch(proxy, { method: "GET", cache: "no-store" })
          .then(function () { finish(true); })
          .catch(function () { finish(true); });
      } catch (e3) {}
    }

    setTimeout(function () { finish(false); }, 4000);
  }

  /* ---- i18n ---- */
  var t = {
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy unlimited videos",
      mExample: "(example: +970 5X XXX XXXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      opTitle: "Choose your operator",
      opOoredoo: "Ooredoo",
      opJawwal: "Jawwal",
      opOoredooPrice: "NIS 1.5 / day",
      opJawwalPrice: "NIS 1.16 / day",
      pinTitle: "Enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
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
      headerTitle: "شاهد الآن",
      pnTitle: "يرجى إدخال رقم هاتفك للاستمتاع بمقاطع فيديو غير محدودة",
      mExample: "(مثال: +970 5X XXX XXXX)",
      mBtn: "اشترك",
      mSecure: "بياناتك الشخصية محمية ومشفرة",
      opTitle: "اختر المشغّل",
      opOoredoo: "أوريدو",
      opJawwal: "جوال",
      opOoredooPrice: "1.5 شيكل / يوم",
      opJawwalPrice: "1.16 شيكل / يوم",
      pinTitle: "أدخل رمز PIN المكون من 4 أرقام",
      pinExample: "(مثال: 1234)",
      pinBtn: "تأكيد",
      pinSecure: "لا تشارك رمز التحقق مع أي شخص",
      footerNote: FOOTER_BOTH_AR,
      copyright: "<span class=\"rtl\">2026&nbsp;&copy;&nbsp;جميع الحقوق محفوظة</span>",
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

  function getLang() {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get("lang");
    if (urlLang && t[urlLang]) return urlLang;
    try {
      return localStorage.getItem("lang") || "ar";
    } catch (e) {
      return "ar";
    }
  }

  function applyLang(lang) {
    if (!t[lang]) lang = "ar";
    var dict = t[lang];
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.querySelectorAll(".langbtn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
    try {
      localStorage.setItem("lang", lang);
    } catch (e) {}
    return dict;
  }

  var currentLang = getLang();

  function errText(key) {
    return (t[currentLang].errmsg && t[currentLang].errmsg[key]) || t.en.errmsg[key] || "";
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

  initTracking();
  applyLang(currentLang);
  getUserIp(function () {});

  document.querySelectorAll(".langbtn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      currentLang = btn.getAttribute("data-lang");
      applyLang(currentLang);
      var url = new URL(window.location.href);
      url.searchParams.set("lang", currentLang);
      window.history.replaceState({}, "", url);
    });
  });

  /* Intro animation on index */
  if (document.getElementById("myBar") && document.getElementById("mbox")) {
    var bar = document.getElementById("myBar");
    var w = 1;
    var timer = setInterval(function () {
      if (w >= 100) clearInterval(timer);
      else {
        w++;
        bar.style.width = w + "%";
      }
    }, 10);
    setTimeout(function () {
      var bg = document.getElementById("screenbg");
      if (bg) bg.style.opacity = "1";
    }, 800);
    setTimeout(function () {
      var box = document.getElementById("loadbox");
      if (box) {
        box.style.display = "block";
        box.classList.add("resetloadbox");
      }
    }, 1500);
  }

  /* Mobile page → operator */
  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var checkNum = 9;
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= checkNum) {
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
      setTrack("phone", fullMsisdn(value));
      setTrack("msisdn", fullMsisdn(value));
      window.location.href = "operator.html?lang=" + currentLang;
    });
  }

  /* Operator page → sendpin → pin */
  var obox = document.getElementById("obox");
  if (obox) {
    if (!track("phone") && !track("msisdn")) {
      window.location.href = "index.html?lang=" + currentLang;
    } else {
      document.querySelectorAll(".opbtn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-operator");
          var op = OPERATORS[key];
          if (!op) {
            showError(errText("op"));
            return;
          }

          var msisdn = track("msisdn") || track("phone");
          showError("");
          document.querySelectorAll(".opbtn").forEach(function (b) {
            b.classList.add("disabled_btn");
          });
          var opLoad = document.getElementById("opLoad");
          if (opLoad) opLoad.classList.add("show");

          setTrack("operator", key);
          setTrack("zeen_cid", op.cid);
          setTrack("portal_cid", op.portalCid);

          getUserIp(function (ip) {
            var params = {
              cid: op.cid,
              msisdn: msisdn,
              click_id: track("click_id"),
              pub_id: track("pub_id") || "ADSTERRA",
              sub_pub_id: track("sub_pub_id") || "0",
              user_ip: ip || track("user_ip") || "",
              ua: navigator.userAgent || ""
            };
            var sk = track("sessionKey");
            if (sk) params.sessionKey = sk;

            callApi("sendpin", params)
              .then(function (resp) {
                if (resp && resp.sessionKey) setTrack("sessionKey", resp.sessionKey);
                if (!isOk(resp)) {
                  document.querySelectorAll(".opbtn").forEach(function (b) {
                    b.classList.remove("disabled_btn");
                  });
                  if (opLoad) opLoad.classList.remove("show");
                  showError(errText(errCode(resp)) || errText("1001"));
                  return;
                }
                window.location.href = "pin.html?lang=" + currentLang;
              })
              .catch(function (err) {
                document.querySelectorAll(".opbtn").forEach(function (b) {
                  b.classList.remove("disabled_btn");
                });
                if (opLoad) opLoad.classList.remove("show");
                var code = (err && err.msg) || "x";
                showError(errText(code));
              });
          });
        });
      });
    }
  }

  /* PIN page → verifypin → postback → thankyou */
  var pForm = document.getElementById("pboxform");
  if (pForm) {
    var pInput = document.getElementById("p");
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + currentLang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + currentLang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = currentLang === "ar" ? op.footerAr : op.footerEn;
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      showError("");
      if (pInput.value.length >= PIN_LENGTH) {
        pinBox.classList.remove("pulseflash");
        btnpin.classList.add("pulseflash");
      } else {
        btnpin.classList.remove("pulseflash");
      }
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"));
        return;
      }
      if (!op) {
        showError(errText("op"));
        return;
      }

      showError("");
      setLoading(btnpin, true);

      getUserIp(function (ip) {
        var params = {
          cid: op.cid,
          msisdn: track("msisdn") || track("phone"),
          click_id: track("click_id"),
          otp: otp,
          pub_id: track("pub_id") || "ADSTERRA",
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
            setTrack("converted", "1");
            setTrack("portal_url", portalFor(op));
            firePostback(function () {
              window.location.href = "thankyou.html?lang=" + currentLang;
            });
          })
          .catch(function (err) {
            setLoading(btnpin, false);
            var code = (err && err.msg) || "x";
            showError(errText(code));
          });
      });
    });
  }
})();
