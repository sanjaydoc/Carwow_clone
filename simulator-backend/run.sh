#!/usr/bin/env bash
# Start the local Simulator backend. Linux/macOS. (Windows: see README.)
set -e
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Creating venv (Python 3.12 recommended)…"
  python3.12 -m venv .venv 2>/dev/null || python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
[ -f .env ] || cp .env.example .env

echo "Backend on http://localhost:8000  (docs: /docs)"
exec uvicorn app.main:app --reload --port 8000
