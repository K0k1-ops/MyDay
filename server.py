import http.server
import socketserver
import json

PORT = 8080
BACKUP_FILE = 'myself_backup.json'

class MyselfHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/save':
            length = int(self.headers['Content-Length'])
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                print(f"[AUTO-SAVE] {BACKUP_FILE} actualizado correctamente.")
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

print(f"Servidor Myself corriendo en http://localhost:{PORT}")
with socketserver.TCPServer(("", PORT), MyselfHandler) as httpd:
    httpd.serve_forever()
