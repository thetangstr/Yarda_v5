# Multi-stage build for Yarda AI Backend
FROM python:3.11-slim

# Set working directory to backend
WORKDIR /app/backend

# Copy backend requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)"

# Use CMD so Railway can override if needed, but with shell to handle PORT variable
CMD exec python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
