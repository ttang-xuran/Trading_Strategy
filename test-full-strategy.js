import { chromium } from 'playwright';

async function testFullStrategy() {
  console.log('🔄 Full testing of Trend Following with Risk MGT strategy...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture all console messages and errors
    const consoleMessages = [];
    const errorMessages = [];
    
    page.on('console', msg => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      if (msg.type() === 'error') {
        console.log('🚨 Console Error:', message);
        errorMessages.push(message);
      } else if (msg.type() === 'log' && (message.includes('Using trend following') || message.includes('Generated') || message.includes('entry') || message.includes('exit') || message.includes('PnL'))) {
        console.log('📊 Strategy Log:', message);
      }
      consoleMessages.push(message);
    });
    
    page.on('pageerror', error => {
      console.log('🚨 Page Error:', error.message);
      errorMessages.push(`[PAGE ERROR] ${error.message}`);
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-ci6pi16pm-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'final-initial.png', fullPage: true });
    
    // Login
    console.log('🔐 Logging in...');
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    if (await loginForm.isVisible({ timeout: 3000 })) {
      await loginForm.fill('tony');
      await passwordInput.fill('123');
      await loginButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Logged in successfully');
    }
    
    // Select strategy
    console.log('🎯 Selecting Trend Following with Risk MGT...');
    const selectElements = await page.locator('select').all();
    let strategySelect = null;
    
    for (let i = 0; i < selectElements.length; i++) {
      const select = selectElements[i];
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
      await page.waitForTimeout(2000);
      console.log('✅ Strategy selected');
      await page.screenshot({ path: 'final-strategy-selected.png', fullPage: true });
    }
    
    // Run backtest
    console.log('🚀 Running backtest...');
    const runButton = await page.locator('button:has-text("Run Backtest")').first();
    if (await runButton.isVisible({ timeout: 3000 })) {
      await runButton.click();
      console.log('✅ Backtest button clicked');
      
      // Wait for backtest to complete
      console.log('⏳ Waiting for backtest to complete...');
      await page.waitForTimeout(15000);
      
      await page.screenshot({ path: 'final-after-backtest.png', fullPage: true });
      
      // Check if page is still functional
      const bodyText = await page.textContent('body');
      if (!bodyText || bodyText.trim().length < 100) {
        console.log('🚨 PAGE WENT BLANK after backtest!');
        return;
      }
      
      console.log('✅ Page still functional after backtest');
      
      // Check for performance metrics
      console.log('📊 Checking performance metrics...');
      const metricsElements = await page.locator('text=/Total Return|Win Rate|Max Drawdown|Profit Factor|Net Profit|Average Trade/').all();
      console.log(`Found ${metricsElements.length} performance metric elements`);
      
      for (let i = 0; i < Math.min(metricsElements.length, 10); i++) {
        const text = await metricsElements[i].textContent();
        if (text && text.trim()) {
          console.log(`  📈 Metric ${i + 1}: "${text.trim()}"`);
        }
      }
      
      // Check for trades in the trades list
      console.log('📋 Checking trades list...');
      
      // Look for trades tab
      const tradesTab = await page.locator('text="List of trades"').first();
      if (await tradesTab.isVisible({ timeout: 2000 })) {
        await tradesTab.click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked on trades tab');
        
        await page.screenshot({ path: 'final-trades-tab.png', fullPage: true });
        
        // Count trades
        const tradeRows = await page.locator('tr, .trade-row, [class*="trade"]').all();
        console.log(`Found ${tradeRows.length} potential trade rows`);
        
        // Get some trade details
        const tradeTexts = await page.locator('text=/ENTRY|CLOSE|BUY|SELL|Long|Short/').all();
        console.log(`Found ${tradeTexts.length} trade-related text elements`);
        
        for (let i = 0; i < Math.min(tradeTexts.length, 5); i++) {
          const text = await tradeTexts[i].textContent();
          if (text && text.trim()) {
            console.log(`  💰 Trade ${i + 1}: "${text.trim()}"`);
          }
        }
      } else {
        console.log('❌ Trades tab not found');
      }
      
      // Check strategy description tab
      console.log('📖 Checking strategy description...');
      const descriptionTab = await page.locator('text="Strategy Description"').first();
      if (await descriptionTab.isVisible({ timeout: 2000 })) {
        await descriptionTab.click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked on strategy description tab');
        
        await page.screenshot({ path: 'final-description-tab.png', fullPage: true });
        
        // Check if strategy details are shown
        const strategyText = await page.locator('text=/Donchian|Risk Management|ATR|Position Sizing/').first();
        if (await strategyText.isVisible({ timeout: 2000 })) {
          const text = await strategyText.textContent();
          console.log(`✅ Strategy description found: "${text?.substring(0, 100)}..."`);
        } else {
          console.log('❌ Strategy description not found');
        }
      } else {
        console.log('❌ Strategy description tab not found');
      }
      
      // Final analysis
      console.log('\n📊 BACKTEST ANALYSIS SUMMARY:');
      console.log(`Total Console Messages: ${consoleMessages.length}`);
      console.log(`Error Messages: ${errorMessages.length}`);
      
      if (errorMessages.length > 0) {
        console.log('\n🚨 ERRORS FOUND:');
        errorMessages.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error}`);
        });
      } else {
        console.log('✅ No errors detected');
      }
      
      // Check for specific strategy logs
      const strategyLogs = consoleMessages.filter(msg => 
        msg.includes('trend following') || 
        msg.includes('entry') || 
        msg.includes('exit') || 
        msg.includes('Generated')
      );
      
      console.log(`\n📈 STRATEGY EXECUTION LOGS (${strategyLogs.length} found):`);
      strategyLogs.slice(0, 10).forEach((log, i) => {
        console.log(`  ${i + 1}. ${log}`);
      });
      
    } else {
      console.log('❌ Run Backtest button not found');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(error.stack);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Full strategy test completed');
}

testFullStrategy();