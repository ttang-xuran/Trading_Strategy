import { chromium } from 'playwright';

async function testLocalStrategy() {
  console.log('🔄 Testing strategy selection on localhost...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Navigating to http://localhost:3000/');
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for page load
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'localhost-initial.png', fullPage: true });
    
    // Login with default credentials
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    if (await loginForm.isVisible({ timeout: 2000 })) {
      console.log('🔐 Logging in with default credentials...');
      await loginForm.fill('admin');
      await passwordInput.fill('password123');
      await loginButton.click();
      
      // Wait for login and main app to load
      console.log('⏳ Waiting for main app to load after login...');
      try {
        // Wait for the main content to appear (charts, dropdowns, etc.)
        await page.waitForSelector('select, .chart-container, canvas', { timeout: 10000 });
        console.log('✅ Main app loaded successfully');
      } catch (e) {
        console.log('⚠️ Main app might not have loaded, continuing anyway...');
      }
      
      await page.screenshot({ path: 'localhost-after-login.png', fullPage: true });
    }
    
    // Look for strategy dropdown - need to find the right one
    console.log('🔍 Looking for strategy dropdown...');
    
    // Get all select elements and check each one
    const selectElements = await page.locator('select').all();
    console.log(`Found ${selectElements.length} select elements, checking each one...`);
    
    let strategySelect = null;
    
    for (let i = 0; i < selectElements.length; i++) {
      const select = selectElements[i];
      const options = await select.locator('option').all();
      
      console.log(`Select ${i + 1}: ${options.length} options`);
      
      // Check if this dropdown contains strategy options
      let hasStrategyOptions = false;
      for (const option of options) {
        const text = await option.textContent();
        if (text && (text.includes('Breakout') || text.includes('Trend Following') || text.includes('Strategy'))) {
          hasStrategyOptions = true;
          break;
        }
      }
      
      if (hasStrategyOptions) {
        strategySelect = select;
        console.log(`✅ Found strategy dropdown at index ${i + 1}!`);
        break;
      } else {
        // Log what this dropdown contains
        const sampleOptions = [];
        for (let j = 0; j < Math.min(options.length, 3); j++) {
          const text = await options[j].textContent();
          sampleOptions.push(text);
        }
        console.log(`  Select ${i + 1} contains: [${sampleOptions.join(', ')}]`);
      }
    }
    
    if (strategySelect) {
      console.log('✅ Found strategy dropdown!');
      
      // Get all options
      const options = await strategySelect.locator('option').all();
      console.log(`Found ${options.length} strategy options:`);
      
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
        console.log('✅ Attempting to select "Trend Following with Risk MGT"...');
        
        try {
          await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
          console.log('✅ Successfully selected the strategy!');
          
          // Wait for changes
          await page.waitForTimeout(2000);
          
          // Take screenshot after selection
          await page.screenshot({ path: 'localhost-after-selection.png', fullPage: true });
          
          // Check current selection
          const selectedValue = await strategySelect.inputValue();
          console.log(`✅ Current selection: ${selectedValue}`);
          
          if (selectedValue === 'trend-following-risk-mgt') {
            console.log('🎉 SUCCESS: Strategy selection confirmed!');
          }
          
        } catch (error) {
          console.log(`❌ Error selecting strategy: ${error.message}`);
        }
      } else if (hasTrendFollowingRiskMgt) {
        console.log('❌ Strategy found but is disabled');
      } else {
        console.log('❌ Strategy not found in options');
      }
    } else {
      console.log('❌ Strategy dropdown not found');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Local test completed');
}

testLocalStrategy();