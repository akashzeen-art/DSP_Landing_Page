#!/usr/bin/env python3
"""
Georgia Beeline AudioBooks — local server (NO PHP required).

  cd ge-audiobooks
  python3 serve.py
  open http://127.0.0.1:8765/?clickid=TEST

Live: https://ge-playcontent.com/ge-audiobooks/?clickid={gclid}
  cid=489 | Beeline | 1 GEL/day | GEcmp
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8765
GECMP = "http://159.89.163.174/prod/GEcmp"
_SSL = ssl.create_default_context()

PROXY_NAMES = ("ge-api-proxy", "ge-api.php")
ALLOWED = ("sendPIN", "verifyPIN", "status", "redirect")


def _fetch(url: str, timeout: int = 30) -> tuple[int, bytes]:
    req = urllib.request.Request(
        url, headers={"User-Agent": "GE-AudioBooks-LocalProxy/1.0"}, method="GET"
    )
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            return resp.getcode() or 200, resp.read()
    except urllib.error.HTTPError as e:
        return int(e.code), e.read() if hasattr(e, "read") else b""
    except Exception as e:
        return 502, json.dumps(
            {"response": "FAIL", "errorMessage": "Proxy error: " + str(e)}
        ).encode()


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **getattr(SimpleHTTPRequestHandler, "extensions_map", {}),
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".php": "application/json",
    }

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
        name = parsed.path.rstrip("/").split("/")[-1] if parsed.path else ""

        if name in PROXY_NAMES:
            self.proxy_gecmp(parsed)
            return

        if name.endswith(".php"):
            self._send(
                503,
                json.dumps(
                    {
                        "response": "FAIL",
                        "errorMessage": "Use python3 serve.py locally. On production, enable PHP for ge-api.php.",
                    }
                ).encode(),
                "application/json",
            )
            return

        super().do_GET()

    def proxy_gecmp(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_path = (qs.get("path") or [""])[0].strip().strip("/")
        if api_path not in ALLOWED:
            self._send(
                400,
                json.dumps(
                    {"response": "FAIL", "errorMessage": "Invalid or missing path"}
                ).encode(),
                "application/json",
            )
            return

        params = {k: v[0] for k, v in qs.items() if k != "path"}
        query = urllib.parse.urlencode(params)
        url = GECMP + "/" + api_path + (("?" + query) if query else "")

        if api_path == "redirect":
            self.send_response(302)
            self.send_header("Location", url)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return

        code, body = _fetch(url, timeout=30)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 56)
    print(" Georgia AudioBooks — Beeline cid=489")
    print(" http://%s:%s/?clickid=TEST" % (HOST, PORT))
    print(" Live: https://ge-playcontent.com/ge-audiobooks/?clickid={gclid}")
    print(" Proxy: /ge-api-proxy  and  /ge-api.php")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
