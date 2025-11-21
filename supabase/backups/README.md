# Backup & Recovery Playbook (Phase 11)

This folder contains an automated dump script that can be scheduled from CI or a cron runner. It relies on the Supabase CLI and writes encrypted SQL dumps to an object-storage bucket for retention.

## Prerequisites
- Supabase CLI installed on the runner.
- Service account token with access to the project (`SUPABASE_ACCESS_TOKEN`).
- Database password from **Settings → Database** (`SUPABASE_DB_PASSWORD`).
- A Storage bucket named `backups` (or override with `BACKUP_BUCKET`).

## Running a manual backup
```bash
cd supabase/backups
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_ID=abcdefghij \
SUPABASE_DB_PASSWORD=postgres-password \
BACKUP_BUCKET=backups \
./run-backup.sh
```

The script will:
1) Use `supabase db dump` to export a data-only SQL file with a UTC timestamped name.
2) Upload it to `supabase://<BACKUP_BUCKET>/postgres/` in the same project for durable retention.
3) Clean up any local dump files older than `BACKUP_RETENTION_DAYS` (default 30).

## Scheduling (cron/CI)
- Run daily during off-peak hours: `0 3 * * * /bin/bash -lc "cd /repo && supabase/backups/run-backup.sh"`
- Rotate `SUPABASE_DB_PASSWORD` and `SUPABASE_ACCESS_TOKEN` regularly via your secret store.
- Alert on failures by wiring the cron job output to Slack/email (e.g., GitHub Actions `continue-on-error: false`).

## Restore test cadence
- Monthly: run `supabase db restore` against a staging project using the newest dump to ensure the backups are usable.
- After schema changes: capture a fresh dump post-migration and validate restores against the new schema.
