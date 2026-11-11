import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

# Credenciales leídas desde las variables de entorno (GitHub Secrets)
TOKEN = os.environ.get("TELEGRAM_TOKEN", "9108464378:AAGQgfDVSVz9k2A42qvnX5g1gSowWgJ8U1Q")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "2019064943")

hoy_str = datetime.now().strftime("%Y-%m-%d")
dia_semana_num = str(datetime.now().isoweekday() % 7) # 0=Dom, 1=Lun, 2=Mar...

# Cargar el archivo de backup JSON exportado
tareas, habituales = [], []
try:
    with open('myself_backup.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        tareas = json.loads(data.get('myday_tasks', '[]'))
        habituales = json.loads(data.get('myday_habitual', '[]'))
except Exception as e:
    print("Error o aviso al leer myself_backup.json:", e)

# Filtrar eventos del día
tareas_hoy = [t for t in tareas if t.get('date') == hoy_str and not t.get('completed')]
rutinas_hoy = [h for h in habituales if dia_semana_num in h.get('days', [])]

# Construir mensaje de Telegram
mensaje = f"☀️ *¡Buenos días, Eric! Agenda para hoy ({hoy_str})*\n\n"

if not tareas_hoy and not rutinas_hoy:
    mensaje += "🎉 No tienes tareas ni rutinas programadas para hoy."
else:
    if rutinas_hoy:
        mensaje += "🔄 *Rutinas Habituales:*\n"
        for h in rutinas_hoy:
            mensaje += f"• {h['title']} ({h.get('startTime', '10:00')} - {h.get('endTime', '11:00')})\n"
        mensaje += "\n"

    if tareas_hoy:
        mensaje += "📚 *Tareas Puntuales:*\n"
        for t in tareas_hoy:
            prefix = "📚" if t.get('category') == 'estudios' else "👤"
            mensaje += f"• {prefix} {t['title']} ({t.get('startTime', '09:00')} - {t.get('endTime', '10:00')})\n"

# Enviar vía Telegram Bot API
url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
payload = urllib.parse.urlencode({
    "chat_id": CHAT_ID,
    "text": mensaje,
    "parse_mode": "Markdown"
}).encode("utf-8")

req = urllib.request.Request(url, data=payload)
try:
    with urllib.request.urlopen(req) as response:
        print("Notificación enviada a Telegram con éxito.")
except Exception as e:
    print("Error al enviar la notificación:", e)