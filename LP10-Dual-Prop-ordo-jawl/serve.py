#!/usr/bin/env python3
"""
Palestine Dual Ooredoo/Jawwal Gamify Propeller LP.
  python3 serve.py
  http://127.0.0.1:8115/?clickid=TEST123
"""
from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8115
API = "https://zeentec.com/pay"
# Optional IP pin when hostname has no public DNS (leave empty normally)
API_RESOLVE_IP = ""
POSTBACK = "https://ad.propellerads.com/conversion.php"
ALLOWED_PATHS = {"pingen", "pinver", "checkstatus", "getportal"}
_SSL = ssl.create_default_context()


def _fetch(url: str, timeout: int = 30) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": "PS-Dual-Gamify-LocalProxy/1.0"}, method="GET")
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
            self.proxy_zeentec(parsed)
            return
        if name in ("propeller-pb.php", "propeller-pb"):
            self.proxy_propeller(parsed)
            return
        if name.endswith(".php"):
            self._send(503, json.dumps({"response": "FAIL", "errorMessage": "Use python3 serve.py locally"}).encode(), "application/json")
            return
        super().do_GET()

    def proxy_zeentec(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        api_path = (qs.get("path") or [""])[0].strip().strip("/")
        if api_path not in ALLOWED_PATHS:
            self._send(400, json.dumps({"response": "FAIL", "errorMessage": "Invalid path"}).encode(), "application/json")
            return
        params = {k: v[0] for k, v in qs.items() if k != "path"}
        query = urllib.parse.urlencode(params)
        url = API + "/" + api_path + (("?" + query) if query else "")
        if api_path == "getportal":
            self.send_response(302)
            self.send_header("Location", url)
            self.end_headers()
            return
        # Clear local error if hostname does not resolve
        try:
            host = urllib.parse.urlparse(API).hostname or ""
            if API_RESOLVE_IP == "" and host:
                import socket
                try:
                    socket.getaddrinfo(host, 443)
                except socket.gaierror:
                    self._send(502, json.dumps({
                        "response": "FAIL",
                        "errorMessage": "DNS missing for %s. Set API / API_RESOLVE_IP in serve.py." % host,
                        "api_base": API,
                    }).encode(), "application/json")
                    return
        except Exception:
            pass
        code, body = _fetch(url, timeout=30)
        text = body.decode("utf-8", errors="replace").strip()
        if text.upper() in ("ACTIVE", "INACTIVE"):
            body = json.dumps({"response": text.upper(), "errorMessage": text}).encode()
            code = 200
        self._send(code if 100 <= code <= 599 else 200, body, "application/json")

    def proxy_propeller(self, parsed: urllib.parse.ParseResult) -> None:
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        visitor_id = ((qs.get("visitor_id") or qs.get("clickid") or [""])[0]).strip()
        payout = ((qs.get("payout") or ["1"])[0]).strip() or "1"
        if not visitor_id or visitor_id.startswith("local_") or visitor_id in ("${SUBID}", "{clickid}"):
            self._send(400, json.dumps({"status": False, "msg": "Missing visitor_id"}).encode(), "application/json")
            return
        pb = POSTBACK + "?" + urllib.parse.urlencode({
            "aid": "3898869", "pid": "", "tid": "154120",
            "visitor_id": visitor_id, "payout": payout,
        })
        code, body = _fetch(pb, timeout=20)
        ok = 200 <= code < 400
        out = json.dumps({
            "status": ok, "http_code": code,
            "visitor_id": visitor_id, "payout": payout,
            "propeller_body": body.decode("utf-8", errors="replace")[:500],
        }).encode()
        self._send(200 if ok else 502, out, "application/json")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Palestine Dual Gamify LP: http://%s:%s/" % (HOST, PORT))
    print("Proxies: /zeen-api.php  /propeller-pb.php")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
