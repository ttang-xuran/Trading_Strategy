# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Bitcoin trading strategy application implementing the "Adaptive Volatility Breakout" strategy. The project includes:
- **Frontend**: React/TypeScript web application for visualization
- **Backend**: FastAPI Python service for data processing and backtesting
- **Strategy**: Pine Script algorithm for TradingView
- **Data**: Multiple cryptocurrency exchange data sources (Coinbase, Binance, Bitstamp, etc.)

## Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Backend Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI server locally (development)
uvicorn btc-strategy-web.backend.app.main:app --reload

# Or use the main entry point (Railway deployment)
python main.py

# API documentation
# Available at http://localhost:8000/docs when running locally
```

### Testing
```bash
# Frontend tests - using Playwright for E2E testing
npx playwright test

# Backend API testing
python btc-strategy-web/backend/test_api.py

# Run specific Python analysis/backtest scripts
python btc_strategy_backtest.py
python optimize_parameters.py
python exact_pine_script_implementation.py

# Test specific exchange data periods
python test_specific_periods_coinbase.py
python compare_same_period.py
```

## Architecture

### Frontend (`src/`, `btc-strategy-web/frontend/`)
- **React 18 + TypeScript** with Vite build system
- **Charting**: Multiple chart libraries (Plotly.js, Recharts, lightweight-charts, Chart.js)
- **State Management**: React hooks and context
- **Styling**: CSS-in-JS with styled-components
- **Data Fetching**: Axios with react-query for API calls
- **Development Server**: Runs on port 3000 with proxy to backend (port 8000)
- **CORS Proxies**: Built-in proxies for external Bitcoin APIs (CoinGecko, Binance, Coinbase, Bitstamp)

Key components:
- `LiveHistoricalChart`: Real-time Bitcoin price charts with multiple timeframes
- `DataSourceSelector`: Switch between exchange data sources
- `PerformanceMetrics`: Trading strategy performance analytics
- `TradesList`: Paginated trade history with CSV export

### Backend (`btc-strategy-web/backend/`, `main.py`)
- **FastAPI** REST API with automatic OpenAPI documentation at `/docs`
- **Data Services**: Multi-exchange price data aggregation from CSV files and live APIs
- **Backtesting Engine**: Python implementation matching Pine Script strategy logic
- **Models**: Pydantic schemas for type safety and API validation
- **CORS Enabled**: Configured for cross-origin requests
- **Background Tasks**: Async data updates and processing

Key services:
- `DataService` (`app/services/data_service.py`): Manages historical data from local CSV files and exchange APIs
- `BacktestService` (`app/services/backtest_service.py`): Executes strategy backtesting with trade signals and equity calculations
- **Entry Points**: Both `main.py` (Railway deployment) and `btc-strategy-web/backend/app/main.py` (development)

API Endpoints:
- `/api/data-sources`: Available exchange data sources
- `/api/chart-data/{source}`: OHLCV candlestick data
- `/api/backtest/{source}`: Strategy backtest results
- `/api/trade-signals/{source}`: Buy/sell signal annotations
- `/api/performance-metrics/{source}`: Detailed performance statistics

### Root-Level Analysis Scripts
Multiple standalone Python scripts for strategy development and validation:
- `btc_strategy_backtest.py`: Core backtesting engine
- `exact_pine_script_implementation.py`: Pine Script strategy replica in Python
- `optimize_parameters.py`: Parameter optimization and sensitivity analysis
- Various comparison and validation scripts (`find_exact_tradingview_match.py`, `test_specific_periods_coinbase.py`)

### Strategy Logic (`BTC_Trading_Strategy.txt`, strategy implementation in frontend)
- **Type**: Volatility breakout with reversal capability
- **Entry**: Price breaks above/below calculated boundaries
- **Exit**: ATR-based stop losses or reversal signals
- **Position Sizing**: 95% equity allocation per trade
- **Risk Management**: 2.5x ATR stop loss multiplier

### Deployment
- **Frontend**: Vercel deployment with automatic builds (`vercel.json` configuration)
- **Backend**: Railway deployment with Docker support (`railway.json`, `render.yaml` for alternatives)
- **Environment**: Configurable for multiple hosting platforms
- **Development**: Local development with Vite dev server and uvicorn backend
- **Production**: Static frontend build served with FastAPI backend

Deployment files:
- `vercel.json`: Vercel frontend configuration with SPA routing
- `railway.json`: Railway backend deployment with health checks
- `render.yaml`: Alternative Render.com deployment configuration
- `Procfile`: Heroku-compatible process definition

## Data Sources

The application supports multiple cryptocurrency exchanges:
- **Coinbase Pro**: Primary data source (most reliable) - `BTC_Coinbase_Historical.csv`
- **Binance**: High liquidity alternative - `BTC_Binance_Historical.csv`
- **Bitstamp**: European exchange data - `BTC_Bitstamp_Historical.csv`
- **Kraken**: Additional validation source - `BTC_Kraken_Historical.csv`
- **CoinMetrics/CryptoCompare**: Historical data providers - `BTC_CoinMetrics_Historical.csv`, `BTC_CryptoCompare_Historical.csv`
- **Hyperliquid**: Recently added exchange support

Historical data files:
- `BTC_Price_full_history.csv`: Complete Bitcoin history from 2009
- `BTC_*_Historical.csv`: Exchange-specific datasets with OHLCV data
- Data format: Date, Open, High, Low, Close, Volume (CSV format)

## Strategy Parameters

Default optimized parameters:
- `lookback_period`: 20 (breakout detection window)
- `range_mult`: 0.5 (boundary calculation multiplier) 
- `stop_loss_mult`: 2.5 (ATR-based stop loss)
- `atr_period`: 14 (volatility calculation period)
- `initial_capital`: $100,000

## Performance Tracking

The application calculates comprehensive metrics:
- Total return percentage and net profit
- Win rate and profit factor
- Maximum drawdown analysis
- Trade statistics (winners/losers, long/short)
- Real-time equity curve visualization