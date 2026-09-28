import http.server
import socketserver
import json
import os
import smtplib
import ssl
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

PORT = 3000
DIRECTORY = r'c:\Users\HP PROBOOK.ROMII\Desktop\BitNovaSwap\blockgate-main-original-backup'

# Load SMTP credentials from .env.txt
env_path = r'c:\Users\HP PROBOOK.ROMII\Desktop\BitNovaSwap\.env.txt'
smtp_config = {
    'host': 'smtp.hostinger.com',
    'port': 465,
    'user': 'support@bitnovaswap.net',
    'pass': 'ggRR54$$4E'
}

if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if ':' in line:
                key, val = line.split(':', 1)
                k = key.strip().upper().replace('-', '_')
                v = val.strip()
                if k in ['SMTP_HOST', 'SMTP_HOSTINGER']:
                    smtp_config['host'] = v
                elif k == 'SMTP_PORT':
                    smtp_config['port'] = int(v)
                elif k == 'SMTP_USERNAME':
                    smtp_config['user'] = v
                elif k == 'SMTP_PASSWORD':
                    smtp_config['pass'] = v

class BitNovaSwapHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path in ['/api/send-email', '/api/contact', '/submit']:
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length).decode('utf-8', errors='ignore')
            
            form_data = {}
            if self.headers.get('Content-Type', '').startswith('application/json'):
                try:
                    form_data = json.loads(post_body)
                except Exception:
                    pass
            else:
                parsed = urllib.parse.parse_qs(post_body)
                for k, v in parsed.items():
                    form_data[k] = v[0] if len(v) == 1 else v

            name = form_data.get('name', 'Anonymous Visitor')
            sender_email = form_data.get('email', 'No email provided')
            subject = form_data.get('subject_field') or form_data.get('subject') or 'New Contact Message'
            message_text = form_data.get('message', '')

            print(f"[SMTP API] Sending email from '{name}' ({sender_email}) - Subject: '{subject}'")

            try:
                msg = MIMEMultipart('alternative')
                msg['From'] = f"BitNovaSwap Support <{smtp_config['user']}>"
                msg['To'] = smtp_config['user']
                msg['Reply-To'] = sender_email
                msg['Subject'] = f"[Website Inquiry] {subject} - {name}"

                html_body = f"""
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0a0e17; color: #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #00d4ff;">New Contact Message from BitNovaSwap Website</h2>
                    <hr style="border: 0; border-top: 1px solid #1e293b;" />
                    <p><strong>From Name:</strong> {name}</p>
                    <p><strong>Sender Email:</strong> <a href="mailto:{sender_email}" style="color: #00d4ff;">{sender_email}</a></p>
                    <p><strong>Subject:</strong> {subject}</p>
                    <p><strong>Message Content:</strong></p>
                    <div style="background-color: #121824; padding: 15px; border-left: 4px solid #00d4ff; margin-top: 10px;">
                        <p style="white-space: pre-wrap; margin: 0; color: #e0e0e0;">{message_text}</p>
                    </div>
                </div>
                """
                msg.attach(MIMEText(html_body, 'html'))

                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_config['host'], smtp_config['port'], context=context) as server:
                    server.login(smtp_config['user'], smtp_config['pass'])
                    server.sendmail(smtp_config['user'], [smtp_config['user']], msg.as_string())

                print("[SMTP API] Email delivered successfully to support@bitnovaswap.net!")
                res = json.dumps({"success": True, "message": "Email sent successfully to support@bitnovaswap.net!"}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)

            except Exception as err:
                print(f"[SMTP API Error] {err}")
                res = json.dumps({"success": False, "message": str(err)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
        else:
            self.send_error(404, "Endpoint Not Found")

print(f"BitNovaSwap Server with SMTP API starting on http://localhost:{PORT}")
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), BitNovaSwapHandler) as httpd:
    httpd.serve_forever()
