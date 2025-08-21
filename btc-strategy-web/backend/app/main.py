"""
BTC Trading Strategy Web API
FastAPI backend for serving trading strategy data and backtesting results
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import pandas as pd
import json
from datetime import datetime, timedelta
import os
import sys

# Add parent directories to path to import our strategy
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
strategy_dir = os.path.dirname(os.path.dirname(parent_dir))
sys.path.append(strategy_dir)
sys.path.append(parent_dir)

from app.services.data_service import DataService
from app.services.backtest_service import BacktestService
from app.models.strategy_models import (
    DataSource, 
    StrategyParameters, 
    BacktestResult,
    ChartData,
    TradeSignal,
    PerformanceMetrics
)

# Initialize FastAPI app
app = FastAPI(
    title="BTC Trading Strategy API",
    description="API for Bitcoin trading strategy visualization and backtesting",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
data_service = DataService()
backtest_service = BacktestService()

@app.get("/")
async def root():
    """Health check endpoint"""
    # Force redeploy to wake up Railway service - 2025-08-21
    return {
        "message": "BTC Trading Strategy API",
        "version": "1.0.0",
        "status": "active",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/data-sources", response_model=List[DataSource])
async def get_data_sources():
    """Get list of available data sources"""
    return await data_service.get_available_sources()

@app.get("/api/chart-data/{source}")
async def get_chart_data(source: str, days: int = 365):
    """Get candlestick chart data for specified source"""
    try:
        chart_data = await data_service.get_chart_data(source, days)
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Data not found for source: {source}")

@app.get("/api/backtest/{source}")
async def get_backtest_results(source: str, parameters: Optional[Dict] = None):
    """Get backtest results for specified data source"""
    try:
        # Use optimized parameters if none provided
        if parameters is None:
            parameters = {
                "lookback_period": 25,
                "range_mult": 0.4,
                "stop_loss_mult": 2.0
            }
        
        result = await backtest_service.run_backtest(source, parameters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@app.get("/api/trade-signals/{source}")
async def get_trade_signals(source: str):
    """Get trade signals for chart annotations"""
    try:
        signals = await backtest_service.get_trade_signals(source)
        return signals
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Signals not found for source: {source}")

@app.get("/api/performance-metrics/{source}")
async def get_performance_metrics(source: str):
    """Get detailed performance metrics"""
    try:
        metrics = await backtest_service.get_performance_metrics(source)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Metrics not found for source: {source}")

@app.get("/api/equity-curve/{source}")
async def get_equity_curve(source: str):
    """Get equity curve data for portfolio visualization"""
    try:
        equity_data = await backtest_service.get_equity_curve(source)
        return equity_data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Equity data not found for source: {source}")

@app.post("/api/update-data")
async def update_data(background_tasks: BackgroundTasks):
    """Trigger data update for all sources"""
    background_tasks.add_task(data_service.update_all_sources)
    return {"message": "Data update initiated", "status": "processing"}

@app.get("/api/comparison")
async def get_source_comparison():
    """Get comparison of all data sources"""
    try:
        comparison = await backtest_service.get_source_comparison()
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@app.post("/api/custom-backtest")
async def run_custom_backtest(parameters: StrategyParameters, source: str):
    """Run backtest with custom parameters"""
    try:
        result = await backtest_service.run_backtest(source, parameters.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Custom backtest failed: {str(e)}")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Resource not found", "detail": str(exc.detail)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error", "detail": str(exc.detail)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)