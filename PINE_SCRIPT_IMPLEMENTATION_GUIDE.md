# Pine Script Implementation Guide

This document provides comprehensive guidance for implementing Pine Script trading strategies in JavaScript/TypeScript for web applications.

## Table of Contents
- [Overview](#overview)
- [Why Direct Pine Script Execution Fails](#why-direct-pine-script-execution-fails)
- [Implementation Strategy](#implementation-strategy)
- [Pine Script to JavaScript Translation](#pine-script-to-javascript-translation)
- [Common Pine Script Functions](#common-pine-script-functions)
- [Strategy Framework Implementation](#strategy-framework-implementation)
- [Data Management](#data-management)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Pine Script is TradingView's domain-specific language for creating trading strategies and indicators. Since Pine Script cannot run in web browsers, we must translate the logic to JavaScript while preserving the exact trading behavior.

**Key Principle**: Treat Pine Script as a specification, not executable code. Implement the same logic in JavaScript with equivalent mathematical and conditional operations.

## Why Direct Pine Script Execution Fails

### 1. Platform Incompatibility
- Pine Script runs exclusively on TradingView's cloud infrastructure
- No Pine Script interpreter exists for client-side web applications
- Web browsers cannot execute Pine Script directly

### 2. Runtime Dependencies
```pine
// Pine Script has built-in functions that don't exist in JavaScript
ta.atr(14)           // Technical analysis functions
ta.sma(close, 20)    // Simple moving average
strategy.entry()     // Strategy execution framework
high[1]              // Automatic bar history access
```

### 3. Different Execution Models
- **Pine Script**: Server-side, bar-by-bar execution with automatic history
- **JavaScript**: Client-side, manual loop processing with explicit data management

## Implementation Strategy

### Step 1: Analyze Pine Script Logic
1. Identify all Pine Script functions used
2. Extract mathematical formulas and conditions
3. Map strategy entry/exit rules
4. Note position management logic

### Step 2: Create JavaScript Equivalents
1. Implement technical indicator functions
2. Set up data structures for OHLC history
3. Create trade tracking system
4. Build backtesting loop

### Step 3: Validate Results
1. Compare trade signals between Pine Script and JavaScript
2. Verify mathematical calculations (ATR, moving averages, etc.)
3. Test edge cases and boundary conditions

## Pine Script to JavaScript Translation

### Technical Indicators

#### ATR (Average True Range)
```pine
// Pine Script
atr_value = ta.atr(atr_period)
```

```javascript
// JavaScript Implementation
const calculateATR = (prices, period) => {
  if (prices.length < period + 1) return 0
  
  let atrSum = 0
  for (let i = 1; i < Math.min(period + 1, prices.length); i++) {
    const curr = prices[prices.length - 1 - i + 1]
    const prev = prices[prices.length - 1 - i]
    const trueRange = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    )
    atrSum += trueRange
  }
  return atrSum / period
}
```

#### Highest/Lowest Values
```pine
// Pine Script
highest_high = ta.highest(high, lookback_period)
lowest_low = ta.lowest(low, lookback_period)
```

```javascript
// JavaScript Implementation
const getHighest = (prices, lookback) => {
  const recentPrices = prices.slice(-lookback)
  return Math.max(...recentPrices.map(p => p.high))
}

const getLowest = (prices, lookback) => {
  const recentPrices = prices.slice(-lookback)
  return Math.min(...recentPrices.map(p => p.low))
}
```

#### Simple Moving Average
```pine
// Pine Script
sma_value = ta.sma(close, length)
```

```javascript
// JavaScript Implementation
const calculateSMA = (prices, period) => {
  if (prices.length < period) return 0
  const recentPrices = prices.slice(-period)
  const sum = recentPrices.reduce((acc, price) => acc + price.close, 0)
  return sum / period
}
```

### Historical Data Access

#### Pine Script Bar History
```pine
// Pine Script (automatic history)
high[0]    // Current bar high
high[1]    // Previous bar high
close[2]   // Two bars ago close
```

```javascript
// JavaScript Implementation
const currentBar = prices[prices.length - 1]
const previousBar = prices[prices.length - 2]
const twoBarsPrevious = prices[prices.length - 3]

const currentHigh = currentBar.high
const previousHigh = previousBar.high
const twoBarsPreviousClose = twoBarsPrevious.close
```

### Strategy Framework

#### Entry/Exit Conditions
```pine
// Pine Script
long_condition = close > upper_boundary
short_condition = close < lower_boundary

strategy.entry("Long", strategy.long, when=long_condition)
strategy.entry("Short", strategy.short, when=short_condition)
```

```javascript
// JavaScript Implementation
const longCondition = currentPrice > upperBoundary
const shortCondition = currentPrice < lowerBoundary

if (longCondition && !hasPosition) {
  executeEntry('long', currentPrice, currentDate)
}

if (shortCondition && !hasPosition) {
  executeEntry('short', currentPrice, currentDate)
}
```

#### Position Management
```pine
// Pine Script
strategy.close("Long", when=exit_condition)
```

```javascript
// JavaScript Implementation
if (exitCondition && hasPosition && currentPosition.type === 'long') {
  executeExit(currentPrice, currentDate, 'Exit Signal')
}
```

## Common Pine Script Functions

### Technical Analysis Functions
| Pine Script | JavaScript Equivalent | Implementation |
|-------------|----------------------|----------------|
| `ta.atr(n)` | `calculateATR(prices, n)` | True range average over n periods |
| `ta.sma(src, n)` | `calculateSMA(prices, n)` | Simple moving average |
| `ta.ema(src, n)` | `calculateEMA(prices, n)` | Exponential moving average |
| `ta.highest(src, n)` | `getHighest(prices, n)` | Highest value in n periods |
| `ta.lowest(src, n)` | `getLowest(prices, n)` | Lowest value in n periods |
| `ta.rsi(src, n)` | `calculateRSI(prices, n)` | Relative Strength Index |

### Strategy Functions
| Pine Script | JavaScript Equivalent | Purpose |
|-------------|----------------------|---------|
| `strategy.entry()` | `executeEntry()` | Open new position |
| `strategy.close()` | `executeExit()` | Close existing position |
| `strategy.exit()` | `executeStopLoss()` | Exit with stop/target |

### Data Access
| Pine Script | JavaScript Equivalent | Description |
|-------------|----------------------|-------------|
| `high[0]` | `prices[prices.length - 1].high` | Current bar high |
| `low[1]` | `prices[prices.length - 2].low` | Previous bar low |
| `close` | `currentBar.close` | Current close price |
| `open` | `currentBar.open` | Current open price |

## Strategy Framework Implementation

### Trade Tracking System
```javascript
// State management for positions and trades
const [hasPosition, setHasPosition] = useState(false)
const [currentPosition, setCurrentPosition] = useState(null)
const [allTrades, setAllTrades] = useState([])
const [equity, setEquity] = useState(initialCapital)

// Trade execution functions
const executeEntry = (type, price, date) => {
  const positionSize = Math.floor((equity * 0.95) / price) // 95% equity allocation
  const newPosition = {
    type,
    entryPrice: price,
    entryDate: date,
    size: positionSize,
    stopLoss: calculateStopLoss(price, type)
  }
  setCurrentPosition(newPosition)
  setHasPosition(true)
}

const executeExit = (exitPrice, exitDate, reason) => {
  if (!hasPosition || !currentPosition) return
  
  const pnl = currentPosition.type === 'long' 
    ? (exitPrice - currentPosition.entryPrice) * currentPosition.size
    : (currentPosition.entryPrice - exitPrice) * currentPosition.size
  
  const completedTrade = {
    ...currentPosition,
    exitPrice,
    exitDate,
    pnl,
    reason
  }
  
  setAllTrades(prev => [...prev, completedTrade])
  setEquity(prev => prev + pnl)
  setHasPosition(false)
  setCurrentPosition(null)
}
```

### Backtesting Loop
```javascript
// Process historical data bar by bar (like Pine Script execution)
const runBacktest = (historicalData) => {
  historicalData.forEach((candle, index) => {
    // Skip if not enough data for indicators
    if (index < Math.max(atrPeriod, lookbackPeriod)) return
    
    const recentPrices = historicalData.slice(0, index + 1)
    
    // Calculate indicators for current bar
    const atr = calculateATR(recentPrices, atrPeriod)
    const highest = getHighest(recentPrices, lookbackPeriod)
    const lowest = getLowest(recentPrices, lookbackPeriod)
    
    // Calculate boundaries
    const upperBoundary = highest + (rangeMultiplier * atr)
    const lowerBoundary = lowest - (rangeMultiplier * atr)
    
    // Check entry conditions
    checkEntryConditions(candle, upperBoundary, lowerBoundary)
    
    // Check exit conditions for existing positions
    checkExitConditions(candle, atr)
  })
}
```

## Data Management

### OHLC Data Structure
```javascript
// Standard OHLC format for both Pine Script compatibility and JavaScript processing
const ohlcCandle = {
  date: new Date('2024-01-01'),
  timestamp: 1704067200000,
  open: 45000.0,
  high: 45500.0,
  low: 44800.0,
  close: 45200.0,
  volume: 1000000
}
```

### Historical Data Requirements
- **Minimum bars**: Ensure enough data for all indicators (max of all periods used)
- **Data quality**: Validate OHLC relationships (high ≥ max(open, close), etc.)
- **Time alignment**: Consistent time intervals between bars
- **Missing data**: Handle gaps in historical data appropriately

## Best Practices

### 1. Exact Logic Replication
- **Never approximate**: Implement exact mathematical formulas from Pine Script
- **Preserve order**: Execute conditions in the same sequence as Pine Script
- **Handle edge cases**: Account for insufficient data, division by zero, etc.

### 2. Performance Optimization
```javascript
// Cache expensive calculations
const indicators = useMemo(() => {
  return historicalData.map((candle, index) => {
    const recentData = historicalData.slice(0, index + 1)
    return {
      atr: calculateATR(recentData, atrPeriod),
      highest: getHighest(recentData, lookbackPeriod),
      lowest: getLowest(recentData, lookbackPeriod)
    }
  })
}, [historicalData, atrPeriod, lookbackPeriod])
```

### 3. Debugging and Validation
```javascript
// Add detailed logging for strategy debugging
const logTradeEntry = (type, price, indicators) => {
  console.log(`Trade Entry: ${type} at ${price}`, {
    atr: indicators.atr,
    upperBoundary: indicators.upperBoundary,
    lowerBoundary: indicators.lowerBoundary,
    currentPrice: price
  })
}
```

### 4. Error Handling
```javascript
// Robust error handling for indicator calculations
const safeCalculateATR = (prices, period) => {
  try {
    if (!prices || prices.length < period + 1) {
      console.warn(`Insufficient data for ATR calculation: ${prices?.length} bars, need ${period + 1}`)
      return 0
    }
    return calculateATR(prices, period)
  } catch (error) {
    console.error('ATR calculation error:', error)
    return 0
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Off-by-One Errors
**Problem**: JavaScript array indexing differs from Pine Script bar indexing
```pine
// Pine Script: [0] = current, [1] = previous
high[1]  // Previous bar high
```
```javascript
// JavaScript: array index from end
prices[prices.length - 2].high  // Previous bar high (not -1!)
```

#### 2. Timing Differences
**Problem**: Pine Script executes on bar close, JavaScript processes sequentially
**Solution**: Ensure all conditions check the same bar's data consistently

#### 3. Floating Point Precision
**Problem**: Minor calculation differences due to JavaScript floating-point arithmetic
**Solution**: Use consistent rounding and comparison tolerances
```javascript
// Use small tolerance for price comparisons
const isBreakout = currentPrice > (upperBoundary + 0.01)
```

#### 4. Data Availability
**Problem**: Pine Script automatically handles insufficient data
**Solution**: Add explicit checks for minimum data requirements
```javascript
if (prices.length < Math.max(atrPeriod, lookbackPeriod) + 1) {
  return // Skip processing until enough data available
}
```

### Validation Checklist

- [ ] All Pine Script functions have JavaScript equivalents
- [ ] Mathematical calculations match exactly
- [ ] Bar indexing is correct (off-by-one check)
- [ ] Entry/exit conditions trigger at same points
- [ ] Trade results match Pine Script backtest
- [ ] Edge cases handled (insufficient data, etc.)
- [ ] Performance is acceptable for large datasets

## Integration with Project

### File Locations
- **Strategy Logic**: `src/App.tsx` (lines ~200-400)
- **Technical Indicators**: `src/services/livePriceService.ts`
- **Pine Script Original**: `BTC_Trading_Strategy.txt`

### Key Implementation Points
- Strategy parameters are configurable via UI
- Multiple data sources supported (Binance, Coinbase, Kraken, etc.)
- Real-time price updates integrated with backtesting
- Results displayed in interactive charts and trade lists

This guide ensures consistent and accurate Pine Script to JavaScript translation for all future strategy implementations.