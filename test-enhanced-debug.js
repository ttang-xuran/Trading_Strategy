import { chromium } from 'playwright';

async function testEnhancedDebug() {
  console.log('🔄 Testing enhanced debugging on latest deployment...');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Capture ALL console logs, especially the enhanced debug output
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('🎯') || message.includes('TRADE') || message.includes('DEBUG') || message.includes('FILTERED') || message.includes('signals')) {
        console.log(`📊 ${message}`);
      }
    });
    
    console.log('🌐 Navigating to newest deployment...');
    await page.goto('https://trading-strategy-dsiekjc1j-tonys-projects-297706df.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.screenshot({ path: 'enhanced-debug-initial.png', fullPage: true });
    
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
      await page.screenshot({ path: 'enhanced-debug-after-login.png', fullPage: true });
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
      await page.screenshot({ path: 'enhanced-debug-strategy-selected.png', fullPage: true });
      
      console.log('🚀 Running backtest...');
      const runButton = await page.locator('button:has-text("Run Backtest")').first();
      if (await runButton.isVisible()) {
        await runButton.click();
        
        console.log('⏳ Waiting for enhanced debug output...');
        await page.waitForTimeout(25000);
        
        await page.screenshot({ path: 'enhanced-debug-after-backtest.png', fullPage: true });
        
        // Check if we can see any chart markers or trade signals info
        console.log('\\n🔍 CHECKING FOR CHART MARKERS:');
        
        try {
          // Look for any text about trade signals
          const signalInfoElements = await page.locator('text=/signals|marker/i').all();
          console.log(`📊 Found ${signalInfoElements.length} elements mentioning signals/markers`);
          
          for (let i = 0; i < signalInfoElements.length && i < 3; i++) {
            const text = await signalInfoElements[i].textContent();
            console.log(`📊 Signal info ${i+1}: "${text}"`);
          }
          
          // Check for SVG elements (chart markers)
          const svgElements = await page.locator('svg circle, svg rect, svg path[stroke], svg g').all();
          console.log(`📊 SVG elements found: ${svgElements.length}`);
          
        } catch (error) {
          console.log(`❌ Error checking chart elements: ${error.message}`);
        }
        
        // Check trades table
        console.log('\\n📋 CHECKING TRADES TABLE:');
        const tradesTab = await page.locator('text="List of trades"').first();
        if (await tradesTab.isVisible({ timeout: 5000 })) {
          await tradesTab.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'enhanced-debug-trades-tab.png', fullPage: true });
          
          const tradeRows = await page.locator('table tbody tr').all();
          console.log(`📊 Trades table has ${tradeRows.length} rows`);
          
          let entryCount = 0, exitCount = 0;
          for (let i = 0; i < Math.min(6, tradeRows.length); i++) {
            const cells = await tradeRows[i].locator('td').all();
            if (cells.length > 1) {
              const actionText = await cells[1].textContent();
              console.log(`📊 Row ${i+1}: action="${actionText}"`);
              
              if (actionText && actionText.includes('ENTRY')) entryCount++;
              if (actionText && actionText.includes('EXIT')) exitCount++;
            }
          }
          
          console.log(`\\n📊 TRADES TABLE SUMMARY:`);
          console.log(`   ENTRY trades: ${entryCount}`);
          console.log(`   EXIT trades: ${exitCount}`);
          console.log(`   Total: ${entryCount + exitCount}`);
          
          if (entryCount > 0 && exitCount > 0) {
            console.log(`✅ SUCCESS: Both ENTRY and EXIT trades found in table!`);
            console.log(`❓ BUT: Chart markers still not visible - this confirms the issue is in chart rendering, not trade generation`);
          } else {
            console.log(`❌ ISSUE: Trades not showing in table properly`);
          }
          
        } else {
          console.log('❌ Trades tab not found or not visible');
        }
        
      } else {
        console.log('❌ Run Backtest button not found');
      }
    } else {
      console.log('❌ Strategy selection failed');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ path: 'enhanced-debug-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\\n🏁 Enhanced debug test completed');
  console.log('\\n📋 SUMMARY:');
  console.log('   - Check console output above for detailed trade debugging');
  console.log('   - Look for "🎯 ALL TRADES DEBUG", "🎯 FILTERED TRADES", etc.');
  console.log('   - This will show exactly why chart markers are not appearing');
}

testEnhancedDebug();