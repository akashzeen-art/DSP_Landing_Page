(function () {
  "use strict";

  /**
   * Cameroon Orange — OneGaming (cid=496) CMcmp
   * 100 CFA/day — PIN 4
   * Host: http://159.89.163.174/prod/CMcmp/
   * Advertizer: clickid=[[subid]] amount=[[amount]] advertiser_id=Zeen1041
   * UI: Theme-496 (same as LP10_IQ_Aciacll_Clkdu)
   * No antifraud
   */

  var msisdnFormat = /^6[0-9]{8}$/;
  var COUNTRY = "237";
  var PIN_LENGTH = 4;
  var CID = "496";
  var AMOUNT = "100";
  var API_HOST = "159.89.163.174";
  var API_BASE = "http://" + API_HOST + "/prod/CMcmp";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var POSTBACK = {
    url: "http://postback.advertizer.com/pb.php",
    advertiser_id: "Zeen1041",
    key: "a5b193ada1cbd22a987bfe876496ac40"
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
    return API_BASE + "/" + path + "?" + q.toString();
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
    var m = String(resp.errorMessage || resp.msg || "").toLowerCase();
    return /success|otp sent|otp verified|active/.test(m);
  }

  function errMsg(resp) {
    return String((resp && (resp.errorMessage || resp.msg || resp.message)) || "");
  }

  function portalUrl(msisdn) {
    return API_BASE + "/redirect?cid=" + CID + "&msisdn=" + encodeURIComponent(msisdn);
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

  var lang = "en";
  var t = {
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
        "OneGaming is a subscription service that auto-renews at 100 CFA every 1 day for Orange Cameroon subscribers.",
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
      heroTitle: "Vous êtes à une étape de regarder",
      formTitle: "Entrez votre numéro de téléphone",
      continueBtn: "Continuer",
      confirmBtn: "Confirmer",
      pinTitle: "Entrez le code PIN",
      pinHint: "Un PIN à 4 chiffres a été envoyé sur votre téléphone.",
      wrongNumber: "Mauvais numéro ?",
      termsLink: "Conditions générales",
      privacyLink: "Politique de confidentialité",
      disclaimer:
        "OneGaming est un service d’abonnement renouvelé automatiquement à 100 FCFA / jour pour les abonnés Orange Cameroun.",
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
            setLoading(false);
            refreshMsisdnBtn();
            if (!isOk(resp)) {
              showError(errMsg(resp) || errText("1001"));
              return;
            }
            showPinStep();
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
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pincode");
    var confirmBtn = document.getElementById("verifybtn");
    var errId = "errortext2";

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
      var pin = String(pInput.value || "").replace(/\D/g, "");
      if (pin.length !== PIN_LENGTH) {
        showError(errText("p"), errId);
        return;
      }
      showError("", errId);
      setLoading(true);

      getUserIp(function (ip) {
        var msisdn = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
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
              setLoading(false);
              confirmBtn.disabled = false;
              showError(errMsg(resp) || errText("1004"), errId);
              return;
            }
            persist("converted", "1");
            persist("portal_url", portalUrl(msisdn));
            persist("pb_amount", AMOUNT);
            callApi("status", { cid: CID, msisdn: msisdn }).catch(function () {});
            firePostback(function () {
              window.location.href = "thankyou.html?lang=" + lang;
            });
          })
          .catch(function (err) {
            setLoading(false);
            confirmBtn.disabled = false;
            showError(errText((err && err.msg) || "x"), errId);
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
