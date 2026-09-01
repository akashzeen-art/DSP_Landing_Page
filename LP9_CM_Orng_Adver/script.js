(function () {
  "use strict";

  /**
   * Cameroon Orange — OneGaming (cid=500) CMcmp — Advertizer
   * UI: LP3 movstreamlite (Watch Now / video frame)
   * Flow: index (MSISDN) → sendPIN → pin.html → verifyPIN → postback → thankyou
   */

  var msisdnFormat = /^6[0-9]{8}$/;
  var COUNTRY = "237";
  var PIN_LENGTH = 4;
  var CID = "500";
  var AMOUNT = "1";
  var API_HOST = "159.89.163.174";
  var API_BASE = "http://" + API_HOST + "/prod/CMcmp";

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

  var ipInflight = null;

  function getUserIp(cb) {
    var cached = track("user_ip");
    if (cached) { cb(cached); return; }
    if (typeof cb !== "function") return;
    if (ipInflight) { ipInflight.push(cb); return; }
    ipInflight = [cb];
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      if (ip) persist("user_ip", ip);
      var list = ipInflight || [];
      ipInflight = null;
      list.forEach(function (fn) { try { fn(ip || ""); } catch (e) {} });
    }
    var t = setTimeout(function () { finish(""); }, 1500);
    var opts = { method: "GET", credentials: "omit", cache: "no-store" };
    if (typeof AbortController !== "undefined") {
      var ac = new AbortController();
      opts.signal = ac.signal;
      setTimeout(function () { try { ac.abort(); } catch (e) {} }, 1400);
    }
    fetch("https://api.ipify.org?format=json", opts)
      .then(function (r) { if (!r.ok) throw new Error("ipify"); return r.json(); })
      .then(function (d) { clearTimeout(t); finish((d && d.ip) || ""); })
      .catch(function () { clearTimeout(t); finish(""); });
  }

  function clientIp() {
    return track("user_ip") || "0.0.0.0";
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
    var opts = { method: "GET", credentials: "omit", cache: "no-store" };
    var timer;
    if (typeof AbortController !== "undefined") {
      var ac = new AbortController();
      opts.signal = ac.signal;
      timer = setTimeout(function () { try { ac.abort(); } catch (e) {} }, 20000);
    }
    return fetch(apiUrl(path, params), opts).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === "AbortError") throw { msg: "x" };
      throw err;
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

  function mapApiError(raw) {
    var m = String(raw || "").toLowerCase();
    if (!m) return "";
    if (m.indexOf("unknown user") !== -1) return errText("unknown");
    if (m.indexOf("technical") !== -1) return errText("tech");
    return raw;
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
      .then(function (r) { if (r.ok) persist("pb_sent", "1"); finish(r.ok); })
      .catch(function () { finish(false); });
    setTimeout(function () { finish(true); }, 4000);
  }

  var lang = "en";
  var t = {
    en: {
      headerTitle: "Watch Now",
      pnTitle: "Please enter your mobile number to enjoy the content",
      mExample: "(example: +237 6XX XXX XXX)",
      mBtn: "Subscribe",
      mSecure: "Your personal data is protected and encrypted",
      pinTitle: "Enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn: "Confirm",
      pinSecure: "Do not share your verification code with anyone",
      footerNote: "OneGaming is a subscription service that auto-renews at 100 CFA every 1 day for Orange Cameroon subscribers.",
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Cameroon mobile number (9 digits starting with 6).",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        unknown: "This number is not eligible on Orange Cameroon. Please use an active Orange number.",
        tech: "Unable to send PIN for this number. Please try again on Orange mobile data, or use a different Orange number.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP.",
        phone: "Please enter your number first."
      }
    },
    fr: {
      headerTitle: "Regarder maintenant",
      pnTitle: "Entrez votre numéro mobile pour profiter des contenus",
      mExample: "(exemple : +237 6XX XXX XXX)",
      mBtn: "S'abonner",
      mSecure: "Vos données personnelles sont protégées et chiffrées",
      pinTitle: "Entrez le PIN à 4 chiffres",
      pinExample: "(exemple : 1234)",
      pinBtn: "Confirmer",
      pinSecure: "Ne partagez pas votre code de vérification",
      footerNote: "OneGaming est un service d'abonnement renouvelé automatiquement à 100 FCFA / jour pour les abonnés Orange Cameroun.",
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;Tous droits réservés",
      errmsg: {
        m: "Veuillez entrer votre numéro mobile",
        o: "Veuillez entrer un numéro camerounais valide (9 chiffres commençant par 6).",
        p: "Veuillez entrer le PIN à 4 chiffres",
        "1001": "Impossible d'envoyer le PIN. Réessayez.",
        "1004": "PIN invalide ou expiré. Réessayez.",
        unknown: "Ce numéro n'est pas éligible sur Orange Cameroun. Utilisez un numéro Orange actif.",
        tech: "Impossible d'envoyer le PIN pour ce numéro. Réessayez en données mobiles Orange ou avec un autre numéro Orange.",
        x: "Erreur de connexion. Réessayez.",
        php: "PHP n'est pas activé sur le serveur.",
        phone: "Veuillez d'abord entrer votre numéro."
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
    if (!wrap) return;
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
  getClickId();

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "fr" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
    if (lang !== "fr" && lang !== "en") lang = "en";
  }
  applyLang();

  document.querySelectorAll(".langbtn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      lang = btn.getAttribute("data-lang") || "en";
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
      else { w++; bar.style.width = w + "%"; }
    }, 10);
    setTimeout(function () {
      var bg = document.getElementById("screenbg");
      if (bg) bg.style.opacity = "1";
    }, 800);
    setTimeout(function () {
      var box = document.getElementById("loadbox");
      if (box) { box.style.display = "block"; box.classList.add("resetloadbox"); }
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
      persist("phone", value);
      persist("msisdn", msisdn);
      getUserIp(function () {});

      var params = { cid: CID, msisdn: msisdn, ip: clientIp() };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("sendPIN", params)
        .then(function (resp) {
          if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
          if (!isOk(resp)) {
            setLoading(btnpn, false);
            showError(mapApiError(errMsg(resp)) || errText("1001"));
            return;
          }
          window.location.href = "pin.html?lang=" + lang;
        })
        .catch(function (err) {
          setLoading(btnpn, false);
          showError(errText((err && err.msg) || "x"));
        });
    });
  }

  var pForm = document.getElementById("pboxform");
  if (pForm) {
    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    }

    var pInput = document.getElementById("p");
    var pinBox = document.querySelector(".pinBox");
    var btnpin = document.querySelector(".btnpin");

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
      showError("");
      setLoading(btnpin, true);
      getUserIp(function () {});

      var msisdn = track("msisdn") || fullMsisdn(track("phone"));
      var params = { cid: CID, msisdn: msisdn, pin: pin, ip: clientIp() };
      var sk = track("sessionKey");
      if (sk) params.sessionKey = sk;

      callApi("verifyPIN", params)
        .then(function (resp) {
          if (!isOk(resp)) {
            setLoading(btnpin, false);
            showError(mapApiError(errMsg(resp)) || errText("1004"));
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
          setLoading(btnpin, false);
          showError(errText((err && err.msg) || "x"));
        });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
