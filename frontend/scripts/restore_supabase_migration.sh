#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_FILE="${BACKUP_FILE:-$ROOT_DIR/db_cluster-30-08-2025@20-59-53.backup}"
RESTORE_SQL="${RESTORE_SQL:-$ROOT_DIR/scripts/supabase_restore.sql}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/scripts/.db.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

: "${PGHOST:?Set PGHOST in scripts/.db.env}"
: "${PGPORT:=5432}"
: "${PGDATABASE:=postgres}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:?Set PGPASSWORD in scripts/.db.env}"

python3 "$ROOT_DIR/scripts/extract_supabase_restore.py" "$BACKUP_FILE" "$RESTORE_SQL"

echo "Testing database connection..."
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER sslmode=require" -c "SELECT version();" >/dev/null

echo "Applying restore SQL..."
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER sslmode=require" \
  -v ON_ERROR_STOP=1 \
  -f "$RESTORE_SQL"

echo "Verifying migrated tables..."
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER sslmode=require" -c "\dt public.*"
psql "host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER sslmode=require" -c "SELECT 'profiles' AS table_name, count(*) FROM public.profiles UNION ALL SELECT 'medications', count(*) FROM public.medications UNION ALL SELECT 'appointments', count(*) FROM public.appointments;"

echo "Migration complete."
