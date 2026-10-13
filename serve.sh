#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8008}"
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/.serve.pid"
LOG_FILE="$DIR/.serve.log"

cmd="${1:-start}"

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

start() {
  if is_running; then
    echo "already running (pid $(cat "$PID_FILE")) on http://localhost:$PORT"
    exit 0
  fi
  cd "$DIR"
  nohup python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 0.3
  echo "started pid $(cat "$PID_FILE") → http://localhost:$PORT"
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:$PORT"
  fi
}

stop() {
  if ! is_running; then
    echo "not running"
    rm -f "$PID_FILE"
    exit 0
  fi
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true
  sleep 0.2
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "stopped pid $pid"
}

status() {
  if is_running; then
    echo "running pid $(cat "$PID_FILE") → http://localhost:$PORT"
  else
    echo "stopped"
  fi
}

logs() {
  [[ -f "$LOG_FILE" ]] || { echo "no log file"; exit 0; }
  tail -f "$LOG_FILE"
}

case "$cmd" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; start ;;
  status)  status ;;
  logs)    logs ;;
  *)       echo "usage: $0 {start|stop|restart|status|logs}"; exit 1 ;;
esac
