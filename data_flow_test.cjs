#!/usr/bin/env node

/**
 * DATA FLOW INTEGRATION TEST
 * Tests the complete data pipeline from CSV → Service → App → UI
 */

const fs = require('fs')

/**
 * Simulate the exact CSV parsing from livePriceService.ts
 */
function simulateCSVParsing() {
  console.log('\n📊 DATA FLOW TEST: CSV PARSING SIMULATION')
  console.log('=========================================')
  
  try {
    // Load the actual CSV file
    const csvPath = '/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv'
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n').slice(1) // Skip header
    
    console.log(`Total CSV lines: ${lines.length}`)
    
    // Parse exactly like livePriceService.fetchCompleteHistoryFromCSV()
    const parsedData = lines
      .filter(line => line.trim() !== '')
      .map(line => {
        const [dateStr, open, high, low, close] = line.split(',')
        
        // Parse MM/DD/YYYY format exactly as in service
        const [month, day, year] = dateStr.split('/')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        
        const parsedOpen = parseFloat(open)
        const parsedHigh = parseFloat(high) 
        const parsedLow = parseFloat(low)
        const parsedClose = parseFloat(close)
        
        // Validation exactly as in service
        if (isNaN(parsedOpen) || isNaN(parsedHigh) || isNaN(parsedLow) || isNaN(parsedClose) ||
            parsedOpen <= 0 || parsedHigh <= 0 || parsedLow <= 0 || parsedClose <= 0) {
          console.warn(`Invalid CSV data for ${dateStr}: open=${open}, high=${high}, low=${low}, close=${close}`)
          return null
        }
        
        return {
          date: date,
          open: parsedOpen,
          high: parsedHigh,
          low: parsedLow,
          close: parsedClose,
          timestamp: date.getTime()
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp)
    
    console.log(`Parsed valid data points: ${parsedData.length}`)
    console.log(`Date range: ${parsedData[0].date.toISOString().split('T')[0]} to ${parsedData[parsedData.length-1].date.toISOString().split('T')[0]}`)
    console.log(`Price range: $${Math.min(...parsedData.map(d => d.close))} to $${Math.max(...parsedData.map(d => d.close)).toLocaleString()}`)
    
    // Test data integrity
    const invalidCount = parsedData.filter(d => 
      !isFinite(d.open) || !isFinite(d.high) || !isFinite(d.low) || !isFinite(d.close) ||
      d.open <= 0 || d.high <= 0 || d.low <= 0 || d.close <= 0
    ).length
    
    console.log(`Invalid data points: ${invalidCount}`)
    
    // Test micro-price handling
    const microPrices = parsedData.filter(d => d.close < 1)
    console.log(`Micro-price entries (< $1): ${microPrices.length}`)
    
    if (microPrices.length > 0) {
      console.log(`Earliest micro-price: ${microPrices[0].date.toISOString().split('T')[0]} - $${microPrices[0].close}`)
      console.log(`Latest micro-price: ${microPrices[microPrices.length-1].date.toISOString().split('T')[0]} - $${microPrices[microPrices.length-1].close}`)
    }
    
    return {
      totalLines: lines.length,
      validDataPoints: parsedData.length,
      invalidCount,
      microPriceCount: microPrices.length,
      parsedData: parsedData.slice(0, 10) // First 10 for inspection
    }
    
  } catch (error) {
    console.error('CSV parsing failed:', error.message)
    return { error: error.message }
  }
}

/**
 * Test the actual strategy calculations from App.tsx
 */
function simulateStrategyCalculations(data) {
  console.log('\n🧮 DATA FLOW TEST: STRATEGY CALCULATIONS SIMULATION') 
  console.log('===================================================')
  
  if (!data || data.length < 20) {
    console.log('Insufficient data for strategy simulation')
    return { error: 'Insufficient data' }
  }
  
  // Strategy parameters from App.tsx
  const lookbackPeriod = 20
  const rangeMultiplier = 0.5
  const stopLossMultiplier = 2.5
  const atrPeriod = 14
  const initialCapital = 100000
  
  let equity = initialCapital
  let position = null
  let entryPrice = 0
  let positionSize = 0
  const trades = []
  
  // Calculate ATR function from App.tsx
  const calculateATR = (data, period, index) => {
    if (index < period) return 1000
    
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
  
  // Test first 100 bars to identify issues quickly
  const testRange = Math.min(100, data.length)
  
  for (let i = lookbackPeriod; i < testRange; i++) {
    const currentBar = data[i]
    const atr = calculateATR(data, atrPeriod, i)
    
    // Calculate breakout levels exactly as in App.tsx
    const lookbackBars = data.slice(Math.max(0, i - lookbackPeriod), i)
    const highestHigh = Math.max(...lookbackBars.map(bar => bar.high))
    const lowestLow = Math.min(...lookbackBars.map(bar => bar.low))
    const breakoutRange = highestHigh - lowestLow
    
    const upperBoundary = currentBar.open + breakoutRange * rangeMultiplier
    const lowerBoundary = currentBar.open - breakoutRange * rangeMultiplier
    
    // Test entry signals
    if (!position) {
      if (currentBar.high > upperBoundary) {
        position = 'LONG'
        entryPrice = upperBoundary
        positionSize = (equity * 0.95) / entryPrice  // CRITICAL CALCULATION
        
        // Validation: Check for extreme position sizes
        if (!isFinite(positionSize) || positionSize > equity * 100) {
          console.log(`⚠️  CRITICAL ISSUE at ${currentBar.date.toISOString().split('T')[0]}: Extreme position size ${positionSize} for entry price $${entryPrice}`)
          return { criticalError: `Extreme position size: ${positionSize} for price $${entryPrice}` }
        }
        
        trades.push({
          date: currentBar.date,
          action: 'ENTRY LONG',
          price: entryPrice,
          size: positionSize,
          pnl: null,
          equity: equity,
          comment: 'Long Entry Signal'
        })
        
        console.log(`Trade ${trades.length}: LONG entry at $${entryPrice.toFixed(8)} | Size: ${positionSize.toFixed(8)} BTC`)
      }
    }
  }
  
  console.log(`Processed ${testRange} bars, generated ${trades.length} trades`)
  
  // Check for problematic trades
  const problematicTrades = trades.filter(trade => 
    !isFinite(trade.size) || 
    trade.size > 1000000 || // More than 1M BTC
    trade.price * trade.size > equity * 10 // More than 10x leverage
  )
  
  console.log(`Problematic trades detected: ${problematicTrades.length}`)
  
  if (problematicTrades.length > 0) {
    console.log('Problematic trades:')
    problematicTrades.forEach((trade, i) => {
      console.log(`  ${i+1}. ${trade.date.toISOString().split('T')[0]}: ${trade.action} | Price: $${trade.price} | Size: ${trade.size} BTC`)
    })
  }
  
  return {
    processedBars: testRange,
    totalTrades: trades.length,
    problematicTrades: problematicTrades.length,
    trades: trades.slice(0, 5), // First 5 trades for inspection
    dataIntegrity: problematicTrades.length === 0
  }
}

/**
 * MAIN DATA FLOW VALIDATION
 */
async function runDataFlowValidation() {
  console.log('📈 BITCOIN TRADING STRATEGY DATA FLOW VALIDATION')
  console.log('=================================================')
  
  // Test CSV parsing
  const csvResults = simulateCSVParsing()
  
  if (csvResults.error) {
    console.log('❌ CSV parsing failed - cannot continue data flow test')
    return { criticalError: csvResults.error }
  }
  
  // Test strategy calculations
  const strategyResults = simulateStrategyCalculations(csvResults.parsedData)
  
  if (strategyResults.criticalError) {
    console.log('❌ Strategy calculations failed - critical error detected')
    return { criticalError: strategyResults.criticalError }
  }
  
  // Final validation summary
  console.log('\n🏆 DATA FLOW VALIDATION SUMMARY')
  console.log('================================')
  console.log(`CSV parsing success: ${!csvResults.error ? '✅' : '❌'}`)
  console.log(`Valid data points: ${csvResults.validDataPoints}`)
  console.log(`Strategy calculation success: ${!strategyResults.criticalError ? '✅' : '❌'}`)
  console.log(`Data integrity: ${strategyResults.dataIntegrity ? '✅' : '❌'}`)
  
  const dataFlowHealthy = !csvResults.error && !strategyResults.criticalError && strategyResults.dataIntegrity
  console.log(`\nData flow status: ${dataFlowHealthy ? '✅ HEALTHY' : '❌ BROKEN'}`)
  
  return {
    csvResults,
    strategyResults,
    dataFlowHealthy,
    criticalIssueCount: (csvResults.invalidCount || 0) + (strategyResults.problematicTrades || 0)
  }
}

// Execute validation
runDataFlowValidation()
  .then(summary => {
    console.log('\n🏁 DATA FLOW VALIDATION COMPLETE')
    console.log(`Status: ${summary.dataFlowHealthy ? 'HEALTHY ✅' : 'BROKEN ❌'}`)
    process.exit(summary.dataFlowHealthy ? 0 : 1)
  })
  .catch(error => {
    console.error('Data flow validation failed:', error)
    process.exit(1)
  })