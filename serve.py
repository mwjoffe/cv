"""Local preview server for dist/, bound strictly to 127.0.0.1.

Usage: python3 serve.py [port]   (run python3 build.py first)
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

DIST = Path(__file__).resolve().parent / "dist"
HOST = "127.0.0.1"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def end_headers(self):
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; media-src 'self'; "
            "frame-src https://www.youtube-nocookie.com https://www.youtube.com; "
            "object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'",
        )
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _deny(self):
        self.send_error(405, "Method Not Allowed")

    do_POST = do_PUT = do_DELETE = do_PATCH = do_TRACE = _deny


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Serving {DIST} at http://{HOST}:{port}", flush=True)
    ThreadingHTTPServer((HOST, port), Handler).serve_forever()
