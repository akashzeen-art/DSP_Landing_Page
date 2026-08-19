(function () {
  "use strict";

  /**
   * Cameroon Dual Operator — PropellerAds
   * UI: LP3 movstreamlite (Watch Now / video frame)
   *
   * Orange OneGaming — cid=496 — host 159.89.163.174 — 100 CFA/day — PIN 4
   * MTN OnCook       — cid=17  — host 168.144.122.72  — 100 CFA/day — PIN 4
   *
   * Flow: MSISDN → operator → sendPIN → pin → verifyPIN → Propeller → thankyou → redirect
   * Postback payout: 100
   */

  var msisdnFormat = /^6[0-9]{8}$/;
  var COUNTRY = "237";
  var PIN_LENGTH = 4;

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    orange: {
      key: "orange",
      cid: "496",
      host: "159.89.163.174",
      name: "Orange",
      service: "OneGaming",
      price: "100",
      footerFr: "OneGaming — Orange : 100 FCFA / jour.",
      footerEn: "OneGaming — Orange: 100 CFA / day."
    },
    mtn: {
      key: "mtn",
      cid: "17",
      host: "168.144.122.72",
      name: "MTN",
      service: "OnCook",
      price: "100",
      footerFr: "OnCook — MTN : 100 FCFA / jour.",
      footerEn: "OnCook — MTN: 100 CFA / day."
    }
  };

  var FOOTER_BOTH_FR =
    "OneGaming — Orange : 100 FCFA / jour. OnCook — MTN : 100 FCFA / jour.";
  var FOOTER_BOTH_EN =
    "OneGaming — Orange: 100 CFA / day. OnCook — MTN: 100 CFA / day.";

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
    var host = q.get("host");
    q.delete("host");
    return "http://" + host + "/prod/CMcmp/" + path + "?" + q.toString();
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
    var r = String(resp.response || "").toUpperCase();
    if (r === "SUCCESS" || r === "ACTIVE") return true;
    if (resp.status === true || resp.status === "true") return true;
    var m = String(resp.errorMessage || resp.msg || "").toLowerCase();
    return /success|otp sent|otp verified|active/.test(m);
  }

  function errMsg(resp) {
    return String((resp && (resp.errorMessage || resp.msg || resp.message)) || "");
  }

  function portalFor(op, msisdn) {
    return "http://" + op.host + "/prod/CMcmp/redirect?cid=" + op.cid + "&msisdn=" + encodeURIComponent(msisdn);
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

    var opKey = track("operator") || "mtn";
    var op = OPERATORS[opKey] || OPERATORS.mtn;
    var payout = op.price || "100";

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

  var lang = "fr";
  var t = {
    fr: {
      headerTitle: "Regarder maintenant",
      pnTitle: "Entrez votre numéro mobile pour profiter des contenus",
      mExample: "(exemple : +237 6XX XXX XXX)",
      mBtn: "S’abonner",
      mSecure: "Vos données personnelles sont protégées et chiffrées",
      opTitle: "Choisissez votre opérateur",
      opOrange: "Orange",
      opMtn: "MTN",
      opOrangePrice: "OneGaming · 100 FCFA / jour",
      opMtnPrice: "OnCook · 100 FCFA / jour",
      pinTitle: "Entrez le PIN à 4 chiffres",
      pinExample: "(exemple : 1234)",
      pinBtn: "Confirmer",
      pinSecure: "Ne partagez pas votre code de vérification",
      footerNote: FOOTER_BOTH_FR,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;Tous droits réservés",
      errmsg: {
        m: "Veuillez entrer votre numéro mobile",
        o: "Veuillez entrer un numéro camerounais valide (9 chiffres commençant par 6).",
        op: "Veuillez choisir un opérateur",
        p: "Veuillez entrer le PIN à 4 chiffres",
        "1001": "Impossible d’envoyer le PIN. Réessayez.",
        "1004": "PIN invalide ou expiré. Réessayez.",
        x: "Erreur de connexion. Réessayez.",
        php: "PHP n’est pas activé sur le serveur.",
        phone: "Veuillez d’abord entrer votre numéro."
      }
    },
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy the content",
      mExample: "(example: +237 6XX XXX XXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      opTitle: "Choose your operator",
      opOrange: "Orange",
      opMtn: "MTN",
      opOrangePrice: "OneGaming · 100 CFA / day",
      opMtnPrice: "OnCook · 100 CFA / day",
      pinTitle: "Enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
      footerNote: FOOTER_BOTH_EN,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Cameroon mobile number (9 digits starting with 6).",
        op: "Please choose an operator",
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
    var dict = t[lang] || t.fr;
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
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

  initTracking();
  getUserIp(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "fr" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "fr"; } catch (e) { lang = "fr"; }
    if (lang !== "fr" && lang !== "en") lang = "fr";
  }
  applyLang();

  document.querySelectorAll(".langbtn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      lang = btn.getAttribute("data-lang") || "fr";
      applyLang();
      var url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url);
    });
  });

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

  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= 9) {
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
          persist("api_host", op.host);

          getUserIp(function (ip) {
            var params = {
              host: op.host,
              cid: op.cid,
              msisdn: msisdn,
              ip: ip || track("user_ip") || ""
            };
            var sk = track("sessionKey");
            if (sk) params.sessionKey = sk;

            callApi("sendPIN", params)
              .then(function (resp) {
                if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
                if (!isOk(resp)) {
                  document.querySelectorAll(".opbtn").forEach(function (b) {
                    b.classList.remove("disabled_btn");
                  });
                  if (opLoad) opLoad.classList.remove("show");
                  showError(errMsg(resp) || errText("1001"));
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
    var btnpin = document.querySelector(".btnpin") || document.querySelector(".btnpn");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = lang === "en" ? op.footerEn : op.footerFr;
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      showError("");
      if (pInput.value.length >= PIN_LENGTH) {
        pinBox.classList.remove("pulseflash");
        btnpin.classList.add("pulseflash");
      } else {
        btnpin.classList.remove("pulseflash");
        if (pInput.value.length === 0) pinBox.classList.add("pulseflash");
      }
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = String(pInput.value || "").replace(/\D/g, "");
      if (pin.length !== PIN_LENGTH) { showError(errText("p")); return; }
      if (!op) { showError(errText("op")); return; }

      showError("");
      setLoading(btnpin, true);

      getUserIp(function (ip) {
        var msisdn = track("msisdn") || track("phone");
        var params = {
          host: op.host,
          cid: op.cid,
          msisdn: msisdn,
          pin: pin,
          ip: ip || track("user_ip") || ""
        };
        var sk = track("sessionKey");
        if (sk) params.sessionKey = sk;

        callApi("verifyPIN", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(btnpin, false);
              showError(errMsg(resp) || errText("1004"));
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalFor(op, msisdn));
            persist("pb_amount", op.price || "100");
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
