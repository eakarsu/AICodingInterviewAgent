#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
set -a; . "$root/.env"; set +a
case "${CONFIRM_DEMO_SEED:-}" in yes|YES) ;; *) echo "Set CONFIRM_DEMO_SEED=yes to seed isolated demo data" >&2; exit 1 ;; esac
(cd "$root/backend" && node seeds/seed.js)
