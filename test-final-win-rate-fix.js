import { chromium } from 'playwright';

async function testFinalWinRateFix() {
  console.log('🔄 Testing FINAL Win Rate fix on latest deployment...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture ALL console logs
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('WIN RATE DEBUG') || message.includes('Math check')) {
        console.log(`🔍 ${message}`);
      }
    });
    
    console.log('🌐 Navigating to latest deployment...');
    // Try the main domain first
    await page.goto('https://trading-strategy-rho.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'final-test-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'final-test-after-login.png', fullPage: true });
    }
    
    // Select strategy
    console.log('🎯 Selecting Trend Following with Risk MGT...');
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
      await page.screenshot({ path: 'final-test-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for backtest execution...');
        await page.waitForTimeout(20000);
        
        await page.screenshot({ path: 'final-test-after-backtest.png', fullPage: true });
        
        // Extract WIN RATE values from the UI
        console.log('\n🎯 EXTRACTING FINAL WIN RATE VALUES:');
        
        try {
          // Get the win rate percentage
          const winRateElement = await page.locator('[style*="color: #238636"] >> text=/\\+\\d+\\.\\d+%/').first();
          const winRatePercent = await winRateElement.textContent();
          console.log(`📊 Win Rate Percentage: ${winRatePercent}`);
          
          // Get the breakdown text
          const breakdownElement = await page.locator('text=/\\d+ \\/ \\d+ completed trades/').first();
          const breakdownText = await breakdownElement.textContent();
          console.log(`📊 Win Rate Breakdown: ${breakdownText}`);
          
          // Parse the breakdown to get numbers
          const match = breakdownText.match(/(\d+) \/ (\d+)/);
          if (match) {
            const winners = parseInt(match[1]);
            const total = parseInt(match[2]);
            const calculatedPercent = (winners / total * 100).toFixed(2);
            console.log(`🧮 Manual calculation: ${winners} ÷ ${total} = ${calculatedPercent}%`);
            
            // Compare with displayed percentage
            const displayedPercent = parseFloat(winRatePercent.replace(/[+%]/g, ''));
            console.log(`🔍 Displayed: ${displayedPercent}% vs Expected: ${calculatedPercent}%`);
            
            if (Math.abs(displayedPercent - parseFloat(calculatedPercent)) < 0.01) {
              console.log(`✅ SUCCESS: Win rate calculation is now CORRECT!`);
              console.log(`✅ Expected 72.73% (8/11) and got ${displayedPercent}%`);
            } else {
              console.log(`❌ ERROR: Win rate calculation still wrong!`);
              console.log(`❌ Expected: ${calculatedPercent}%, Got: ${displayedPercent}%`);
            }
          }
          
        } catch (error) {
          console.log(`❌ Could not extract win rate values: ${error.message}`);
        }
        
      } else {
        console.log('❌ Run Backtest button not found');
      }
    } else {
      console.log('❌ Strategy selection failed');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'final-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n🏁 Final Win Rate fix test completed');
}

testFinalWinRateFix();