(function () {
  "use strict";

  /**
   * Cameroon Orange — OneGaming (PropellerAds)
   * UI: LP7_Kw_Ordo_prop bluescreen (same-page MSISDN → PIN)
   * API: LP3_CM_Ornge_Prop CMcmp format
   *
   * Orange OneGaming — cid=496 — 159.89.163.174 — 100 CFA/day — PIN 4
   * MSISDN: +237, local 9 digits starting with 6
   * Postback payout: 100
   */

  var msisdnFormat = /^6[0-9]{8}$/;
  var COUNTRY = "237";
  var PIN_LENGTH = 4;
  var PAYOUT = "100";
  var CID = "496";
  var API_HOST = "159.89.163.174";

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
      if (v && String(v).indexOf("{") === -1 && String(v).indexOf("$") === -1) persist(k, v);
    });

    if (!track("pub_id")) persist("pub_id", "propeller");
    if (!track("sub_pub_id")) {
      var zone = params.get("zoneid") || params.get("zone_id") || "0";
      if (zone && String(zone).indexOf("{") === -1) persist("sub_pub_id", "ZONE" + zone);
    }

    persist("zeen_cid", CID);
    persist("api_host", API_HOST);
    persist("operator", "orange");
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
      q.set("host", API_HOST);
      return "zeen-api.php?" + q.toString();
    }
    return "http://" + API_HOST + "/prod/CMcmp/" + path + "?" + q.toString();
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

  function portalUrl(msisdn) {
    return "http://" + API_HOST + "/prod/CMcmp/redirect?cid=" + CID + "&msisdn=" + encodeURIComponent(msisdn);
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

    var payout = PAYOUT;
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

  var lang = "en";
  var t = {
    en: {
      topInfo: "100 CFA / day · Orange",
      formTitle: "Enter your phone number",
      subscribeBtn: "Subscribe",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      pinHint: "A 4-digit PIN has been sent to your phone.",
      wrongNumber: "Wrong number?",
      exitBtn: "Exit",
      tcTitle: "Terms and Conditions",
      tcAgree: "By clicking Subscribe above, you agree to the following terms and conditions",
      t1: "● OneGaming is a subscription service for Orange Cameroon at 100 CFA per day",
      t2: "● The subscription renews automatically until you cancel with your operator",
      t4: "● A 4-digit PIN will be sent to your mobile number to confirm",
      t5: "● Make sure you have a good internet connection to access content quickly",
      t6: "● By continuing you agree to the service terms and to receive subscription updates on your registered mobile number",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Cameroon mobile number (9 digits starting with 6).",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP."
      }
    },
    fr: {
      topInfo: "100 FCFA / jour · Orange",
      formTitle: "Entrez votre numéro de téléphone",
      subscribeBtn: "S’abonner",
      confirmBtn: "Confirmer",
      pinTitle: "Entrez le code PIN",
      pinHint: "Un PIN à 4 chiffres a été envoyé sur votre téléphone.",
      wrongNumber: "Mauvais numéro ?",
      exitBtn: "Quitter",
      tcTitle: "Conditions générales",
      tcAgree: "En cliquant sur S’abonner ci-dessus, vous acceptez les conditions suivantes",
      t1: "● OneGaming est un service d’abonnement Orange Cameroun à 100 FCFA par jour",
      t2: "● L’abonnement se renouvelle automatiquement jusqu’à résiliation auprès de votre opérateur",
      t4: "● Un PIN à 4 chiffres sera envoyé sur votre mobile pour confirmer",
      t5: "● Assurez-vous d’avoir une bonne connexion Internet pour accéder rapidement au contenu",
      t6: "● En continuant, vous acceptez les conditions du service et de recevoir des mises à jour sur votre numéro enregistré",
      errmsg: {
        m: "Veuillez entrer votre numéro mobile",
        o: "Veuillez entrer un numéro camerounais valide (9 chiffres commençant par 6).",
        p: "Veuillez entrer le PIN à 4 chiffres",
        "1001": "Impossible d’envoyer le PIN. Réessayez.",
        "1004": "PIN invalide ou expiré. Réessayez.",
        x: "Erreur de connexion. Réessayez.",
        php: "PHP n’est pas activé sur le serveur."
      }
    }
  };

  function errText(key) {
    return (t[lang].errmsg && t[lang].errmsg[key]) || t.en.errmsg[key] || "";
  }

  function applyLang() {
    var dict = t[lang] || t.en;
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    var bar = document.getElementById("langbar");
    if (bar) bar.value = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errBox") || document.getElementById("errBox2");
    if (box) box.textContent = msg || "";
  }

  function setLoading(btn, on) {
    if (!btn) return;
    var load = btn.querySelector(".submitload");
    if (on) {
      if (load) load.classList.add("show");
      btn.classList.add("btn-loading", "disabled_btn");
      btn.disabled = true;
    } else {
      if (load) load.classList.remove("show");
      btn.classList.remove("btn-loading", "disabled_btn");
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

  function showMsisdnStep() {
    var otp = document.getElementById("otp_div");
    var pin = document.getElementById("vcode_div");
    if (pin) pin.classList.add("hide");
    if (otp) otp.classList.remove("hide");
    var langbar = document.getElementById("langbar");
    if (langbar) langbar.style.visibility = "";
  }

  initTracking();
  getUserIp(function () {});
  getClickId();

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "fr" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
  }
  applyLang();

  var langbar = document.getElementById("langbar");
  if (langbar) {
    langbar.addEventListener("change", function () {
      lang = langbar.value === "fr" ? "fr" : "en";
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
      setLoading(submitBtn, true);
      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", msisdn);

      getUserIp(function (ip) {
        var params = {
          cid: CID,
          msisdn: msisdn,
          ip: ip || track("user_ip") || ""
        };
        var sk = track("sessionKey");
        if (sk) params.sessionKey = sk;

        callApi("sendPIN", params)
          .then(function (resp) {
            if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
            if (!isOk(resp)) {
              setLoading(submitBtn, false);
              refreshMsisdnBtn();
              showError(errMsg(resp) || errText("1001"));
              return;
            }
            showPinStep();
            var pinEl = document.getElementById("pin");
            if (pinEl) { pinEl.value = ""; pinEl.focus(); }
            document.getElementById("verifybtn").disabled = true;
          })
          .catch(function (err) {
            setLoading(submitBtn, false);
            refreshMsisdnBtn();
            showError(errText((err && err.msg) || "x"));
          });
      });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pin");
    var confirmBtn = document.getElementById("verifybtn");
    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      confirmBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", "errBox2");
      showError("");
    });
    var wrong = document.getElementById("wrongNumber");
    if (wrong) {
      wrong.addEventListener("click", function (e) {
        e.preventDefault();
        showMsisdnStep();
        setLoading(document.getElementById("submitBtn"), false);
        var sb = document.getElementById("submitBtn");
        if (sb) {
          var mi = document.getElementById("msisdn");
          if (mi) {
            var value = normalizeLocal(mi.value);
            sb.disabled = !msisdnFormat.test(value);
          }
        }
      });
    }
    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        showError(errText("p"), "errBox2");
        return;
      }
      showError("", "errBox2");
      showError("");
      setLoading(confirmBtn, true);

      getUserIp(function (ip) {
        var msisdn = track("msisdn") || track("phone");
        var params = {
          cid: CID,
          msisdn: msisdn,
          pin: otp,
          ip: ip || track("user_ip") || ""
        };
        var sk = track("sessionKey");
        if (sk) params.sessionKey = sk;

        callApi("verifyPIN", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(confirmBtn, false);
              confirmBtn.disabled = false;
              showError(errMsg(resp) || errText("1004"), "errBox2");
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalUrl(msisdn));
            persist("pb_amount", PAYOUT);
            firePostback(function () {
              window.location.href = "thankyou.html?lang=" + lang;
            });
          })
          .catch(function (err) {
            setLoading(confirmBtn, false);
            confirmBtn.disabled = false;
            showError(errText((err && err.msg) || "x"), "errBox2");
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
