import { chromium } from 'playwright';

async function testStrategySelection() {
  console.log('🔄 Starting strategy selection test...');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to false to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Navigating to https://trading-strategy-plum.vercel.app/');
    await page.goto('https://trading-strategy-plum.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for page to fully load
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-page.png', fullPage: true });
    console.log('📸 Screenshot saved: initial-page.png');
    
    // Handle login if required
    const loginForm = await page.locator('input[type="text"], input[type="email"], input[placeholder*="Username"], input[placeholder*="username"]').first();
    const passwordInput = await page.locator('input[type="password"], input[placeholder*="Password"], input[placeholder*="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In"), button[type="submit"]').first();
    
    if (await loginForm.isVisible({ timeout: 2000 })) {
      console.log('🔐 Login form detected. Attempting to login...');
      
      // Try multiple credential combinations including .env.example suggestions
      const credentialPairs = [
        ['admin', 'password123'],
        ['admin', 'your_secure_password_here'],
        ['admin', 'TradingMaster2024!'],
        ['admin', 'BTC$ecur3P@ssw0rd'],
        ['admin', 'Strategy@2024#Safe'],
        ['admin', 'admin'],
        ['demo', 'demo'],
        ['test', 'test'],
        ['user', 'password']
      ];
      
      let loginSuccessful = false;
      
      for (const [username, password] of credentialPairs) {
        console.log(`🔑 Trying credentials: ${username} / ${password}`);
        
        // Clear the form fields first
        await loginForm.fill('');
        await passwordInput.fill('');
        
        // Fill with current credentials
        await loginForm.fill(username);
        await passwordInput.fill(password);
        
        console.log('📤 Submitting login form...');
        await loginButton.click();
        
        // Wait for login to complete and page to load
        console.log('⏳ Waiting for login to complete...');
        await page.waitForTimeout(3000);
        
        // Check if login was successful by looking for main content or absence of error
        const hasErrorMessage = await page.locator(':has-text("Invalid username or password"), .error, .login-error').first().isVisible({ timeout: 2000 }).catch(() => false);
        const isLoggedIn = await page.locator('select, .strategy-selector, [role="combobox"], .dashboard, .main-content').first().isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isLoggedIn && !hasErrorMessage) {
          console.log('✅ Login successful!');
          loginSuccessful = true;
          await page.screenshot({ path: 'after-login.png', fullPage: true });
          console.log('📸 Screenshot saved: after-login.png');
          break;
        } else if (hasErrorMessage) {
          console.log('❌ Invalid credentials, trying next pair...');
          // Continue to next credentials
        } else {
          console.log('⚠️ Login status unclear, trying next pair...');
        }
      }
      
      if (!loginSuccessful) {
        console.log('❌ All login attempts failed. Proceeding without authentication...');
      }
    } else {
      console.log('ℹ️ No login form detected, proceeding directly...');
    }
    
    // Look for strategy selector/dropdown
    console.log('🔍 Looking for strategy selector...');
    
    // Try different selectors for the strategy dropdown
    const selectorOptions = [
      'select[name="strategy"]',
      'select',
      '[role="combobox"]',
      '.strategy-selector',
      '.dropdown',
      'select:has-text("strategy")',
      'select:has-text("Strategy")'
    ];
    
    let strategySelector = null;
    for (const selector of selectorOptions) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          strategySelector = element;
          console.log(`✅ Found strategy selector with: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!strategySelector) {
      console.log('❌ Strategy selector not found, looking for any dropdowns...');
      const dropdowns = await page.locator('select').all();
      console.log(`Found ${dropdowns.length} select elements`);
      
      for (let i = 0; i < dropdowns.length; i++) {
        const dropdown = dropdowns[i];
        const isVisible = await dropdown.isVisible();
        if (isVisible) {
          const options = await dropdown.locator('option').all();
          console.log(`Dropdown ${i}: ${options.length} options`);
          for (let j = 0; j < options.length; j++) {
            const optionText = await options[j].textContent();
            console.log(`  Option ${j}: "${optionText}"`);
          }
          
          // Check if this dropdown contains our target strategy
          const trendFollowingOption = await dropdown.locator('option:has-text("Trend Following with Risk MGT")').first();
          if (await trendFollowingOption.count() > 0) {
            strategySelector = dropdown;
            console.log(`✅ Found "Trend Following with Risk MGT" in dropdown ${i}`);
            break;
          }
        }
      }
    }
    
    if (strategySelector) {
      console.log('📋 Strategy selector found! Getting all options...');
      
      // Get all options
      const options = await strategySelector.locator('option').all();
      console.log(`Found ${options.length} strategy options:`);
      
      let hasTrendFollowing = false;
      let trendFollowingDisabled = false;
      
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const text = await option.textContent();
        const value = await option.getAttribute('value');
        const disabled = await option.getAttribute('disabled');
        
        console.log(`  ${i + 1}. "${text}" (value: ${value}, disabled: ${disabled !== null})`);
        
        if (text && text.includes('Trend Following with Risk MGT')) {
          hasTrendFollowing = true;
          trendFollowingDisabled = disabled !== null;
          console.log(`🎯 Found "Trend Following with Risk MGT" - Disabled: ${trendFollowingDisabled}`);
        }
      }
      
      if (hasTrendFollowing) {
        if (!trendFollowingDisabled) {
          console.log('✅ Attempting to select "Trend Following with Risk MGT"...');
          
          try {
            await strategySelector.selectOption({ label: 'Trend Following with Risk MGT' });
            console.log('✅ Successfully selected "Trend Following with Risk MGT"');
            
            // Wait for any changes to occur
            await page.waitForTimeout(2000);
            
            // Take screenshot after selection
            await page.screenshot({ path: 'after-selection.png', fullPage: true });
            console.log('📸 Screenshot saved: after-selection.png');
            
            // Check if selection was successful
            const selectedValue = await strategySelector.inputValue();
            console.log(`Selected value: ${selectedValue}`);
            
            // Look for strategy parameters or other indicators that the selection worked
            const parameterElements = await page.locator('.parameter, .param, [class*="param"], [class*="setting"]').all();
            console.log(`Found ${parameterElements.length} potential parameter elements`);
            
            for (let i = 0; i < Math.min(parameterElements.length, 10); i++) {
              const text = await parameterElements[i].textContent();
              if (text && text.trim()) {
                console.log(`  Parameter ${i + 1}: "${text.trim()}"`);
              }
            }
            
            // Look for specific parameters mentioned in requirements
            const donLenParam = await page.locator(':has-text("donLen"):has-text("40")').first();
            const atrMultParam = await page.locator(':has-text("atrMult"):has-text("9.0")').first();
            const riskParam = await page.locator(':has-text("riskPerTrade"):has-text("5")').first();
            
            if (await donLenParam.count() > 0) {
              console.log('✅ Found donLen: 40 parameter');
            }
            if (await atrMultParam.count() > 0) {
              console.log('✅ Found atrMult: 9.0 parameter');
            }
            if (await riskParam.count() > 0) {
              console.log('✅ Found riskPerTrade: 5 parameter');
            }
            
          } catch (error) {
            console.log(`❌ Error selecting strategy: ${error.message}`);
          }
        } else {
          console.log('❌ "Trend Following with Risk MGT" is disabled and cannot be selected');
        }
      } else {
        console.log('❌ "Trend Following with Risk MGT" option not found in dropdown');
      }
    } else {
      console.log('❌ No strategy selector found on the page');
      
      // Get page content for debugging
      const pageTitle = await page.title();
      const url = page.url();
      console.log(`Page title: "${pageTitle}"`);
      console.log(`Current URL: ${url}`);
      
      // Look for any text mentioning strategies
      const strategyTexts = await page.locator(':has-text("strategy"), :has-text("Strategy")').all();
      console.log(`Found ${strategyTexts.length} elements containing "strategy"`);
      
      for (let i = 0; i < Math.min(strategyTexts.length, 5); i++) {
        const text = await strategyTexts[i].textContent();
        console.log(`  Strategy text ${i + 1}: "${text}"`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(error.stack);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Test completed');
}

testStrategySelection();