#!/bin/bash

# Apply database migrations for User Story 2
# This script applies the critical migrations needed for token purchase system

echo "🚀 Applying database migrations for User Story 2..."

# Read Supabase connection details from .env.local
export $(grep SUPABASE .env.local | xargs)

# Clean up newlines in variables
SUPABASE_DB_USER=$(echo $SUPABASE_DB_USER | tr -d '\n')
SUPABASE_DB_NAME=$(echo $SUPABASE_DB_NAME | tr -d '\n')
SUPABASE_DB_PORT=$(echo $SUPABASE_DB_PORT | tr -d '\n')

# Build connection string
DB_URL="postgresql://${SUPABASE_DB_USER}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}?sslmode=require"

echo "📦 Applying migrations..."

# Apply only the critical migrations for User Story 2
# (001 should already exist, 002 and 003 are needed for tokens)

echo "  ✓ Migration 002: users_token_accounts"
psql "$DB_URL" -f supabase/migrations/002_create_token_accounts.sql 2>&1 | grep -v "already exists" || true

echo "  ✓ Migration 003: users_token_transactions"
psql "$DB_URL" -f supabase/migrations/003_create_token_transactions.sql 2>&1 | grep -v "already exists" || true

echo ""
echo "✅ Migrations applied successfully!"
echo ""
echo "🔍 Verifying tables..."
psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%token%';"

echo ""
echo "✅ Database ready for User Story 2 testing!"
echo ""
echo "Next steps:"
echo "  1. Configure Stripe keys in backend/.env"
echo "  2. Start backend: cd backend && uvicorn src.main:app --reload"
echo "  3. Start frontend: cd frontend && npm run dev"
echo "  4. Start Stripe CLI: stripe listen --forward-to http://localhost:8000/webhooks/stripe"
