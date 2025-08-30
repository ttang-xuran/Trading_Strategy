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

# Run FastAPI server locally
uvicorn btc-strategy-web.backend.app.main:app --reload

# Or use the main entry point
python main.py
```

### Testing
```bash
# Frontend tests
npm test

# Backend API testing
python btc-strategy-web/backend/test_api.py
```

## Architecture

### Frontend (`src/`, `btc-strategy-web/frontend/`)
- **React 18 + TypeScript** with Vite build system
- **Charting**: Multiple chart libraries (Plotly.js, Recharts, lightweight-charts)
- **State Management**: React hooks and context
- **Styling**: CSS-in-JS with styled-components
- **Data Fetching**: Axios with react-query for API calls

Key components:
- `LiveHistoricalChart`: Real-time Bitcoin price charts with multiple timeframes
- `DataSourceSelector`: Switch between exchange data sources
- `PerformanceMetrics`: Trading strategy performance analytics
- `TradesList`: Paginated trade history with CSV export

### Backend (`btc-strategy-web/backend/`, `main.py`)
- **FastAPI** REST API with automatic OpenAPI documentation
- **Data Services**: Multi-exchange price data aggregation
- **Backtesting Engine**: Python implementation of Pine Script strategy
- **Models**: Pydantic schemas for type safety

Key services:
- `DataService`: Handles multiple exchange APIs (Coinbase, Binance, Bitstamp)
- `BacktestService`: Executes strategy backtesting with configurable parameters
- API endpoints for chart data, trade signals, performance metrics, equity curves

### Strategy Logic (`BTC_Trading_Strategy.txt`, strategy implementation in frontend)
- **Type**: Volatility breakout with reversal capability
- **Entry**: Price breaks above/below calculated boundaries
- **Exit**: ATR-based stop losses or reversal signals
- **Position Sizing**: 95% equity allocation per trade
- **Risk Management**: 2.5x ATR stop loss multiplier

### Deployment
- **Frontend**: Vercel deployment with automatic builds
- **Backend**: Railway deployment with Docker support
- **Environment**: Configurable for multiple hosting platforms

## Data Sources

The application supports multiple cryptocurrency exchanges:
- **Coinbase Pro**: Primary data source (most reliable)
- **Binance**: High liquidity alternative
- **Bitstamp**: European exchange data
- **Kraken**: Additional validation source
- **CoinMetrics/CryptoCompare**: Historical data providers

Historical data files:
- `BTC_Price_full_history.csv`: Complete Bitcoin history from 2009
- `BTC_*_Historical.csv`: Exchange-specific datasets

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