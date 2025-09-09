import { chromium } from 'playwright';

async function testTrendFollowingRiskMgtComprehensive() {
  console.log('🔄 Comprehensive test of Trend Following with Risk MGT strategy...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture console logs for strategy analysis
    const strategyLogs = [];
    page.on('console', msg => {
      const message = msg.text();
      strategyLogs.push(message);
      if (message.includes('LONG') || message.includes('SHORT') || message.includes('trend following') || message.includes('trades')) {
        console.log(`📊 STRATEGY LOG: ${message}`);
      }
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${message}`);
      }
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-l42l8kuok-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'trend-risk-initial.png', fullPage: true });
    
    // Login
    console.log('🔐 Logging in...');
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    if (await loginForm.isVisible({ timeout: 5000 })) {
      await loginForm.fill('tony');
      await passwordInput.fill('123');
      await loginButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Select Trend Following with Risk MGT strategy
    console.log('🎯 Selecting Trend Following with Risk MGT strategy...');
    const selectElements = await page.locator('select').all();
    let strategySelect = null;
    
    for (const select of selectElements) {
      const options = await select.locator('option').all();
      for (const option of options) {
        const text = await option.textContent();
        if (text && text.includes('Trend Following with Risk MGT')) {
          strategySelect = select;
          break;
        }
      }
      if (strategySelect) break;
    }
    
    if (strategySelect) {
      await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'trend-risk-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for backtest execution (20 seconds)...');
        await page.waitForTimeout(20000);
        
        await page.screenshot({ path: 'trend-risk-after-backtest.png', fullPage: true });
        
        // 1. ANALYZE PERFORMANCE METRICS
        console.log('📊 Analyzing Performance Metrics...');
        const totalReturnElement = await page.locator('text=/Total Return.*%/').first();
        const totalTradesElement = await page.locator('text=/Total Trades.*\d+/').first();
        const winRateElement = await page.locator('text=/Win Rate.*%/').first();
        const maxDrawdownElement = await page.locator('text=/Max Drawdown.*%/').first();
        const profitFactorElement = await page.locator('text=/Profit Factor.*\d/').first();
        const avgTradeElement = await page.locator('text=/Average Trade.*\$/').first();
        
        if (await totalReturnElement.isVisible({ timeout: 2000 })) {
          const totalReturn = await totalReturnElement.textContent();
          console.log(`📈 ${totalReturn}`);
        }
        if (await totalTradesElement.isVisible({ timeout: 2000 })) {
          const totalTrades = await totalTradesElement.textContent();
          console.log(`🔢 ${totalTrades}`);
        }
        if (await winRateElement.isVisible({ timeout: 2000 })) {
          const winRate = await winRateElement.textContent();
          console.log(`🎯 ${winRate}`);
        }
        if (await maxDrawdownElement.isVisible({ timeout: 2000 })) {
          const maxDrawdown = await maxDrawdownElement.textContent();
          console.log(`📉 ${maxDrawdown}`);
        }
        if (await profitFactorElement.isVisible({ timeout: 2000 })) {
          const profitFactor = await profitFactorElement.textContent();
          console.log(`💰 ${profitFactor}`);
        }
        if (await avgTradeElement.isVisible({ timeout: 2000 })) {
          const avgTrade = await avgTradeElement.textContent();
          console.log(`📊 ${avgTrade}`);
        }
        
        // 2. ANALYZE TRADE STATISTICS
        console.log('📋 Analyzing Trade Statistics...');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 3000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'trend-risk-trades-tab.png', fullPage: true });
          
          // Count different trade types
          const allRows = await page.locator('table tbody tr').all();
          console.log(`📊 Total trade rows found: ${allRows.length}`);
          
          let longEntries = 0, longExits = 0, shortEntries = 0, shortExits = 0;
          let totalPnL = 0;
          const tradeDetails = [];
          
          for (const row of allRows) {
            const cells = await row.locator('td').all();
            if (cells.length >= 6) {
              const action = await cells[1].textContent();
              const price = await cells[2].textContent();
              const size = await cells[3].textContent();
              const pnl = await cells[4].textContent();
              
              tradeDetails.push({ action, price, size, pnl });
              
              if (action && action.includes('LONG')) {
                if (action.includes('ENTRY')) longEntries++;
                if (action.includes('CLOSE')) longExits++;
              }
              if (action && action.includes('SHORT')) {
                if (action.includes('ENTRY')) shortEntries++;
                if (action.includes('CLOSE')) shortExits++;
              }
              
              // Parse PnL
              if (pnl && pnl !== '-') {
                const pnlNum = parseFloat(pnl.replace(/[$,]/g, ''));
                if (!isNaN(pnlNum)) totalPnL += pnlNum;
              }
            }
          }
          
          console.log(`🔴 CRITICAL ANALYSIS:`);
          console.log(`📈 LONG Entries: ${longEntries}, LONG Exits: ${longExits}`);
          console.log(`📉 SHORT Entries: ${shortEntries}, SHORT Exits: ${shortExits}`);
          console.log(`💰 Calculated Total PnL: $${totalPnL.toFixed(2)}`);
          
          // Check if strategy is truly LONG-ONLY
          if (shortEntries > 0 || shortExits > 0) {
            console.log(`❌ CRITICAL ERROR: Strategy shows ${shortEntries} SHORT entries and ${shortExits} SHORT exits!`);
            console.log(`❌ This violates the LONG-ONLY Pine Script specification!`);
          } else {
            console.log(`✅ SUCCESS: Strategy is properly LONG-ONLY (no SHORT trades)`);
          }
          
          // Show sample trades
          console.log(`📋 Sample trade details (first 5):`);
          for (let i = 0; i < Math.min(5, tradeDetails.length); i++) {
            const trade = tradeDetails[i];
            console.log(`  ${i + 1}. ${trade.action} at ${trade.price}, size: ${trade.size}, PnL: ${trade.pnl}`);
          }
          
          // Navigate to next page if available
          const nextButton = await page.locator('button:has-text("Next")').first();
          if (await nextButton.isVisible({ timeout: 1000 }) && await nextButton.isEnabled()) {
            console.log('📄 Checking additional trade pages...');
            await nextButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'trend-risk-trades-page2.png', fullPage: true });
          }
        }
        
        // 3. CHECK PERFORMANCE TAB
        console.log('📈 Checking Performance tab...');
        const performanceTab = await page.locator('text="Performance"').first();
        if (await performanceTab.isVisible({ timeout: 2000 })) {
          await performanceTab.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'trend-risk-performance.png', fullPage: true });
        }
        
        // 4. CHECK STRATEGY DESCRIPTION TAB
        console.log('📖 Checking Strategy Description...');
        const descriptionTab = await page.locator('text="Strategy Description"').first();
        if (await descriptionTab.isVisible({ timeout: 2000 })) {
          await descriptionTab.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'trend-risk-description.png', fullPage: true });
        }
        
        // 5. VERIFY STRATEGY PARAMETERS
        console.log('🔧 Verifying Strategy Parameters...');
        const overviewTab = await page.locator('text="Overview"').first();
        if (await overviewTab.isVisible({ timeout: 2000 })) {
          await overviewTab.click();
          await page.waitForTimeout(1000);
          
          // Check parameter values
          const parameterInputs = await page.locator('input[type="range"]').all();
          console.log(`🎛️ Found ${parameterInputs.length} parameter controls`);
          
          for (let i = 0; i < parameterInputs.length; i++) {
            const input = parameterInputs[i];
            const value = await input.getAttribute('value');
            const min = await input.getAttribute('min');
            const max = await input.getAttribute('max');
            console.log(`  Parameter ${i + 1}: value=${value}, range=${min}-${max}`);
          }
        }
        
      } else {
        console.log('❌ Run Backtest button not found or not visible');
      }
    } else {
      console.log('❌ Strategy selection failed');
    }
    
    // 6. FINAL COMPREHENSIVE SUMMARY
    console.log('\n🎯 COMPREHENSIVE ANALYSIS SUMMARY:');
    console.log('Strategy Logs captured:', strategyLogs.length);
    console.log('Screenshots taken: 6-8 different views');
    console.log('Analysis completed for: Performance, Trades, Parameters, Description');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'trend-risk-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Comprehensive Trend Following Risk MGT test completed');
}

testTrendFollowingRiskMgtComprehensive();