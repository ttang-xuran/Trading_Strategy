import { chromium } from 'playwright';

async function testDebugProduction() {
  console.log('🔄 Testing debug logs on production...');
  
  // Wait for deployment
  console.log('⏳ Waiting 30 seconds for deployment...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture all console logs
    page.on('console', msg => {
      const message = msg.text();
      console.log(`📊 CONSOLE: ${message}`);
    });
    
    console.log('🌐 Navigating to production...');
    await page.goto('https://trading-strategy-l42l8kuok-tonys-projects-297706df.vercel.app/', { 
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
        await page.waitForTimeout(20000);
        
        // Get final displayed values
        try {
          await page.screenshot({ path: 'debug-win-rate-final.png', fullPage: true });
          console.log('📸 Screenshot taken');
        } catch (error) {
          console.log('❌ Could not take screenshot');
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Production debug test completed');
}

testDebugProduction();