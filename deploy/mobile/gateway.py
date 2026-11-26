"""br20 同源登录和模型接口，仅通过本机 Unix socket 交给 Nginx。"""
import hashlib
import hmac
import http.client
import json
import os
import secrets
import socketserver
import threading
import time
from http.cookies import SimpleCookie, CookieError
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit

COOKIE = "__Host-xiajin_session"
TTL = 8 * 3600
sessions = {}
lock = threading.Lock()
model_slots = threading.BoundedSemaphore(4)
login_user = os.environ["LOGIN_USER"]
salt = bytes.fromhex(os.environ["LOGIN_SALT"])
login_hash = bytes.fromhex(os.environ["LOGIN_HASH"])
gateway = urlsplit(os.environ.get("LLM_BASE_URL", ""))
origin = "https://br20.xiaoyuqi.top"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # 路径与状态由站点 Nginx 记录。口令、会话和请求正文均不写日志。

    def reply(self, status, data=None, cookie=None):
        body = json.dumps(data).encode() if data is not None else b""
        self.send_response(status)
        self.send_header("Cache-Control", "no-store")
        if data is not None:
            self.send_header("Content-Type", "application/json")
        if cookie is not None:
            age = TTL if cookie else 0
            self.send_header("Set-Cookie", f"{COOKIE}={cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age={age}")
        if status != 204:
            self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def token(self):
        jar = SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
        except CookieError:
            return ""
        return jar[COOKIE].value if COOKIE in jar else ""

    def authenticated(self):
        with lock:
            return sessions.get(self.token(), 0) > time.monotonic()

    def do_GET(self):
        if self.path == "/api/session":
            return self.reply(200, {"authenticated": self.authenticated()})
        self.reply(404)

    def do_POST(self):
        if self.headers.get("Origin", origin) != origin:
            return self.reply(403)
        if self.path == "/api/session/logout":
            with lock:
                sessions.pop(self.token(), None)
            return self.reply(204, cookie="")
        if self.path not in ("/api/session/login", "/api/llm/chat/completions"):
            return self.reply(404)
        login = self.path == "/api/session/login"
        if not login and not self.authenticated():
            return self.reply(401)
        if self.headers.get_content_type() != "application/json":
            return self.reply(415)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= (4096 if login else 131072):
                return self.reply(413)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                return self.reply(400)
        except (ValueError, RecursionError):
            return self.reply(400)
        if login:
            return self.login(data)
        self.chat(data)

    def login(self, data):
        password = data.get("password")
        if not isinstance(password, str):
            return self.reply(401)
        try:
            digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 400000)
        except UnicodeEncodeError:
            return self.reply(400)
        if not hmac.compare_digest(digest, login_hash) or data.get("username") != login_user:
            return self.reply(401)
        now = time.monotonic()
        token = secrets.token_urlsafe(32)
        with lock:
            for old in [key for key, expiry in sessions.items() if expiry <= now]:
                del sessions[old]
            sessions.pop(self.token(), None)
            sessions[token] = now + TTL
        self.reply(204, cookie=token)

    def chat(self, data):
        if gateway.scheme != "https" or not gateway.hostname or not os.environ.get("LLM_API_KEY") or not os.environ.get("LLM_MODEL"):
            return self.reply(503)
        messages = data.get("messages")
        if (not isinstance(messages, list) or not 0 < len(messages) <= 64 or
                not all(isinstance(m, dict) and m.get("role") in ("system", "user", "assistant")
                        and isinstance(m.get("content"), str) for m in messages)):
            return self.reply(400)
        limit = data.get("max_tokens", 2048)
        if type(limit) is not int or limit < 1:
            return self.reply(400)
        options = data.get("chat_template_kwargs")
        payload = json.dumps({
            "model": os.environ["LLM_MODEL"], "max_tokens": min(limit, 2400),
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
            "temperature": 0.3, "stream": data.get("stream") is True,
            "chat_template_kwargs": {"thinking": isinstance(options, dict) and options.get("thinking") is True},
        }).encode()
        if not model_slots.acquire(blocking=False):
            return self.reply(429)
        conn = http.client.HTTPSConnection(gateway.hostname, gateway.port, timeout=120)
        started = False
        try:
            conn.request("POST", gateway.path.rstrip("/") + "/chat/completions", body=payload, headers={
                "Host": os.environ.get("LLM_HOST_HEADER") or gateway.netloc,
                "Authorization": "Bearer " + os.environ["LLM_API_KEY"], "Content-Type": "application/json",
            })
            result = conn.getresponse()
            if result.status != 200:
                return self.reply(429 if result.status == 429 else 502)
            self.send_response(200)
            self.send_header("Content-Type", result.getheader("Content-Type", "application/json"))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            started = True
            while chunk := result.read1(16384):
                self.wfile.write(chunk)
        except (OSError, http.client.HTTPException):
            if not started:
                self.reply(502)
        finally:
            conn.close()
            model_slots.release()


class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True


if __name__ == "__main__":
    path = "/run/xiajin-supervision/api.sock"
    if os.path.exists(path):
        os.unlink(path)
    with Server(path, Handler) as server:
        os.chmod(path, 0o660)
        server.serve_forever()
