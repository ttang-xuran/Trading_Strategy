import { chromium } from 'playwright';

async function testProductionStrategy() {
  console.log('🔄 Testing "Trend Following with Risk MGT" strategy on production...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 Console Error:', msg.text());
      }
    });
    
    console.log('🌐 Navigating to production URL...');
    await page.goto('https://trading-strategy-97rvu9y7z-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'prod-initial.png', fullPage: true });
    
    // Login with provided credentials
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    if (await loginForm.isVisible({ timeout: 3000 })) {
      // Try with lowercase tony first
      const credentialPairs = [
        ['tony', '123'],
        ['Tony', '123'],
        ['admin', 'password123'],
        ['admin', 'admin']
      ];
      
      let loginSuccessful = false;
      
      for (const [username, password] of credentialPairs) {
        console.log(`🔐 Trying credentials: ${username} / ${password}`);
        
        // Clear and fill form
        await loginForm.fill('');
        await passwordInput.fill('');
        await loginForm.fill(username);
        await passwordInput.fill(password);
        await loginButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check if login succeeded by looking for main content or absence of error
        const hasErrorMessage = await page.locator(':has-text("Invalid username or password")').first().isVisible({ timeout: 2000 }).catch(() => false);
        const isLoggedIn = await page.locator('select, .chart-container, canvas').first().isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isLoggedIn && !hasErrorMessage) {
          console.log('✅ Login successful!');
          loginSuccessful = true;
          break;
        } else if (hasErrorMessage) {
          console.log('❌ Invalid credentials, trying next...');
        } else {
          console.log('⚠️ Login status unclear, trying next...');
        }
      }
      
      if (!loginSuccessful) {
        console.log('❌ All login attempts failed');
        await page.screenshot({ path: 'prod-login-failed.png', fullPage: true });
        return;
      }
      
      // Wait for login and main app to load
      console.log('⏳ Waiting for main app to load...');
      try {
        await page.waitForSelector('select, .chart-container, canvas', { timeout: 10000 });
        console.log('✅ Main app loaded successfully');
      } catch (e) {
        console.log('⚠️ Main app load timeout, continuing anyway...');
      }
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'prod-after-login.png', fullPage: true });
    }
    
    // Find strategy dropdown
    console.log('🔍 Looking for strategy dropdown...');
    const selectElements = await page.locator('select').all();
    console.log(`Found ${selectElements.length} select elements`);
    
    let strategySelect = null;
    
    for (let i = 0; i < selectElements.length; i++) {
      const select = selectElements[i];
      const options = await select.locator('option').all();
      
      // Check if this dropdown contains strategy options
      for (const option of options) {
        const text = await option.textContent();
        if (text && (text.includes('Breakout') || text.includes('Trend Following'))) {
          strategySelect = select;
          console.log(`✅ Found strategy dropdown at index ${i + 1}!`);
          break;
        }
      }
      if (strategySelect) break;
    }
    
    if (strategySelect) {
      // Get all strategy options
      const options = await strategySelect.locator('option').all();
      console.log(`📋 Found ${options.length} strategy options:`);
      
      let hasTrendFollowingRiskMgt = false;
      let isEnabled = false;
      
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const text = await option.textContent();
        const value = await option.getAttribute('value');
        const disabled = await option.getAttribute('disabled');
        
        console.log(`  ${i + 1}. "${text}" (value: ${value}, disabled: ${disabled !== null})`);
        
        if (text && text.includes('Trend Following with Risk MGT')) {
          hasTrendFollowingRiskMgt = true;
          isEnabled = disabled === null;
          console.log(`🎯 Found "Trend Following with Risk MGT" - Enabled: ${isEnabled}`);
        }
      }
      
      if (hasTrendFollowingRiskMgt && isEnabled) {
        console.log('✅ Selecting "Trend Following with Risk MGT"...');
        
        try {
          await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
          console.log('✅ Strategy selected successfully!');
          
          // Wait for strategy to process
          console.log('⏳ Waiting for strategy processing...');
          await page.waitForTimeout(5000);
          
          // Take screenshot after selection
          await page.screenshot({ path: 'prod-strategy-selected.png', fullPage: true });
          
          // Check for any error messages on page
          const errorElements = await page.locator('.error, [class*="error"], .alert-danger, [role="alert"]').all();
          console.log(`Found ${errorElements.length} potential error elements`);
          
          for (let i = 0; i < errorElements.length; i++) {
            const errorText = await errorElements[i].textContent();
            if (errorText && errorText.trim()) {
              console.log(`🚨 Error message ${i + 1}: "${errorText.trim()}"`);
            }
          }
          
          // Check if trades are generated
          const tradeElements = await page.locator('[class*="trade"], .trade-list, table tr').all();
          console.log(`📊 Found ${tradeElements.length} potential trade elements`);
          
          // Check if chart is visible
          const chartElements = await page.locator('canvas, svg, .chart-container, [class*="chart"]').all();
          console.log(`📈 Found ${chartElements.length} potential chart elements`);
          
          // Check for performance metrics
          const metricsElements = await page.locator('[class*="metric"], .metric, .performance').all();
          console.log(`📈 Found ${metricsElements.length} potential metrics elements`);
          
          // Look for specific text that might indicate the issue
          const pageText = await page.textContent('body');
          if (pageText.includes('not yet implemented')) {
            console.log('🚨 Found "not yet implemented" message');
          }
          if (pageText.includes('error')) {
            console.log('🚨 Found "error" text on page');
          }
          
          // Wait a bit longer to see if anything loads
          console.log('⏳ Waiting additional time for data to load...');
          await page.waitForTimeout(10000);
          
          // Take final screenshot
          await page.screenshot({ path: 'prod-final-result.png', fullPage: true });
          
          console.log('✅ Test completed - check screenshots for results');
          
        } catch (error) {
          console.log(`❌ Error testing strategy: ${error.message}`);
          await page.screenshot({ path: 'prod-error.png', fullPage: true });
        }
      } else if (hasTrendFollowingRiskMgt) {
        console.log('❌ Strategy found but is disabled');
      } else {
        console.log('❌ Strategy not found in dropdown');
      }
    } else {
      console.log('❌ Strategy dropdown not found');
      await page.screenshot({ path: 'prod-no-dropdown.png', fullPage: true });
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(error.stack);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Production test completed');
}

testProductionStrategy();