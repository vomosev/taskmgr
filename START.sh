#!/usr/bin/env bash
#
# START.sh — launch the TaskMgr Express API (never the Next.js dev/prod server).
#
# Usage:
#   bash START.sh
#
# The API is started in the background with nohup, its PID is written to
# api.pid and all output is appended to logs/api.log.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# 1. Load environment variables from .env when present
# ---------------------------------------------------------------------------
if [ -f ".env" ]; then
  echo "[START] Loading environment from .env"
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo "[START] No .env file found — relying on the ambient environment."
  echo "[START] See .env.example for the full list of supported variables."
fi

# ---------------------------------------------------------------------------
# 2. Install production dependencies when node_modules is missing
# ---------------------------------------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "[START] node_modules missing — running npm install --omit=dev"
  npm install --omit=dev
fi

# ---------------------------------------------------------------------------
# 3. Prepare log directory
# ---------------------------------------------------------------------------
mkdir -p logs

# ---------------------------------------------------------------------------
# 4. Stop any previously started instance recorded in api.pid
# ---------------------------------------------------------------------------
if [ -f "api.pid" ]; then
  OLD_PID="$(cat api.pid 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[START] Stopping previous API process (PID $OLD_PID)"
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f api.pid
fi

# ---------------------------------------------------------------------------
# 5. Launch the Express API in the background
# ---------------------------------------------------------------------------
echo "[START] Starting TaskMgr API (server/index.js) on port ${PORT:-4116}"
nohup node server/index.js > logs/api.log 2>&1 &
API_PID=$!
echo "$API_PID" > api.pid

sleep 1
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "[START] ERROR: the API process exited immediately. Last log lines:"
  tail -n 40 logs/api.log || true
  exit 1
fi

echo "[START] API running with PID $API_PID"
echo "[START] Logs:        logs/api.log"
echo "[START] Health check: https://taskmgr-api.arx-app.com:4116/health"