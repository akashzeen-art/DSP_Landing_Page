(function () {
  "use strict";

  var CFG = {
    key: "7IBl1KlFbJHRP7ZourckYAXyOlRSvOxn",
    campaignid: "687",
    pubid: "ZD1",
    lp: "http://64.225.85.48/adnet/portal/redirect"
  };

  function store(k, v) {
    if (!v) return;
    try { sessionStorage.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e2) {}
  }

  function read(k) {
    try {
      var v = sessionStorage.getItem(k);
      if (v) return v;
    } catch (e) {}
    try { return localStorage.getItem(k) || ""; } catch (e2) { return ""; }
  }

  function cookieTid() {
    try {
      var parts = String(document.cookie || "").split(";");
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim().split("=");
        var n = (p[0] || "").toLowerCase();
        if (n === "tid" || n === "cs_tid" || n === "clkstrm_tid" || n === "_tid") {
          return decodeURIComponent(p.slice(1).join("=") || "").trim();
        }
      }
    } catch (e) {}
    return "";
  }

  function getTid() {
    var sk = read("sessionKey") || read("zeen_ti") || "";
    if (sk) return sk;
    var el = document.getElementById("tid");
    if (el && el.value) return String(el.value).trim();
    try {
      if (window.tid) return String(window.tid).trim();
    } catch (e) {}
    return read("cs_tid") || cookieTid();
  }

  function setTid(v) {
    v = String(v || "").trim();
    if (!v) return;
    store("cs_tid", v);
    try { window.tid = v; } catch (e) {}
    var el = document.getElementById("tid");
    if (el) el.value = v;
  }

  function rewriteCheckPin(url) {
    if (!url || typeof url !== "string") return url;
    if (url.indexOf("clkstrm.com") === -1 || url.indexOf("check-pin") === -1) return url;
    var tid = getTid();
    if (tid) {
      if (/data%5Btid%5D=/.test(url)) return url.replace(/data%5Btid%5D=[^&]*/, "data%5Btid%5D=" + encodeURIComponent(tid));
      if (/data\[tid\]=/.test(url)) return url.replace(/data\[tid\]=[^&]*/, "data[tid]=" + encodeURIComponent(tid));
      if (url.indexOf("data%5Btid%5D") === -1 && url.indexOf("data[tid]") === -1) {
        return url + "&data%5Btid%5D=" + encodeURIComponent(tid);
      }
      return url;
    }
    if (/data(?:%5B|\[)tid(?:%5D|\])=(?:&|$)/.test(url)) return "";
    return url;
  }

  function patch() {
    if (window.__clkstrmTidPatch) return;
    window.__clkstrmTidPatch = true;

    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var next = rewriteCheckPin(url);
        if (url.indexOf("check-pin") !== -1 && url.indexOf("clkstrm.com") !== -1 && !next) {
          return Promise.resolve(new Response(JSON.stringify({ status: "ok", skipped: true }), { status: 200 }));
        }
        if (typeof input === "string" && next && next !== url) input = next;
        return origFetch.call(this, input, init);
      };
    }

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      if (typeof url === "string") {
        var next = rewriteCheckPin(url);
        if (url.indexOf("check-pin") !== -1 && url.indexOf("clkstrm.com") !== -1 && !next) {
          url = "data:application/json,{\"status\":\"ok\",\"skipped\":true}";
        } else if (next) url = next;
      }
      return origOpen.apply(this, arguments);
    };

    function hookSrc(proto) {
      var desc = Object.getOwnPropertyDescriptor(proto, "src");
      if (!desc || !desc.set) return;
      Object.defineProperty(proto, "src", {
        configurable: true,
        enumerable: desc.enumerable,
        get: desc.get,
        set: function (v) {
          var next = rewriteCheckPin(String(v || ""));
          desc.set.call(this, next || "data:,");
        }
      });
    }
    try { hookSrc(HTMLImageElement.prototype); } catch (e) {}
    try { hookSrc(HTMLScriptElement.prototype); } catch (e2) {}
  }

  function qs(extra) {
    var ip = read("user_ip") || "";
    var clickId = read("click_id") || read("zeen_click_id") || "TEST123";
    var msisdn = read("msisdn") || read("phone") || "";
    var req = read("sessionKey") || read("zeen_ti") || "";
    var p = {
      method: "get-script",
      api_key: CFG.key,
      campaignid: CFG.campaignid,
      ip: ip,
      ua: navigator.userAgent || "",
      lp: CFG.lp,
      lang: (document.documentElement.lang || "en").slice(0, 2),
      cid: clickId,
      pubid: CFG.pubid,
      msisdn: msisdn
    };
    if (req) p["data[req_id]"] = req;
    if (extra) {
      Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    }
    return p;
  }

  function toQuery(obj) {
    return Object.keys(obj).map(function (k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k] == null ? "" : obj[k]);
    }).join("&");
  }

  function syncFromSession() {
    var sk = read("sessionKey") || read("zeen_ti") || "";
    if (sk) setTid(sk);
    var reqEl = document.getElementById("req_id");
    if (reqEl && sk) reqEl.value = sk;
  }

  patch();
  syncFromSession();
  setInterval(syncFromSession, 400);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFromSession);
  }

  window.ClkstrmAF = {
    getTid: getTid,
    setTid: setTid,
    waitTid: function (ms, cb) { syncFromSession(); cb(getTid()); },
    load: syncFromSession,
    checkPinUrl: function (pin) {
      syncFromSession();
      var tid = getTid();
      if (!tid) return "";
      var req = read("sessionKey") || read("zeen_ti") || tid;
      return "https://api.clkstrm.com/v1/?" + toQuery(qs({
        method: "check-pin",
        pin: pin,
        "data[req_id]": req,
        "data[tid]": tid
      }));
    }
  };
})();
