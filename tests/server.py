"""Test server for tests/: serves the project (with Range support, from tools/serve.py) and takes test results by POST
(each test POSTs its log to /__result/<name>, saved as tests/out/<name>.txt).
Usage: python3 tests/server.py <repo> <out dir> <port>   (tests/lib.sh starts it)
If out/bump.txt exists, sw.js and changelog.json are served as if version 2.5.9 had been released."""
import re, importlib.util, http.server, io, os, sys
REPO, OUT = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location('serve', os.path.join(REPO, 'tools', 'serve.py'))
serve = importlib.util.module_from_spec(spec); spec.loader.exec_module(serve)
class H(serve.RangeHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        path = self.path.split('?')[0]
        if os.path.exists(os.path.join(OUT, 'bump.txt')) and path in ('/sw.js', '/changelog.json'):
            body = open(os.path.join(REPO, path.lstrip('/')), encoding='utf8').read()
            if path == '/sw.js': body = re.sub(r"const VERSION = '[0-9.]+';", "const VERSION = '2.5.9';", body)
            else: body = re.sub(r'"latest": "[0-9.]+"', '"latest": "2.5.9"', body).replace('"versions": [', '"versions": [\n  { "v": "2.5.9", "notes": ["A test update"] },', 1)
            data = body.encode('utf8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript' if path.endswith('.js') else 'application/json')
            self.send_header('Content-Length', str(len(data))); self.send_header('Cache-Control', 'no-cache'); self.end_headers()
            self.wfile.write(data); return
        return super().do_GET()
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        name = os.path.basename(self.path.split('?')[0]) or 'result'
        body = self.rfile.read(n)
        if name == 'bump': open(os.path.join(OUT, 'bump.txt'), 'w').write('1')
        elif name == 'unbump':
            p = os.path.join(OUT, 'bump.txt')
            if os.path.exists(p): os.remove(p)
        else:
            with open(os.path.join(OUT, name + '.txt'), 'wb') as f: f.write(body)
        self.send_response(204); self.end_headers()
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[3])), H).serve_forever()
