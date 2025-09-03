import { useState, useEffect, useMemo } from 'react'
import LiveHistoricalChart from './components/LiveHistoricalChart'
import DataQualityMonitor from './components/DataQualityMonitor'
import { AuthProvider } from './contexts/AuthContext'
import AuthWrapper from './components/AuthWrapper'
import LogoutButton from './components/LogoutButton'
import { livePriceService } from './services/livePriceService'
import './index.css'
// Force deployment with complete Bitcoin history support v3 - Fixed backtesting metrics

// Calculate real performance metrics from actual trades
const calculatePerformanceData = (trades: any[], initialCapital: number = 100000) => {
  if (trades.length === 0) {
    return {
      total_return_percent: 0,
      total_trades: 0,
      win_rate_percent: 0,
      max_drawdown_percent: 0,
      profit_factor: 0,
      average_trade: 0,
      net_profit: 0,
      gross_profit: 0,
      gross_loss: 0,
      winning_trades: 0,
      losing_trades: 0,
      peak_equity: initialCapital,
      final_equity: initialCapital,
      long_trades: 0,
      short_trades: 0,
      average_winner: 0,
      average_loser: 0
    }
  }
  const closingTrades = trades.filter(trade => trade.pnl !== null)
  
  const grossProfit = closingTrades.filter(trade => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLoss = Math.abs(closingTrades.filter(trade => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0))
  const netProfit = grossProfit - grossLoss
  
  // FIXED: Get final equity from most recent trade (first in array since reverse chronological)
  const finalEquity = trades.length > 0 ? trades[0].equity : initialCapital
  const peakEquity = trades.reduce((max, trade) => Math.max(max, trade.equity), initialCapital)
  
  // FIXED: Calculate proper maximum drawdown (peak-to-trough)
  let maxDrawdown = 0
  let runningPeak = initialCapital
  
  // Process trades in chronological order for drawdown calculation
  const chronologicalTrades = [...trades].reverse()
  chronologicalTrades.forEach(trade => {
    runningPeak = Math.max(runningPeak, trade.equity)
    const drawdown = (runningPeak - trade.equity) / runningPeak
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  })
  
  const winningTrades = closingTrades.filter(trade => trade.pnl > 0).length
  const losingTrades = closingTrades.filter(trade => trade.pnl < 0).length
  
  // FIXED: Only count entry trades, not all trades with LONG/SHORT in name
  const longTrades = trades.filter(trade => trade.action === 'ENTRY LONG').length
  const shortTrades = trades.filter(trade => trade.action === 'ENTRY SHORT').length
  
  // Calculate average winner/loser
  const averageWinner = winningTrades > 0 ? grossProfit / winningTrades : 0
  const averageLoser = losingTrades > 0 ? grossLoss / losingTrades : 0
  
  // FIXED: Handle profit factor when no losses (infinity case)
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Number.POSITIVE_INFINITY : 0)
  
  return {
    total_return_percent: ((finalEquity - initialCapital) / initialCapital) * 100,
    total_trades: trades.length, // Count all trades, not just closing trades
    win_rate_percent: closingTrades.length > 0 ? (winningTrades / closingTrades.length) * 100 : 0,
    max_drawdown_percent: maxDrawdown * 100, // FIXED: Proper drawdown calculation
    profit_factor: profitFactor, // FIXED: Handle no-loss scenarios
    average_trade: closingTrades.length > 0 ? netProfit / closingTrades.length : 0,
    net_profit: netProfit,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    winning_trades: winningTrades,
    losing_trades: losingTrades,
    peak_equity: peakEquity,
    final_equity: finalEquity,
    long_trades: longTrades, // FIXED: Only entry trades
    short_trades: shortTrades, // FIXED: Only entry trades
    average_winner: averageWinner,
    average_loser: averageLoser
  }
}

const initialPrice = {
  price: 0,
  change24h: 0,
  timestamp: new Date().toISOString()
}

// Trading strategy definitions
type StrategyType = 'breakout-long-short' | 'trend-following' | 'mean-reversion' | 'momentum'

interface TradingStrategy {
  id: StrategyType
  name: string
  description: string
  parameters: any // Flexible parameter structure for different strategies
}

