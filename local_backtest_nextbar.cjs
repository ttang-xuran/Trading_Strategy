// Local backtest script with CORRECT next-bar execution (Pine Script compatible)
// Parameters from website: Lookback: 20, Range Mult: 0.5, Stop Loss: 2.5, ATR: 14
// Data range: 2014-01-01 to 2025-08-19 (4249 candles)

const fs = require('fs');
const path = require('path');

// Read the historical Bitcoin data (same as website)
const csvPath = path.join(__dirname, 'BTC_Price_full_history.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');
const lines = csvData.split('\n').slice(1); // Skip header

// Parse CSV data (matching website logic exactly)
const ohlcData = lines
  .filter(line => line.trim())
  .map(line => {
    const [dateStr, open, high, low, close] = line.split(',');
    
    // Parse MM/DD/YYYY format to proper Date with explicit UTC to avoid timezone issues
    const [month, day, year] = dateStr.split('/');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)); // Set to noon UTC
    
    // Parse OHLC values and validate they're valid numbers > 0
    const parsedOpen = parseFloat(open);
    const parsedHigh = parseFloat(high);
    const parsedLow = parseFloat(low);
    const parsedClose = parseFloat(close);
    
    // Skip invalid data (same validation as website)
    if (isNaN(parsedOpen) || isNaN(parsedHigh) || isNaN(parsedLow) || isNaN(parsedClose) ||
        parsedOpen <= 0 || parsedHigh <= 0 || parsedLow <= 0 || parsedClose <= 0) {
      console.warn(`Invalid CSV data for ${dateStr}: open=${open}, high=${high}, low=${low}, close=${close}`);
      return null;
    }
    
    return {
      date: date,
      open: parsedOpen,
      high: parsedHigh,
      low: parsedLow,
      close: parsedClose,
      timestamp: date.getTime()
    };
  })
  .filter(item => item !== null) // Remove any null entries from invalid data
  .filter(item => item.date >= new Date('2014-01-01')) // Start from 2014 to avoid extreme early prices (same as website)
  .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending

console.log(`Loaded ${ohlcData.length} candles from ${ohlcData[0].date.toISOString().split('T')[0]} to ${ohlcData[ohlcData.length-1].date.toISOString().split('T')[0]}`);

// Strategy parameters (matching website)
const lookbackPeriod = 20;
const rangeMultiplier = 0.5;
const stopLossMultiplier = 2.5;
const atrPeriod = 14;
const initialCapital = 100000;

let equity = initialCapital;
let position = null; // 'LONG', 'SHORT', or null
let entryPrice = 0;
let positionSize = 0;
const trades = [];

// Pending signals for next-bar execution (Pine Script behavior)
let pendingSignal = null; // 'LONG', 'SHORT', or null

// Calculate ATR function
const calculateATR = (data, period, index) => {
  if (index < period) return 1000; // Default ATR for early periods
  
  let sum = 0;
  for (let i = Math.max(0, index - period + 1); i <= index; i++) {
    const current = data[i];
    const previous = i > 0 ? data[i - 1] : current;
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    sum += tr;
  }
  return sum / period;
};

