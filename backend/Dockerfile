# ==============================================================================
# AgentPulse HQ - Django REST & Channels (ASGI) Backend Dockerfile
# Multi-stage production container with PostGIS & GDAL geospatial support
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr and writing bytecode
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies for PostgreSQL, PostGIS, Pillow, and healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libproj-dev \
    curl \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . /app/

# Create media and static storage directories
RUN mkdir -p /app/media /app/staticfiles

# Expose standard Daphne ASGI port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/api/agents/ || exit 1

# Default command: launch Daphne ASGI server (handles both HTTP and WebSockets)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
