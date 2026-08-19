(function () {
  "use strict";

  /**
   * Sri Lanka Dual Operator — PropellerAds
   * UI: loaderlite (same as LP1_Dua_Palastine_Propellar)
   *
   * Mobitel (cid=3057) portal 342 — 10 LKR/day — unsub C XG → 85868
   * Hutch   (cid=3058) portal 288 — 10 LKR/day — unsub C XG → 87689
   *
   * Flow: MSISDN → operator → sendpin → pin → verifypin → Propeller → thankyou → portal
   * Postback payout: 10 (both operators)
   */

  var msisdnFormat = /^7[0-9]{8}$/;
  var COUNTRY = "94";
  var PIN_LENGTH = 4;
  var ZEEN = "http://64.225.85.48/adnet";

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  var OPERATORS = {
    mobitel: {
      key: "mobitel",
      cid: "3057",
      portalCid: "342",
      name: "Mobitel",
      price: "10",
      footerEn: "ZD Jam Magic Escapes — Mobitel: 10 LKR/day. To cancel, send SMS C XG to 85868.",
      footerSi: "ZD Jam Magic Escapes — මොබිටෙල්: දිනකට රු. 10. අවලංගු කිරීමට C XG 85868 ට යවන්න."
    },
    hutch: {
      key: "hutch",
      cid: "3058",
      portalCid: "288",
      name: "Hutch",
      price: "10",
      footerEn: "ZD X Gamez — Hutch: 10 LKR/day. To cancel, send SMS C XG to 87689.",
      footerSi: "ZD X Gamez — හච්: දිනකට රු. 10. අවලංගු කිරීමට C XG 87689 ට යවන්න."
    }
  };

  var FOOTER_BOTH_EN =
    "ZD Jam Magic Escapes — Mobitel: 10 LKR/day (unsubscribe: SMS C XG to 85868). ZD X Gamez — Hutch: 10 LKR/day (unsubscribe: SMS C XG to 87689).";
  var FOOTER_BOTH_SI =
    "ZD Jam Magic Escapes — මොබිටෙල්: දිනකට රු. 10 (අවලංගු: C XG → 85868). ZD X Gamez — හච්: දිනකට රු. 10 (අවලංගු: C XG → 87689).";

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
    return ZEEN + "/" + path + "?" + q.toString();
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
    return ZEEN + "/Promo/Api/CPportal?cid=" + (op && op.portalCid ? op.portalCid : "342");
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

    var opKey = track("operator") || "mobitel";
    var op = OPERATORS[opKey] || OPERATORS.mobitel;
    var payout = op.price || "10";

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
      fileName: "File Name",
      fileSize: "File Size",
      downloadSpeed: "Download speed",
      pnTitle: "Please enter your mobile number",
      mExample: "(example: +94 7X XXX XXXX)",
      mBtn1: "Continue",
      mSecure: "Your personal data is protected and encrypted.",
      opTitle: "Choose your operator",
      opMobitel: "Mobitel",
      opHutch: "Hutch",
      opMobitelPrice: "10 LKR / day",
      opHutchPrice: "10 LKR / day",
      pinTitle: "Please enter the 4-digit PIN",
      pinExample: "(example: 1234)",
      pinBtn1: "Continue",
      pinSecure: "Do not share your verification code with anyone.",
      terms: "Terms & Condition",
      tncText: FOOTER_BOTH_EN,
      close: "Close",
      footerNote: FOOTER_BOTH_EN,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;All Rights Reserved",
      errmsg: {
        m: "Please enter your mobile number",
        o: "Please enter a valid Sri Lanka mobile number (9 digits starting with 7).",
        op: "Please choose an operator",
        p: "Please enter the 4-digit PIN",
        "1001": "PIN could not be sent. Please try again.",
        "1004": "Invalid or expired PIN. Please try again.",
        x: "Connection error. Please try again.",
        php: "PHP is not enabled. Ask hosting to enable PHP.",
        phone: "Please enter your number first."
      }
    },
    si: {
      fileName: "ගොනු නාමය",
      fileSize: "ගොනු ප්‍රමාණය",
      downloadSpeed: "බාගත කිරීමේ වේගය",
      pnTitle: "කරුණාකර ඔබේ ජංගම අංකය ඇතුළත් කරන්න",
      mExample: "(උදා: +94 7X XXX XXXX)",
      mBtn1: "ඉදිරියට",
      mSecure: "ඔබේ පුද්ගලික දත්ත ආරක්ෂිත සහ සංකේතනය කර ඇත.",
      opTitle: "ඔබේ මෙහෙයුම්කරු තෝරන්න",
      opMobitel: "මොබිටෙල්",
      opHutch: "හච්",
      opMobitelPrice: "දිනකට රු. 10",
      opHutchPrice: "දිනකට රු. 10",
      pinTitle: "ඉලක්කම් 4ක PIN ඇතුළත් කරන්න",
      pinExample: "(උදා: 1234)",
      pinBtn1: "ඉදිරියට",
      pinSecure: "සත්‍යාපන කේතය කිසිවෙකු සමඟ බෙදා නොගන්න.",
      terms: "නියම සහ කොන්දේසි",
      tncText: FOOTER_BOTH_SI,
      close: "වසන්න",
      footerNote: FOOTER_BOTH_SI,
      copyright: "&copy;&nbsp;2026&nbsp;&nbsp;සියලු හිමිකම් ඇවිරිණි",
      errmsg: {
        m: "කරුණාකර ජංගම අංකය ඇතුළත් කරන්න",
        o: "වලංගු ශ්‍රී ලංකා ජංගම අංකයක් ඇතුළත් කරන්න (7න් පටන් ගන්නා ඉලක්කම් 9).",
        op: "කරුණාකර මෙහෙයුම්කරු තෝරන්න",
        p: "ඉලක්කම් 4ක PIN ඇතුළත් කරන්න",
        "1001": "PIN යැවිය නොහැකි විය. නැවත උත්සාහ කරන්න.",
        "1004": "PIN වලංගු නැත හෝ කල් ඉකුත් වී ඇත.",
        x: "සම්බන්ධතා දෝෂයකි. නැවත උත්සාහ කරන්න.",
        php: "PHP සක්‍රිය කර නැත.",
        phone: "පළමුව ඔබේ අංකය ඇතුළත් කරන්න."
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
    var btn = wrap.querySelector(".button");
    var txt = wrap.querySelector(".btntxt");
    var load = wrap.querySelector(".submitload");
    if (!btn) return;
    if (on) {
      if (load) load.style.display = "flex";
      if (txt) txt.classList.add("disabled_txt");
      btn.classList.add("disabled_btn");
      wrap.classList.remove("pulseflash");
    } else {
      if (load) load.style.display = "none";
      if (txt) txt.classList.remove("disabled_txt");
      btn.classList.remove("disabled_btn");
    }
  }

  initTracking();
  getUserIp(function () {});

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "si" || qLang === "en") lang = qLang;
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

  var terms = document.querySelector(".terms");
  var tncbox = document.querySelector(".tncbox");
  var closetnc = document.querySelector(".closetnc");
  if (terms && tncbox) {
    terms.addEventListener("click", function () {
      tncbox.classList.remove("hide");
      terms.style.display = "none";
    });
  }
  if (closetnc && tncbox && terms) {
    closetnc.addEventListener("click", function () {
      tncbox.classList.add("hide");
      terms.style.display = "";
    });
  }

  var mForm = document.getElementById("mboxform");
  if (mForm) {
    var mInput = document.getElementById("m");
    var btnpn = document.querySelector(".btnpn");
    var mobileBox = document.querySelector(".mobileBox");
    var sideCheck = document.querySelector(".sidebtncheck");

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      var len = mInput.value.length;
      showError("");
      if (len >= 9) {
        if (sideCheck) sideCheck.classList.add("show");
        mobileBox.classList.remove("pulseflash", "pulseflash-delay");
        mobileBox.classList.add("pulseflash-pause");
        btnpn.classList.add("pulseflash");
      } else if (len > 0) {
        if (sideCheck) sideCheck.classList.remove("show");
        mobileBox.classList.remove("pulseflash", "pulseflash-delay");
        mobileBox.classList.add("pulseflash-pause");
        btnpn.classList.remove("pulseflash");
      } else {
        if (sideCheck) sideCheck.classList.remove("show");
        mobileBox.classList.add("pulseflash", "pulseflash-delay");
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
          persist("portal_cid", op.portalCid);

          getUserIp(function (ip) {
            var params = {
              cid: op.cid,
              msisdn: msisdn,
              click_id: getClickId(),
              pub_id: track("pub_id") || "propeller",
              sub_pub_id: track("sub_pub_id") || "0",
              user_ip: ip || track("user_ip") || "",
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
                  });
                  if (opLoad) opLoad.classList.remove("show");
                  showError(errText(errCode(resp)) || errText("1001"));
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
    var pinCheck = document.querySelector(".pincheckicon") || document.querySelector(".sidebtncheck");
    var opKey = track("operator") || "";
    var op = OPERATORS[opKey];

    if (!track("msisdn") && !track("phone")) {
      window.location.href = "index.html?lang=" + lang;
    } else if (!op) {
      window.location.href = "operator.html?lang=" + lang;
    } else {
      var foot = document.getElementById("opFooterNote");
      if (foot) foot.textContent = lang === "si" ? op.footerSi : op.footerEn;
    }

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      var len = pInput.value.length;
      showError("");
      if (len >= PIN_LENGTH) {
        if (pinCheck) pinCheck.classList.add("show");
        pinBox.classList.remove("pulseflash", "pulseflash-delay");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.add("pulseflash");
      } else if (len > 0) {
        if (pinCheck) pinCheck.classList.remove("show");
        pinBox.classList.remove("pulseflash", "pulseflash-delay");
        pinBox.classList.add("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      } else {
        if (pinCheck) pinCheck.classList.remove("show");
        pinBox.classList.add("pulseflash", "pulseflash-delay");
        pinBox.classList.remove("pulseflash-pause");
        btnpin.classList.remove("pulseflash");
      }
    });

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) { showError(errText("p")); return; }
      if (!op) { showError(errText("op")); return; }

      showError("");
      setLoading(btnpin, true);

      getUserIp(function (ip) {
        var params = {
          cid: op.cid,
          msisdn: track("msisdn") || track("phone"),
          click_id: getClickId(),
          otp: otp,
          pub_id: track("pub_id") || "propeller",
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
            persist("converted", "1");
            persist("portal_url", portalFor(op));
            persist("pb_amount", op.price || "10");
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
