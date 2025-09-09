import { chromium } from 'playwright';

async function testFinalURL() {
  console.log('🔄 Testing latest deployment with corrected understanding...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture strategy logs specifically
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('LONG') || message.includes('SHORT') || message.includes('entry') || message.includes('exit')) {
        console.log(`📊 STRATEGY LOG: ${message}`);
      }
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-g164drsby-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
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
    }
    
    // Select strategy and run test
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
      console.log('🎯 Selecting strategy...');
      await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
      await page.waitForTimeout(2000);
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        // Wait for strategy execution and capture logs
        console.log('⏳ Waiting for strategy execution (15 seconds)...');
        await page.waitForTimeout(15000);
        
        await page.screenshot({ path: 'final-wrong-strategy.png', fullPage: true });
        
        // Check trades tab
        console.log('📋 Checking trades...');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 2000 })) {
          await tradesTab.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'final-trades-wrong.png', fullPage: true });
          
          // Look for SHORT trades (which shouldn't exist!)
          const shortTrades = await page.locator('text=/SHORT|Short/').all();
          console.log(`🚨 FOUND ${shortTrades.length} SHORT TRADE REFERENCES (SHOULD BE ZERO!)`);
          
          if (shortTrades.length > 0) {
            for (let i = 0; i < Math.min(shortTrades.length, 5); i++) {
              const text = await shortTrades[i].textContent();
              console.log(`  ❌ SHORT TRADE ${i + 1}: "${text}"`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Investigation completed');
}

testFinalURL();