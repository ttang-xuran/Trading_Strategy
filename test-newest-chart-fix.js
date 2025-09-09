import { chromium } from 'playwright';

async function testNewestChartFix() {
  console.log('🔄 Testing chart markers fix on newest deployment...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture ALL console logs to see debug output
    page.on('console', msg => {
      const message = msg.text();
      console.log(`📊 CONSOLE: ${message}`);
    });
    
    console.log('🌐 Navigating to newest deployment...');
    await page.goto('https://trading-strategy-a3if2idl2-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'newest-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'newest-after-login.png', fullPage: true });
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
      await page.screenshot({ path: 'newest-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for backtest and chart rendering...');
        await page.waitForTimeout(25000);
        
        await page.screenshot({ path: 'newest-after-backtest.png', fullPage: true });
        
        // Look for debug output about trade signals
        console.log('\n🔍 ANALYZING DEBUG OUTPUT AND CHART:');
        
        // Check if we can find any chart info text about trade signals
        try {
          const chartInfoElements = await page.locator('text=/📊.*trade signals/').all();
          console.log(`📊 Found ${chartInfoElements.length} chart info elements`);
          
          for (const element of chartInfoElements) {
            const text = await element.textContent();
            console.log(`📊 Chart info: ${text}`);
          }
          
          if (chartInfoElements.length === 0) {
            console.log('❌ No chart info elements found - checking for any signals text');
            const anySignalsText = await page.locator('text=signals').all();
            console.log(`📊 Found ${anySignalsText.length} elements with "signals" text`);
          }
          
          // Check for SVG elements that could be markers
          const svgCircles = await page.locator('svg circle').all();
          const svgPaths = await page.locator('svg path').all();
          const svgRects = await page.locator('svg rect').all();
          
          console.log(`📊 SVG elements: ${svgCircles.length} circles, ${svgPaths.length} paths, ${svgRects.length} rects`);
          
        } catch (error) {
          console.log(`❌ Error checking chart elements: ${error.message}`);
        }
        
        // Check trades table
        console.log('\n📋 CHECKING TRADES TABLE:');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 3000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'newest-trades-tab.png', fullPage: true });
          
          const tradeRows = await page.locator('table tbody tr').all();
          console.log(`📊 Found ${tradeRows.length} rows in trades table`);
          
          let entryCount = 0, exitCount = 0;
          for (let i = 0; i < Math.min(5, tradeRows.length); i++) {
            const cells = await tradeRows[i].locator('td').all();
            if (cells.length > 1) {
              const actionText = await cells[1].textContent();
              console.log(`📊 Row ${i+1}: ${actionText}`);
              
              if (actionText && actionText.includes('ENTRY')) entryCount++;
              if (actionText && actionText.includes('EXIT')) exitCount++;
            }
          }
          
          console.log(`\n📊 FINAL RESULTS:`);
          console.log(`   ENTRY trades: ${entryCount}`);
          console.log(`   EXIT trades: ${exitCount}`);
          
          if (entryCount > 0 && exitCount > 0) {
            console.log(`✅ SUCCESS: Found both ENTRY and EXIT trades!`);
          } else if (entryCount > 0 && exitCount === 0) {
            console.log(`⚠️  PARTIAL: Found ENTRY but no EXIT trades`);
          } else {
            console.log(`❌ ISSUE: No trades found in table`);
          }
        }
        
      } else {
        console.log('❌ Run Backtest button not found');
      }
    } else {
      console.log('❌ Strategy selection failed');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'newest-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n🏁 Newest chart fix test completed');
}

testNewestChartFix();