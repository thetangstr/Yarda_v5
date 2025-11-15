#!/bin/bash
# Railway startup script
cd /app/backend && exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
