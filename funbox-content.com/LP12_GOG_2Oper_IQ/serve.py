#!/usr/bin/env python3
"""
Iraq 2-Operator LP — funbox-content.com
  python3 serve.py
  http://127.0.0.1:8135/?clickid=TEST123
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8135
ZEEN = "http://64.225.85.48/adnet"
ALLOWED_PATHS = {"sendpin", "verifypin", "checkstatus"}
AF_PREFIX = "http://apicalling.com/"
SHIELD_PREFIX = "https://sdp.salasto.dev:2053/Shield/AntiFraud/Prepare/"
_SSL = ssl.create_default_context()


def _fetch(url: str, timeout: int = 90, headers: dict | None = None) -> tuple[int, bytes, str]:
    hdrs = {"User-Agent": "IQ-2Oper-LocalProxy/1.0"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs, method="GET")
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            body = resp.read()
            # collect headers
            hdict = {k: v for k, v in resp.headers.items()}
            return resp.getcode() or 200, body, json.dumps(hdict)
    except urllib.error.HTTPError as e:
        return int(e.code), (e.read() if hasattr(e, "read") else b""), "{}"
    except Exception as e:
        return 502, json.dumps({"status": False, "msg": "Proxy error: " + str(e)}).encode(), "{}"


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

        if name in ("zeen-api.php", "zeen-api"):
            self.proxy_zeen(parsed)
            return
        if name in ("af-proxy.php", "af-proxy"):
            self.proxy_af(parsed)
            return
        if name in ("asiacell-af.php", "asiacell-af"):
            self.proxy_asiacell(parsed)
            return
        if name.endswith(".php"):
            self._send(503, json.dumps({"status": False, "msg": "Use python3 serve.py locally"}).encode(), "application/json")
            return
        super().do_GET()

    def proxy_zeen(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_path = (qs.get("path") or [""])[0].strip().strip("/")
        if api_path not in ALLOWED_PATHS:
            self._send(400, json.dumps({"status": False, "msg": "Invalid path"}).encode(), "application/json")
            return
        params = {k: v[0] for k, v in qs.items() if k != "path"}
        query = urllib.parse.urlencode(params)
        url = ZEEN + "/" + api_path + (("?" + query) if query else "")
        code, body, _ = _fetch(url, timeout=90)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_af(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        url = (qs.get("url") or [""])[0].strip()
        if not url.startswith(AF_PREFIX):
            self._send(400, json.dumps({"status": False, "msg": "Invalid url"}).encode(), "application/json")
            return
        code, body, _ = _fetch(url, timeout=20)
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_asiacell(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        page = ((qs.get("page") or ["1"])[0]).strip() or "1"
        msisdn = ((qs.get("msisdn") or [""])[0]).strip()
        click_id = ((qs.get("click_id") or qs.get("af_clickid") or ["local"])[0]).strip() or "local"
        params = {
            "Page": page,
            "ChannelID": "22737",
            "ClickID": click_id,
            "Headers": "",
            "UserIP": "",
            "MSISDN": msisdn,
        }
        url = SHIELD_PREFIX + "?" + urllib.parse.urlencode(params)
        code, body, hdr_json = _fetch(url, timeout=25)
        # Best-effort local mock of asiacell-af.php JSON shape
        antifraud = None
        mcp = None
        try:
            hdrs = json.loads(hdr_json)
            for k, v in hdrs.items():
                lk = k.lower()
                if lk == "antifrauduniqid":
                    antifraud = v
                if lk in ("mcpuniqid", "mcpuniqud"):
                    mcp = v
        except Exception:
            pass
        script = body.decode("utf-8", errors="replace") if body else ""
        out = json.dumps({
            "response": "SUCCESS" if 200 <= code < 400 else "FAIL",
            "page": int(page) if page.isdigit() else 1,
            "antifrauduniqid": antifraud,
            "mcpuniqid": mcp,
            "script": script or None,
            "af_clickid": click_id,
            "http_code": code,
        }).encode()
        self._send(200 if 200 <= code < 400 else 502, out, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("IQ 2-Op LP: http://%s:%s/" % (HOST, PORT))
    print("Proxies: /zeen-api.php  /af-proxy.php  /asiacell-af.php")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
