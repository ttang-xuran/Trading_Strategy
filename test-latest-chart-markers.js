import { chromium } from 'playwright';

async function testLatestChartMarkers() {
  console.log('🔄 Testing chart markers on latest deployment...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture ALL console logs to see what's happening
    page.on('console', msg => {
      const message = msg.text();
      console.log(`📊 CONSOLE: ${message}`);
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-hh1uex8e0-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'latest-chart-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'latest-chart-after-login.png', fullPage: true });
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
      await page.screenshot({ path: 'latest-chart-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for backtest and chart rendering...');
        await page.waitForTimeout(25000);
        
        await page.screenshot({ path: 'latest-chart-after-backtest.png', fullPage: true });
        
        // Check for chart markers
        console.log('\n📈 ANALYZING CHART MARKERS:');
        
        try {
          // Look for the trade signals info text
          const chartInfoElements = await page.locator('text=/📊.*trade signals/').all();
          console.log(`Found ${chartInfoElements.length} chart info elements`);
          
          for (let i = 0; i < chartInfoElements.length; i++) {
            const infoText = await chartInfoElements[i].textContent();
            console.log(`📊 Chart info ${i+1}: ${infoText}`);
            
            // Extract number of signals
            const match = infoText.match(/(\d+)\s+trade signals/);
            if (match) {
              const signalCount = parseInt(match[1]);
              console.log(`📍 Found ${signalCount} trade signals on chart`);
            }
          }
          
          // Check for SVG circles (typical chart markers)
          const svgCircles = await page.locator('svg circle').all();
          console.log(`⭕ SVG circles found: ${svgCircles.length}`);
          
          // Check for any elements with marker-like attributes
          const markerElements = await page.locator('[data-signal], [data-trade], circle[fill]').all();
          console.log(`📍 Potential marker elements: ${markerElements.length}`);
          
        } catch (error) {
          console.log(`❌ Error analyzing chart markers: ${error.message}`);
        }
        
        // Check trades list for comparison
        console.log('\n📋 CHECKING TRADES LIST:');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 3000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'latest-chart-trades-tab.png', fullPage: true });
          
          // Count trades in the table
          const tradeRows = await page.locator('table tbody tr').all();
          let entryCount = 0, exitCount = 0;
          
          console.log(`📊 Found ${tradeRows.length} trade rows in table`);
          
          for (let i = 0; i < Math.min(10, tradeRows.length); i++) {
            const cells = await tradeRows[i].locator('td').all();
            if (cells.length > 1) {
              const actionText = await cells[1].textContent();
              console.log(`📊 Row ${i+1}: ${actionText}`);
              
              if (actionText && actionText.includes('ENTRY')) {
                entryCount++;
              } else if (actionText && actionText.includes('EXIT')) {
                exitCount++;
              }
            }
          }
          
          console.log(`\n📊 SUMMARY:`);
          console.log(`   ENTRY trades: ${entryCount}`);
          console.log(`   EXIT trades: ${exitCount}`);
          console.log(`   Expected total markers: ${entryCount + exitCount}`);
          
          if (exitCount === 0) {
            console.log(`⚠️  WARNING: No EXIT trades found in table!`);
          }
          
          if (entryCount > 0 && exitCount === 0) {
            console.log(`❌ PROBLEM: Only ENTRY trades, missing EXIT trades`);
          } else if (entryCount > 0 && exitCount > 0) {
            console.log(`✅ Both ENTRY and EXIT trades found in data`);
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
    await page.screenshot({ path: 'latest-chart-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n🏁 Latest chart markers test completed');
}

testLatestChartMarkers();