(function () {
  "use strict";

  /**
   * Force Zeen sendpin `ti` into clkstrm check-pin data[tid].
   * NOTE: never use window.tid — <input id="tid"> makes window.tid an HTMLElement.
   */
  function isBadTi(v) {
    if (v == null) return true;
    if (typeof v !== "string") return true;
    v = v.trim();
    if (!v) return true;
    if (v.indexOf("[object ") === 0) return true;
    if (v === "undefined" || v === "null") return true;
    return false;
  }

  function cleanTi(v) {
    if (v == null) return "";
    if (typeof v !== "string") {
      /* If DOM input, use .value */
      try {
        if (typeof v === "object" && v && typeof v.value === "string") {
          v = v.value;
        } else {
          return "";
        }
      } catch (e) { return ""; }
    }
    v = String(v).trim();
    return isBadTi(v) ? "" : v;
  }

  function readStore(k) {
    try {
      var v = sessionStorage.getItem(k);
      v = cleanTi(v);
      if (v) return v;
    } catch (e) {}
    try {
      var v2 = cleanTi(localStorage.getItem(k) || "");
      if (v2) return v2;
    } catch (e2) {}
    return "";
  }

  function writeStore(k, v) {
    v = cleanTi(v);
    if (!v) return;
    try { sessionStorage.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e2) {}
  }

  function clearBadStore() {
    ["zeen_ti", "cs_tid", "sessionKey"].forEach(function (k) {
      try {
        var v = sessionStorage.getItem(k);
        if (v && isBadTi(v)) sessionStorage.removeItem(k);
      } catch (e) {}
      try {
        var v2 = localStorage.getItem(k);
        if (v2 && isBadTi(v2)) localStorage.removeItem(k);
      } catch (e2) {}
    });
  }

  function getTi() {
    try {
      var q = new URLSearchParams(window.location.search).get("ti");
      q = cleanTi(q);
      if (q) return q;
    } catch (e) {}

    var fromStore = readStore("zeen_ti") || readStore("cs_tid") || readStore("sessionKey");
    if (fromStore) return fromStore;

    try {
      var z = cleanTi(window.__zeen_ti);
      if (z) return z;
    } catch (e2) {}

    /* Read from #tid INPUT value only — never window.tid (DOM conflict) */
    var el = document.getElementById("tid");
    if (el && el.value) {
      var ev = cleanTi(el.value);
      if (ev) return ev;
    }
    return "";
  }

  function setTi(v) {
    v = cleanTi(v);
    if (!v) return;
    writeStore("zeen_ti", v);
    writeStore("cs_tid", v);
    writeStore("sessionKey", v);
    try { window.__zeen_ti = v; } catch (e) {}
    var tidEl = document.getElementById("tid");
    if (tidEl) tidEl.value = v;
    var reqEl = document.getElementById("req_id");
    if (reqEl) reqEl.value = v;
  }

  function forceTid(url) {
    if (!url || typeof url !== "string") return url;
    if (url.indexOf("clkstrm.com") === -1) return url;
    if (url.indexOf("check-pin") === -1) return url;

    var ti = getTi();
    if (!ti) return url;

    if (/data%5Btid%5D=/.test(url)) {
      url = url.replace(/data%5Btid%5D=[^&]*/, "data%5Btid%5D=" + encodeURIComponent(ti));
    } else if (/data\[tid\]=/.test(url)) {
      url = url.replace(/data\[tid\]=[^&]*/, "data[tid]=" + encodeURIComponent(ti));
    } else {
      url += (url.indexOf("?") >= 0 ? "&" : "?") + "data%5Btid%5D=" + encodeURIComponent(ti);
    }
    return url;
  }

  function installPatch() {
    if (!window.__zeenFetchRaw) {
      window.__zeenFetchRaw = window.fetch;
    }
    var rawFetch = window.__zeenFetchRaw;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var next = forceTid(url);
        if (next && next !== url) {
          if (typeof input === "string") input = next;
          else if (typeof Request !== "undefined" && input instanceof Request) {
            input = new Request(next, input);
          }
        }
      } catch (e) {}
      return rawFetch.call(this, input, init);
    };

    if (!window.__zeenXhrPatched) {
      window.__zeenXhrPatched = true;
      var origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        try {
          if (typeof url === "string") {
            arguments[1] = forceTid(url);
          }
        } catch (e) {}
        return origOpen.apply(this, arguments);
      };
    }
  }

  clearBadStore();

  try {
    var bootTi = cleanTi(new URLSearchParams(window.location.search).get("ti"));
    if (bootTi) setTi(bootTi);
    else {
      var existing = getTi();
      if (existing) setTi(existing);
    }
  } catch (e) {}

  installPatch();
  setInterval(function () {
    var ti = getTi();
    if (ti) setTi(ti);
    installPatch();
  }, 250);

  document.addEventListener("click", function () {
    var ti = getTi();
    if (ti) setTi(ti);
    installPatch();
  }, true);

  window.ClkstrmAF = {
    getTid: getTi,
    setTid: setTi,
    getZeenTi: getTi,
    setZeenTi: setTi,
    forceTid: forceTid,
    load: function () {
      var ti = getTi();
      if (ti) setTi(ti);
      installPatch();
    }
  };
})();
