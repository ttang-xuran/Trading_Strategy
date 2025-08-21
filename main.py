"""
Simple main.py for Railway deployment
"""

import os
import sys
import uvicorn

# Add the btc-strategy-web/backend directory to the path
backend_dir = os.path.join(os.path.dirname(__file__), 'btc-strategy-web', 'backend')
sys.path.insert(0, backend_dir)

from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)