#!/bin/bash
echo "Starting BTC Strategy API..."
echo "Current directory: $(pwd)"
echo "Python path: $PYTHONPATH"
echo "Port: $PORT"
echo "Files in current directory:"
ls -la

# Set proper Python path
export PYTHONPATH="/opt/render/project/src:/opt/render/project/src/btc-strategy-web/backend"

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}