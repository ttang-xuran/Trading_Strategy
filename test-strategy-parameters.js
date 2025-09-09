import { chromium } from 'playwright';

async function testStrategyParameters() {
  console.log('🔄 Testing Strategy Parameters functionality...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', err => {
      console.log(`❌ PAGE ERROR: ${err.message}`);
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-94wulftfr-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'params-test-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'params-test-after-login.png', fullPage: true });
    }
    
    // Select Trend Following with Risk MGT strategy
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
      await page.screenshot({ path: 'params-test-strategy-selected.png', fullPage: true });
      
      // Now test parameter modification
      console.log('🔧 Testing parameter modification...');
      
      // Test SMA Fast Length parameter
      console.log('📊 Testing SMA Fast Length parameter...');
      const smaFastInput = await page.locator('input[type="number"]').first();
      
      if (await smaFastInput.isVisible({ timeout: 2000 })) {
        console.log('✅ Found SMA Fast Length input field');
        
        // Get current value
        const currentValue = await smaFastInput.inputValue();
        console.log(`📋 Current SMA Fast Length: ${currentValue}`);
        
        // Try to change it
        await smaFastInput.clear();
        await smaFastInput.fill('60');
        await page.waitForTimeout(1000);
        
        // Verify the change
        const newValue = await smaFastInput.inputValue();
        console.log(`📝 New SMA Fast Length: ${newValue}`);
        
        if (newValue === '60') {
          console.log('✅ SUCCESS: SMA Fast Length parameter can be modified');
        } else {
          console.log('❌ FAILED: SMA Fast Length parameter modification failed');
        }
        
        await page.screenshot({ path: 'params-test-after-sma-change.png', fullPage: true });
        
      } else {
        console.log('❌ SMA Fast Length input field not found or not visible');
      }
      
      // Test other parameter fields
      console.log('🔍 Looking for all parameter input fields...');
      const allInputs = await page.locator('input[type="number"]').all();
      console.log(`📊 Found ${allInputs.length} number input fields`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        if (await input.isVisible()) {
          const value = await input.inputValue();
          const placeholder = await input.getAttribute('placeholder');
          console.log(`📋 Input ${i + 1}: value="${value}", placeholder="${placeholder}"`);
          
          // Test if we can modify this input
          try {
            await input.clear();
            await input.fill('999');
            await page.waitForTimeout(500);
            const testValue = await input.inputValue();
            console.log(`📝 Test modification result: "${testValue}"`);
            
            // Restore original value
            await input.clear();
            await input.fill(value);
          } catch (error) {
            console.log(`❌ Error modifying input ${i + 1}: ${error.message}`);
          }
        }
      }
      
      // Test Run Backtest button with modified parameters
      console.log('🚀 Testing Run Backtest with modified parameters...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      
      if (await runButton.isVisible({ timeout: 2000 })) {
        console.log('✅ Run Backtest button found');
        await runButton.click();
        
        console.log('⏳ Waiting for backtest execution (10 seconds)...');
        await page.waitForTimeout(10000);
        
        await page.screenshot({ path: 'params-test-after-backtest.png', fullPage: true });
        
        // Check if results appeared
        const performanceMetrics = await page.locator('text="Total Return"').first();
        if (await performanceMetrics.isVisible({ timeout: 3000 })) {
          console.log('✅ SUCCESS: Backtest executed with parameter modifications');
        } else {
          console.log('❌ FAILED: Backtest did not complete or show results');
        }
        
      } else {
        console.log('❌ Run Backtest button not found or not visible');
      }
      
    } else {
      console.log('❌ Strategy dropdown not found');
      await page.screenshot({ path: 'params-test-no-strategy.png', fullPage: true });
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'params-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Strategy Parameters test completed');
}

testStrategyParameters();