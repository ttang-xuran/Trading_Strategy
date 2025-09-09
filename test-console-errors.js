import { chromium } from 'playwright';

async function testConsoleErrors() {
  console.log('🔄 Testing for console errors on strategy selection...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      console.log('Console:', message);
      consoleMessages.push(message);
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.log('🚨 Page Error:', error.message);
      consoleMessages.push(`[PAGE ERROR] ${error.message}`);
    });
    
    console.log('🌐 Navigating to production URL...');
    await page.goto('https://trading-strategy-97rvu9y7z-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Login
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    if (await loginForm.isVisible({ timeout: 3000 })) {
      console.log('🔐 Logging in...');
      await loginForm.fill('tony');
      await passwordInput.fill('123');
      await loginButton.click();
      
      await page.waitForSelector('select', { timeout: 10000 });
      console.log('✅ Logged in successfully');
    }
    
    // Find strategy dropdown
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
      console.log('✅ Found strategy dropdown');
      
      // Take screenshot before selection
      await page.screenshot({ path: 'before-strategy-selection.png', fullPage: true });
      
      console.log('🎯 Selecting "Trend Following with Risk MGT"...');
      await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
      
      // Wait a bit for any immediate errors
      await page.waitForTimeout(3000);
      
      // Take screenshot after selection
      await page.screenshot({ path: 'after-strategy-selection.png', fullPage: true });
      
      // Wait longer to see if page recovers or shows more errors
      await page.waitForTimeout(10000);
      
      // Final screenshot
      await page.screenshot({ path: 'final-error-state.png', fullPage: true });
      
      console.log('📝 Console Messages Summary:');
      consoleMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg}`);
      });
      
    } else {
      console.log('❌ Strategy dropdown not found');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Console error test completed');
}

testConsoleErrors();