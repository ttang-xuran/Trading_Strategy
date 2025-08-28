#!/usr/bin/env node

/**
 * COMPREHENSIVE VALIDATION TEST FOR BTC TRADING STRATEGY
 * Tests all mathematical calculations, edge cases, and data processing
 */

// Test data with extreme price ranges from 2009 to 2025
const testData = [
  // Early 2009 micro-prices 
  { date: new Date('2009-01-03'), open: 0.0001, high: 0.000104, low: 0.0001, close: 0.0001 },
  { date: new Date('2009-01-04'), open: 0.000106, high: 0.00011, low: 0.0001, close: 0.0001 },
  { date: new Date('2009-01-05'), open: 0.000105, high: 0.000106, low: 0.0001, close: 0.0001 },
  
  // Bitcoin breakthrough periods
  { date: new Date('2017-12-17'), open: 19000, high: 19783, low: 18500, close: 19497 },
  { date: new Date('2017-12-18'), open: 19497, high: 19500, low: 18000, close: 18000 },
  
  // Recent high-value periods 2025
  { date: new Date('2025-08-18'), open: 117405.01, high: 117543.75, low: 114640.14, close: 116227.05 },
  { date: new Date('2025-08-19'), open: 116227.05, high: 116725.69, low: 112767.06, close: 113465.79 },
]

// Strategy parameters (exact from Pine Script)
const strategyParams = {
  lookbackPeriod: 20,
  rangeMultiplier: 0.5,
  stopLossMultiplier: 2.5,
  atrPeriod: 14,
  initialCapital: 100000
}

/**
 * TEST 1: ATR Calculation Validation
 */
