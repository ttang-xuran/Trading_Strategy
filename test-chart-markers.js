import { chromium } from 'playwright';

async function testChartMarkers() {
  console.log('🔄 Testing chart markers on latest deployment...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture console logs for trade signal details
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('signal') || message.includes('marker') || message.includes('ENTRY') || message.includes('EXIT')) {
        console.log(`📊 ${message}`);
      }
    });
    
    console.log('🌐 Navigating to latest deployment...');
    await page.goto('https://trading-strategy-a1rosd14u-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'chart-test-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'chart-test-after-login.png', fullPage: true });
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
      await page.screenshot({ path: 'chart-test-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for backtest and chart rendering...');
        await page.waitForTimeout(20000);
        
        await page.screenshot({ path: 'chart-test-after-backtest.png', fullPage: true });
        
        // Check for chart markers
        console.log('\n📈 ANALYZING CHART MARKERS:');
        
        try {
          // Look for chart elements and signals
          const chartContainer = await page.locator('#btc-chart').first();
          if (await chartContainer.isVisible({ timeout: 5000 })) {
            console.log('✅ Chart container found');
            
            // Check for trade signals/markers on the chart
            const signalElements = await page.locator('[data-signal]').all();
            console.log(`📍 Found ${signalElements.length} signal markers on chart`);
            
            // Alternative: check for marker elements by class or data attributes
            const entryMarkers = await page.locator('[data-action*="ENTRY"]').all();
            const exitMarkers = await page.locator('[data-action*="EXIT"]').all();
            
            console.log(`🟢 ENTRY markers: ${entryMarkers.length}`);
            console.log(`🔴 EXIT markers: ${exitMarkers.length}`);
            
            if (entryMarkers.length > exitMarkers.length) {
              console.log('⚠️  WARNING: More ENTRY markers than EXIT markers detected!');
              console.log(`⚠️  Expected: Equal number of ENTRY and EXIT markers`);
              console.log(`⚠️  Actual: ${entryMarkers.length} ENTRY, ${exitMarkers.length} EXIT`);
            } else if (entryMarkers.length === exitMarkers.length) {
              console.log('✅ ENTRY and EXIT markers are balanced');
            }
            
            // Check if there are any circle elements (typical chart markers)
            const circles = await page.locator('circle').all();
            console.log(`⭕ Total circle elements (potential markers): ${circles.length}`);
            
            // Look for SVG elements that might be markers
            const svgMarkers = await page.locator('svg circle, svg rect, svg path[data-signal]').all();
            console.log(`📊 SVG marker elements: ${svgMarkers.length}`);
            
          } else {
            console.log('❌ Chart container not found');
          }
          
        } catch (error) {
          console.log(`❌ Error analyzing chart markers: ${error.message}`);
        }
        
        // Check the trades list to verify what trades should have markers
        console.log('\n📋 CHECKING TRADES LIST:');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 3000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'chart-test-trades-tab.png', fullPage: true });
          
          // Count trades in the table
          const tradeRows = await page.locator('table tbody tr').all();
          let entryCount = 0, exitCount = 0;
          
          for (let i = 0; i < Math.min(10, tradeRows.length); i++) {
            const actionCell = await tradeRows[i].locator('td').nth(1);
            const actionText = await actionCell.textContent();
            
            if (actionText && actionText.includes('ENTRY')) {
              entryCount++;
            } else if (actionText && actionText.includes('EXIT')) {
              exitCount++;
            }
          }
          
          console.log(`📊 In trades table: ${entryCount} ENTRY trades, ${exitCount} EXIT trades (first 10 rows)`);
          console.log(`📊 Expected chart markers: ${entryCount} ENTRY + ${exitCount} EXIT = ${entryCount + exitCount} total`);
        }
        
      } else {
        console.log('❌ Run Backtest button not found');
      }
    } else {
      console.log('❌ Strategy selection failed');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'chart-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n🏁 Chart markers test completed');
}

testChartMarkers();