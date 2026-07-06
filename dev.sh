#!/bin/bash
set -e

cd "$(dirname "$0")"

# macOS CGO workaround
if [[ "$OSTYPE" == "darwin"* ]]; then
  export CGO_CFLAGS_ALLOW="-Xpreprocessor"
fi

# Setup .env if not exists
if [ ! -f src/.env ]; then
  echo "[dev] Creating src/.env from .env.example ..."
  cp src/.env.example src/.env
fi

# Start backend (Go)
start_backend() {
  if command -v air &>/dev/null; then
    echo "[dev] Starting Go backend with air (hot reload) on :3000 ..."
    cd src
    air
  else
    echo "[dev] Starting Go backend with go run on :3000 ..."
    cd src
    go run . rest
  fi
}

# Install web deps if needed
if [ ! -d web/node_modules ]; then
  echo "[dev] Installing web dependencies ..."
  cd web && npm install && cd ..
fi

# Start web UI (Vite)
echo "[dev] Starting Web UI (Vite) ..."
cd web && npm run dev &
WEB_PID=$!

# Start backend
start_backend &
BACKEND_PID=$!

# Trap to kill both on exit
trap "kill $BACKEND_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