function testATRCalculation() {
  console.log('\n=== TEST 1: ATR CALCULATION VALIDATION ===')
  
  const calculateATR = (data, period, index) => {
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
  
  // Test with micro-prices (potential precision issues)
  const microPriceATR = calculateATR(testData, 3, 2)
  console.log(`ATR for micro-prices: ${microPriceATR}`)
  
  // Test with high-value prices
  const highValueATR = calculateATR(testData, 3, 6)
  console.log(`ATR for high-value prices: ${highValueATR}`)
  
  // Validation checks
  const validationResults = {
    microPriceATRValid: !isNaN(microPriceATR) && microPriceATR > 0,
    highValueATRValid: !isNaN(highValueATR) && highValueATR > 0,
    noInfinityValues: isFinite(microPriceATR) && isFinite(highValueATR)
  }
  
  console.log('ATR Validation Results:', validationResults)
  return validationResults
}

/**
 * TEST 2: Position Sizing Validation (CRITICAL)
 */
function testPositionSizing() {
  console.log('\n=== TEST 2: POSITION SIZING VALIDATION ===')
  
  const calculatePositionSize = (equity, entryPrice) => {
    return (equity * 0.95) / entryPrice
  }
  
  const testCases = [
    // Micro-price era (2009) - CRITICAL TEST
    { equity: 100000, entryPrice: 0.0001, expectedIssue: 'Extreme position size' },
    { equity: 100000, entryPrice: 0.001, expectedIssue: 'Very large position size' },
    
    // Normal price ranges
    { equity: 100000, entryPrice: 1000, expectedIssue: 'None' },
    { equity: 100000, entryPrice: 50000, expectedIssue: 'None' },
    { equity: 100000, entryPrice: 120000, expectedIssue: 'None' },
    
    // Edge case: Zero or near-zero equity
    { equity: 1, entryPrice: 50000, expectedIssue: 'Insufficient equity' },
    { equity: 0, entryPrice: 50000, expectedIssue: 'Zero equity' }
  ]
  
  console.log('Position Size Test Results:')
  const results = testCases.map(test => {
    const positionSize = calculatePositionSize(test.equity, test.entryPrice)
    const positionValue = positionSize * test.entryPrice
    const leverageRatio = positionValue / test.equity
    
    const result = {
      ...test,
      positionSize,
      positionValue,
      leverageRatio,
      isRealistic: leverageRatio < 10, // Position shouldn't exceed 10x equity
      hasOverflow: !isFinite(positionSize) || positionSize > Number.MAX_SAFE_INTEGER
    }
    
    console.log(`  Entry: $${test.entryPrice} | Position: ${positionSize.toFixed(8)} BTC | Value: $${positionValue.toFixed(2)} | Leverage: ${leverageRatio.toFixed(2)}x`)
    
    return result
  })
  
  // Critical validation
  const criticalIssues = results.filter(r => 
    r.hasOverflow || r.leverageRatio > 100 || !isFinite(r.leverageRatio)
  )
  
  console.log(`\nCritical Position Sizing Issues: ${criticalIssues.length}`)
  criticalIssues.forEach(issue => {
    console.log(`  CRITICAL: Entry $${issue.entryPrice} creates ${issue.leverageRatio.toFixed(2)}x leverage`)
  })
  
  return { results, criticalIssues }
}

/**
 * TEST 3: P&L Calculation Validation
 */
function testPnLCalculations() {
  console.log('\n=== TEST 3: P&L CALCULATION VALIDATION ===')
  
  const calculatePnL = (entryPrice, exitPrice, positionSize, direction) => {
    if (direction === 'LONG') {
      return (exitPrice - entryPrice) * positionSize
    } else {
      return (entryPrice - exitPrice) * positionSize
    }
  }
  
  const testTrades = [
    // Micro-price era trades (extreme precision test)
    { entry: 0.0001, exit: 0.0002, size: 950000000, direction: 'LONG', expectedPnL: 95000 },
    { entry: 0.001, exit: 0.002, size: 95000000, direction: 'LONG', expectedPnL: 95000 },
    
    // Normal price trades
    { entry: 50000, exit: 55000, size: 1.9, direction: 'LONG', expectedPnL: 9500 },
    { entry: 60000, exit: 55000, size: 1.583, direction: 'SHORT', expectedPnL: 7915 },
    
    // High-value trades
    { entry: 120000, exit: 115000, size: 0.792, direction: 'SHORT', expectedPnL: 3960 }
  ]
  
  console.log('P&L Calculation Results:')
  const results = testTrades.map(trade => {
    const calculatedPnL = calculatePnL(trade.entry, trade.exit, trade.size, trade.direction)
    const precision = Math.abs(calculatedPnL - trade.expectedPnL)
    
    const result = {
      ...trade,
      calculatedPnL,
      precision,
      isAccurate: precision < 0.01, // Within 1 cent
      hasOverflow: !isFinite(calculatedPnL)
    }
    
    console.log(`  ${trade.direction} $${trade.entry}→$${trade.exit} | Size: ${trade.size} | P&L: $${calculatedPnL.toFixed(2)} | Expected: $${trade.expectedPnL}`)
    
    return result
  })
  
  const inaccurate = results.filter(r => !r.isAccurate || r.hasOverflow)
  console.log(`\nP&L Calculation Issues: ${inaccurate.length}`)
  
  return { results, inaccurate }
}

/**
 * TEST 4: Mathematical Overflow Detection
 */
function testMathematicalOverflow() {
  console.log('\n=== TEST 4: MATHEMATICAL OVERFLOW DETECTION ===')
  
  const overflowTests = [
    // Test Number.MAX_SAFE_INTEGER boundaries
    { value: Number.MAX_SAFE_INTEGER - 1, description: 'Max safe integer - 1' },
    { value: Number.MAX_SAFE_INTEGER, description: 'Max safe integer' },
    { value: Number.MAX_SAFE_INTEGER + 1, description: 'Max safe integer + 1' },
    
    // Test extreme position sizes
    { value: 0.0001 * 1000000000000, description: 'Micro-price * extreme size' },
    { value: 120000 * 1000000, description: 'High-price * large size' },
    
    // Test division by near-zero
    { value: 100000 / 0.0000001, description: 'Division by near-zero' }
  ]
  
  console.log('Overflow Test Results:')
  const results = overflowTests.map(test => {
    const isSafe = Number.isSafeInteger(test.value) || (isFinite(test.value) && Math.abs(test.value) < 1e15)
    const result = {
      ...test,
      isSafe,
      isFinite: isFinite(test.value),
      scientificNotation: test.value.toExponential(2)
    }
    
    console.log(`  ${test.description}: ${test.value} | Safe: ${isSafe} | Finite: ${result.isFinite}`)
    return result
  })
  
  const unsafeCalculations = results.filter(r => !r.isSafe || !r.isFinite)
  console.log(`\nUnsafe Mathematical Operations: ${unsafeCalculations.length}`)
  
  return { results, unsafeCalculations }
}

/**
 * TEST 5: Data Precision Validation
 */
function testDataPrecision() {
  console.log('\n=== TEST 5: DATA PRECISION VALIDATION ===')
  
  // Test floating-point precision with Bitcoin price ranges
  const precisionTests = [
    { original: 0.0001, processed: parseFloat('0.0001'), description: '2009 micro-price' },
    { original: 1.23456789, processed: parseFloat('1.23456789'), description: 'Multi-decimal price' },
    { original: 119294.01, processed: parseFloat('119294.01'), description: '2025 high-value price' },
    { original: 0.1, processed: 0.1, description: 'Decimal representation' },
    { original: 1/3, processed: parseFloat((1/3).toFixed(8)), description: 'Repeating decimal' }
  ]
  
  console.log('Data Precision Results:')
  const results = precisionTests.map(test => {
    const difference = Math.abs(test.original - test.processed)
    const relativePrecision = difference / Math.max(test.original, 1e-10) // Avoid division by zero
    
    const result = {
      ...test,
      difference,
      relativePrecision,
      isPrecise: relativePrecision < 1e-10, // Very high precision requirement
      isUsable: relativePrecision < 1e-6    // Practical precision for trading
    }
    
    console.log(`  ${test.description}: Original=${test.original} | Processed=${test.processed} | Diff=${difference.toExponential(2)}`)
    return result
  })
  
  const precisionIssues = results.filter(r => !r.isUsable)
  console.log(`\nPrecision Issues: ${precisionIssues.length}`)
  
  return { results, precisionIssues }
}

/**
 * TEST 6: Strategy Logic Validation
 */
function testStrategyLogic() {
  console.log('\n=== TEST 6: STRATEGY LOGIC VALIDATION ===')
  
  // Simulate strategy with test data
  let equity = 100000
  let position = null
  let entryPrice = 0
  let positionSize = 0
  const trades = []
  
  // Test boundary calculations
  const testBoundaries = (data, index) => {
    const lookbackBars = data.slice(Math.max(0, index - 5), index) // Use 5 for testing
    const highestHigh = Math.max(...lookbackBars.map(bar => bar.high))
    const lowestLow = Math.min(...lookbackBars.map(bar => bar.low))
    const breakoutRange = highestHigh - lowestLow
    
    const current = data[index]
    const upperBoundary = current.open + breakoutRange * 0.5
    const lowerBoundary = current.open - breakoutRange * 0.5
    
    return { upperBoundary, lowerBoundary, breakoutRange }
  }
  
  console.log('Strategy Logic Test:')
  
  for (let i = 5; i < testData.length; i++) {
    const current = testData[i]
    const boundaries = testBoundaries(testData, i)
    
    console.log(`Day ${i}: Price=${current.close} | Upper=${boundaries.upperBoundary.toFixed(8)} | Lower=${boundaries.lowerBoundary.toFixed(8)}`)
    
    // Test entry logic
    if (!position && current.high > boundaries.upperBoundary) {
      position = 'LONG'
      entryPrice = boundaries.upperBoundary
      positionSize = (equity * 0.95) / entryPrice
      
      console.log(`  ENTRY LONG: Price=${entryPrice} | Size=${positionSize} | Value=$${(entryPrice * positionSize).toFixed(2)}`)
      
      // Validate position size is reasonable
      if (positionSize > equity * 10) {
        console.log(`  ⚠️  WARNING: Extreme position size detected: ${positionSize}`)
      }
      
      trades.push({ type: 'entry', position, entryPrice, positionSize, equity })
    }
  }
  
  return { trades, finalEquity: equity }
}

/**
 * MAIN VALIDATION EXECUTION
 */
async function runComprehensiveValidation() {
  console.log('🔍 BITCOIN TRADING STRATEGY COMPREHENSIVE VALIDATION')
  console.log('================================================')
  console.log(`Test Data Range: ${testData[0].date.toDateString()} to ${testData[testData.length-1].date.toDateString()}`)
  console.log(`Price Range: $${Math.min(...testData.map(d => d.close))} to $${Math.max(...testData.map(d => d.close)).toLocaleString()}`)
  
  // Run all tests
  const atrResults = testATRCalculation()
  const positionResults = testPositionSizing()
  const pnlResults = testPnLCalculations()
  const overflowResults = testMathematicalOverflow()
  const precisionResults = testDataPrecision()
  const strategyResults = testStrategyLogic()
  
  // Generate validation report
  console.log('\n🏆 COMPREHENSIVE VALIDATION REPORT')
  console.log('=====================================')
  
  const criticalIssues = []
  const warnings = []
  const recommendations = []
  
  // ATR Analysis
  if (!atrResults.microPriceATRValid || !atrResults.highValueATRValid) {
    criticalIssues.push('ATR calculation fails with extreme price ranges')
  }
  
  // Position Sizing Analysis (MOST CRITICAL)
  if (positionResults.criticalIssues.length > 0) {
    criticalIssues.push(`CRITICAL: ${positionResults.criticalIssues.length} extreme position sizing issues detected`)
    positionResults.criticalIssues.forEach(issue => {
      criticalIssues.push(`  - Entry price $${issue.entryPrice} creates ${issue.leverageRatio.toFixed(2)}x leverage (DANGEROUS)`)
    })
  }
  
  // P&L Calculation Analysis
  if (pnlResults.inaccurate.length > 0) {
    warnings.push(`P&L calculations have ${pnlResults.inaccurate.length} precision issues`)
  }
  
  // Overflow Analysis
  if (overflowResults.unsafeCalculations.length > 0) {
    criticalIssues.push(`Mathematical overflow detected in ${overflowResults.unsafeCalculations.length} calculations`)
  }
  
  // Precision Analysis
  if (precisionResults.precisionIssues.length > 0) {
    warnings.push(`Data precision issues in ${precisionResults.precisionIssues.length} calculations`)
  }
  
  // Generate summary
  console.log(`\n📊 VALIDATION SUMMARY:`)
  console.log(`  Critical Issues: ${criticalIssues.length}`)
  console.log(`  Warnings: ${warnings.length}`)
  console.log(`  Production Ready: ${criticalIssues.length === 0 ? '✅ YES' : '❌ NO'}`)
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:')
    criticalIssues.forEach(issue => console.log(`  - ${issue}`))
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:')
    warnings.forEach(warning => console.log(`  - ${warning}`))
  }
  
  // Specific recommendations for micro-price handling
  recommendations.push('Implement position size caps to prevent extreme leverage')
  recommendations.push('Add precision validation for micro-price calculations')
  recommendations.push('Use BigNumber.js or similar for high-precision calculations')
  recommendations.push('Implement circuit breakers for unrealistic position sizes')
  
  console.log('\n💡 RECOMMENDATIONS:')
  recommendations.forEach(rec => console.log(`  - ${rec}`))
  
  return {
    criticalIssues: criticalIssues.length,
    warnings: warnings.length,
    productionReady: criticalIssues.length === 0,
    positionSizingIssues: positionResults.criticalIssues.length,
    overflowIssues: overflowResults.unsafeCalculations.length
  }
}

// Execute validation
runComprehensiveValidation()
  .then(summary => {
    console.log('\n🏁 VALIDATION COMPLETE')
    console.log(`Final Assessment: ${summary.productionReady ? 'PRODUCTION READY ✅' : 'PRODUCTION BLOCKED ❌'}`)
    process.exit(summary.criticalIssues > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('Validation failed:', error)
    process.exit(1)
  })