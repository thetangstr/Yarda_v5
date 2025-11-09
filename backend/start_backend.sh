#!/bin/bash

# Unset old Supabase environment variables that might override .env
unset SUPABASE_URL
unset VITE_SUPABASE_ANON_KEY
unset SUPABASE_DB_HOST
unset SUPABASE_DB_NAME
unset SUPABASE_DB_PORT
unset SUPABASE_DB_USER
unset DATABASE_URL  # Critical: prevents old database connection

# Activate virtual environment
source venv/bin/activate

# Start uvicorn
uvicorn src.main:app --reload --port 8000
