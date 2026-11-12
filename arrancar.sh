#!/bin/bash

CD_DIR="/home/ericma/Escritorio/MyDay"
cd "$CD_DIR" || exit

# 1. Iniciar Servidor Web Local
if ! pgrep -f "python3 server.py" > /dev/null; then
    python3 server.py > /dev/null 2>&1 &
    sleep 1
fi

# 2. Reiniciar Asistente Jarvis con el nuevo código
pkill -f "python3 jarvis_bot.py"
python3 jarvis_bot.py > /dev/null 2>&1 &
echo "🤖 Jarvis Bot actualizado y corriendo."

# 3. Abrir Firefox
firefox --new-window http://localhost:8080

# 4. Al cerrar Firefox, forzar sincronización con GitHub
echo "🔄 Sincronizando agenda con GitHub..."
git add myself_backup.json
git commit -m "Auto-sync al cerrar app ($(date +'%Y-%m-%d %H:%M'))"
git push origin main
echo "✅ Cambios subidos correctamente."
