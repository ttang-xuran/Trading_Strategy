// Simple Playwright script to check Average Trade format
const { chromium } = require('playwright');

async function checkAverageTradeFormat() {
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('📍 Navigating to trading strategy app...');
        await page.goto('https://trading-strategy-n7aifyac8-tonys-projects-297706df.vercel.app/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to load...');
        await page.waitForTimeout(5000);
        
        // Look for Average Trade elements
        console.log('🔍 Looking for Average Trade elements...');
        
        // Try to find the Average Trade card
        const averageTradeElements = await page.locator('text=Average Trade').all();
        console.log(`Found ${averageTradeElements.length} "Average Trade" text elements`);
        
        // Look for values ending with 'M' or 'K'
        const mValues = await page.locator('text=/\\$[0-9]+\\.?[0-9]*M/').all();
        const kValues = await page.locator('text=/\\$[0-9]+\\.?[0-9]*K/').all();
        
        console.log(`Found ${mValues.length} values ending with 'M'`);
        console.log(`Found ${kValues.length} values ending with 'K'`);
        
        // Get all text content from metric cards
        const metricCards = await page.locator('[data-testid="metric-card"], .metric-card, div:has-text("Average Trade")').all();
        console.log(`Found ${metricCards.length} potential metric cards`);
        
        // Screenshot for debugging
        await page.screenshot({ path: 'average-trade-check.png', fullPage: true });
        console.log('📸 Screenshot saved as average-trade-check.png');
        
        // Get page content around Average Trade
        const pageContent = await page.content();
        const averageTradeSection = pageContent.match(/Average Trade.*?<\/div>/gi);
        if (averageTradeSection) {
            console.log('📊 Average Trade section found:');
            averageTradeSection.forEach((section, index) => {
                console.log(`${index + 1}: ${section.substring(0, 200)}...`);
            });
        }
        
        // Look for any text containing currency values
        const currencyPattern = /\$[0-9,]+\.?[0-9]*[KM]?/g;
        const currencyMatches = pageContent.match(currencyPattern);
        if (currencyMatches) {
            console.log('💰 Currency values found:', currencyMatches.slice(0, 20));
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    }
    
    await browser.close();
    console.log('✅ Browser closed');
}

checkAverageTradeFormat().catch(console.error);