#!/bin/bash
set -e

echo "=== Update GoWA - gowa.wss.web.id ==="

# 1. Git pull
echo "[1/5] Pulling latest code..."
git pull

# 2. Stop service
echo "[2/5] Stopping gowa-rest service..."
sudo systemctl stop gowa-rest

# 3. Build web frontend
echo "[3/5] Building web frontend..."
cd web
npm install
npm run build

# 4. Tidy dependencies & build Go binary
echo "[4/5] Tidying Go modules and building binary..."
cd ../src
go mod tidy
go build -o whatsapp

# 5. Restart service
echo "[5/5] Restarting gowa-rest service..."
sudo systemctl restart gowa-rest

echo "=== Update complete ==="
sudo systemctl status gowa-rest --no-pager