const tradingStrategies: Record<StrategyType, TradingStrategy> = {
  'breakout-long-short': {
    id: 'breakout-long-short',
    name: 'Breakout for long and short',
    description: 'Adaptive Volatility Breakout strategy with reversal capability, optimized for Bitcoin trading across multiple data sources.',
    parameters: {
      lookbackPeriod: 20,
      rangeMultiplier: 0.5,
      stopLossMultiplier: 2.5,
      atrPeriod: 14
    }
  },
  'trend-following': {
    id: 'trend-following',
    name: 'Trend Following',
    description: 'Long-only trend following with SMA regime filter, ADX/Choppiness strength filters, Donchian breakouts, and ATR trailing stops',
    parameters: {
      smaFastLen: 50,
      smaSlowLen: 250,
      donLen: 20,
      atrMult: 5.0,
      adxLen: 14,
      adxTh: 15.0,
      chopLen: 14,
      chopTh: 55.0,
      atrLen: 14
    }
  },
  'mean-reversion': {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Trades against extreme price movements expecting a return to average (Coming Soon)',
    parameters: {
      lookbackPeriod: 14,
      rangeMultiplier: 2.0,
      stopLossMultiplier: 1.5,
      atrPeriod: 14
    }
  },
  'momentum': {
    id: 'momentum',
    name: 'Momentum',
    description: 'Captures short-term price momentum with RSI and MACD signals (Coming Soon)',
    parameters: {
      lookbackPeriod: 10,
      rangeMultiplier: 0.8,
      stopLossMultiplier: 2.0,
      atrPeriod: 14
    }
  }
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedSource, setSelectedSource] = useState('binance')
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('breakout-long-short')
  const [livePrice, setLivePrice] = useState(initialPrice)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trades'>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [initialCapital, setInitialCapital] = useState(100000)
  const tradesPerPage = 10

  const handleRefreshData = () => {
    setCurrentTime(new Date())
    setRefreshKey(prev => prev + 1) // Force chart to reload data
  }

  // Convert timeframe to days
  const getTimeframeDays = (timeframe: string): number => {
    switch (timeframe) {
      case '1M': return 30
      case '3M': return 90
      case '6M': return 180
      case 'YTD': 
        const yearStart = new Date(new Date().getFullYear(), 0, 1)
        return Math.floor((Date.now() - yearStart.getTime()) / (1000 * 60 * 60 * 24))
      case '1Y': return 365
      case '2Y': return 730
      case '3Y': return 1095
      case '5Y': return 1825
      case '10Y': return 3650
      default: return 180
    }
  }

  // Generate real strategy trades using actual historical market data
  // Breakout strategy implementation
  const generateBreakoutTrades = async (ohlcData: any[], parameters: any, equity: number, capital: number) => {
    const { lookbackPeriod, rangeMultiplier, stopLossMultiplier, atrPeriod } = parameters
    console.log(`Using breakout parameters: lookback=${lookbackPeriod}, range=${rangeMultiplier}, stopLoss=${stopLossMultiplier}, atr=${atrPeriod}`)
    
    let position = null  // 'LONG', 'SHORT', or null
    let entryPrice = 0
    let positionSize = 0
    const trades = []
    
    // Pine Script state tracking
    let pendingSignal = null // 'LONG', 'SHORT', or null
    
    // Calculate ATR
    const calculateATR = (data: any[], period: number, index: number) => {
      if (index < period) return 1000 // Default ATR for early periods
      
      let sum = 0
      for (let i = Math.max(0, index - period + 1); i <= index; i++) {
        const current = data[i]
        const previous = i > 0 ? data[i - 1] : current
        
        const tr = Math.max(
          current.high - current.low,
          Math.abs(current.high - previous.close),
          Math.abs(current.low - previous.close)
        )
        sum += tr
      }
      return sum / period
    }
    
    // Process each day - COMPLETE Pine Script implementation
    for (let i = lookbackPeriod; i < ohlcData.length; i++) {
      const currentBar = ohlcData[i]
      const nextBar = i + 1 < ohlcData.length ? ohlcData[i + 1] : null
      
      // Add data validation for extreme price ranges
      if (!currentBar || !currentBar.open || !currentBar.high || 
          !currentBar.low || !currentBar.close || 
          currentBar.open <= 0 || currentBar.high <= 0 || 
          currentBar.low <= 0 || currentBar.close <= 0) {
        console.warn(`Invalid price data at index ${i}, skipping`)
        continue
      }
      
      const atr = calculateATR(ohlcData, atrPeriod, i)
      if (atr === 1000) continue // Skip if ATR not available
      
      // EXACT Pine Script Calculations
      // highest_high = ta.highest(high, lookback_period)[1] - previous bars only
      const lookbackBars = ohlcData.slice(Math.max(0, i - lookbackPeriod), i)
      if (lookbackBars.length === 0) continue
      
      const highestHigh = Math.max(...lookbackBars.map(bar => bar.high))
      const lowestLow = Math.min(...lookbackBars.map(bar => bar.low))
      const breakoutRange = highestHigh - lowestLow
      
      // upper_boundary = open + breakout_range * range_mult
      // lower_boundary = open - breakout_range * range_mult  
      const upperBoundary = currentBar.open + (breakoutRange * rangeMultiplier)
      const lowerBoundary = currentBar.open - (breakoutRange * rangeMultiplier)
      
      // EXACT Pine Script Entry Logic (no date filter - use full dataset)
      // go_long = high > upper_boundary
      // go_short = low < lower_boundary
      const goLong = currentBar.high > upperBoundary
      const goShort = currentBar.low < lowerBoundary
      
      // STEP 1: Execute any pending signals from previous bar (Next-bar execution)
      let positionChanged = false
      
      if (pendingSignal === 'LONG' && nextBar) {
        // Close short if exists (strategy.close("Short", comment="Reverse to Long"))
        if (position === 'SHORT') {
          const exitPrice = nextBar.open
          // CORRECTED: positionSize is already in BTC shares, so P&L = shares * price_change
          // For SHORT: profit when price falls, so pnl = shares * (entryPrice - exitPrice)
          const pnl = positionSize * (entryPrice - exitPrice)
          equity += pnl
          
          trades.push({
            date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            action: 'CLOSE SHORT',
            price: exitPrice,
            size: positionSize,
            pnl: pnl,
            equity: equity,
            comment: 'Reverse to Long (Next Bar)'
          })
        }
        
        // Enter long (strategy.entry("Long", strategy.long))
        if (nextBar) {
          position = 'LONG'
          entryPrice = nextBar.open
          // CORRECTED: Store position size as BTC shares, not dollar amount
          positionSize = (equity * 0.99) / entryPrice
          positionChanged = true
          
          trades.push({
            date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            action: 'ENTRY LONG',
            price: entryPrice,
            size: positionSize,
            pnl: null,
            equity: equity,
            comment: 'Long Entry (Next Bar)'
          })
        }
        pendingSignal = null
      }
      else if (pendingSignal === 'SHORT' && nextBar) {
        // Close long if exists (strategy.close("Long", comment="Reverse to Short"))
        if (position === 'LONG') {
          const exitPrice = nextBar.open
          // CORRECTED: positionSize is already in BTC shares, so P&L = shares * price_change
          const pnl = positionSize * (exitPrice - entryPrice)
          equity += pnl
          
          trades.push({
            date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            action: 'CLOSE LONG',
            price: exitPrice,
            size: positionSize,
            pnl: pnl,
            equity: equity,
            comment: 'Reverse to Short (Next Bar)'
          })
        }
        
        // Enter short (strategy.entry("Short", strategy.short))
        if (nextBar) {
          position = 'SHORT'
          entryPrice = nextBar.open
          // CORRECTED: Store position size as BTC shares, not dollar amount
          positionSize = (equity * 0.99) / entryPrice
          positionChanged = true
          
          trades.push({
            date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            action: 'ENTRY SHORT',
            price: entryPrice,
            size: positionSize,
            pnl: null,
            equity: equity,
            comment: 'Short Entry (Next Bar)'
          })
        }
        pendingSignal = null
      }
      
      // STEP 2: Check for new signals on current bar (for next bar execution)
      // CRITICAL: Only trigger signals if opposite to current position (Pine Script behavior)
      if (goLong && !positionChanged) {
        // Only set LONG signal if we're NOT already LONG
        if (position !== 'LONG') {
          pendingSignal = 'LONG'
        }
      }
      else if (goShort && !positionChanged) {
        // Only set SHORT signal if we're NOT already SHORT
        if (position !== 'SHORT') {
          pendingSignal = 'SHORT'
        }
      }
      
      // STEP 3: PINE SCRIPT STOP LOSSES (Recalculated every bar, executed when hit)
      // This matches: long_stop_price = strategy.position_avg_price - atr * stop_loss_mult (every bar)
      //               if strategy.position_size > 0: strategy.exit("SL Long", stop=long_stop_price)
      if (position !== null && !positionChanged) {
        if (position === 'LONG') {
          // Recalculate stop price every bar with current ATR (Pine Script behavior)
          const longStopPrice = entryPrice - (atr * stopLossMultiplier)
          // Execute immediately if current bar hits the dynamically updated stop level
          if (currentBar.low <= longStopPrice) {
            const exitPrice = longStopPrice
            const pnl = positionSize * (exitPrice - entryPrice)
            equity += pnl
            
            trades.push({
              date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              action: 'STOP LOSS LONG',
              price: exitPrice,
              size: positionSize,
              pnl: pnl,
              equity: equity,
              comment: `Stop Loss Hit (ATR: ${atr.toFixed(2)})`
            })
            
            position = null
            entryPrice = 0
            positionSize = 0
            positionChanged = true
          }
        }
        else if (position === 'SHORT') {
          // Recalculate stop price every bar with current ATR (Pine Script behavior)
          const shortStopPrice = entryPrice + (atr * stopLossMultiplier)
          // Execute immediately if current bar hits the dynamically updated stop level  
          if (currentBar.high >= shortStopPrice) {
            const exitPrice = shortStopPrice
            const pnl = positionSize * (entryPrice - exitPrice)
            equity += pnl
            
            trades.push({
              date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              action: 'STOP LOSS SHORT',
              price: exitPrice,
              size: positionSize,
              pnl: pnl,
              equity: equity,
              comment: `Stop Loss Hit (ATR: ${atr.toFixed(2)})`
            })
            
            position = null
            entryPrice = 0
            positionSize = 0
            positionChanged = true
          }
        }
      }
    }
    
    console.log(`Generated ${trades.length} breakout trades`)
    return {
      trades: trades.reverse(), // Most recent first
      historicalDataCount: ohlcData.length
    }
  }

  // Trend Following strategy implementation
  const generateTrendFollowingTrades = async (ohlcData: any[], parameters: any, equity: number, capital: number) => {
    const { smaFastLen, smaSlowLen, donLen, atrMult, adxLen, adxTh, chopLen, chopTh, atrLen } = parameters
    console.log(`Using trend following parameters: smaFast=${smaFastLen}, smaSlow=${smaSlowLen}, donLen=${donLen}, atrMult=${atrMult}`)
    
    let position = null  // 'LONG' or null (long-only strategy)
    let entryPrice = 0
    let positionSize = 0
    let peakClose = null // For ATR trailing stop
    const trades = []
    
    // Technical indicator calculation helpers
    const calculateSMA = (data: any[], period: number, index: number) => {
      if (index < period - 1) return null
      let sum = 0
      for (let i = index - period + 1; i <= index; i++) {
        sum += data[i].close
      }
      return sum / period
    }
    
    const calculateATR = (data: any[], period: number, index: number) => {
      if (index < period) return null
      let sum = 0
      for (let i = Math.max(0, index - period + 1); i <= index; i++) {
        const current = data[i]
        const previous = i > 0 ? data[i - 1] : current
        const tr = Math.max(
          current.high - current.low,
          Math.abs(current.high - previous.close),
          Math.abs(current.low - previous.close)
        )
        sum += tr
      }
      return sum / period
    }
    
    const calculateRMA = (values: number[], period: number) => {
      if (values.length < period) return null
      let rma = values[0]
      for (let i = 1; i < values.length; i++) {
        rma = (rma * (period - 1) + values[i]) / period
      }
      return rma
    }
    
    const calculateADX = (data: any[], period: number, index: number) => {
      if (index < period * 2) return null
      
      let plusDMs = []
      let minusDMs = []
      let trs = []
      
      for (let i = Math.max(1, index - period * 2); i <= index; i++) {
        const chH = data[i].high - data[i - 1].high
        const chL = data[i - 1].low - data[i].low
        const plusDM = (chH > chL && chH > 0) ? chH : 0
        const minusDM = (chL > chH && chL > 0) ? chL : 0
        const tr = Math.max(
          data[i].high - data[i].low,
          Math.abs(data[i].high - data[i - 1].close),
          Math.abs(data[i].low - data[i - 1].close)
        )
        
        plusDMs.push(plusDM)
        minusDMs.push(minusDM)
        trs.push(tr)
      }
      
      const trRMA = calculateRMA(trs.slice(-period), period)
      const pdmRMA = calculateRMA(plusDMs.slice(-period), period)
      const mdmRMA = calculateRMA(minusDMs.slice(-period), period)
      
      if (!trRMA || trRMA === 0) return null
      
      const plusDI = 100 * (pdmRMA / trRMA)
      const minusDI = 100 * (mdmRMA / trRMA)
      const dx = 100 * (Math.abs(plusDI - minusDI) / Math.max(plusDI + minusDI, 1e-10))
      
      return dx // Simplified ADX calculation
    }
    
    const calculateChoppiness = (data: any[], period: number, index: number) => {
      if (index < period) return null
      
      let sumTR = 0
      let highest = data[index - period + 1].high
      let lowest = data[index - period + 1].low
      
      for (let i = index - period + 1; i <= index; i++) {
        const current = data[i]
        const previous = i > 0 ? data[i - 1] : current
        const tr = Math.max(
          current.high - current.low,
          Math.abs(current.high - previous.close),
          Math.abs(current.low - previous.close)
        )
        sumTR += tr
        highest = Math.max(highest, current.high)
        lowest = Math.min(lowest, current.low)
      }
      
      const range = highest - lowest
      if (range === 0) return 100
      
      return 100 * (Math.log10(sumTR / range) / Math.log10(period))
    }
    
    const getDonchianHigh = (data: any[], period: number, index: number) => {
      if (index < period) return null
      let highest = data[index - period].high // Previous bars only [1]
      for (let i = index - period + 1; i < index; i++) {
        highest = Math.max(highest, data[i].high)
      }
      return highest
    }
    
    // Process each day
    for (let i = Math.max(smaSlowLen, adxLen * 2, chopLen); i < ohlcData.length; i++) {
      const currentBar = ohlcData[i]
      
      // Skip invalid data
      if (!currentBar || !currentBar.close || currentBar.close <= 0) {
        continue
      }
      
      // Calculate indicators
      const smaFast = calculateSMA(ohlcData, smaFastLen, i)
      const smaSlow = calculateSMA(ohlcData, smaSlowLen, i)
      const donUp = getDonchianHigh(ohlcData, donLen, i)
      const adx = calculateADX(ohlcData, adxLen, i)
      const chop = calculateChoppiness(ohlcData, chopLen, i)
      const atr = calculateATR(ohlcData, atrLen, i)
      
      if (!smaFast || !smaSlow || !donUp || !adx || !chop || !atr) {
        continue
      }
      
      // Trend Following conditions
      const regimeUp = currentBar.close > smaSlow && smaFast > smaSlow
      const strength = adx > adxTh && chop < chopTh
      const breakout = currentBar.close > donUp
      const goLong = regimeUp && strength && breakout
      
      // Entry logic
      if (goLong && position !== 'LONG') {
        // Close any existing position first (though this is long-only)
        if (position === 'LONG') {
          const exitPrice = currentBar.close
          const pnl = positionSize * (exitPrice - entryPrice)
          equity += pnl
          
          trades.push({
            date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            action: 'CLOSE LONG',
            price: exitPrice,
            size: positionSize,
            pnl: pnl,
            equity: equity,
            comment: 'Exit before new entry'
          })
        }
        
        // Enter long
        position = 'LONG'
        entryPrice = currentBar.close
        positionSize = (equity * 0.99) / entryPrice // 99% allocation with 1% cash buffer
        peakClose = currentBar.close
        
        trades.push({
          date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          action: 'ENTRY LONG',
          price: entryPrice,
          size: positionSize,
          pnl: null,
          equity: equity,
          comment: `Trend Entry (ADX: ${adx.toFixed(1)}, CHOP: ${chop.toFixed(1)})`
        })
      }
      
      // Exit logic for long positions
      if (position === 'LONG') {
        // Update peak close for trailing stop
        peakClose = Math.max(peakClose, currentBar.close)
        
        // Calculate trailing stop
        const trailStop = peakClose - atrMult * atr
        
        // Check trend exit
        const trendExit = currentBar.close < smaFast
        
        // Exit conditions
        if (currentBar.low <= trailStop || trendExit) {
          const exitPrice = trendExit ? currentBar.close : trailStop
          const pnl = positionSize * (exitPrice - entryPrice)
          equity += pnl
          
          trades.push({
            date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            action: trendExit ? 'TREND EXIT' : 'ATR TRAIL STOP',
            price: exitPrice,
            size: positionSize,
            pnl: pnl,
            equity: equity,
            comment: trendExit ? 'Below SMA Fast' : `ATR Trail (${atrMult}x)`
          })
          
          position = null
          entryPrice = 0
          positionSize = 0
          peakClose = null
        }
      }
    }
    
    console.log(`Generated ${trades.length} trend following trades`)
    return {
      trades: trades.reverse(), // Most recent first
      historicalDataCount: ohlcData.length
    }
  }

  const generateAllTrades = async (source: string = 'coinbase', timeframe: string = '6M', capital: number = 100000, strategyType: StrategyType = 'breakout-long-short', customParameters?: any) => {
    console.log(`Generating strategy trades for source: ${source}, timeframe: ${timeframe}, strategy: ${strategyType}`)
    
    try {
      // Get current strategy configuration
      const currentStrategy = tradingStrategies[strategyType]
      if (!currentStrategy) {
        throw new Error(`Unknown strategy: ${strategyType}`)
      }
      
      // Only allow implemented strategies
      if (strategyType !== 'breakout-long-short' && strategyType !== 'trend-following') {
        throw new Error(`Strategy "${currentStrategy.name}" is not yet implemented. Currently available: "Breakout for long and short" and "Trend Following".`)
      }
      
      // Get REAL historical OHLC data from the selected exchange for the selected timeframe
      const days = getTimeframeDays(timeframe)
      console.log(`Fetching ${days} days of real historical data from ${source}...`)
      const ohlcData = await livePriceService.getHistoricalData(source, days)
      
      console.log(`Received ${ohlcData.length} days of REAL ${source} OHLC data`)
      
      if (ohlcData.length === 0) {
        throw new Error(`No historical data received from ${source}`)
      }
      
      // Use custom parameters if provided, otherwise fall back to strategy defaults
      const parameters = customParameters || currentStrategy.parameters
      
      let equity = capital
      let position = null  // 'LONG', 'SHORT', or null
      let entryPrice = 0
      let positionSize = 0
      const trades = []
      
      // Strategy-specific implementation
      if (strategyType === 'breakout-long-short') {
        return await generateBreakoutTrades(ohlcData, parameters, equity, capital)
      } else if (strategyType === 'trend-following') {
        return await generateTrendFollowingTrades(ohlcData, parameters, equity, capital)
      }
      
    } catch (error) {
      console.error('Failed to generate strategy trades:', error)
      return {
        trades: [],
        historicalDataCount: 0
      }
    }
  }

  const [allTrades, setAllTrades] = useState<any[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [backtestCompleted, setBacktestCompleted] = useState(false)
  const [historicalDataCount, setHistoricalDataCount] = useState<number>(0)
  // State to track selected timeframe from chart component
  const [selectedTimeframe, setSelectedTimeframe] = useState('6M')
  
  // User-configurable strategy parameters (dynamically set based on selected strategy)
  const [userParameters, setUserParameters] = useState(
    tradingStrategies['breakout-long-short'].parameters
  )

  // Update user parameters when strategy changes
  useEffect(() => {
    if (tradingStrategies[selectedStrategy]) {
      setUserParameters(tradingStrategies[selectedStrategy].parameters)
    }
  }, [selectedStrategy])
  
  // Manual backtest function - only runs when user clicks button
  const runBacktest = async () => {
    setTradesLoading(true)
    setBacktestCompleted(false)
    try {
      console.log('Starting backtest for source:', selectedSource, 'timeframe:', selectedTimeframe, 'capital:', initialCapital, 'strategy:', selectedStrategy)
      console.log('Using custom parameters:', userParameters)
      const result = await generateAllTrades(selectedSource, selectedTimeframe, initialCapital, selectedStrategy, userParameters)
      console.log('Backtest completed:', result.trades.length, 'trades')
      setAllTrades(result.trades)
      setHistoricalDataCount(result.historicalDataCount)
      setBacktestCompleted(true)
    } catch (error) {
      console.error('Failed to run backtest:', error)
      setAllTrades([])
      setHistoricalDataCount(0)
      alert(`Failed to run backtest: ${error.message}`)
    } finally {
      setTradesLoading(false)
    }
  }
  
  // Calculate real performance metrics from trades
  const performanceData = calculatePerformanceData(allTrades, initialCapital)
  
  // Pagination logic
  const totalPages = Math.ceil(allTrades.length / tradesPerPage)
  const startIndex = (currentPage - 1) * tradesPerPage
  const endIndex = startIndex + tradesPerPage
  const currentTrades = allTrades.slice(startIndex, endIndex)

  // CSV download function with error handling
  const downloadTradesCSV = () => {
    try {
      if (!allTrades || allTrades.length === 0) {
        alert('No trades to download. Please run a backtest first.')
        return
      }
      
      const headers = ['Date', 'Action', 'Price', 'Size', 'P&L', 'Equity', 'Comment']
      const csvContent = [
        headers.join(','),
        ...allTrades.map(trade => [
          trade.date || 'N/A',
          trade.action || 'N/A',
          (trade.price || 0).toFixed(2),
          typeof trade.size === 'number' ? trade.size.toFixed(8) : parseFloat(trade.size || '0').toFixed(8),
          trade.pnl ? trade.pnl.toFixed(2) : '',
          (trade.equity || 0).toFixed(2),
          `"${trade.comment || 'N/A'}"`
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `btc_trades_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (error) {
      console.error('Error downloading CSV:', error)
      alert('Error downloading CSV file. Please try again.')
    }
  }

  // Generate real equity curve data from trades
  const generateEquityData = () => {
    if (allTrades.length === 0) {
      // Return default starting point while loading
      return [{
        date: new Date('2020-01-01'),
        equity: initialCapital
      }]
    }
    
    // Use the actual trades to create equity curve
    const equityPoints = []
    const startingEquity = initialCapital
    
    // FIXED: Get the actual date range from trades instead of arbitrary 90 days ago
    const chronologicalTrades = [...allTrades].reverse()
    
    // Start with initial capital at the beginning of the trading period
    if (chronologicalTrades.length > 0) {
      const firstTradeDate = new Date(chronologicalTrades[0].date)
      // Start equity curve a few days before first trade to show initial capital
      const startDate = new Date(firstTradeDate)
      startDate.setDate(startDate.getDate() - 1)
      
      equityPoints.push({
        date: startDate,
        equity: startingEquity
      })
    }
    
    // Add equity points from actual trades (in chronological order)
    chronologicalTrades.forEach(trade => {
      const tradeDate = new Date(trade.date)
      // Ensure valid date
      if (!isNaN(tradeDate.getTime())) {
        equityPoints.push({
          date: tradeDate,
          equity: trade.equity
        })
      }
    })
    
    // Sort by date to ensure proper chronological order
    return equityPoints.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const drawEquityCurve = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Clear canvas
    ctx.fillStyle = '#161b22'
    ctx.fillRect(0, 0, rect.width, rect.height)

    const equityData = generateEquityData()
    const padding = 50
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Find min/max equity values
    const equityValues = equityData.map(d => d.equity)
    const minEquity = Math.min(...equityValues) * 0.95
    const maxEquity = Math.max(...equityValues) * 1.05

    // Draw grid lines
    ctx.strokeStyle = '#30363d'
    ctx.lineWidth = 0.5
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
      
      // Equity labels
      const equityValue = maxEquity - ((maxEquity - minEquity) / 5) * i
      ctx.fillStyle = '#7d8590'
      ctx.font = '10px Segoe UI'
      ctx.textAlign = 'right'
      ctx.fillText(`$${(equityValue / 1000000).toFixed(1)}M`, padding - 10, y + 3)
    }

    // Draw equity curve
    ctx.strokeStyle = '#238636'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    equityData.forEach((point, index) => {
      const x = padding + (chartWidth / (equityData.length - 1)) * index
      const y = padding + chartHeight - ((point.equity - minEquity) / (maxEquity - minEquity)) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()

    // Add fill under curve
    ctx.lineTo(padding + chartWidth, padding + chartHeight)
    ctx.lineTo(padding, padding + chartHeight)
    ctx.closePath()
    ctx.fillStyle = 'rgba(35, 134, 54, 0.1)'
    ctx.fill()

    // Draw date labels
    ctx.fillStyle = '#7d8590'
    ctx.font = '10px Segoe UI'
    ctx.textAlign = 'center'
    const dateStep = Math.max(1, Math.floor(equityData.length / 6))
    for (let i = 0; i < equityData.length; i += dateStep) {
      const x = padding + (chartWidth / (equityData.length - 1)) * i
      const date = equityData[i].date
      ctx.fillText(
        date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
        x,
        rect.height - 10
      )
    }

    // Add title
    ctx.fillStyle = '#f0f6fc'
    ctx.font = 'bold 12px Segoe UI'
    ctx.textAlign = 'left'
    ctx.fillText('Portfolio Equity Growth', padding, 20)
  }

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Real live price updates from selected source
  // Make selectedSource globally available for components
  useEffect(() => {
    (window as any).selectedDataSource = selectedSource
  }, [selectedSource])

  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const priceData = await livePriceService.getLiveBitcoinPrice(selectedSource)
        console.log('App received live price data:', {
          price: priceData.price,
          source: priceData.source,
          confidence: priceData.confidence,
          isValid: priceData.isValid
        })
        // Validate and cap unrealistic 24h changes at app level
        let validatedChange24h = priceData.change24h || 0
        const changePercent = (validatedChange24h / priceData.price) * 100
        
        if (Math.abs(changePercent) > 15) {
          console.warn(`App received unrealistic 24h change: ${changePercent.toFixed(2)}%. Capping to ±5%.`)
          validatedChange24h = (priceData.price * 0.05) * Math.sign(validatedChange24h)
        }
        
        setLivePrice({
          price: priceData.price,
          change24h: validatedChange24h,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to fetch live price:', error)
      }
    }

    // Fetch immediately
    fetchLivePrice()
    
    // Then fetch every 30 seconds
    const interval = setInterval(fetchLivePrice, 30000)
    return () => clearInterval(interval)
  }, [selectedSource])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#f0f6fc',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          {/* Logo and Title */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ 
              fontSize: '2rem', 
              margin: '0 0 0.5rem 0',
              color: '#f0f6fc'
            }}>
              🚀 BTC Strategy
            </h1>
            <p style={{ 
              margin: 0, 
              color: '#7d8590',
              opacity: 0.9 
            }}>
              {tradingStrategies[selectedStrategy].name}
            </p>
          </div>
          
          {/* Logout Button */}
          <div>
            <LogoutButton />
          </div>
        </header>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-end',
          padding: '1rem',
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ 
              fontSize: '0.9rem', 
              color: '#f0f6fc', 
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
              Exchange Selection
            </label>
            <select 
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'white',
                color: 'black'
              }}
            >
              <option value="coinbase">Coinbase Pro (Active)</option>
              <option value="binance">Binance</option>
              <option value="bitstamp">Bitstamp</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ 
              fontSize: '0.9rem', 
              color: '#f0f6fc', 
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
              Strategy Selection
            </label>
            <select 
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as StrategyType)}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'white',
                color: 'black'
              }}
            >
              {Object.values(tradingStrategies).map(strategy => (
                <option 
                  key={strategy.id} 
                  value={strategy.id}
                  disabled={strategy.id !== 'breakout-long-short' && strategy.id !== 'trend-following'}
                  style={{
                    color: (strategy.id !== 'breakout-long-short' && strategy.id !== 'trend-following') ? '#999' : 'black'
                  }}
                >
                  {strategy.name} {(strategy.id !== 'breakout-long-short' && strategy.id !== 'trend-following') ? '(Coming Soon)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ 
              fontSize: '0.9rem', 
              color: '#f0f6fc', 
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
              Initial Capital
            </label>
            <select 
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseInt(e.target.value))}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'white',
                color: 'black'
              }}
            >
              <option value={10000}>$10K</option>
              <option value={50000}>$50K</option>
              <option value={100000}>$100K</option>
              <option value={500000}>$500K</option>
              <option value={1000000}>$1M</option>
            </select>
          </div>
          
          <button
            onClick={runBacktest}
            disabled={tradesLoading}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: tradesLoading ? '#6c757d' : '#238636',
              color: 'white',
              cursor: tradesLoading ? 'not-allowed' : 'pointer',
              marginLeft: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            {tradesLoading ? '⏳ Running...' : '🚀 Run Backtest'}
          </button>
          
          <button
            onClick={handleRefreshData}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#2f81f7',
              color: 'white',
              cursor: 'pointer',
              marginLeft: '0.5rem'
            }}
          >
            Refresh Data
          </button>

          <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#7d8590' }}>
            Selected: {selectedSource.toUpperCase()} | Last updated: {currentTime.toLocaleString()}
          </div>
          
          {/* Data Quality Monitor */}
          <DataQualityMonitor className="ml-4" />
        </div>

        {/* Performance Metrics - 6 cards in a row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📈 Total Return
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#238636' }}>
              +{performanceData.total_return_percent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Net Profit: ${(performanceData.net_profit / 1000000).toFixed(1)}M
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📊 Total Trades
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f0f6fc' }}>
              {performanceData.total_trades}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Winners: {performanceData.winning_trades} | Losers: {performanceData.losing_trades}
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              🎯 Win Rate
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#238636' }}>
              +{performanceData.win_rate_percent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              {performanceData.winning_trades} / {performanceData.winning_trades + performanceData.losing_trades} trades
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📉 Max Drawdown
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#da3633' }}>
              {performanceData.max_drawdown_percent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Peak: ${(performanceData.peak_equity / 1000000).toFixed(1)}M
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📊 Profit Factor
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#238636' }}>
              {performanceData.profit_factor.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Gross Profit: ${(performanceData.gross_profit / 1000000).toFixed(1)}M
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              💰 Average Trade
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fd7e14' }}>
              ${(performanceData.average_trade / 1000000).toFixed(1)}M
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Avg Winner: ${(performanceData.average_winner / 1000).toFixed(1)}K | Avg Loser: ${(performanceData.average_loser / 1000).toFixed(1)}K
            </div>
          </div>
        </div>

        {/* Bitcoin Price Display */}
        <div style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#7d8590', marginBottom: '0.25rem' }}>
              Bitcoin - {selectedSource.toUpperCase()}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f0f6fc' }}>
              {livePrice.price > 0 ? `$${livePrice.price.toLocaleString()}` : 'Loading...'}
            </div>
          </div>
          <div style={{ 
            color: livePrice.change24h >= 0 ? '#238636' : '#da3633',
            fontSize: '1.1rem'
          }}>
            {(livePrice.change24h / livePrice.price * 100) >= 0 ? '+' : ''}{(livePrice.change24h / livePrice.price * 100).toFixed(2)}%
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#7d8590' }}>
            🔴 Live | Updated: {new Date(livePrice.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Chart Section */}
        <div style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, color: '#f0f6fc' }}>
              Bitcoin (BTC/USD) - {selectedSource.toUpperCase()}
            </h3>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#7d8590',
              fontStyle: 'italic'
            }}>
              Use timeframe buttons on the chart to change periods
            </div>
            {/* Fixed: Removed duplicate timeframe buttons - v2.0 */}
          </div>
          
          <div style={{ position: 'relative' }}>
            <LiveHistoricalChart 
              key={refreshKey}
              height={400}
              source={selectedSource}
              onTimeframeChange={setSelectedTimeframe}
              tradeSignals={allTrades.filter(trade => trade.action.includes('ENTRY')).map(trade => {
                // Parse formatted date string like "Aug 15, 2025" back to YYYY-MM-DD format
                const parsedDate = new Date(trade.date);
                const isoDate = isNaN(parsedDate.getTime()) ? trade.date : parsedDate.toISOString().split('T')[0];
                return {
                  date: isoDate,
                  type: trade.action.includes('LONG') ? 'BUY' : 'SELL',
                  price: trade.price,
                  reason: trade.comment || 'Strategy Signal'
                };
              })} 
            />
            
            {/* Live Price Overlay */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              backgroundColor: 'rgba(22, 27, 34, 0.9)',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '200px',
              zIndex: 10
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                <span style={{ fontWeight: 'bold', color: '#f0f6fc' }}>Live Bitcoin Price</span>
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#FFD700',
                marginBottom: '0.5rem'
              }}>
                {livePrice.price > 0 ? `$${livePrice.price.toLocaleString()}` : 'Loading...'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
                <div>24h Change: <span style={{ 
                  color: livePrice.change24h >= 0 ? '#238636' : '#da3633' 
                }}>
                  {(livePrice.change24h / livePrice.price * 100) >= 0 ? '+' : ''}{(livePrice.change24h / livePrice.price * 100).toFixed(2)}%
                </span></div>
                <div>Updated: {new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #30363d' 
          }}>
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'performance', label: 'Performance' }, 
              { key: 'trades', label: 'List of trades' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab.key ? '#21262d' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.key ? '#2f81f7' : 'transparent'}`,
                  color: activeTab === tab.key ? '#f0f6fc' : '#7d8590',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? '600' : '400'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '1rem' }}>
            {activeTab === 'overview' && (
              <div>
                <h3 style={{ marginBottom: '1rem', color: '#f0f6fc' }}>Strategy Overview</h3>
                <p style={{ marginBottom: '1rem', color: '#7d8590' }}>
                  {tradingStrategies[selectedStrategy].description}
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem' 
                }}>
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '1rem' }}>Strategy Parameters</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      {/* Dynamic parameter controls based on selected strategy */}
                      {selectedStrategy === 'breakout-long-short' && (
                        <>
                          {/* Lookback Period */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              Lookback Period: {userParameters.lookbackPeriod}
                            </label>
                            <input
                              type="range"
                              min="5"
                              max="50"
                              value={userParameters.lookbackPeriod}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                lookbackPeriod: parseInt(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 5-50 (Default: 20)
                            </div>
                          </div>

                          {/* Range Multiplier */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              Range Multiplier: {userParameters.rangeMultiplier}
                            </label>
                            <input
                              type="range"
                              min="0.1"
                              max="2.0"
                              step="0.1"
                              value={userParameters.rangeMultiplier}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                rangeMultiplier: parseFloat(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 0.1-2.0 (Default: 0.5)
                            </div>
                          </div>

                          {/* Stop Loss Multiplier */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              Stop Loss Multiplier: {userParameters.stopLossMultiplier}
                            </label>
                            <input
                              type="range"
                              min="1.0"
                              max="5.0"
                              step="0.1"
                              value={userParameters.stopLossMultiplier}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                stopLossMultiplier: parseFloat(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 1.0-5.0 (Default: 2.5)
                            </div>
                          </div>

                          {/* ATR Period */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              ATR Period: {userParameters.atrPeriod}
                            </label>
                            <input
                              type="range"
                              min="5"
                              max="30"
                              value={userParameters.atrPeriod}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                atrPeriod: parseInt(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 5-30 (Default: 14)
                            </div>
                          </div>
                        </>
                      )}

                      {selectedStrategy === 'trend-following' && (
                        <>
                          {/* SMA Fast Length */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              SMA Fast Length: {userParameters.smaFastLen}
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={userParameters.smaFastLen}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                smaFastLen: parseInt(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 10-100 (Default: 50)
                            </div>
                          </div>

                          {/* SMA Slow Length */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              SMA Slow Length: {userParameters.smaSlowLen}
                            </label>
                            <input
                              type="range"
                              min="100"
                              max="500"
                              value={userParameters.smaSlowLen}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                smaSlowLen: parseInt(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 100-500 (Default: 250)
                            </div>
                          </div>

                          {/* Donchian Length */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              Donchian Breakout Length: {userParameters.donLen}
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="50"
                              value={userParameters.donLen}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                donLen: parseInt(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 10-50 (Default: 20)
                            </div>
                          </div>

                          {/* ATR Multiplier */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              ATR Trail Multiplier: {userParameters.atrMult}
                            </label>
                            <input
                              type="range"
                              min="1.0"
                              max="10.0"
                              step="0.1"
                              value={userParameters.atrMult}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                atrMult: parseFloat(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 1.0-10.0 (Default: 5.0)
                            </div>
                          </div>

                          {/* ADX Threshold */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              ADX Threshold: {userParameters.adxTh}
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="50"
                              step="1"
                              value={userParameters.adxTh}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                adxTh: parseFloat(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 10-50 (Default: 15)
                            </div>
                          </div>

                          {/* Choppiness Threshold */}
                          <div>
                            <label style={{ 
                              display: 'block', 
                              fontSize: '0.9rem', 
                              color: '#f0f6fc', 
                              marginBottom: '0.5rem',
                              fontWeight: '500'
                            }}>
                              Choppiness Threshold: {userParameters.chopTh}
                            </label>
                            <input
                              type="range"
                              min="30"
                              max="80"
                              step="1"
                              value={userParameters.chopTh}
                              onChange={(e) => setUserParameters(prev => ({
                                ...prev,
                                chopTh: parseFloat(e.target.value)
                              }))}
                              style={{
                                width: '100%',
                                height: '4px',
                                backgroundColor: '#30363d',
                                outline: 'none',
                                borderRadius: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#7d8590', marginTop: '0.25rem' }}>
                              Range: 30-80 (Default: 55)
                            </div>
                          </div>
                        </>
                      )}

                      {/* Reset to Defaults Button */}
                      <button
                        onClick={() => setUserParameters(tradingStrategies[selectedStrategy].parameters)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #30363d',
                          borderRadius: '4px',
                          backgroundColor: '#21262d',
                          color: '#7d8590',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          marginTop: '0.5rem'
                        }}
                      >
                        Reset to Defaults
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Data Source</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>{selectedSource.charAt(0).toUpperCase() + selectedSource.slice(1)}</div>
                      <div>Total Candles: {backtestCompleted ? historicalDataCount.toLocaleString() : 'Run backtest to see data'}</div>
                      <div>Timeframe: {selectedTimeframe}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div>
                <h3 style={{ marginBottom: '2rem', color: '#f0f6fc' }}>Detailed Performance Analysis</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem' 
                }}>
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Returns & Profitability</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Total Return: <span style={{ color: '#238636' }}>{performanceData.total_return_percent.toFixed(1)}%</span></div>
                      <div>Net Profit: ${performanceData.net_profit.toLocaleString()}</div>
                      <div>Gross Profit: ${performanceData.gross_profit.toLocaleString()}</div>
                      <div>Gross Loss: ${performanceData.gross_loss.toLocaleString()}</div>
                      <div>Profit Factor: {performanceData.profit_factor.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Trade Statistics</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Total Trades: {performanceData.total_trades}</div>
                      <div>Winning Trades: {performanceData.winning_trades}</div>
                      <div>Losing Trades: {performanceData.losing_trades}</div>
                      <div>Win Rate: {performanceData.win_rate_percent.toFixed(1)}%</div>
                      <div>Average Trade: ${performanceData.average_trade.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Risk Metrics</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Max Drawdown: <span style={{ color: '#da3633' }}>{performanceData.max_drawdown_percent.toFixed(1)}%</span></div>
                      <div>Peak Equity: ${performanceData.peak_equity.toLocaleString()}</div>
                      <div>Final Equity: ${performanceData.final_equity.toLocaleString()}</div>
                      <div>Long Trades: {performanceData.long_trades}</div>
                      <div>Short Trades: {performanceData.short_trades}</div>
                    </div>
                  </div>
                </div>
                
                {/* Equity Curve Chart */}
                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ color: '#f0f6fc', marginBottom: '1rem' }}>Equity Curve Over Time</h4>
                  <div style={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    padding: '1rem',
                    height: '300px',
                    position: 'relative'
                  }}>
                    <canvas 
                      ref={(canvas) => {
                        if (canvas) drawEquityCurve(canvas)
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trades' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#f0f6fc' }}>
                    Trade History {backtestCompleted ? `(${allTrades.length} trades)` : '(No backtest run)'}
                  </h3>
                  <button
                    onClick={downloadTradesCSV}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#238636',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    📥 Download CSV
                  </button>
                </div>
                
                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 2fr',
                    gap: '1rem',
                    padding: '0.5rem',
                    backgroundColor: '#21262d',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontWeight: 'bold',
                    color: '#f0f6fc'
                  }}>
                    <div>Date</div>
                    <div>Action</div>
                    <div>Price</div>
                    <div>Size</div>
                    <div>P&L</div>
                    <div>Equity</div>
                    <div>Comment</div>
                  </div>
                  
                  {tradesLoading ? (
                    <div style={{ 
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#7d8590'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
                      <div>Running backtest with real {selectedSource.toUpperCase()} market data...</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        Fetching historical prices and applying {tradingStrategies[selectedStrategy].name} strategy
                      </div>
                    </div>
                  ) : !backtestCompleted ? (
                    <div style={{ 
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#7d8590'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
                      <div>Ready to run backtest</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        Click "🚀 Run Backtest" above to analyze {selectedSource.toUpperCase()} historical data
                      </div>
                    </div>
                  ) : currentTrades.map((trade, index) => (
                    <div key={index} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 2fr',
                      gap: '1rem',
                      padding: '0.5rem',
                      backgroundColor: index % 2 === 0 ? '#161b22' : 'transparent',
                      borderRadius: '4px',
                      color: '#7d8590'
                    }}>
                      <div>{trade.date || 'N/A'}</div>
                      <div style={{ 
                        color: trade.action && trade.action.includes('ENTRY') ? '#238636' : 
                              trade.action && trade.action.includes('CLOSE') ? '#da3633' : '#fd7e14'
                      }}>
                        {trade.action || 'N/A'}
                      </div>
                      <div>${trade.price ? trade.price.toLocaleString() : '0'}</div>
                      <div>{typeof trade.size === 'number' ? trade.size.toFixed(8) : parseFloat(trade.size || '0').toFixed(8)}</div>
                      <div style={{ 
                        color: trade.pnl && trade.pnl > 0 ? '#238636' : trade.pnl && trade.pnl < 0 ? '#da3633' : '#7d8590'
                      }}>
                        {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toLocaleString()}` : '-'}
                      </div>
                      <div>${trade.equity ? trade.equity.toLocaleString() : '0'}</div>
                      <div>{trade.comment || 'N/A'}</div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  padding: '1rem 0'
                }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      backgroundColor: currentPage === 1 ? '#161b22' : '#21262d',
                      color: currentPage === 1 ? '#7d8590' : '#f0f6fc',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Previous
                  </button>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #30363d',
                            borderRadius: '4px',
                            backgroundColor: currentPage === pageNum ? '#2f81f7' : '#21262d',
                            color: currentPage === pageNum ? 'white' : '#f0f6fc',
                            cursor: 'pointer',
                            fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                          }}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      backgroundColor: currentPage === totalPages ? '#161b22' : '#21262d',
                      color: currentPage === totalPages ? '#7d8590' : '#f0f6fc',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next →
                  </button>
                  
                  <div style={{ marginLeft: '1rem', color: '#7d8590', fontSize: '0.9rem' }}>
                    Page {currentPage} of {totalPages} | Showing {startIndex + 1}-{Math.min(endIndex, allTrades.length)} of {allTrades.length} trades
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrapped App with Authentication
const AppWithAuth = () => {
  return (
    <AuthProvider>
      <AuthWrapper>
        <App />
      </AuthWrapper>
    </AuthProvider>
  )
}

export default AppWithAuth