# Multi-stage build for Yarda AI Backend
FROM python:3.11-slim as backend

# Set working directory
WORKDIR /app

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Copy backend requirements first for better caching
COPY backend/requirements.txt backend/

# Install Python dependencies
RUN cd backend && \
    pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ backend/

# Expose port (Railway will override with $PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)"

# Use ENTRYPOINT so it can't be overridden
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
