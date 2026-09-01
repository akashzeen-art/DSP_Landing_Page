#!/usr/bin/env python3
"""
Cameroon Orange OneGaming Advertizer LP (Theme-496).
  python3 serve.py
  http://127.0.0.1:8119/?clickid=TEST123
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8119
ALLOWED_HOSTS = {"159.89.163.174"}
ALLOWED_PATHS = {"sendPIN", "verifyPIN", "status"}
POSTBACK = "http://postback.advertizer.com/pb.php"
_SSL = ssl.create_default_context()


def _fetch(url: str, timeout: int = 30) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": "CM-Orange-Advertizer-LocalProxy/1.0"}, method="GET")
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            return resp.getcode() or 200, resp.read()
    except urllib.error.HTTPError as e:
        return int(e.code), e.read() if hasattr(e, "read") else b""
    except Exception as e:
        return 502, json.dumps({"response": "FAIL", "errorMessage": "Proxy error: " + str(e)}).encode()


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

        if name in ("zeen-api.php", "zeen-proxy"):
            self.proxy_cm(parsed)
            return
        if name in ("advertizer-pb.php", "advertizer-pb"):
            self.proxy_advertizer(parsed)
            return
        if name.endswith(".php"):
            self._send(503, json.dumps({"response": "FAIL", "errorMessage": "Use python3 serve.py locally"}).encode(), "application/json")
            return
        super().do_GET()

    def proxy_cm(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_host = (qs.get("host") or ["159.89.163.174"])[0].strip()
        api_path = (qs.get("path") or [""])[0].strip()
        if api_host not in ALLOWED_HOSTS or api_path not in ALLOWED_PATHS:
            self._send(400, json.dumps({"response": "FAIL", "errorMessage": "Invalid host or path"}).encode(), "application/json")
            return
        params = {k: v[0] for k, v in qs.items() if k not in ("host", "path")}
        query = urllib.parse.urlencode(params)
        url = "http://%s/prod/CMcmp/%s%s" % (api_host, api_path, ("?" + query) if query else "")
        code, body = _fetch(url, timeout=30)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_advertizer(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        clickid = ((qs.get("clickid") or qs.get("click_id") or qs.get("subid") or qs.get("visitor_id") or [""])[0]).strip()
        amount = ((qs.get("amount") or ["100"])[0]).strip() or "100"
        if not clickid or clickid.startswith("local_") or clickid in ("${SUBID}", "{clickid}", "[[subid]]"):
            self._send(400, json.dumps({"status": False, "msg": "Missing clickid"}).encode(), "application/json")
            return
        txn_id = ((qs.get("txn_id") or [""])[0]).strip() or clickid
        pb = POSTBACK + "?" + urllib.parse.urlencode({
            "clickid": clickid,
            "txn_id": txn_id,
            "amount": amount,
            "advertiser_id": "Zeen1041",
            "key": "a5b193ada1cbd22a987bfe876496ac40",
        })
        code, body = _fetch(pb, timeout=20)
        ok = 200 <= code < 400
        out = json.dumps({
            "status": ok, "http_code": code,
            "clickid": clickid, "amount": amount,
            "advertizer_body": body.decode("utf-8", errors="replace")[:500],
        }).encode()
        self._send(200 if ok else 502, out, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Cameroon Orange OneGaming Advertizer LP: http://%s:%s/" % (HOST, PORT))
    print("Proxies: /zeen-api.php  /advertizer-pb.php")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
