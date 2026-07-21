#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$root/.env" ] || { echo "Missing .env" >&2; exit 1; }
set -a; . "$root/.env"; set +a
: "${DATABASE_URL:?DATABASE_URL is required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/backend/models/schema.sql"
for file in "$root"/backend/models/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"; done
