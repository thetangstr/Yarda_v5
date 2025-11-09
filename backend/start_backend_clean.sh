#!/bin/bash
# Backend startup script with environment variable cleanup
# This ensures old Supabase project variables don't override .env config

echo "🧹 Cleaning environment variables..."

# Unset any system-level Supabase variables that might override .env
unset SUPABASE_URL
unset SUPABASE_DB_USER
unset SUPABASE_DB_HOST
unset SUPABASE_DB_NAME
unset SUPABASE_DB_PORT
unset SUPABASE_ANON_KEY
unset SUPABASE_SERVICE_ROLE_KEY
unset VITE_SUPABASE_ANON_KEY

echo "✅ Environment cleaned"
echo "📂 Loading configuration from backend/.env"

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run: python -m venv venv && pip install -r requirements.txt"
    exit 1
fi

source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Copy from .env.example and configure."
    exit 1
fi

echo "🚀 Starting Yarda AI Landscape Studio API..."
echo "📍 Backend: http://127.0.0.1:8000"
echo "📋 Health check: http://127.0.0.1:8000/health"
echo ""

# Start uvicorn with reload for development
uvicorn src.main:app --reload --port 8000
