#!/usr/bin/env node

/**
 * SECURITY AND PERFORMANCE VALIDATION TEST
 * Tests floating-point vulnerabilities, memory usage, and performance bottlenecks
 */

const fs = require('fs')
const path = require('path')

/**
 * SECURITY TEST 1: Floating-Point Precision Vulnerabilities
 */
function testFloatingPointVulnerabilities() {
  console.log('\n🔐 SECURITY TEST 1: FLOATING-POINT VULNERABILITIES')
  console.log('===================================================')
  
  const vulnerabilityTests = [
    // Test 1: Precision loss in calculations
    {
      name: 'Precision Loss Attack',
      test: () => {
        const microPrice = 0.0001
        const equity = 100000
        const positionSize = (equity * 0.95) / microPrice
        const calculatedEquity = positionSize * microPrice / 0.95
        return Math.abs(calculatedEquity - equity) > 0.01 // More than 1 cent difference
      }
    },
    
    // Test 2: Division by zero protection
    {
      name: 'Division by Zero',
      test: () => {
        try {
          const result = 100000 / 0
          return !isFinite(result)
        } catch (error) {
          return false // Protected
        }
      }
    },
    
    // Test 3: Integer overflow in position sizing
    {
      name: 'Integer Overflow',
      test: () => {
        const extremePositionSize = Number.MAX_SAFE_INTEGER + 1
        const isUnsafe = !Number.isSafeInteger(extremePositionSize)
        return isUnsafe
      }
    },
    
    // Test 4: NaN propagation
    {
      name: 'NaN Propagation',
      test: () => {
        const invalidInput = NaN
        const equity = 100000
        const positionSize = (equity * 0.95) / invalidInput
        return isNaN(positionSize)
      }
    },
    
    // Test 5: Negative price injection
    {
      name: 'Negative Price Injection',
      test: () => {
        const negativePrice = -50000
        const equity = 100000
        const positionSize = (equity * 0.95) / negativePrice
        return positionSize < 0 || !isFinite(positionSize)
      }
    }
  ]
  
  console.log('Vulnerability Test Results:')
  let vulnerabilityCount = 0
  
  vulnerabilityTests.forEach(test => {
    const isVulnerable = test.test()
    if (isVulnerable) vulnerabilityCount++
    
    console.log(`  ${test.name}: ${isVulnerable ? '🚨 VULNERABLE' : '✅ PROTECTED'}`)
  })
  
  console.log(`\nTotal Vulnerabilities: ${vulnerabilityCount}`)
  return { vulnerabilityCount, tests: vulnerabilityTests }
}

/**
 * SECURITY TEST 2: Input Validation
 */
function testInputValidation() {
  console.log('\n🔐 SECURITY TEST 2: INPUT VALIDATION')
  console.log('====================================')
  
  const maliciousInputs = [
    { name: 'SQL Injection Attempt', input: "'; DROP TABLE trades; --", type: 'string' },
    { name: 'XSS Attempt', input: "<script>alert('xss')</script>", type: 'string' },
    { name: 'Extremely Large Number', input: '999999999999999999999', type: 'number' },
    { name: 'Scientific Notation', input: '1e+100', type: 'number' },
    { name: 'Negative Infinity', input: Number.NEGATIVE_INFINITY, type: 'number' },
    { name: 'Positive Infinity', input: Number.POSITIVE_INFINITY, type: 'number' },
    { name: 'NaN Input', input: NaN, type: 'number' },
    { name: 'Empty String', input: '', type: 'string' },
    { name: 'Null Input', input: null, type: 'any' },
    { name: 'Undefined Input', input: undefined, type: 'any' }
  ]
  
  console.log('Input Validation Results:')
  
  const validatePriceInput = (input) => {
    if (typeof input !== 'number') return false
    if (!isFinite(input)) return false
    if (input <= 0) return false
    if (input > 1000000) return false // Reasonable upper limit
    return true
  }
  
  let validationFailures = 0
  
  maliciousInputs.forEach(test => {
    const isValid = validatePriceInput(test.input)
    const shouldBeRejected = !isValid
    
    if (!shouldBeRejected) validationFailures++
    
    console.log(`  ${test.name}: ${shouldBeRejected ? '✅ REJECTED' : '🚨 ACCEPTED (VULNERABLE)'}`)
  })
  
  console.log(`\nValidation Failures: ${validationFailures}`)
  return { validationFailures, tests: maliciousInputs }
}

