import { chromium } from 'playwright';

async function testNewestDeployment() {
  console.log('🔄 Testing newest deployment after fix...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture ALL console logs for debugging
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('WIN RATE') || message.includes('Math check') || message.includes('winners') || message.includes('losers')) {
        console.log(`📊 ${message}`);
      }
    });
    
    // Try a few potential new deployment URLs
    const potentialUrls = [
      'https://trading-strategy-git-main-ttang-xurans-projects.vercel.app/',
      'https://trading-strategy-rho.vercel.app/',
    ];
    
    let successUrl = null;
    
    for (const url of potentialUrls) {
      try {
        console.log(`🌐 Trying ${url}...`);
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        // Check if we can see the login form
        const loginForm = await page.locator('input[type="text"]').first();
        if (await loginForm.isVisible({ timeout: 3000 })) {
          successUrl = url;
          console.log(`✅ Successfully loaded ${url}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to load ${url}: ${error.message}`);
        continue;
      }
    }
    
    if (!successUrl) {
      console.log('❌ No working deployment URL found');
      return;
    }
    
    // Login
    console.log('🔐 Logging in...');
    const loginForm = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const loginButton = await page.locator('button:has-text("Sign In")').first();
    
    await loginForm.fill('tony');
    await passwordInput.fill('123');
    await loginButton.click();
    await page.waitForTimeout(3000);
    
    // Select strategy  
    console.log('🎯 Selecting Trend Following with Risk MGT...');
    const strategySelect = await page.locator('select').nth(2);
    await strategySelect.selectOption({ value: 'trend-following-risk-mgt' });
    await page.waitForTimeout(2000);
    
    console.log('🚀 Running backtest...');
    const runButton = await page.locator('button:has-text("Run Backtest")').first();
    await runButton.click();
    
    console.log('⏳ Waiting for results...');
    await page.waitForTimeout(20000);
    
    // Get results
    try {
      const winRateText = await page.locator('div:has-text("+") >> text=/\\+\\d+\\.\\d+%/').first().textContent();
      console.log(`🎯 Win Rate: ${winRateText}`);
      
      const breakdown = await page.locator('text=/\\d+ \\/ \\d+ completed/').first().textContent();
      console.log(`🎯 Breakdown: ${breakdown}`);
      
      // Parse and validate
      const match = breakdown.match(/(\d+) \/ (\d+)/);
      if (match) {
        const winners = parseInt(match[1]);
        const total = parseInt(match[2]);
        const expected = (winners / total * 100).toFixed(2);
        const actual = parseFloat(winRateText.replace(/[+%]/g, ''));
        
        console.log(`\n🔍 VALIDATION:`);
        console.log(`   Winners: ${winners}, Total: ${total}`);
        console.log(`   Expected: ${expected}%`);
        console.log(`   Displayed: ${actual}%`);
        
        if (Math.abs(actual - parseFloat(expected)) < 0.01) {
          console.log(`\n✅ SUCCESS: Win rate is now CORRECT!`);
        } else {
          console.log(`\n❌ STILL WRONG: Fix did not work`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Could not validate results: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log('🏁 Test completed');
}

testNewestDeployment();