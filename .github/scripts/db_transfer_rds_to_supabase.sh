#!/bin/bash
# KIET Exams Portal - Database Transfer Script (AWS RDS -> Supabase)
# This script is manually called by GitHub Actions to push RDS data back to Supabase.

set -e # Exit immediately if a command exits with a non-zero status.

echo "Starting KIET Exams Portal Database Sync (RDS -> Supabase)..."

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set."
  exit 1
fi

if [ -z "$RDS_DB_URL" ]; then
  echo "ERROR: RDS_DB_URL is not set."
  exit 1
fi

echo "Step 1: Exporting data from AWS RDS..."
# We use docker to guarantee we use PostgreSQL 17 tools
docker run --rm postgres:17 pg_dump "$RDS_DB_URL" --no-owner --no-acl --clean > /tmp/rds_backup.sql

echo "Step 2: Importing data into Supabase..."
# We redirect stdout to /dev/null to avoid massive logs, but keep stderr for errors.
docker run --rm -i postgres:17 psql "$SUPABASE_DB_URL" < /tmp/rds_backup.sql > /dev/null

echo "Step 3: Cleaning up..."
rm /tmp/rds_backup.sql

echo "✅ Database Sync Complete! Supabase now perfectly matches AWS RDS."
