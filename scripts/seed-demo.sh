#!/usr/bin/env bash
set -euo pipefail
[ "${CONFIRM_DEMO_SEED:-}" = "yes" ] || { echo "Set CONFIRM_DEMO_SEED=yes to seed isolated demo data" >&2; exit 1; }
root="$(cd "$(dirname "$0")/.." && pwd)"
set -a; . "$root/.env"; set +a
(cd "$root/backend" && node seeds/seed.js)
