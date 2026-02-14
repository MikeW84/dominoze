#!/bin/sh
PORT=8000
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

echo "Starting Dominoze..."
echo "  Local:   http://localhost:$PORT"
[ -n "$LOCAL_IP" ] && echo "  Network: http://$LOCAL_IP:$PORT"
echo ""
echo "Press Ctrl+C to stop."

python3 -m http.server "$PORT" -d "$(dirname "$0")" &
sleep 0.5
xdg-open "http://localhost:$PORT" 2>/dev/null || open "http://localhost:$PORT" 2>/dev/null || true
wait
