import { chromium } from 'playwright';

async function testWinRateDebugLocal() {
  console.log('🔄 Testing win rate debug on localhost...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture all console logs
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('WIN RATE DEBUG') || message.includes('LONG-ONLY')) {
        console.log(`📊 ${message}`);
      }
    });
    
    console.log('🌐 Navigating to localhost...');
    await page.goto('http://localhost:3001/', { 
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
    console.log('🎯 Selecting strategy...');
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
      await page.waitForTimeout(2000);
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for debug output...');
        await page.waitForTimeout(15000);
        
        // Get actual displayed win rate
        try {
          const winRateText = await page.locator('div:has-text("+") >> text=/\\+\\d+\\.\\d+%/').first().textContent();
          console.log(`🎯 Displayed Win Rate: ${winRateText}`);
          
          const breakdownText = await page.locator('text=/\\d+ \\/ \\d+/').first().textContent();
          console.log(`🎯 Displayed Breakdown: ${breakdownText}`);
          
        } catch (error) {
          console.log('❌ Could not get displayed values');
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Local debug test completed');
}

testWinRateDebugLocal();