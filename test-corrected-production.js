import { chromium } from 'playwright';

async function testCorrectedProduction() {
  console.log('🔄 Testing corrected LONG-ONLY strategy on production...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture strategy logs specifically
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('LONG') || message.includes('SHORT') || message.includes('entry') || message.includes('exit') || message.includes('trend following')) {
        console.log(`📊 STRATEGY LOG: ${message}`);
      }
    });
    
    // Wait for Vercel deployment to be ready (recent push)
    console.log('⏳ Waiting 30 seconds for Vercel deployment...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('🌐 Navigating to latest production deployment...');
    await page.goto('https://trading-strategy-g164drsby-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 45000 
    });
    
    await page.screenshot({ path: 'corrected-prod-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'corrected-prod-after-login.png', fullPage: true });
    }
    
    // Select corrected strategy and run test
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
      console.log('🎯 Selecting corrected strategy...');
      await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'corrected-prod-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        // Wait for strategy execution and capture logs
        console.log('⏳ Waiting for corrected strategy execution (20 seconds)...');
        await page.waitForTimeout(20000);
        
        await page.screenshot({ path: 'corrected-prod-after-backtest.png', fullPage: true });
        
        // Check trades tab for LONG-ONLY verification
        console.log('📋 Checking corrected trades...');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 3000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'corrected-prod-trades-tab.png', fullPage: true });
          
          // Look for SHORT trades (which should NOT exist!)
          const shortTrades = await page.locator('text=/SHORT|Short/').all();
          console.log(`✅ VERIFICATION: Found ${shortTrades.length} SHORT TRADE REFERENCES (SHOULD BE ZERO!)`);
          
          if (shortTrades.length > 0) {
            console.log('❌ CRITICAL: Still finding SHORT trades in corrected production implementation!');
            for (let i = 0; i < Math.min(shortTrades.length, 5); i++) {
              const text = await shortTrades[i].textContent();
              console.log(`  ❌ SHORT TRADE ${i + 1}: "${text}"`);
            }
          } else {
            console.log('✅ SUCCESS: No SHORT trades found - production strategy is now LONG-ONLY as required!');
          }
          
          // Look for LONG trades (which should exist)
          const longTrades = await page.locator('text=/LONG|Long/').all();
          console.log(`✅ VERIFICATION: Found ${longTrades.length} LONG TRADE REFERENCES`);
          
          // Check for performance metrics
          const performanceTab = await page.locator('text="Performance"').first();
          if (await performanceTab.isVisible({ timeout: 2000 })) {
            await performanceTab.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'corrected-prod-performance.png', fullPage: true });
          }
        }
      } else {
        console.log('❌ Run Backtest button not found or not visible');
        await page.screenshot({ path: 'corrected-prod-no-run-button.png', fullPage: true });
      }
    } else {
      console.log('❌ Strategy dropdown not found');
      await page.screenshot({ path: 'corrected-prod-no-strategy.png', fullPage: true });
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'corrected-prod-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Production corrected strategy test completed');
}

testCorrectedProduction();