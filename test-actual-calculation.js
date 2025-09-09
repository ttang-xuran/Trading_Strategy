import { chromium } from 'playwright';

async function testActualWinRateCalculation() {
  console.log('🔄 Testing actual win rate calculation in browser...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Inject debugging code to capture actual calculation
    await page.addInitScript(() => {
      const originalConsoleLog = console.log;
      window.debugLogs = [];
      console.log = (...args) => {
        const message = args.join(' ');
        window.debugLogs.push(message);
        originalConsoleLog(...args);
        
        // Capture performance calculation details
        if (message.includes('winningTrades') || message.includes('closingTrades') || message.includes('win_rate')) {
          window.debugLogs.push(`🔍 WIN RATE DEBUG: ${message}`);
        }
      };
    });
    
    console.log('🌐 Navigating to deployment...');
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
    
    // Select strategy and run
    console.log('🎯 Selecting strategy...');
    const strategySelect = await page.locator('select[value*="strategy"]').first();
    await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
    await page.waitForTimeout(2000);
    
    const runButton = await page.locator('button:has-text("Run Backtest")').first();
    if (await runButton.isVisible()) {
      await runButton.click();
      await page.waitForTimeout(15000);
      
      // Get actual win rate value from DOM
      const winRateElement = await page.locator('text=/\\+\\d+\\.\\d+%/').first();
      const actualWinRate = await winRateElement.textContent();
      console.log(`📊 Actual Win Rate from DOM: ${actualWinRate}`);
      
      // Get the detailed breakdown
      const breakdownElement = await page.locator('text=/\\d+ \\/ \\d+ trade pairs/').first();
      const breakdown = await breakdownElement.textContent();
      console.log(`📊 Breakdown from DOM: ${breakdown}`);
      
      // Extract debug logs
      const debugLogs = await page.evaluate(() => window.debugLogs || []);
      console.log('\n🔍 Debug logs from calculation:');
      debugLogs.forEach(log => {
        if (log.includes('WIN RATE') || log.includes('winner') || log.includes('loser') || log.includes('trades')) {
          console.log(`  ${log}`);
        }
      });
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Actual calculation test completed');
}

testActualWinRateCalculation();