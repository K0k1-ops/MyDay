#!/bin/bash
if ! pgrep -f "python3 -m http.server 8080" > /dev/null; then
    cd /home/ericma/Escritorio/MyDay && python3 -m http.server 8080 > /dev/null 2>&1 &
    sleep 1
fi
firefox --new-window http://localhost:8080


