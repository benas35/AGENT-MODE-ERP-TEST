#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN for CLI authentication}"
: "${SUPABASE_PROJECT_ID:?Set SUPABASE_PROJECT_ID (e.g. abcdefghij)}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD (from Database settings)}"
: "${BACKUP_BUCKET:=backups}"
: "${BACKUP_RETENTION_DAYS:=30}"

STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
FILENAME="postgres-backup-${STAMP}.sql"
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"

supabase db dump \
  --project-ref "${SUPABASE_PROJECT_ID}" \
  --db-url "${DB_URL}" \
  --file "${FILENAME}" \
  --data-only

# Upload to object storage for durable retention
supabase storage cp "${FILENAME}" "supabase://${BACKUP_BUCKET}/postgres/${FILENAME}" --project-ref "${SUPABASE_PROJECT_ID}"

# Keep local working directory tidy when running from CI/cron
find . -maxdepth 1 -name 'postgres-backup-*.sql' -type f -mtime +"${BACKUP_RETENTION_DAYS}" -delete

echo "Backup complete: ${FILENAME}" >&2
