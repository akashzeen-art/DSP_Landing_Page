#!/usr/bin/env python3
"""
Iraq 3-Operator Clickadu LP (loaderlite UI) local server.
  python3 serve.py
  http://127.0.0.1:8096/?clickid=TEST123
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8096
ZEEN = "http://64.225.85.48/adnet"
CLICKADU = "http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/"
CLICKADU_AID = "307904"
_SSL = ssl.create_default_context()


def _fetch(url: str, timeout: int = 30) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": "IQClickadu-LocalProxy/1.0"}, method="GET")
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            return resp.getcode() or 200, resp.read()
    except urllib.error.HTTPError as e:
        return int(e.code), e.read() if hasattr(e, "read") else b""
    except Exception as e:
        return 502, json.dumps({"status": False, "msg": "Proxy error: " + str(e)}).encode()


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
        name = (parsed.path.rstrip("/").split("/")[-1] if parsed.path else "") or ""

        if name in ("zeen-api.php", "zeen-proxy"):
            self.proxy_zeen(parsed)
            return
        if name in ("clickadu-pb.php", "clickadu-pb"):
            self.proxy_clickadu(parsed)
            return
        if name in ("af-proxy.php", "af-proxy"):
            self.proxy_af(parsed)
            return
        if name.endswith(".php"):
            self._send(503, json.dumps({"status": False, "msg": "Use python3 serve.py locally"}).encode(), "application/json")
            return
        super().do_GET()

    def proxy_zeen(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_path = (qs.get("path") or [""])[0].strip().strip("/")
        if not api_path:
            self._send(400, json.dumps({"status": False, "msg": "Missing path"}).encode(), "application/json")
            return
        params = {k: v[0] for k, v in qs.items() if k != "path"}
        query = urllib.parse.urlencode(params)
        url = ZEEN + "/" + api_path + (("?" + query) if query else "")
        code, body = _fetch(url, timeout=30)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_clickadu(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        visitor_id = ((qs.get("visitor_id") or qs.get("clickid") or qs.get("subid") or [""])[0]).strip()
        low = visitor_id.lower()
        if not visitor_id or visitor_id.startswith("local_") or low in ("clickid", "subid", "visitor_id") or "${" in visitor_id:
            self._send(400, json.dumps({"status": False, "msg": "Missing visitor_id"}).encode(), "application/json")
            return
        pb = CLICKADU + "?" + urllib.parse.urlencode({
            "visitor_id": visitor_id,
            "aid": CLICKADU_AID,
        })
        code, body = _fetch(pb, timeout=20)
        ok = 200 <= code < 400
        out = json.dumps({
            "status": ok,
            "http_code": code,
            "visitor_id": visitor_id,
            "clickadu_body": body.decode("utf-8", errors="replace")[:500],
        }).encode()
        self._send(200 if ok else 502, out, "application/json")

    def proxy_af(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        url = ((qs.get("url") or [""])[0]).strip()
        if not url or not url.startswith("http://apicalling.com/"):
            self._send(400, json.dumps({"status": False, "msg": "Invalid url"}).encode(), "application/json")
            return
        code, body = _fetch(url, timeout=15)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Iraq 3-Operator Clickadu LP1 (loaderlite): http://%s:%s/" % (HOST, PORT))
    print("Proxies: /zeen-api.php  /clickadu-pb.php  /af-proxy.php")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
