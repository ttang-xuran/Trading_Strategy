import { chromium } from 'playwright';

async function testLatestWinRate() {
  console.log('🔄 Testing Win Rate on latest deployment...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture ALL console logs
    page.on('console', msg => {
      const message = msg.text();
      console.log(`📊 CONSOLE: ${message}`);
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-adah91gw7-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'latest-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'latest-after-login.png', fullPage: true });
    }
    
    // Select strategy
    console.log('🎯 Selecting Trend Following with Risk MGT...');
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
      await page.screenshot({ path: 'latest-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for backtest execution...');
        await page.waitForTimeout(20000);
        
        await page.screenshot({ path: 'latest-after-backtest.png', fullPage: true });
        
        // Extract WIN RATE values from the UI
        console.log('\n🎯 EXTRACTING WIN RATE VALUES FROM UI:');
        
        try {
          // Get the win rate percentage
          const winRateElement = await page.locator('[style*="color: #238636"] >> text=/\\+\\d+\\.\\d+%/').first();
          const winRatePercent = await winRateElement.textContent();
          console.log(`📊 Win Rate Percentage: ${winRatePercent}`);
          
          // Get the breakdown text
          const breakdownElement = await page.locator('text=/\\d+ \\/ \\d+ completed trades/').first();
          const breakdownText = await breakdownElement.textContent();
          console.log(`📊 Win Rate Breakdown: ${breakdownText}`);
          
          // Parse the breakdown to get numbers
          const match = breakdownText.match(/(\d+) \/ (\d+)/);
          if (match) {
            const winners = parseInt(match[1]);
            const total = parseInt(match[2]);
            const calculatedPercent = (winners / total * 100).toFixed(2);
            console.log(`🧮 Manual calculation: ${winners} ÷ ${total} = ${calculatedPercent}%`);
            
            // Compare with displayed percentage
            const displayedPercent = parseFloat(winRatePercent.replace(/[+%]/g, ''));
            console.log(`🔍 Displayed: ${displayedPercent}% vs Calculated: ${calculatedPercent}%`);
            
            if (Math.abs(displayedPercent - parseFloat(calculatedPercent)) < 0.01) {
              console.log(`✅ SUCCESS: Win rate calculation is CORRECT!`);
            } else {
              console.log(`❌ ERROR: Win rate calculation is WRONG!`);
              console.log(`❌ Expected: ${calculatedPercent}%, Got: ${displayedPercent}%`);
            }
          }
          
        } catch (error) {
          console.log(`❌ Could not extract win rate values: ${error.message}`);
        }
        
        // Also check the trades table
        console.log('\n📋 Checking trades table...');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 3000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'latest-trades-tab.png', fullPage: true });
          
          // Count profitable vs losing trades in the table
          const tradeRows = await page.locator('table tbody tr').all();
          let winners = 0, losers = 0;
          
          for (const row of tradeRows.slice(0, Math.min(10, tradeRows.length))) {
            const pnlCell = await row.locator('td').nth(4);
            const pnlText = await pnlCell.textContent();
            
            if (pnlText && pnlText !== '-') {
              const pnlValue = parseFloat(pnlText.replace(/[$,]/g, ''));
              if (!isNaN(pnlValue)) {
                if (pnlValue > 0) winners++;
                else if (pnlValue < 0) losers++;
              }
            }
          }
          
          console.log(`📊 From trades table (first page): ${winners} winners, ${losers} losers`);
          console.log(`📊 Table-based win rate: ${winners > 0 ? ((winners / (winners + losers)) * 100).toFixed(2) : 0}%`);
        }
        
      } else {
        console.log('❌ Run Backtest button not found');
      }
    } else {
      console.log('❌ Strategy selection failed');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'latest-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n🏁 Latest Win Rate test completed');
}

testLatestWinRate();