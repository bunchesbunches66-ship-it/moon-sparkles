#!/usr/bin/env bash
# integration/launcher.sh
# Start Newelle backend (if not running), wait until it's healthy, then start Utsuwa frontend.
# Exits with the frontend exit code. Cleans up the backend if this script started it.

set -euo pipefail

# Configuration (edit if needed)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_BIN="${REPO_ROOT}/third_party/Newelle/newelle"
FRONTEND_BIN="${REPO_ROOT}/third_party/Utsuwa/utsuwa"
LOG_DIR="${HOME}/.local/share/newelle-utsuwa/logs"
BACKEND_LOG="${LOG_DIR}/newelle.log"
FRONTEND_LOG="${LOG_DIR}/utsuwa.log"
BACKEND_PORT="${NEWELLE_PORT:-5000}"
BACKEND_HOST="127.0.0.1"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"
HEALTH_PATH="${NEWELLE_HEALTH_PATH:-/health}"
START_TIMEOUT=${START_TIMEOUT:-20}   # seconds to wait for backend ready
SLEEP_BETWEEN_CHECKS=0.5

mkdir -p "${LOG_DIR}"

# Helper: is backend responding?
backend_healthy() {
  if command -v curl >/dev/null 2>&1; then
    curl -s -f --max-time 2 "${BACKEND_URL}${HEALTH_PATH}" >/dev/null 2>&1
    return $?
  else
    # fallback: try to open TCP connection with /dev/tcp
    (echo > /dev/tcp/${BACKEND_HOST}/${BACKEND_PORT}) >/dev/null 2>&1 && return 0 || return 1
  fi
}

# Find running backend (simple heuristic: pid by listening port)
backend_pid_running() {
  # Try lsof, ss, or netstat
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:${BACKEND_PORT} -sTCP:LISTEN -Fp | sed 's/^p//' | head -n1 || true
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :${BACKEND_PORT}" 2>/dev/null | awk -F',' '/LISTEN/ {print $2}' | sed 's/.*pid=//' | sed 's/,.*//' | head -n1 || true
  else
    # best-effort
    echo ""
  fi
}

CLEANUP_STARTED_BACKEND_PID=""

stop_started_backend() {
  if [ -n "${CLEANUP_STARTED_BACKEND_PID:-}" ]; then
    if kill -0 "${CLEANUP_STARTED_BACKEND_PID}" >/dev/null 2>&1; then
      echo "Stopping backend (pid ${CLEANUP_STARTED_BACKEND_PID})..."
      kill "${CLEANUP_STARTED_BACKEND_PID}" || true
      # give it a moment
      sleep 1
      kill -9 "${CLEANUP_STARTED_BACKEND_PID}" >/dev/null 2>&1 || true
    fi
  fi
}

trap 'stop_started_backend' EXIT

echo "Integration launcher: REPO_ROOT=${REPO_ROOT}"
echo "Backend binary: ${BACKEND_BIN}"
echo "Frontend binary: ${FRONTEND_BIN}"
echo "Logs: backend -> ${BACKEND_LOG}, frontend -> ${FRONTEND_LOG}"
echo "Backend URL: ${BACKEND_URL}${HEALTH_PATH}"

# 1) Ensure backend binary exists
if [ ! -x "${BACKEND_BIN}" ]; then
  echo "ERROR: Backend binary not found or not executable at ${BACKEND_BIN}"
  echo "Please build Newelle (meson/ninja) or update BACKEND_BIN path."
  exit 2
fi

# 2) Ensure frontend binary exists
if [ ! -x "${FRONTEND_BIN}" ]; then
  echo "ERROR: Frontend binary not found or not executable at ${FRONTEND_BIN}"
  echo "Please build Utsuwa or update FRONTEND_BIN path."
  exit 2
fi

# 3) If a backend is already listening and healthy, reuse it
if backend_healthy; then
  echo "Found a healthy backend already running at ${BACKEND_URL}"
else
  EXISTING_PID="$(backend_pid_running || true)"
  if [ -n "${EXISTING_PID}" ]; then
    echo "Port ${BACKEND_PORT} is in use by PID ${EXISTING_PID}. Waiting briefly for it to become healthy..."
    started=0
    t=0
    while [ "${t}" -lt "${START_TIMEOUT}" ]; do
      if backend_healthy; then
        started=1
        break
      fi
      sleep "${SLEEP_BETWEEN_CHECKS}"
      t=$(awk "BEGIN {print $t + $SLEEP_BETWEEN_CHECKS}")
    done
    if [ "${started}" -eq 0 ]; then
      echo "Existing process on port ${BACKEND_PORT} is not responding to healthcheck; continuing to start our own backend."
    else
      echo "Existing process became healthy; reusing it."
    fi
  fi

  # Start backend in background
  echo "Starting backend..."
  # Export config environment variables for backend if needed
  export NEWELLE_PORT="${BACKEND_PORT}"
  # redirect stdout/stderr to log
  nohup "${BACKEND_BIN}" --port "${BACKEND_PORT}" >>"${BACKEND_LOG}" 2>&1 &

  CLEANUP_STARTED_BACKEND_PID=$!
  echo "Backend started with pid ${CLEANUP_STARTED_BACKEND_PID}, waiting for healthcheck..."

  # Wait for healthcheck
  waited=0
  while [ "${waited}" -lt "${START_TIMEOUT}" ]; do
    if backend_healthy; then
      echo "Backend is healthy."
      break
    fi
    sleep "${SLEEP_BETWEEN_CHECKS}"
    waited=$(awk "BEGIN {print $waited + $SLEEP_BETWEEN_CHECKS}")
  done

  if ! backend_healthy; then
    echo "Backend did not become healthy within ${START_TIMEOUT}s. See log: ${BACKEND_LOG}"
    # dump last few lines for debugging
    tail -n 50 "${BACKEND_LOG}" || true
    exit 3
  fi
fi

# 4) Start frontend (replace process with exec so that wrapper exit status is frontend exit code)
echo "Starting frontend..."
# Export variable to let frontend find backend if it needs it
export NEWELLE_URL="${BACKEND_URL}"
# run frontend with logs
"${FRONTEND_BIN}" "$@" >>"${FRONTEND_LOG}" 2>&1 || FRONT_EXIT=$?
FRONT_EXIT=${FRONT_EXIT:-$?}
echo "Frontend exited with code ${FRONT_EXIT}"

# Script will exit now; trap will stop the backend only if we started it (cleanup)
exit "${FRONT_EXIT}"
