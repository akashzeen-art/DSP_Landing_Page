#!/usr/bin/env python3
"""
Iraq Asiacell Gamifya Propeller LP local server.
  python3 serve.py
  http://127.0.0.1:8113/?clickid=TEST123
"""
from __future__ import annotations

import base64
import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8113
IQAG = "http://143.198.213.74/prod/IQAGcmp"
AF = "https://antifraud-vms.iraqcom.com/Prepare/"
POSTBACK = "https://ad.propellerads.com/conversion.php"
ALLOWED_PATHS = {"sendPIN", "verifyPIN", "status"}
_SSL = ssl.create_default_context()


def _fetch(url: str, timeout: int = 30, want_headers: bool = False) -> tuple[int, bytes, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": "IQ-Asiacell-LocalProxy/1.0"}, method="GET")
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            body = resp.read()
            headers = {k.lower(): v for k, v in resp.headers.items()} if want_headers else {}
            return resp.getcode() or 200, body, headers
    except urllib.error.HTTPError as e:
        headers = {k.lower(): v for k, v in e.headers.items()} if want_headers and e.headers else {}
        return int(e.code), (e.read() if hasattr(e, "read") else b""), headers
    except Exception as e:
        return 502, json.dumps({"response": "FAIL", "errorMessage": "Proxy error: " + str(e)}).encode(), {}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def _send(self, code: int, body: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type + "; charset=UTF-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        name = (parsed.path.rstrip("/").split("/")[-1] if parsed.path else "") or ""

        if name in ("iq-api.php", "iq-api"):
            self.proxy_iqag(parsed)
            return
        if name in ("asiacell-af.php", "asiacell-af"):
            self.proxy_af(parsed)
            return
        if name in ("propeller-pb.php", "propeller-pb"):
            self.proxy_propeller(parsed)
            return
        if name.endswith(".php"):
            self._send(503, json.dumps({"response": "FAIL", "errorMessage": "Use python3 serve.py locally"}).encode(), "application/json")
            return
        super().do_GET()

    def proxy_iqag(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_path = (qs.get("path") or [""])[0].strip().strip("/")
        if api_path not in ALLOWED_PATHS:
            self._send(400, json.dumps({"response": "FAIL", "errorMessage": "Invalid path"}).encode(), "application/json")
            return
        params = {k: v[0] for k, v in qs.items() if k != "path"}
        query = urllib.parse.urlencode(params)
        url = IQAG + "/" + api_path + (("?" + query) if query else "")
        code, body, _ = _fetch(url, timeout=30)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_af(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        page = (qs.get("page") or ["1"])[0]
        if page not in ("1", "2"):
            page = "1"
        msisdn = "".join(c for c in ((qs.get("msisdn") or [""])[0]) if c.isdigit())
        clickid = ((qs.get("clickid") or [""])[0]).strip() or str(abs(hash(str(id(self)))) % 10**9)
        # Minimal browser-like headers for local AF
        fake_headers = {
            "User-Agent": self.headers.get("User-Agent") or "Mozilla/5.0",
            "Accept-Language": self.headers.get("Accept-Language") or "en",
        }
        headers_b64 = base64.b64encode(json.dumps(fake_headers).encode()).decode()
        ip = "127.0.0.1"
        url = AF + "?" + urllib.parse.urlencode({
            "Page": page,
            "ChannelID": "22796",
            "ClickID": clickid,
            "Headers": headers_b64,
            "UserIP": base64.b64encode(ip.encode()).decode(),
            "MSISDN": msisdn,
        })
        code, body, hdrs = _fetch(url, timeout=20, want_headers=True)
        script = None
        text = body.decode("utf-8", errors="replace")
        import re
        m = re.search(r"/\*[\s\S]*", text)
        if m:
            script = m.group(0)
        elif text.strip() and "<script" not in text.lower():
            script = text.strip()
        out = json.dumps({
            "response": "SUCCESS",
            "page": int(page),
            "antifrauduniqid": hdrs.get("antifrauduniqid"),
            "mcpuniqid": hdrs.get("mcpuniqid"),
            "script": script,
            "http_code": code,
        }).encode()
        self._send(200, out, "application/json")

    def proxy_propeller(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        visitor_id = ((qs.get("visitor_id") or qs.get("clickid") or [""])[0]).strip()
        payout = ((qs.get("payout") or ["360"])[0]).strip() or "360"
        if not visitor_id or visitor_id.startswith("local_") or visitor_id in ("${SUBID}", "{clickid}"):
            self._send(400, json.dumps({"status": False, "msg": "Missing visitor_id"}).encode(), "application/json")
            return
        pb = POSTBACK + "?" + urllib.parse.urlencode({
            "aid": "3898869", "pid": "", "tid": "154120",
            "visitor_id": visitor_id, "payout": payout,
        })
        code, body, _ = _fetch(pb, timeout=20)
        ok = 200 <= code < 400
        out = json.dumps({
            "status": ok, "http_code": code,
            "visitor_id": visitor_id, "payout": payout,
            "propeller_body": body.decode("utf-8", errors="replace")[:500],
        }).encode()
        self._send(200 if ok else 502, out, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Iraq Asiacell Gamifya LP: http://%s:%s/" % (HOST, PORT))
    print("Proxies: /iq-api.php  /asiacell-af.php  /propeller-pb.php")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
