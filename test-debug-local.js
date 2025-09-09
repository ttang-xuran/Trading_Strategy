import { chromium } from 'playwright';

async function testDebugLocal() {
  console.log('🔄 Testing debug locally...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture console logs for trade signals debug
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('TRADE SIGNALS DEBUG') || message.includes('Sample signals') || message.includes('trade signals')) {
        console.log(`🎯 ${message}`);
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
    
    // Select strategy using a more reliable method
    console.log('🎯 Selecting Trend Following with Risk MGT...');
    await page.selectOption('select:nth-of-type(3)', 'trend-following-risk-mgt');
    await page.waitForTimeout(2000);
    
    console.log('🚀 Running backtest...');
    const runButton = await page.locator('button:has-text("Run Backtest")').first();
    await runButton.click();
    
    console.log('⏳ Waiting for debug output and trade signals...');
    await page.waitForTimeout(15000);
    
    await page.screenshot({ path: 'debug-local-test.png', fullPage: true });
    
    console.log('✅ Debug test completed - check console logs above');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testDebugLocal();