/**
 * PERFORMANCE TEST 1: Large Dataset Processing
 */
async function testLargeDatasetPerformance() {
  console.log('\n⚡ PERFORMANCE TEST 1: LARGE DATASET PROCESSING')
  console.log('===============================================')
  
  try {
    // Load the actual BTC CSV file
    const csvPath = '/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv'
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n')
    
    console.log(`Total CSV lines: ${lines.length}`)
    console.log(`Estimated memory usage: ${(csvContent.length / 1024 / 1024).toFixed(2)} MB`)
    
    // Simulate data processing performance
    const startTime = Date.now()
    
    // Parse CSV data (similar to livePriceService)
    const processedData = lines.slice(1) // Skip header
      .filter(line => line.trim() !== '')
      .map(line => {
        const [dateStr, open, high, low, close] = line.split(',')
        const [month, day, year] = dateStr.split('/')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        
        return {
          date: date,
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          timestamp: date.getTime()
        }
      })
      .filter(item => 
        !isNaN(item.open) && !isNaN(item.high) && 
        !isNaN(item.low) && !isNaN(item.close) &&
        item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0
      )
    
    const parseTime = Date.now() - startTime
    
    // Test strategy calculation performance
    const strategyStartTime = Date.now()
    let processedBars = 0
    
    // Simulate the strategy loop
    for (let i = 20; i < Math.min(1000, processedData.length); i++) { // Limit to 1000 for performance test
      const lookbackBars = processedData.slice(Math.max(0, i - 20), i)
      const highestHigh = Math.max(...lookbackBars.map(bar => bar.high))
      const lowestLow = Math.min(...lookbackBars.map(bar => bar.low))
      const breakoutRange = highestHigh - lowestLow
      
      // Boundary calculations
      const currentBar = processedData[i]
      const upperBoundary = currentBar.open + breakoutRange * 0.5
      const lowerBoundary = currentBar.open - breakoutRange * 0.5
      
      // ATR calculation (simplified)
      let atrSum = 0
      for (let j = Math.max(0, i - 14 + 1); j <= i; j++) {
        const current = processedData[j]
        const previous = j > 0 ? processedData[j - 1] : current
        const tr = Math.max(
          current.high - current.low,
          Math.abs(current.high - previous.close),
          Math.abs(current.low - previous.close)
        )
        atrSum += tr
      }
      const atr = atrSum / 14
      
      processedBars++
    }
    
    const strategyTime = Date.now() - strategyStartTime
    
    const performanceResults = {
      totalBars: processedData.length,
      parseTimeMs: parseTime,
      strategyTimeMs: strategyTime,
      processedBars,
      barsPerSecond: (processedBars / (strategyTime / 1000)).toFixed(2),
      memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      isPerformant: strategyTime < 5000 && parseTime < 2000 // Under 5s strategy, 2s parsing
    }
    
    console.log('Performance Results:')
    console.log(`  Total historical bars: ${performanceResults.totalBars}`)
    console.log(`  Data parsing time: ${performanceResults.parseTimeMs}ms`)
    console.log(`  Strategy calculation time: ${performanceResults.strategyTimeMs}ms`)
    console.log(`  Processing rate: ${performanceResults.barsPerSecond} bars/second`)
    console.log(`  Memory usage: ${performanceResults.memoryUsageMB} MB`)
    console.log(`  Performance acceptable: ${performanceResults.isPerformant ? '✅ YES' : '❌ NO'}`)
    
    return performanceResults
    
  } catch (error) {
    console.error('Performance test failed:', error.message)
    return { error: error.message, isPerformant: false }
  }
}

/**
 * PERFORMANCE TEST 2: Memory Leak Detection
 */
