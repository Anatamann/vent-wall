#!/bin/sh
set -e

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-ventwall}"
POSTGRES_DB="${POSTGRES_DB:-ventwall}"

echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 2
done

echo "Running database migrations..."
node dist/scripts/migrate.js

if [ "${VENTWALL_SEED_DB:-false}" = "true" ]; then
  echo "Seeding database (idempotent)..."
  node dist/scripts/seed.js
fi

echo "Starting Vent Wall API on port ${PORT:-4000}..."
exec node dist/index.js