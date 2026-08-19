# Server Shifting Workflow Architecture

This document outlines the architecture and orchestration steps for shifting the backend of the KIET Exams Portal between Render (free tier) and AWS (production tier) with zero downtime and graceful user handling.

## Components Involved

1. **Frontend (S3 & CloudFront)**: 
   The frontend is entirely statically hosted on S3 and distributed via CloudFront. It relies on a runtime configuration file called `env.js` (stored in S3) to determine the current `API_BASE_URL`.
   - By updating this `env.js` file and invalidating the CloudFront cache, we can instantly point all users to a new backend without a frontend rebuild.
   - The frontend uses a global `fetch` interceptor to monitor for a 10-minute warning header (`X-Maintenance-At`) and a maintenance mode status (`503 MAINTENANCE_MODE`).

2. **Backend (FastAPI)**:
   - A middleware checks Redis on every request.
   - If a warning timer is set, it injects the `X-Maintenance-At` header, causing the frontend to show a countdown banner.
   - If maintenance mode is fully active, it returns `503`, freezing the frontend and preventing any database writes. Fastcron is bypassed via the `/docs` endpoint to prevent false alarms.

3. **Database (Supabase & RDS)**:
   - Supabase is used during non-exam days (Render).
   - AWS RDS is used during exam days.
   - Synchronization scripts guarantee data parity before shifting traffic.

4. **ElastiCache (Redis)**:
   - Redis stores session states, rate limits, and our critical `maintenance_mode` flags.
   - By taking snapshots of ElastiCache before shutting it down, it perfectly preserves these flags across reboots.

## The Orchestration Workflow

We use a third-party cron service (like Fastcron) to orchestrate this process using two distinct hits to the system per shift.

### Phase 1: The Warning (10 Minutes Prior)
Fastcron hits `POST /admin/schedule-maintenance` with `{"minutes": 10}` on the currently active backend.
- A Redis key `maintenance_timer_end` is created.
- The backend starts injecting `X-Maintenance-At` into all responses.
- The frontend interceptor detects this and displays a countdown banner to the students: "Service will go down for maintenance in 10m 00s. Please save your work."
- Exactly at 0m 0s, the frontend instantly freezes itself, preventing any further user action.

### Phase 2: The Shift (Execution)
Exactly 10 minutes later, Fastcron triggers the appropriate GitHub Action Webhook (`shift-to-aws.yml` or `shift-to-render.yml`).

#### Shifting to AWS (Render -> AWS)
1. GitHub Action calls `POST /admin/maintenance-mode` on Render. Render goes fully offline.
2. `env.js` in S3 is overwritten with the AWS backend URL. CloudFront is invalidated.
3. In parallel, RDS and ElastiCache are restored from their snapshots.
   *Because ElastiCache was snapshot while in maintenance mode during the last shutdown, it boots up natively with `maintenance_mode = true`!*
4. ECS is scaled up. Because ElastiCache is in maintenance, ECS safely rejects any premature traffic.
5. Database is synced (Supabase -> RDS).
6. GitHub Action calls `POST /admin/maintenance-mode` on AWS (disabling it). AWS starts accepting traffic. Users refresh and continue seamlessly on AWS.

#### Shifting to Render (AWS -> Render)
1. GitHub Action calls `POST /admin/maintenance-mode` on AWS. AWS goes fully offline.
2. `env.js` in S3 is overwritten with the Render backend URL. CloudFront is invalidated.
3. Render's maintenance mode is verified to be ON.
4. Database is synced (RDS -> Supabase).
5. GitHub Action calls `POST /admin/maintenance-mode` on Render (disabling it). Render starts accepting traffic.
6. In parallel, to save costs:
   - RDS takes a final snapshot and is deleted.
   - ElastiCache takes a final snapshot (preserving the `maintenance_mode = true` flag) and is deleted.
   - ECS is scaled to 0 tasks.
