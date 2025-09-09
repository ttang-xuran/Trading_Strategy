import { chromium } from 'playwright';

async function testParametersFixedProduction() {
  console.log('🔄 Testing fixed Strategy Parameters on production...');
  
  // Wait for Vercel deployment
  console.log('⏳ Waiting 45 seconds for Vercel deployment...');
  await new Promise(resolve => setTimeout(resolve, 45000));
  
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
    
    console.log('🌐 Navigating to production deployment...');
    await page.goto('https://trading-strategy-94wulftfr-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'params-prod-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'params-prod-after-login.png', fullPage: true });
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
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'params-prod-strategy-selected.png', fullPage: true });
      
      // Check if page is still working (not blank)
      const bodyText = await page.textContent('body');
      if (bodyText && bodyText.trim().length > 100) {
        console.log('✅ SUCCESS: Page renders properly after strategy selection!');
        
        // Check if parameters are now visible
        const rangeInputs = await page.locator('input[type="range"]').all();
        console.log(`✅ Found ${rangeInputs.length} parameter sliders!`);
        
        if (rangeInputs.length > 0) {
          console.log('🎛️ Testing parameter modification...');
          
          // Test the first slider (SMA Fast Length)
          const firstSlider = rangeInputs[0];
          const originalValue = await firstSlider.getAttribute('value');
          console.log(`📊 Original SMA Fast Length: ${originalValue}`);
          
          // Move slider
          await firstSlider.fill('70');
          await page.waitForTimeout(1000);
          
          const newValue = await firstSlider.getAttribute('value');
          console.log(`📝 New SMA Fast Length: ${newValue}`);
          
          if (newValue === '70') {
            console.log('✅ SUCCESS: Parameter slider modification works!');
            
            // Test another parameter
            if (rangeInputs.length > 1) {
              const secondSlider = rangeInputs[1];
              const origValue2 = await secondSlider.getAttribute('value');
              await secondSlider.fill('300');
              await page.waitForTimeout(500);
              const newValue2 = await secondSlider.getAttribute('value');
              console.log(`📊 SMA Slow Length: ${origValue2} → ${newValue2}`);
            }
            
            await page.screenshot({ path: 'params-prod-modified.png', fullPage: true });
            
            // Test backtest with modified parameters
            console.log('🚀 Testing backtest with modified parameters...');
            const runButton = await page.locator('button:has-text("Run Backtest")').first();
            if (await runButton.isVisible()) {
              await runButton.click();
              console.log('⏳ Waiting for backtest to complete (15 seconds)...');
              await page.waitForTimeout(15000);
              
              // Check if results appeared
              const performanceMetrics = await page.locator('text="Total Return"').first();
              if (await performanceMetrics.isVisible({ timeout: 3000 })) {
                console.log('✅ SUCCESS: Backtest completed with custom parameters!');
                
                // Check for trades
                const tradesTab = await page.locator('text="List of trades"').first();
                if (await tradesTab.isVisible({ timeout: 2000 })) {
                  await tradesTab.click();
                  await page.waitForTimeout(2000);
                  console.log('✅ SUCCESS: Trades tab accessible');
                }
              } else {
                console.log('❌ FAILED: Backtest did not complete or show results');
              }
              
              await page.screenshot({ path: 'params-prod-backtest-result.png', fullPage: true });
            } else {
              console.log('❌ Run Backtest button not found');
            }
          } else {
            console.log('❌ FAILED: Parameter slider not working');
          }
        } else {
          console.log('❌ No parameter sliders found');
        }
      } else {
        console.log('❌ FAILED: Page went blank after strategy selection');
      }
    } else {
      console.log('❌ Strategy dropdown not found');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'params-prod-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Production parameter fix test completed');
}

testParametersFixedProduction();