// Process each day - CORRECTED: Next-bar execution like Pine Script
for (let i = lookbackPeriod; i < ohlcData.length; i++) {
  const currentBar = ohlcData[i];
  const nextBar = i + 1 < ohlcData.length ? ohlcData[i + 1] : null;
  
  // Add data validation
  if (!currentBar || !currentBar.open || !currentBar.high || 
      !currentBar.low || !currentBar.close || 
      currentBar.open <= 0 || currentBar.high <= 0 || 
      currentBar.low <= 0 || currentBar.close <= 0) {
    console.warn(`Invalid price data at index ${i}, skipping`);
    continue;
  }
  
  const atr = calculateATR(ohlcData, atrPeriod, i);
  if (atr === 1000) continue; // Skip if ATR not available
  
  // EXACT Pine Script Calculations
  const lookbackBars = ohlcData.slice(Math.max(0, i - lookbackPeriod), i);
  if (lookbackBars.length === 0) continue;
  
  const highestHigh = Math.max(...lookbackBars.map(bar => bar.high));
  const lowestLow = Math.min(...lookbackBars.map(bar => bar.low));
  const breakoutRange = highestHigh - lowestLow;
  
  const upperBoundary = currentBar.open + (breakoutRange * rangeMultiplier);
  const lowerBoundary = currentBar.open - (breakoutRange * rangeMultiplier);
  
  // EXACT Pine Script Entry Logic
  const goLong = currentBar.high > upperBoundary;
  const goShort = currentBar.low < lowerBoundary;
  
  // STEP 1: Execute any pending signals from previous bar (Next-bar execution)
  let positionChanged = false;
  
  if (pendingSignal === 'LONG' && nextBar) {
    // Close short if exists
    if (position === 'SHORT') {
      const exitPrice = nextBar.open;
      // CORRECTED: For SHORT positions, profit when price falls
      const pnl = positionSize * (entryPrice - exitPrice);
      equity += pnl;
      
      trades.push({
        date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        action: 'CLOSE SHORT',
        price: exitPrice,
        size: positionSize,
        pnl: pnl,
        equity: equity,
        comment: 'Reverse to Long (Next Bar)'
      });
    }
    
    // Enter long
    if (nextBar) {
      position = 'LONG';
      entryPrice = nextBar.open;
      // CORRECTED: Store position size as BTC shares, not dollar amount
      positionSize = (equity * 0.99) / entryPrice;
      positionChanged = true;
      
      trades.push({
        date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        action: 'ENTRY LONG',
        price: entryPrice,
        size: positionSize,
        pnl: null,
        equity: equity,
        comment: 'Long Entry (Next Bar)'
      });
    }
    pendingSignal = null;
  }
  else if (pendingSignal === 'SHORT' && nextBar) {
    // Close long if exists
    if (position === 'LONG') {
      const exitPrice = nextBar.open;
      // CORRECTED: For LONG positions, profit when price rises
      const pnl = positionSize * (exitPrice - entryPrice);
      equity += pnl;
      
      trades.push({
        date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        action: 'CLOSE LONG',
        price: exitPrice,
        size: positionSize,
        pnl: pnl,
        equity: equity,
        comment: 'Reverse to Short (Next Bar)'
      });
    }
    
    // Enter short
    if (nextBar) {
      position = 'SHORT';
      entryPrice = nextBar.open;
      // CORRECTED: Store position size as BTC shares, not dollar amount
      positionSize = (equity * 0.99) / entryPrice;
      positionChanged = true;
      
      trades.push({
        date: nextBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        action: 'ENTRY SHORT',
        price: entryPrice,
        size: positionSize,
        pnl: null,
        equity: equity,
        comment: 'Short Entry (Next Bar)'
      });
    }
    pendingSignal = null;
  }
  
  // STEP 2: Check for new signals on current bar (for next bar execution)
  // CRITICAL: Only trigger signals if opposite to current position (Pine Script behavior)
  if (goLong && !positionChanged) {
    // Only set LONG signal if we're NOT already LONG
    if (position !== 'LONG') {
      pendingSignal = 'LONG';
    }
  }
  else if (goShort && !positionChanged) {
    // Only set SHORT signal if we're NOT already SHORT
    if (position !== 'SHORT') {
      pendingSignal = 'SHORT';
    }
  }
  
  // STEP 3: EXIT LOGIC - Check stops on current bar (immediate execution)
  if (!positionChanged && position !== null && !pendingSignal) {
    
    if (position === 'LONG') {
      const stopLossPrice = entryPrice - (atr * stopLossMultiplier);
      
      if (currentBar.low <= stopLossPrice) {
        const exitPrice = stopLossPrice;
        const pnl = positionSize * (exitPrice - entryPrice);
        equity += pnl;
        
        trades.push({
          date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          action: 'STOP LOSS LONG',
          price: exitPrice,
          size: positionSize,
          pnl: pnl,
          equity: equity,
          comment: 'Stop Loss Hit'
        });
        
        position = null;
        entryPrice = 0;
        positionSize = 0;
      }
    }
    
    if (position === 'SHORT') {
      const stopLossPrice = entryPrice + (atr * stopLossMultiplier);
      
      if (currentBar.high >= stopLossPrice) {
        const exitPrice = stopLossPrice;
        // CORRECTED: For SHORT positions, profit when price falls
        const pnl = positionSize * (entryPrice - exitPrice);
        equity += pnl;
        
        trades.push({
          date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          action: 'STOP LOSS SHORT',
          price: exitPrice,
          size: positionSize,
          pnl: pnl,
          equity: equity,
          comment: 'Stop Loss Hit'
        });
        
        position = null;
        entryPrice = 0;
        positionSize = 0;
      }
    }
  }
}

// Calculate performance metrics
const closingTrades = trades.filter(trade => trade.pnl !== null);
const grossProfit = closingTrades.filter(trade => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
const grossLoss = Math.abs(closingTrades.filter(trade => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
const netProfit = grossProfit - grossLoss;
const finalEquity = trades.length > 0 ? trades[trades.length - 1].equity : initialCapital; // Last trade
const peakEquity = trades.reduce((max, trade) => Math.max(max, trade.equity), initialCapital);

const winningTrades = closingTrades.filter(trade => trade.pnl > 0).length;
const losingTrades = closingTrades.filter(trade => trade.pnl < 0).length;

const totalReturnPercent = ((finalEquity - initialCapital) / initialCapital) * 100;
const winRate = closingTrades.length > 0 ? (winningTrades / closingTrades.length) * 100 : 0;
const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
const averageTrade = closingTrades.length > 0 ? netProfit / closingTrades.length : 0;

console.log('\n=== LOCAL NEXT-BAR EXECUTION RESULTS ===');
console.log(`Total Return: ${totalReturnPercent.toFixed(2)}%`);
console.log(`Net Profit: $${(netProfit/1000000).toFixed(1)}M`);
console.log(`Final Equity: $${(finalEquity/1000000).toFixed(1)}M`);
console.log(`Total Trades: ${trades.length}`);
console.log(`Closing Trades: ${closingTrades.length}`);
console.log(`Winners: ${winningTrades} | Losers: ${losingTrades}`);
console.log(`Win Rate: ${winRate.toFixed(2)}%`);
console.log(`Profit Factor: ${profitFactor.toFixed(2)}`);
console.log(`Gross Profit: $${(grossProfit/1000000).toFixed(1)}M`);
console.log(`Gross Loss: $${(grossLoss/1000000).toFixed(1)}M`);
console.log(`Average Trade: $${(averageTrade/1000000).toFixed(1)}M`);

// Show first few trades for debugging
console.log('\n=== FIRST 10 TRADES (NEXT-BAR) ===');
trades.slice(0, 10).forEach((trade, i) => {
  console.log(`${i+1}. ${trade.date} ${trade.action} @$${trade.price.toFixed(2)} Size:${trade.size ? trade.size.toFixed(8) : 'N/A'} P&L:${trade.pnl ? '$' + trade.pnl.toFixed(2) : 'N/A'} Equity:$${trade.equity.toFixed(2)}`);
});

console.log('\n=== COMPARISON ===');
console.log('Previous Same-Bar Results: +3,428,035.31%, $3428.0M, 384 trades');
console.log(`Current Next-Bar Results:  ${totalReturnPercent.toFixed(2)}%, $${(netProfit/1000000).toFixed(1)}M, ${trades.length} trades`);