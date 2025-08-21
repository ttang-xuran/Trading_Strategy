# Dockerfile for BTC Trading Strategy API (Railway deployment)
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY btc-strategy-web/backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY btc-strategy-web/backend/ ./

# Copy the strategy files and data
COPY exact_pine_script_implementation.py ./
COPY BTC_*.csv ./data/

# Create necessary directories
RUN mkdir -p /app/data/raw /app/data/processed

# Expose port
EXPOSE 8000

# Run the application - use shell form to allow PORT variable expansion
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}