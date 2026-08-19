#!/usr/bin/env python3
"""
Local static file server + Adpoke / Propeller proxies.
Use this instead of `python3 -m http.server` so API calls work without PHP.

  python3 serve.py
  # then open http://127.0.0.1:8082/
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8082
ADPOKE = "http://64.225.87.221/adpoke/cnt/inapp"
POSTBACK = "https://ad.propellerads.com/conversion.php"
AID = "3898869"
PID = ""
TID = "154120"

# Allow HTTPS postback without local cert issues on some macOS setups
_SSL = ssl.create_default_context()


def _fetch(url: str, timeout: int = 30) -> tuple[int, bytes, str]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ZeenLP-LocalProxy/1.0"},
        method="GET",
    )
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            return resp.getcode() or 200, resp.read(), resp.headers.get_content_type() or "application/octet-stream"
    except urllib.error.HTTPError as e:
        body = e.read() if hasattr(e, "read") else b""
        return int(e.code), body, "application/json"
    except Exception as e:
        return 502, json.dumps({"response": "FAIL", "errorMessage": "Proxy error: " + str(e)}).encode("utf-8"), "application/json"


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

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        # Allow /adpoke-api.php and nested paths if opened from a subfolder
        if path.endswith("adpoke-api.php"):
            self.proxy_adpoke(parsed)
            return
        if path.endswith("propeller-pb.php"):
            self.proxy_propeller(parsed)
            return
        super().do_GET()

    def proxy_adpoke(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_path = (qs.get("path") or [""])[0].strip().strip("/")
        if not api_path:
            self._send(400, json.dumps({"response": "FAIL", "errorMessage": "Missing path"}).encode(), "application/json")
            return

        params = {k: v[0] for k, v in qs.items() if k != "path"}
        query = urllib.parse.urlencode(params)
        url = ADPOKE + "/" + api_path + (("?" + query) if query else "")

        if api_path == "portal":
            self.send_response(302)
            self.send_header("Location", url)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return

        code, body, _ctype = _fetch(url, timeout=30)
        # Upstream is JSON for sendotp / validateotp / statuscheck
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_propeller(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        visitor_id = (qs.get("visitor_id") or [""])[0].strip()
        payout = (qs.get("payout") or ["1"])[0].strip() or "1"

        if not visitor_id or visitor_id == "${SUBID}" or visitor_id.lower() == "clickid":
            self._send(
                400,
                json.dumps({
                    "status": False,
                    "msg": "Missing or invalid visitor_id (need real Propeller ${SUBID} from clickid)",
                }).encode(),
                "application/json",
            )
            return

        pb = POSTBACK + "?" + urllib.parse.urlencode({
            "aid": AID,
            "pid": PID,
            "tid": TID,
            "visitor_id": visitor_id,
            "payout": payout,
        })
        code, body, _ = _fetch(pb, timeout=20)
        ok = 200 <= code < 400
        out = json.dumps({
            "status": ok,
            "http_code": code,
            "visitor_id": visitor_id,
            "payout": payout,
            "postback_url": pb,
            "propeller_body": body.decode("utf-8", errors="replace")[:500],
            "error": "" if ok else "postback failed",
        }).encode("utf-8")
        self._send(200 if ok else 502, out, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Palestine LP local server: http://%s:%s/" % (HOST, PORT))
    print("Proxies: /adpoke-api.php  /propeller-pb.php")
    print("Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
