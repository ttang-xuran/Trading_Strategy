import { chromium } from 'playwright';

async function testRunBacktesting() {
  console.log('🔄 Testing "Run Backtesting" with Trend Following Risk MGT...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture all console messages and errors
    const consoleMessages = [];
    page.on('console', msg => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      console.log('Console:', message);
      consoleMessages.push(message);
    });
    
    page.on('pageerror', error => {
      console.log('🚨 Page Error:', error.message);
      consoleMessages.push(`[PAGE ERROR] ${error.message}`);
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-fhicu462e-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'latest-initial.png', fullPage: true });
    
    // Login
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    if (await loginForm.isVisible({ timeout: 3000 })) {
      console.log('🔐 Logging in with tony/123...');
      await loginForm.fill('tony');
      await passwordInput.fill('123');
      await loginButton.click();
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'latest-after-login.png', fullPage: true });
    }
    
    // Find and select strategy
    const selectElements = await page.locator('select').all();
    let strategySelect = null;
    
    for (let i = 0; i < selectElements.length; i++) {
      const select = selectElements[i];
      const options = await select.locator('option').all();
      
      for (const option of options) {
        const text = await option.textContent();
        if (text && text.includes('Trend Following with Risk MGT')) {
          strategySelect = select;
          console.log(`✅ Found strategy dropdown at index ${i + 1}`);
          break;
        }
      }
      if (strategySelect) break;
    }
    
    if (strategySelect) {
      console.log('🎯 Selecting "Trend Following with Risk MGT"...');
      await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'latest-strategy-selected.png', fullPage: true });
      
      // Look for "Run Backtesting" button
      const runButtons = await page.locator('button').all();
      let runBacktestButton = null;
      
      console.log('🔍 Looking for Run Backtesting button...');
      for (let i = 0; i < runButtons.length; i++) {
        const button = runButtons[i];
        const text = await button.textContent();
        console.log(`Button ${i + 1}: "${text}"`);
        
        if (text && (text.includes('Run Backtesting') || text.includes('Run') || text.includes('Backtest'))) {
          runBacktestButton = button;
          console.log(`✅ Found Run Backtesting button: "${text}"`);
          break;
        }
      }
      
      if (runBacktestButton) {
        console.log('🚀 Clicking Run Backtesting...');
        await runBacktestButton.click();
        
        // Wait a moment and take screenshot immediately after click
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'latest-after-run-click.png', fullPage: true });
        
        // Wait longer to see what happens
        console.log('⏳ Waiting to see if page goes blank...');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'latest-after-5sec.png', fullPage: true });
        
        // Wait even longer
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'latest-final-state.png', fullPage: true });
        
        // Check if page content is missing
        const bodyText = await page.textContent('body');
        if (!bodyText || bodyText.trim().length < 100) {
          console.log('🚨 PAGE WENT BLANK! Body text length:', bodyText ? bodyText.length : 0);
        } else {
          console.log('✅ Page still has content. Body text length:', bodyText.length);
        }
        
      } else {
        console.log('❌ Run Backtesting button not found');
        
        // Show all buttons for debugging
        console.log('📋 All buttons found:');
        for (let i = 0; i < runButtons.length; i++) {
          const text = await runButtons[i].textContent();
          console.log(`  ${i + 1}. "${text}"`);
        }
      }
      
    } else {
      console.log('❌ Strategy dropdown not found');
    }
    
    console.log('\n📝 Console Messages Summary:');
    consoleMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg}`);
    });
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(error.stack);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Run Backtesting test completed');
}

testRunBacktesting();