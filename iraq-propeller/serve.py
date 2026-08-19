#!/usr/bin/env python3
"""
Iraq Propeller LP — local server (proxies CMP + AF endpoints).

  cd iraq-propeller
  python3 serve.py
  open http://127.0.0.1:8770/?clickid=TEST

Live: https://click2funbox.com/iqprop3op/?clickid=${SUBID}&zoneid={zone_id}
"""
from __future__ import annotations

import base64
import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8770
_SSL = ssl.create_default_context()

BASES = {
    "iqag": "http://143.198.213.74/prod/IQAGcmp",
    "iqkg": "http://143.198.213.74/prod/IQKGcmp",
    "iqzain": "http://159.89.163.174/prod/IQcmp",
}
CMP_PATHS = ("sendPIN", "verifyPIN", "status", "redirect", "antifraud")


def _fetch(url: str, timeout: int = 30, headers: bool = False) -> tuple[int, bytes, bytes]:
    req = urllib.request.Request(
        url, headers={"User-Agent": "IraqPropeller-LocalProxy/1.0"}, method="GET"
    )
    try:
        kwargs = {"timeout": timeout}
        if url.startswith("https"):
            kwargs["context"] = _SSL
        with urllib.request.urlopen(req, **kwargs) as resp:
            body = resp.read()
            raw_h = b""
            if headers:
                raw_h = ("\r\n".join(f"{k}: {v}" for k, v in resp.headers.items()) + "\r\n\r\n").encode()
            return resp.getcode() or 200, raw_h, body
    except urllib.error.HTTPError as e:
        body = e.read() if hasattr(e, "read") else b""
        return int(e.code), b"", body
    except Exception as e:
        return 502, b"", json.dumps(
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

    def _send(self, code: int, body: bytes, content_type: str = "application/json") -> None:
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
        qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)

        if name in ("iq-api.php", "iq-api-proxy"):
            self.proxy_cmp(qs)
            return
        if name in ("asiacell-af.php", "asiacell-af"):
            self.proxy_asiacell_af(qs)
            return
        if name in ("zain-shield.php", "zain-shield"):
            self.proxy_zain_shield(qs)
            return
        if name in ("propeller-pb.php", "propeller-pb"):
            self.proxy_propeller(qs)
            return
        if name.endswith(".php"):
            self._send(
                503,
                json.dumps(
                    {
                        "response": "FAIL",
                        "errorMessage": "Use python3 serve.py locally for PHP proxies.",
                    }
                ).encode(),
            )
            return
        super().do_GET()

    def proxy_cmp(self, qs: dict) -> None:
        provider = (qs.get("provider") or [""])[0].strip().lower()
        path = (qs.get("path") or [""])[0].strip().strip("/")
        if provider not in BASES or path not in CMP_PATHS:
            self._send(
                400,
                json.dumps({"response": "FAIL", "errorMessage": "Invalid provider/path"}).encode(),
            )
            return
        params = {k: v[0] for k, v in qs.items() if k not in ("provider", "path")}
        query = urllib.parse.urlencode(params)
        url = BASES[provider] + "/" + path + (("?" + query) if query else "")
        if path == "redirect":
            self.send_response(302)
            self.send_header("Location", url)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return
        code, _, body = _fetch(url)
        self._send(code if 100 <= code <= 599 else 200, body)

    def proxy_asiacell_af(self, qs: dict) -> None:
        page = (qs.get("page") or ["1"])[0]
        msisdn = (qs.get("msisdn") or [""])[0]
        clickid = (qs.get("clickid") or [str(int(time.time()))])[0]
        headers_b64 = base64.b64encode(b"{}").decode()
        user_ip_b64 = base64.b64encode(b"127.0.0.1").decode()
        url = (
            "https://antifraud-vms.iraqcom.com/Prepare/?"
            + urllib.parse.urlencode(
                {
                    "Page": page,
                    "ChannelID": "22796",
                    "ClickID": clickid,
                    "Headers": headers_b64,
                    "UserIP": user_ip_b64,
                    "MSISDN": msisdn,
                }
            )
        )
        # Local: return stub if AF unreachable so UI can be tested
        code, raw_h, body = _fetch(url, timeout=15, headers=True)
        antifraudid = None
        mcpuniqid = None
        try:
            # urllib already folded headers into response; stub IDs for local
            pass
        except Exception:
            pass
        if code >= 400 or not body:
            antifraudid = "local_af_" + str(int(time.time()))
            mcpuniqid = "local_mcp_" + str(int(time.time()))
            script = "/* local asiacell af stub */"
        else:
            text = body.decode("utf-8", errors="ignore")
            import re

            m = re.search(r"/\*[\s\S]*", text)
            script = m.group(0) if m else (text or "/* af */")
            antifraudid = "af_" + str(int(time.time()))
            mcpuniqid = "mcp_" + str(int(time.time()))
        self._send(
            200,
            json.dumps(
                {
                    "response": "SUCCESS",
                    "page": int(page or 1),
                    "antifrauduniqid": antifraudid,
                    "mcpuniqid": mcpuniqid,
                    "script": script,
                    "http_code": code,
                    "local": True,
                }
            ).encode(),
        )

    def proxy_zain_shield(self, qs: dict) -> None:
        uniqid = (qs.get("uniqid") or [str(int(time.time()))])[0]
        self._send(
            200,
            json.dumps(
                {
                    "response": "SUCCESS",
                    "uniqid": uniqid,
                    "source": "/* local zain shield stub */",
                    "fallback": True,
                }
            ).encode(),
        )

    def proxy_propeller(self, qs: dict) -> None:
        visitor = (qs.get("visitor_id") or [""])[0]
        if not visitor:
            self._send(
                400,
                json.dumps({"status": False, "msg": "Missing visitor_id"}).encode(),
            )
            return
        self._send(
            200,
            json.dumps({"status": True, "visitor_id": visitor, "local": True}).encode(),
        )


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("=" * 56)
    print(" Iraq Propeller — Asiacell / Korek / Zain")
    print(" http://%s:%s/?clickid=TEST" % (HOST, PORT))
    print(" Live: https://click2funbox.com/iqprop3op/?clickid=${SUBID}&zoneid={zone_id}")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
