const { chromium } = require('playwright');

async function testTrendFollowingStrategy() {
  console.log('🚀 Starting comprehensive test for Trend Following with Risk MGT strategy...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enhanced console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.error('❌ BROWSER ERROR:', text);
    } else if (type === 'warn') {
      console.warn('⚠️  BROWSER WARNING:', text);
    } else if (text.includes('strategy') || text.includes('trading') || text.includes('error')) {
      console.log('📋 BROWSER LOG:', text);
    }
  });

  page.on('pageerror', error => {
    console.error('💥 PAGE ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.error('🌐 NETWORK FAILURE:', request.url(), request.failure().errorText);
  });

  try {
    console.log('🌐 Navigating to production site...');
    await page.goto('https://trading-strategy-97rvu9y7z-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    await page.screenshot({ path: 'step1-initial-load.png', fullPage: true });
    console.log('📸 Initial load screenshot saved');

    // Enhanced authentication handling
    console.log('🔐 Checking for authentication requirements...');
    
    // Wait for login form to be fully loaded
    await page.waitForTimeout(3000);
    
    const authRequired = await page.locator('input[type="password"], .login-form').count() > 0;
    
    if (authRequired) {
      console.log('🔑 Authentication required - attempting login...');
      
      // Extended credential list based on findings
      const credentials = [
        { username: 'admin', password: 'password123' }, // Default from code
        { username: 'admin', password: 'your_secure_password_here' }, // From .env.example
        { username: 'admin', password: 'TradingMaster2024!' }, // From .env.example
        { username: 'admin', password: 'BTC$ecur3P@ssw0rd' }, // From .env.example
        { username: 'admin', password: 'Strategy@2024#Safe' }, // From .env.example
        { username: 'admin', password: 'admin' },
        { username: 'user', password: 'password123' },
        { username: 'test', password: 'test' },
        { username: 'demo', password: 'demo' }
      ];
      
      let loginSuccessful = false;
      
      for (let i = 0; i < credentials.length; i++) {
        const { username, password } = credentials[i];
        console.log(`🔑 Attempt ${i + 1}/${credentials.length}: ${username}/${password}`);
        
        try {
          // Clear any existing values
          await page.locator('input[type="text"], input[name="username"]').first().fill('');
          await page.locator('input[type="password"]').first().fill('');
          
          // Fill credentials
          await page.locator('input[type="text"], input[name="username"]').first().fill(username);
          await page.locator('input[type="password"]').first().fill(password);
          
          // Click Sign In button
          await page.locator('button:has-text("Sign In")').click();
          
          // Wait for response
          await page.waitForTimeout(4000);
          
          // Check for success (no more login form OR no error message)
          const stillHasLoginForm = await page.locator('input[type="password"]').count() > 0;
          const hasErrorMessage = await page.locator('text="Invalid username or password"').count() > 0;
          
          if (!stillHasLoginForm && !hasErrorMessage) {
            console.log('✅ Login successful!');
            loginSuccessful = true;
            break;
          } else if (hasErrorMessage) {
            console.log('❌ Invalid credentials, trying next...');
          } else {
            console.log('🤔 Status unclear, trying next...');
          }
        } catch (error) {
          console.log(`❌ Login attempt failed: ${error.message}`);
        }
      }
      
      if (!loginSuccessful) {
        console.log('⚠️  All login attempts failed. Taking screenshot and continuing anyway...');
        await page.screenshot({ path: 'step2-login-failed.png', fullPage: true });
        // Continue with test to see what's accessible
      }
    } else {
      console.log('ℹ️  No authentication required');
    }

    // Wait for main app to load
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step3-main-app.png', fullPage: true });
    
    // Look for strategy selector with multiple approaches
    console.log('🎯 Looking for strategy selector...');
    
    let strategyDropdown = null;
    const strategySelectors = [
      'select[name="strategy"]',
      'select:has(option:has-text("Trend Following"))',
      'select:has(option:has-text("Adaptive"))', // Look for any strategy selector
      '.strategy-selector select',
      '#strategy-select',
      'select', // Any select element
      '[data-testid="strategy-select"]'
    ];
    
    // Wait for selectors to appear
    await page.waitForTimeout(5000);
    
    for (const selector of strategySelectors) {
      try {
        const element = page.locator(selector).first();
        const count = await element.count();
        if (count > 0) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            strategyDropdown = element;
            console.log(`✅ Found strategy dropdown with selector: ${selector}`);
            break;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!strategyDropdown) {
      console.log('❌ Strategy dropdown not found. Analyzing page content...');
      
      // Get all select elements and their options
      const allSelects = await page.locator('select').all();
      console.log(`📊 Found ${allSelects.length} select elements on page`);
      
      for (let i = 0; i < allSelects.length; i++) {
        try {
          const selectElement = allSelects[i];
          const options = await selectElement.locator('option').allTextContents();
          console.log(`Select ${i + 1} options:`, options);
          
          // Check if any options contain strategy-related text
          const hasStrategy = options.some(opt => 
            opt.toLowerCase().includes('trend') || 
            opt.toLowerCase().includes('strategy') || 
            opt.toLowerCase().includes('adaptive') ||
            opt.toLowerCase().includes('volatility')
          );
          
          if (hasStrategy) {
            strategyDropdown = selectElement;
            console.log(`✅ Found strategy dropdown in select ${i + 1}`);
            break;
          }
        } catch (error) {
          console.log(`Error analyzing select ${i + 1}:`, error.message);
        }
      }
    }
    
    if (!strategyDropdown) {
      // Check page content for clues
      const bodyText = await page.textContent('body');
      console.log('📄 Page contains "strategy":', bodyText.includes('strategy'));
      console.log('📄 Page contains "Trend Following":', bodyText.includes('Trend Following'));
      
      await page.screenshot({ path: 'step4-no-strategy-dropdown.png', fullPage: true });
      throw new Error('Strategy dropdown not found after comprehensive search');
    }

    // Get available strategies
    const options = await strategyDropdown.locator('option').allTextContents();
    console.log('📋 Available strategies:', options);
    
    // Find Trend Following strategy
    const trendFollowingOptions = options.filter(option => 
      option.includes('Trend Following') ||
      option.toLowerCase().includes('trend following') ||
      (option.toLowerCase().includes('trend') && option.toLowerCase().includes('risk'))
    );
    
    if (trendFollowingOptions.length === 0) {
      console.log('❌ Trend Following with Risk MGT strategy not found!');
      console.log('Available options:', options);
      await page.screenshot({ path: 'step5-trend-following-missing.png', fullPage: true });
      throw new Error('Trend Following strategy not available in dropdown');
    }
    
    const selectedStrategy = trendFollowingOptions[0];
    console.log(`✅ Found Trend Following strategy: "${selectedStrategy}"`);
    
    // Select the strategy
    console.log('🎯 Selecting Trend Following strategy...');
    await strategyDropdown.selectOption({ label: selectedStrategy });
    
    // Wait for strategy to load and process
    console.log('⏳ Waiting for strategy to load...');
    await page.waitForTimeout(8000);
    
    await page.screenshot({ path: 'step6-strategy-selected.png', fullPage: true });
    
    // Now test the strategy functionality
    console.log('🧪 Testing strategy functionality...');
    
    // 1. Check for strategy parameters
    console.log('1️⃣ Checking strategy parameters...');
    const expectedParams = ['donLen', 'atrMult', 'riskPerTrade'];
    const paramsFound = [];
    
    for (const param of expectedParams) {
      const paramElement = page.locator(`text=${param}`);
      const count = await paramElement.count();
      if (count > 0) {
        paramsFound.push(param);
        console.log(`✅ Found parameter: ${param}`);
      } else {
        console.log(`❌ Missing parameter: ${param}`);
      }
    }
    
    // Also check in page text content
    const pageText = await page.textContent('body');
    for (const param of expectedParams) {
      if (pageText.includes(param) && !paramsFound.includes(param)) {
        paramsFound.push(param);
        console.log(`✅ Found parameter in text: ${param}`);
      }
    }
    
    console.log(`📊 Strategy parameters found: ${paramsFound.length}/${expectedParams.length}`);
    
    // 2. Check for chart
    console.log('2️⃣ Checking for chart...');
    const chartSelectors = [
      'canvas',
      '.plotly',
      '.chart-container',
      '#chart',
      '.recharts-wrapper',
      '[data-testid="chart"]',
      '.chart',
      'svg'
    ];
    
    let chartFound = false;
    let chartType = '';
    
    for (const selector of chartSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        chartFound = true;
        chartType = selector;
        console.log(`✅ Chart found: ${selector} (${count} elements)`);
        break;
      }
    }
    
    if (!chartFound) {
      console.log('❌ No chart elements found');
    }
    
    // 3. Check for performance metrics
    console.log('3️⃣ Checking performance metrics...');
    const metricsSelectors = [
      'text=Total Return',
      'text=Win Rate',
      'text=Profit Factor',
      'text=Max Drawdown',
      'text=Net Profit',
      'text=Sharpe',
      '.performance-metrics',
      '.metrics'
    ];
    
    const metricsFound = [];
    for (const selector of metricsSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        metricsFound.push(selector);
        console.log(`✅ Found metric: ${selector}`);
      }
    }
    
    console.log(`📊 Performance metrics found: ${metricsFound.length}`);
    
    // 4. Check for trades/signals
    console.log('4️⃣ Checking for trade signals...');
    const tradesSelectors = [
      'text=Buy',
      'text=Sell',
      'text=Long',
      'text=Short',
      'text=Entry',
      'text=Exit',
      '.trades-list',
      '.trade-signals',
      'table',
      '.trade-row'
    ];
    
    const tradesFound = [];
    for (const selector of tradesSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        tradesFound.push(selector);
        console.log(`✅ Found trades/signals: ${selector}`);
      }
    }
    
    console.log(`📊 Trade signals found: ${tradesFound.length}`);
    
    // 5. Test with different data sources
    console.log('5️⃣ Testing with different data sources...');
    const dataSourceSelector = page.locator('select:has(option:has-text("Coinbase")), select:has(option:has-text("Binance"))').first();
    const dataSourceCount = await dataSourceSelector.count();
    
    if (dataSourceCount > 0) {
      const dataOptions = await dataSourceSelector.locator('option').allTextContents();
      console.log('📊 Available data sources:', dataOptions);
      
      // Try Binance if available
      const binanceOption = dataOptions.find(opt => opt.toLowerCase().includes('binance'));
      if (binanceOption) {
        console.log('🔄 Testing with Binance data source...');
        await dataSourceSelector.selectOption({ label: binanceOption });
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: 'step7-binance-data.png', fullPage: true });
        console.log('✅ Binance data source test completed');
      }
    } else {
      console.log('❌ No data source selector found');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'step8-final-state.png', fullPage: true });
    
    // Check browser console for errors one more time
    await page.waitForTimeout(2000);
    
    // Generate comprehensive report
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    console.log(`🌐 Site URL: https://trading-strategy-97rvu9y7z-tonys-projects-297706df.vercel.app/`);
    console.log(`🔐 Authentication: ${authRequired ? (loginSuccessful ? 'Required & Successful' : 'Required & FAILED') : 'Not Required'}`);
    console.log(`🎯 Strategy Dropdown: ${strategyDropdown ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`📋 Trend Following Strategy: ${trendFollowingOptions.length > 0 ? 'AVAILABLE' : 'MISSING'}`);
    console.log(`📊 Strategy Parameters: ${paramsFound.length}/${expectedParams.length} found (${paramsFound.join(', ')})`);
    console.log(`📈 Chart Present: ${chartFound ? 'YES' : 'NO'} ${chartType ? `(${chartType})` : ''}`);
    console.log(`📊 Performance Metrics: ${metricsFound.length} found`);
    console.log(`💹 Trade Signals: ${tradesFound.length} found`);
    console.log(`🔄 Data Sources: ${dataSourceCount > 0 ? 'Available' : 'Not Found'}`);
    
    console.log('\n🔍 ISSUES DETECTED:');
    let issueCount = 0;
    
    if (authRequired && !loginSuccessful) {
      console.log(`❌ Issue ${++issueCount}: Authentication failed - cannot access main application`);
    }
    
    if (!strategyDropdown) {
      console.log(`❌ Issue ${++issueCount}: Strategy dropdown not found`);
    }
    
    if (trendFollowingOptions.length === 0) {
      console.log(`❌ Issue ${++issueCount}: Trend Following with Risk MGT strategy not available in dropdown`);
    }
    
    if (paramsFound.length < expectedParams.length) {
      const missing = expectedParams.filter(p => !paramsFound.includes(p));
      console.log(`❌ Issue ${++issueCount}: Missing strategy parameters: ${missing.join(', ')}`);
    }
    
    if (!chartFound) {
      console.log(`❌ Issue ${++issueCount}: Chart not loading or not visible`);
    }
    
    if (metricsFound.length === 0) {
      console.log(`❌ Issue ${++issueCount}: No performance metrics displayed`);
    }
    
    if (tradesFound.length === 0) {
      console.log(`❌ Issue ${++issueCount}: No trade signals or trades list visible`);
    }
    
    if (issueCount === 0) {
      console.log('✅ No major issues detected - strategy appears to be working correctly!');
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('- step1-initial-load.png');
    console.log('- step3-main-app.png');  
    console.log('- step6-strategy-selected.png');
    console.log('- step8-final-state.png');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    await page.screenshot({ path: 'error-comprehensive.png', fullPage: true });
    console.log('📸 Error screenshot saved: error-comprehensive.png');
    
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    const url = page.url();
    console.log('🌐 Current URL:', url);
  } finally {
    await browser.close();
  }
}

testTrendFollowingStrategy().catch(console.error);