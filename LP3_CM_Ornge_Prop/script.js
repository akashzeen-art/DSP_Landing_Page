(function () {
  "use strict";

  /**
   * Cameroon Orange — OneGaming (PropellerAds)
   * UI: Theme 340 dark modal (Watch / Download → modal PIN flow)
   *
   * Orange OneGaming — cid=496 — 159.89.163.174 — 100 CFA/day — PIN 4
   * MSISDN: +237, local 9 digits starting with 6
   * (Vendor sample used 241; Country = Cameroon → 237)
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
      if (v && String(v).indexOf("{") === -1) persist(k, v);
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
      watchBtn: "Watch",
      downloadBtn: "Download",
      formTitle: "Enter your phone number",
      continueBtn: "Continue",
      confirmBtn: "Confirm",
      pinTitle: "Enter PIN code",
      wrongNumber: "Wrong number?",
      termsLink: "Terms & Conditions",
      privacyLink: "Privacy Policy",
      tcTitle: "Terms And Conditions",
      ppTitle: "Privacy Policy",
      tcBody: "By continuing you agree to subscribe to OneGaming (Orange Cameroon) at 100 CFA per day. The subscription renews automatically until cancelled with your operator. PIN length is 4 digits.",
      ppBody: "We collect your mobile number and technical data (IP, user agent) only to process the subscription and deliver the service.",
      footerNote: "OneGaming is a subscription service that auto-renews at 100 CFA every 1 day for Orange Cameroon subscribers.",
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
      watchBtn: "Regarder",
      downloadBtn: "Télécharger",
      formTitle: "Entrez votre numéro de téléphone",
      continueBtn: "Continuer",
      confirmBtn: "Confirmer",
      pinTitle: "Entrez le code PIN",
      wrongNumber: "Mauvais numéro ?",
      termsLink: "Conditions générales",
      privacyLink: "Politique de confidentialité",
      tcTitle: "Conditions générales",
      ppTitle: "Politique de confidentialité",
      tcBody: "En continuant, vous acceptez de vous abonner à OneGaming (Orange Cameroun) à 100 FCFA par jour. L’abonnement se renouvelle automatiquement jusqu’à résiliation auprès de votre opérateur. PIN de 4 chiffres.",
      ppBody: "Nous collectons votre numéro mobile et des données techniques (IP, user agent) uniquement pour traiter l’abonnement et fournir le service.",
      footerNote: "OneGaming est un service d’abonnement renouvelé automatiquement à 100 FCFA / jour pour les abonnés Orange Cameroun.",
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
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    var bar = document.getElementById("langbar");
    if (bar) bar.value = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function showError(msg, id) {
    var box = document.getElementById(id || "errBox");
    if (box) box.textContent = msg || "";
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn.classList.add("btn-loading", "disabled_btn");
      btn.disabled = true;
    } else {
      btn.classList.remove("btn-loading", "disabled_btn");
    }
  }

  function showStep(id) {
    document.querySelectorAll(".step").forEach(function (el) {
      el.classList.remove("active");
    });
    var step = document.getElementById(id);
    if (step) step.classList.add("active");
    var foot = document.getElementById("div3");
    if (foot) foot.style.display = id === "vcode_div" ? "none" : "";
  }

  function openModal() {
    var modal = document.getElementById("newModal");
    if (modal) modal.classList.add("show");
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

  setTimeout(openModal, 1000);
  ["btnWatch", "btnDownload"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", openModal);
  });

  document.getElementById("openTerms") && document.getElementById("openTerms").addEventListener("click", function () {
    document.getElementById("termsModal").classList.add("open");
  });
  document.getElementById("openPrivacy") && document.getElementById("openPrivacy").addEventListener("click", function () {
    document.getElementById("privacyModal").classList.add("open");
  });
  document.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", function () {
      var id = el.getAttribute("data-close");
      var m = document.getElementById(id);
      if (m) m.classList.remove("open");
    });
  });

  var mForm = document.getElementById("msisdnForm");
  var mInput = document.getElementById("msisdn");
  var submitBtn = document.getElementById("submitBtn");

  function refreshMsisdnBtn() {
    var value = normalizeLocal(mInput.value);
    var ok = msisdnFormat.test(value);
    if (!submitBtn.classList.contains("btn-loading")) submitBtn.disabled = !ok;
    return { value: value, ok: ok };
  }

  if (mInput) {
    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      showError("");
      refreshMsisdnBtn();
    });
    refreshMsisdnBtn();
  }

  if (mForm) {
    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdnBtn();
      if (!state.value) { showError(errText("m")); return; }
      if (!state.ok) { showError(errText("o")); return; }
      showError("");

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", msisdn);
      setLoading(submitBtn, true);

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
            setLoading(submitBtn, false);
            refreshMsisdnBtn();
            if (!isOk(resp)) {
              showError(errMsg(resp) || errText("1001"));
              return;
            }
            showStep("vcode_div");
            var pinEl = document.getElementById("pin");
            if (pinEl) { pinEl.value = ""; pinEl.focus(); }
            document.getElementById("verifyBtn").disabled = true;
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
  var pInput = document.getElementById("pin");
  var verifyBtn = document.getElementById("verifyBtn");

  if (pInput) {
    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      verifyBtn.disabled = pInput.value.length !== PIN_LENGTH;
      showError("", "errBox2");
    });
  }

  var wrong = document.getElementById("wrongNumber");
  if (wrong) {
    wrong.addEventListener("click", function (e) {
      e.preventDefault();
      showStep("otp_div");
    });
  }

  if (pForm) {
    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = String(pInput.value || "").replace(/\D/g, "");
      if (pin.length !== PIN_LENGTH) { showError(errText("p"), "errBox2"); return; }

      showError("", "errBox2");
      setLoading(verifyBtn, true);

      getUserIp(function (ip) {
        var msisdn = track("msisdn") || track("phone");
        var params = {
          cid: CID,
          msisdn: msisdn,
          pin: pin,
          ip: ip || track("user_ip") || ""
        };
        var sk = track("sessionKey");
        if (sk) params.sessionKey = sk;

        callApi("verifyPIN", params)
          .then(function (resp) {
            if (!isOk(resp)) {
              setLoading(verifyBtn, false);
              verifyBtn.disabled = false;
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
            setLoading(verifyBtn, false);
            verifyBtn.disabled = false;
            showError(errText((err && err.msg) || "x"), "errBox2");
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
