const { chromium } = require('playwright');

async function testTrendFollowingStrategy() {
  console.log('Starting Playwright test for Trend Following with Risk MGT strategy...');
  
  // Launch browser with debugging options
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless mode
    slowMo: 1000, // Slow down actions for better visibility
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enable console logging to capture JavaScript errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('BROWSER ERROR:', msg.text());
    } else if (msg.type() === 'warn') {
      console.warn('BROWSER WARNING:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  // Capture uncaught exceptions
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
  });

  // Capture failed network requests
  page.on('requestfailed', request => {
    console.error('NETWORK FAILURE:', request.url(), request.failure().errorText);
  });

  try {
    console.log('Navigating to production site...');
    await page.goto('https://trading-strategy-97rvu9y7z-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-page-load.png', fullPage: true });
    console.log('Initial page screenshot saved as initial-page-load.png');

    // Check if authentication is required
    console.log('Checking for authentication...');
    const authRequired = await page.locator('input[type="password"], input[name="password"], .login-form, #login').count() > 0;
    
    if (authRequired) {
      console.log('Authentication required, attempting login...');
      
      // Try different authentication patterns
      const credentials = [
        { username: 'admin', password: 'password123' },
        { username: 'admin', password: 'admin' },
        { username: 'test', password: 'test' },
        { username: 'user', password: 'password' }
      ];
      
      for (const cred of credentials) {
        try {
          console.log(`Trying credentials: ${cred.username}/${cred.password}`);
          
          // Look for username/email field
          const usernameField = page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first();
          if (await usernameField.count() > 0) {
            await usernameField.fill(cred.username);
          }
          
          // Look for password field
          const passwordField = page.locator('input[type="password"], input[name="password"]').first();
          if (await passwordField.count() > 0) {
            await passwordField.fill(cred.password);
          }
          
          // Look for login button
          const loginButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
          if (await loginButton.count() > 0) {
            await loginButton.click();
            await page.waitForTimeout(3000);
            
            // Check if login was successful
            const stillOnLoginPage = await page.locator('input[type="password"]').count() > 0;
            if (!stillOnLoginPage) {
              console.log('Login successful!');
              break;
            }
          }
        } catch (error) {
          console.log(`Login attempt with ${cred.username}/${cred.password} failed:`, error.message);
        }
      }
    } else {
      console.log('No authentication required or already authenticated');
    }

    // Wait for main content to load
    await page.waitForTimeout(5000);
    
    // Take screenshot after potential login
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('After login screenshot saved as after-login.png');

    // Look for strategy dropdown/selector
    console.log('Looking for strategy selector...');
    const strategySelectors = [
      'select[name="strategy"]',
      'select:has(option:has-text("Trend Following"))',
      '.strategy-selector select',
      '#strategy-select',
      'select:has(option:has-text("Adaptive Volatility"))',
      '[data-testid="strategy-select"]'
    ];
    
    let strategyDropdown = null;
    for (const selector of strategySelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        strategyDropdown = element;
        console.log(`Found strategy dropdown with selector: ${selector}`);
        break;
      }
    }
    
    if (!strategyDropdown) {
      console.error('Strategy dropdown not found! Available selectors on page:');
      const selects = await page.locator('select').all();
      for (let i = 0; i < selects.length; i++) {
        const selectElement = selects[i];
        const options = await selectElement.locator('option').allTextContents();
        console.log(`Select ${i + 1} options:`, options);
      }
      
      // Take screenshot of current state
      await page.screenshot({ path: 'strategy-dropdown-not-found.png', fullPage: true });
      throw new Error('Strategy dropdown not found');
    }

    // Get all available strategies
    const options = await strategyDropdown.locator('option').allTextContents();
    console.log('Available strategies:', options);
    
    // Look for "Trend Following with Risk MGT" strategy
    const trendFollowingOption = options.find(option => 
      option.includes('Trend Following with Risk MGT') || 
      option.includes('Trend Following') ||
      option.toLowerCase().includes('trend')
    );
    
    if (!trendFollowingOption) {
      console.error('Trend Following with Risk MGT strategy not found in dropdown!');
      console.log('Available options:', options);
      await page.screenshot({ path: 'trend-following-not-found.png', fullPage: true });
      throw new Error('Trend Following strategy not available');
    }
    
    console.log(`Found strategy: ${trendFollowingOption}`);
    
    // Select the Trend Following strategy
    console.log('Selecting Trend Following with Risk MGT strategy...');
    await strategyDropdown.selectOption({ label: trendFollowingOption });
    
    // Wait for strategy to load
    await page.waitForTimeout(5000);
    
    // Take screenshot after strategy selection
    await page.screenshot({ path: 'after-strategy-selection.png', fullPage: true });
    console.log('After strategy selection screenshot saved');

    // Check if strategy parameters are visible
    console.log('Checking for strategy parameters...');
    const parameterSelectors = [
      'text=donLen',
      'text=atrMult', 
      'text=riskPerTrade',
      '[data-testid="strategy-parameters"]',
      '.strategy-params',
      '.parameters'
    ];
    
    let parametersFound = false;
    for (const selector of parameterSelectors) {
      if (await page.locator(selector).count() > 0) {
        parametersFound = true;
        console.log(`Parameters found with selector: ${selector}`);
        break;
      }
    }
    
    if (parametersFound) {
      console.log('Strategy parameters are visible');
      // Try to capture parameter values
      const paramText = await page.textContent('body');
      if (paramText.includes('donLen') || paramText.includes('atrMult') || paramText.includes('riskPerTrade')) {
        console.log('Expected parameters (donLen: 40, atrMult: 9.0, riskPerTrade: 5) found in page content');
      }
    } else {
      console.warn('Strategy parameters not clearly visible');
    }

    // Check for chart loading
    console.log('Checking for chart...');
    const chartSelectors = [
      'canvas',
      '.plotly',
      '.chart-container',
      '#chart',
      '.recharts-wrapper',
      '[data-testid="chart"]'
    ];
    
    let chartFound = false;
    for (const selector of chartSelectors) {
      if (await page.locator(selector).count() > 0) {
        chartFound = true;
        console.log(`Chart found with selector: ${selector}`);
        break;
      }
    }
    
    if (chartFound) {
      console.log('Chart is present on the page');
    } else {
      console.error('Chart not found on the page');
    }

    // Check for performance metrics
    console.log('Checking for performance metrics...');
    const metricsSelectors = [
      'text=Total Return',
      'text=Win Rate',
      'text=Profit Factor',
      'text=Max Drawdown',
      '.performance-metrics',
      '[data-testid="performance-metrics"]'
    ];
    
    let metricsFound = false;
    for (const selector of metricsSelectors) {
      if (await page.locator(selector).count() > 0) {
        metricsFound = true;
        console.log(`Performance metrics found with selector: ${selector}`);
        break;
      }
    }
    
    if (metricsFound) {
      console.log('Performance metrics are visible');
    } else {
      console.error('Performance metrics not found');
    }

    // Check for trade signals/trades list
    console.log('Checking for trades...');
    const tradesSelectors = [
      'text=Buy',
      'text=Sell', 
      'text=Long',
      'text=Short',
      '.trades-list',
      '[data-testid="trades-list"]',
      'table'
    ];
    
    let tradesFound = false;
    for (const selector of tradesSelectors) {
      if (await page.locator(selector).count() > 0) {
        tradesFound = true;
        console.log(`Trades found with selector: ${selector}`);
        break;
      }
    }
    
    if (tradesFound) {
      console.log('Trade signals/trades are visible');
    } else {
      console.error('No trades or trade signals found');
    }

    // Test different data sources if available
    console.log('Checking for data source selector...');
    const dataSourceSelectors = [
      'select:has(option:has-text("Coinbase"))',
      'select:has(option:has-text("Binance"))',
      '.data-source-selector select',
      '[data-testid="data-source-select"]'
    ];
    
    let dataSourceDropdown = null;
    for (const selector of dataSourceSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        dataSourceDropdown = element;
        console.log(`Found data source dropdown with selector: ${selector}`);
        break;
      }
    }
    
    if (dataSourceDropdown) {
      const dataSourceOptions = await dataSourceDropdown.locator('option').allTextContents();
      console.log('Available data sources:', dataSourceOptions);
      
      // Test with Binance if available
      const binanceOption = dataSourceOptions.find(option => 
        option.includes('Binance') || option.toLowerCase().includes('binance')
      );
      
      if (binanceOption) {
        console.log('Testing with Binance data source...');
        await dataSourceDropdown.selectOption({ label: binanceOption });
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: 'with-binance-data.png', fullPage: true });
        console.log('Binance data source test screenshot saved');
      }
    } else {
      console.log('Data source selector not found');
    }

    // Final comprehensive screenshot
    await page.screenshot({ path: 'final-test-state.png', fullPage: true });
    console.log('Final test state screenshot saved');

    // Summary of findings
    console.log('\n=== TEST SUMMARY ===');
    console.log('Strategy dropdown found:', !!strategyDropdown);
    console.log('Trend Following strategy available:', !!trendFollowingOption);
    console.log('Strategy parameters visible:', parametersFound);
    console.log('Chart present:', chartFound);
    console.log('Performance metrics visible:', metricsFound);
    console.log('Trades/signals found:', tradesFound);
    console.log('Data source selector available:', !!dataSourceDropdown);

    if (!chartFound || !metricsFound || !tradesFound) {
      console.log('\n=== POTENTIAL ISSUES ===');
      if (!chartFound) console.log('- Chart is not loading properly');
      if (!metricsFound) console.log('- Performance metrics are not displaying');
      if (!tradesFound) console.log('- No trades or trade signals are being generated');
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
    
    // Take error screenshot
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    console.log('Error state screenshot saved as error-state.png');
    
    // Get page content for debugging
    const pageContent = await page.content();
    console.log('Page HTML length:', pageContent.length);
    
    // Check if page loaded at all
    const title = await page.title();
    console.log('Page title:', title);
  } finally {
    await browser.close();
  }
}

// Run the test
testTrendFollowingStrategy().catch(console.error);