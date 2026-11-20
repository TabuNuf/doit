#!/bin/sh
# Stops whatever listens on the board's port (a server on old code), waiting up to 5 seconds.
PORT="${DOIT_PORT:-4317}"
pids=$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null) || exit 0
kill $pids 2>/dev/null
i=0
while [ $i -lt 20 ] && lsof -ti "tcp:$PORT" -sTCP:LISTEN >/dev/null 2>&1; do sleep 0.25; i=$((i+1)); done
pids=$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null) && kill -9 $pids 2>/dev/null
exit 0
