#!/bin/bash
# Script de sincronización automática al apagar el equipo

LOGFILE="/home/ericma/Escritorio/MyDay/shutdown_sync.log"
echo "=== Apagado detectado: $(date) ===" >> "$LOGFILE"

cd /home/ericma/Escritorio/MyDay || exit

# Asegurar que estamos en la rama main
/usr/bin/git checkout main >> "$LOGFILE" 2>&1

if [ -f "myself_backup.json" ]; then
    # Añadir el backup y cualquier cambio en el repositorio
    /usr/bin/git add myself_backup.json >> "$LOGFILE" 2>&1
    /usr/bin/git add -u >> "$LOGFILE" 2>&1
    
    # Hacer commit solo si hay cambios detectados
    if ! /usr/bin/git diff-index --quiet HEAD --; then
        /usr/bin/git commit -m "Auto-sync al apagar portátil ($(date +'%Y-%m-%d %H:%M'))" >> "$LOGFILE" 2>&1
        /usr/bin/git push origin main >> "$LOGFILE" 2>&1
        echo "✅ Sincronizado correctamente con GitHub." >> "$LOGFILE"
    else
        echo "ℹ️ No se detectaron cambios nuevos en myself_backup.json." >> "$LOGFILE"
    fi
else
    echo "⚠️ No se encontró myself_backup.json" >> "$LOGFILE"
fi#!/bin/bash
# Script de sincronización automática al apagar el equipo

LOGFILE="/home/ericma/Escritorio/MyDay/shutdown_sync.log"
echo "=== Apagado detectado: $(date) ===" >> "$LOGFILE"

cd /home/ericma/Escritorio/MyDay || exit

if [ -f "myself_backup.json" ]; then
    /usr/bin/git add myself_backup.json >> "$LOGFILE" 2>&1
    /usr/bin/git commit -m "Auto-sync al apagar portátil ($(date +'%Y-%m-%d %H:%M'))" >> "$LOGFILE" 2>&1
    /usr/bin/git push origin main >> "$LOGFILE" 2>&1
    echo "✅ Sincronizado correctamente con GitHub." >> "$LOGFILE"
else
    echo "⚠️ No se encontró myself_backup.json" >> "$LOGFILE"
fi
