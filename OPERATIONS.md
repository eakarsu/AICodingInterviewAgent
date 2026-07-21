# Operations

Copy `.env.example` to `.env`, replace every secret, then run `scripts/bootstrap.sh` once and `scripts/migrate.sh` for reviewed schema changes. `start.sh` only starts the two project processes and only stops the PIDs it created. Demo seeding is destructive/test-only and requires both `CONFIRM_DEMO_SEED=yes` and an explicit `DEMO_ADMIN_PASSWORD`.

The governed API is `/api/interview-workflow`. Tenant membership and roles must be provisioned by an administrator. Source code is referenced by private object key and checksum; it is not executed by the web process. A real isolated sandbox must call the signed runner-result endpoint. Sandbox isolation, curated hidden datasets, identity provisioning, provider credentials, latency/load evaluation, and instructor validation remain deployment gates.
