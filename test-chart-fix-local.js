import { chromium } from 'playwright';

async function testChartFixLocal() {
  console.log('🔄 Testing chart markers fix locally...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('trade signals') || message.includes('ENTRY') || message.includes('EXIT')) {
        console.log(`📊 ${message}`);
      }
    });
    
    console.log('🌐 Navigating to localhost...');
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
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
    
    // Select strategy
    console.log('🎯 Selecting Trend Following with Risk MGT...');
    const strategySelect = await page.locator('select').nth(2);
    await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
    await page.waitForTimeout(2000);
    
    console.log('🚀 Running backtest...');
    const runButton = await page.locator('button:has-text("Run Backtest")').first();
    await runButton.click();
    
    console.log('⏳ Waiting for results and chart markers...');
    await page.waitForTimeout(15000);
    
    await page.screenshot({ path: 'local-chart-fix-test.png', fullPage: true });
    
    // Check if we can see trade signal markers
    try {
      const chartInfo = await page.locator('text=/📊.*trade signals/').first();
      if (await chartInfo.isVisible({ timeout: 5000 })) {
        const infoText = await chartInfo.textContent();
        console.log(`📈 Chart info: ${infoText}`);
        
        // Extract number of signals
        const match = infoText.match(/(\d+)\s+trade signals/);
        if (match) {
          const signalCount = parseInt(match[1]);
          console.log(`✅ Found ${signalCount} trade signals on chart`);
          
          if (signalCount > 0) {
            console.log(`✅ SUCCESS: Chart markers are now working!`);
          } else {
            console.log(`❌ No trade signals found on chart`);
          }
        }
      } else {
        console.log('❌ No chart signal info found');
      }
    } catch (error) {
      console.log(`❌ Could not check chart markers: ${error.message}`);
    }
    
    // Check trades list for comparison
    console.log('\n📋 Checking trades list...');
    const tradesTab = await page.locator('text="List of trades"').first();
    if (await tradesTab.isVisible({ timeout: 3000 })) {
      await tradesTab.click();
      await page.waitForTimeout(3000);
      
      const tradeRows = await page.locator('table tbody tr').all();
      let entryCount = 0, exitCount = 0;
      
      for (let i = 0; i < Math.min(10, tradeRows.length); i++) {
        const actionCell = await tradeRows[i].locator('td').nth(1);
        const actionText = await actionCell.textContent();
        
        if (actionText && actionText.includes('ENTRY')) {
          entryCount++;
        } else if (actionText && actionText.includes('EXIT')) {
          exitCount++;
        }
      }
      
      console.log(`📊 Trades: ${entryCount} ENTRY, ${exitCount} EXIT`);
      console.log(`📊 Expected chart markers: ${entryCount + exitCount} total`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Local chart fix test completed');
}

testChartFixLocal();