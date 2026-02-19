#!/usr/bin/env bash
#
# PostgreSQL backup for SP Customs. Use on server (or locally from project root).
# Reads backend/.env for DATABASE_URL_SYNC; backup written to backups/sp_customs_YYYY-MM-DD_HH-MM-SS.dump
# Read-only: pg_dump only reads from the DB and never modifies or deletes anything, even if the script fails.
#
# Run from project root: ./scripts/backup-db.sh
# Restore: pg_restore -U postgres -h HOST -d sp_customs --clean --if-exists backup.dump
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/sp_customs_${TIMESTAMP}.dump"

# Read DATABASE_URL_SYNC from backend .env (avoid sourcing whole file - .env may have invalid shell syntax)
ENV_FILE="${PROJECT_ROOT}/backend/.env"
if [ -f "$ENV_FILE" ]; then
  DATABASE_URL_SYNC=$(grep -E '^DATABASE_URL_SYNC=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
fi

# Connection from DATABASE_URL_SYNC (postgresql://user:pass@host:port/db) or env
PGUSER="${PGUSER:-postgres}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-sp_customs}"

if [ -n "$DATABASE_URL_SYNC" ]; then
  # Parse postgresql://user:password@host:port/database
  if [[ "$DATABASE_URL_SYNC" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
    PGUSER="${BASH_REMATCH[1]}"
    export PGPASSWORD="${BASH_REMATCH[2]}"
    PGHOST="${BASH_REMATCH[3]}"
    PGPORT="${BASH_REMATCH[4]}"
    PGDATABASE="${BASH_REMATCH[5]}"
  fi
fi

mkdir -p "$BACKUP_DIR"
echo "Backing up ${PGDATABASE} (${PGHOST}:${PGPORT}) to ${BACKUP_FILE} ..."

# Try pg_dump in PATH, then common install locations (Linux server, Mac)
PG_DUMP=""
if command -v pg_dump >/dev/null 2>&1; then
  PG_DUMP=pg_dump
elif [ -x "/usr/bin/pg_dump" ]; then
  PG_DUMP=/usr/bin/pg_dump
elif [ -x "/Library/PostgreSQL/18/bin/pg_dump" ]; then
  PG_DUMP="/Library/PostgreSQL/18/bin/pg_dump"
elif [ -x "/Library/PostgreSQL/17/bin/pg_dump" ]; then
  PG_DUMP="/Library/PostgreSQL/17/bin/pg_dump"
elif [ -x "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump" ]; then
  PG_DUMP="/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump"
fi

if [ -n "$PG_DUMP" ]; then
  $PG_DUMP -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" -Fc -f "$BACKUP_FILE" "$PGDATABASE"
  echo "Done. Backup: ${BACKUP_FILE}"
  ls -la "$BACKUP_FILE"
else
  echo "pg_dump not found. Install PostgreSQL client (e.g. postgresql-client) on the server."
  echo "Manual: PGPASSWORD=*** pg_dump -U $PGUSER -h $PGHOST -p $PGPORT -Fc -f sp_customs.dump $PGDATABASE"
  exit 1
fi
