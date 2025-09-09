import { chromium } from 'playwright';

async function testParametersFixed() {
  console.log('🔄 Testing fixed Strategy Parameters on localhost...');
  
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
    
    console.log('🌐 Navigating to localhost...');
    await page.goto('http://localhost:3001/', { 
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
      await page.screenshot({ path: 'params-fixed-local.png', fullPage: true });
      
      // Check if parameters are now visible
      const rangeInputs = await page.locator('input[type="range"]').all();
      console.log(`✅ Found ${rangeInputs.length} parameter sliders!`);
      
      if (rangeInputs.length > 0) {
        console.log('🎛️ Testing parameter modification...');
        
        // Test the first slider (SMA Fast Length)
        const firstSlider = rangeInputs[0];
        const originalValue = await firstSlider.getAttribute('value');
        console.log(`📊 Original value: ${originalValue}`);
        
        // Move slider
        await firstSlider.fill('60');
        await page.waitForTimeout(1000);
        
        const newValue = await firstSlider.getAttribute('value');
        console.log(`📝 New value: ${newValue}`);
        
        if (newValue === '60') {
          console.log('✅ SUCCESS: Parameter slider works!');
        } else {
          console.log('❌ FAILED: Parameter slider not working');
        }
        
        // Test backtest with modified parameters
        console.log('🚀 Testing backtest with modified parameters...');
        const runButton = await page.locator('button:has-text("Run Backtest")').first();
        if (await runButton.isVisible()) {
          await runButton.click();
          await page.waitForTimeout(10000);
          
          // Check if results appeared
          const performanceMetrics = await page.locator('text="Total Return"').first();
          if (await performanceMetrics.isVisible({ timeout: 3000 })) {
            console.log('✅ SUCCESS: Backtest works with parameter modifications!');
          } else {
            console.log('❌ FAILED: Backtest did not complete');
          }
          
          await page.screenshot({ path: 'params-fixed-backtest-local.png', fullPage: true });
        }
      } else {
        console.log('❌ No parameter sliders found - fix did not work');
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Parameter fix test completed');
}

testParametersFixed();