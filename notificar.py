import os
import json
import requests
from datetime import datetime
from zoneinfo import ZoneInfo

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_PATH = os.path.join(BASE_DIR, 'myself_backup.json')

BOT_TOKEN = "9108464378:AAGQgfDVSVz9k2A42qvnX5g1gSowWgJ8U1Q"  # Tu token de Telegram
CHAT_ID = "2019064943"         # Tu Chat ID

def bucle_aviso_manana():
    """Hilo secundario que envía la agenda automáticamente a las 08:00 AM (Hora de España)"""
    enviado_hoy = False
    while True:
        try:
            # Obtiene siempre la hora exacta en España, sin importar dónde esté el servidor
            now = datetime.now(ZoneInfo("Europe/Madrid"))
            
            if now.hour == 8 and now.minute == 0 and not enviado_hoy:
                chat_id = get_saved_chat_id()
                if chat_id:
                    send_message(chat_id, "🌅 *¡Buenos días! Aquí tienes tu agenda para hoy:*")
                    responder_agenda(chat_id, now.date())
                    enviado_hoy = True
            
            if now.hour == 0 and now.minute == 0:
                enviado_hoy = False
        except Exception as e:
            print(f"⚠️ Error en recordatorio matutino: {e}")
            
        time.sleep(30)

def enviar_notificacion():
    if not os.path.exists(BACKUP_PATH):
        print(f"Aviso: No se encontró {BACKUP_PATH}")
        return

    with open(BACKUP_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    now = datetime.now()
    hoy_str = now.strftime('%Y-%m-%d')
    dia_semana_str = now.strftime('%w')

    tareas = json.loads(data.get('myday_tasks', '[]'))
    habituales = json.loads(data.get('myday_habitual', '[]'))

    tareas_hoy = [t for t in tareas if t.get('date') == hoy_str]
    rutinas_hoy = [h for h in habituales if 'days' in h and dia_semana_str in h['days']]

    if not tareas_hoy and not rutinas_hoy:
        mensaje = "☀️ *¡Buenos días!* Hoy no tienes ninguna tarea ni rutina agendada."
    else:
        mensaje = f"☀️ *¡Buenos días! Agenda para hoy ({now.strftime('%d/%m')})*\n\n"
        
        if rutinas_hoy:
            mensaje += "🔄 *Rutinas:*\n"
            for h in rutinas_hoy:
                mensaje += f"• *{h.get('title')}* ({h.get('startTime', '10:00')} - {h.get('endTime', '11:00')})\n"
            mensaje += "\n"

        if tareas_hoy:
            mensaje += "📌 *Tareas:*\n"
            for t in tareas_hoy:
                estado = "✅" if t.get('completed') else "⏳"
                mensaje += f"{estado} *{t.get('title')}* ({t.get('startTime', '09:00')})\n"

    payload = {
        'chat_id': CHAT_ID,
        'text': mensaje,
        'parse_mode': 'Markdown',
        'disable_notification': False
    }

    requests.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage", json=payload)
    print("Notificación matutina enviada a Telegram con éxito.")

if __name__ == "__main__":
    enviar_notificacion()