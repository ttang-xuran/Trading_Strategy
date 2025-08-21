# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bitcoin trading strategy repository containing:
- A Pine Script trading algorithm for TradingView (`BTC_Trading_Strategy.txt`)
- Historical Bitcoin price data (`BTC_Price_full_history.csv`)

## Architecture

### Strategy Implementation
The core trading strategy is implemented in Pine Script v5 as "Adaptive Volatility Breakout [Reversal Enabled]":

- **Strategy Type**: Volatility breakout with reversal capability
- **Timeframe**: Configurable date range (default: Jan 2020 - Dec 2025)
- **Position Management**: Automatic reversal between long/short positions
- **Risk Management**: ATR-based stop losses

### Key Components
- **Breakout Detection**: Uses lookback period to identify highest/lowest levels
- **Entry Signals**: Price breaks above/below calculated boundaries trigger trades
- **Exit Logic**: ATR-based stop losses with configurable multipliers
- **Visualization**: Plots boundaries and highlights active date range

### Data Structure
- Historical price data in standard OHLC CSV format
- Date range: January 2009 onwards
- Fields: datetime, open, high, low, close

## File Structure
```
/
├── BTC_Trading_Strategy.txt    # Pine Script strategy code
└── BTC_Price_full_history.csv  # Historical Bitcoin OHLC data
```

## Development Notes

### Strategy Parameters
- `lookback_period`: Period for calculating breakout levels (default: 20)
- `range_mult`: Range multiplier for boundaries (default: 0.5)
- `stop_loss_mult`: ATR multiplier for stop losses (default: 2.5)
- `atr_period`: ATR calculation period (default: 14)

### Testing
- No automated testing framework present
- Strategy testing done through TradingView backtesting interface
- Initial capital: $100,000
- Commission: 0.1%

This is a Pine Script-based trading strategy project with no build system or dependencies beyond TradingView platform.