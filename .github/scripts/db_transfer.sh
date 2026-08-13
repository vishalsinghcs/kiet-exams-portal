#!/bin/bash
# KIET Exams Portal - Database Transfer Script (Supabase -> AWS RDS)
# This script is automatically called by GitHub Actions during Exam Day Startup.

set -e # Exit immediately if a command exits with a non-zero status.

echo "Starting KIET Exams Portal Database Sync..."

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set."
  exit 1
fi

if [ -z "$RDS_DB_URL" ]; then
  echo "ERROR: RDS_DB_URL is not set."
  exit 1
fi


echo "Step 1: Exporting data from Supabase..."
# We use --no-owner and --no-acl to avoid permission issues when restoring to RDS.
# We use --clean to drop existing objects before recreating them (ensures full overwrite).
pg_dump "$SUPABASE_DB_URL" --no-owner --no-acl --clean -f /tmp/supabase_backup.sql

echo "Step 2: Importing data into AWS RDS..."
# We redirect stdout to /dev/null to avoid massive logs, but keep stderr for errors.
psql "$RDS_DB_URL" -f /tmp/supabase_backup.sql > /dev/null

echo "Step 3: Cleaning up..."
rm /tmp/supabase_backup.sql

echo "✅ Database Sync Complete! RDS now matches Supabase."