function testMemoryUsage() {
  console.log('\n⚡ PERFORMANCE TEST 2: MEMORY LEAK DETECTION')
  console.log('=============================================')
  
  const getMemoryUsage = () => {
    const usage = process.memoryUsage()
    return {
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024
    }
  }
  
  console.log('Memory Usage Test:')
  
  // Baseline memory
  const baseline = getMemoryUsage()
  console.log(`  Baseline: Heap=${baseline.heapUsed.toFixed(2)}MB, Total=${baseline.heapTotal.toFixed(2)}MB`)
  
  // Simulate large array processing (like historical data)
  const largeArray = new Array(10000).fill(0).map((_, i) => ({
    date: new Date(Date.now() - i * 86400000),
    price: Math.random() * 100000,
    volume: Math.random() * 1000000
  }))
  
  const afterAllocation = getMemoryUsage()
  console.log(`  After 10K allocation: Heap=${afterAllocation.heapUsed.toFixed(2)}MB (+${(afterAllocation.heapUsed - baseline.heapUsed).toFixed(2)}MB)`)
  
  // Clean up and check for proper garbage collection
  largeArray.length = 0
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  setTimeout(() => {
    const afterCleanup = getMemoryUsage()
    const memoryLeaked = afterCleanup.heapUsed > baseline.heapUsed + 5 // Allow 5MB tolerance
    
    console.log(`  After cleanup: Heap=${afterCleanup.heapUsed.toFixed(2)}MB`)
    console.log(`  Memory leak detected: ${memoryLeaked ? '🚨 YES' : '✅ NO'}`)
    
    return { memoryLeaked, baseline, afterCleanup }
  }, 1000)
}

/**
 * MAIN SECURITY & PERFORMANCE VALIDATION
 */
async function runSecurityPerformanceValidation() {
  console.log('🛡️  BITCOIN TRADING STRATEGY SECURITY & PERFORMANCE VALIDATION')
  console.log('==============================================================')
  
  // Run security tests
  const floatingPointResults = testFloatingPointVulnerabilities()
  const inputValidationResults = testInputValidation()
  
  // Run performance tests
  const performanceResults = await testLargeDatasetPerformance()
  const memoryResults = testMemoryUsage()
  
  // Generate security report
  console.log('\n🛡️  SECURITY ANALYSIS SUMMARY')
  console.log('=============================')
  console.log(`Floating-point vulnerabilities: ${floatingPointResults.vulnerabilityCount}`)
  console.log(`Input validation failures: ${inputValidationResults.validationFailures}`)
  
  // Generate performance report
  console.log('\n⚡ PERFORMANCE ANALYSIS SUMMARY')
  console.log('================================')
  console.log(`Dataset size: ${performanceResults.totalBars || 'N/A'} historical bars`)
  console.log(`Processing performance: ${performanceResults.isPerformant ? '✅ ACCEPTABLE' : '❌ TOO SLOW'}`)
  
  // Overall security assessment
  const totalVulnerabilities = floatingPointResults.vulnerabilityCount + inputValidationResults.validationFailures
  const securityScore = Math.max(0, 100 - (totalVulnerabilities * 20))
  
  console.log('\n🏆 SECURITY & PERFORMANCE FINAL ASSESSMENT')
  console.log('===========================================')
  console.log(`Security Score: ${securityScore}/100`)
  console.log(`Performance Rating: ${performanceResults.isPerformant ? 'ACCEPTABLE' : 'NEEDS OPTIMIZATION'}`)
  console.log(`Production Security Ready: ${securityScore >= 80 ? '✅ YES' : '❌ NO'}`)
  console.log(`Production Performance Ready: ${performanceResults.isPerformant ? '✅ YES' : '❌ NO'}`)
  
  return {
    securityScore,
    totalVulnerabilities,
    performanceResults,
    productionReady: securityScore >= 80 && performanceResults.isPerformant
  }
}

// Execute validation
runSecurityPerformanceValidation()
  .then(summary => {
    console.log(`\n🏁 SECURITY & PERFORMANCE VALIDATION COMPLETE`)
    console.log(`Final Status: ${summary.productionReady ? 'READY ✅' : 'BLOCKED ❌'}`)
    process.exit(summary.productionReady ? 0 : 1)
  })
  .catch(error => {
    console.error('Security/Performance validation failed:', error)
    process.exit(1)
  })