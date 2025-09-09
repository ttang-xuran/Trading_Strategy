const puppeteer = require('puppeteer');

async function testAverageTradeFormat() {
    console.log('🚀 Starting browser test...');
    
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        console.log('📍 Navigating to trading strategy app...');
        await page.goto('https://trading-strategy-n7aifyac8-tonys-projects-297706df.vercel.app/', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        console.log('⏳ Waiting for content to load...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for React app to load
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-page-content.png', fullPage: true });
        console.log('📸 Screenshot saved as test-page-content.png');
        
        // Check if login form is present
        const loginForm = await page.$('input[type="password"]');
        if (loginForm) {
            console.log('🔑 Login form detected. Logging in...');
            
            // Fill username
            await page.type('input:nth-of-type(1)', 'tony');
            console.log('✓ Username filled');
            
            // Fill password
            await page.type('input[type="password"]', '123');
            console.log('✓ Password filled');
            
            // Click sign in button
            await page.click('button');
            console.log('✓ Sign in button clicked');
            
            // Wait for dashboard to load
            console.log('⏳ Waiting for dashboard to load...');
            await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds for dashboard
            
            // Take another screenshot after login
            await page.screenshot({ path: 'test-page-after-login.png', fullPage: true });
            console.log('📸 Post-login screenshot saved as test-page-after-login.png');
        }
        
        // Look for Average Trade text and surrounding values
        const averageTradeElements = await page.evaluate(() => {
            const elements = [];
            const textNodes = document.querySelectorAll('*');
            
            for (let node of textNodes) {
                const text = node.textContent || '';
                if (text.includes('Average Trade')) {
                    elements.push({
                        text: text.trim(),
                        outerHTML: node.outerHTML.substring(0, 500) + '...'
                    });
                }
            }
            return elements;
        });
        
        console.log('🔍 Average Trade elements found:', averageTradeElements.length);
        averageTradeElements.forEach((el, i) => {
            console.log(`${i + 1}:`, el.text);
        });
        
        // Look for currency values with M or K
        const currencyValues = await page.evaluate(() => {
            const regex = /\$[\d,]+\.?\d*[MK]?/g;
            const bodyText = document.body.textContent || '';
            const matches = bodyText.match(regex) || [];
            return matches.slice(0, 20); // Get first 20 matches
        });
        
        console.log('💰 Currency values found:', currencyValues);
        
        // Specifically look for values ending in M or K
        const mValues = currencyValues.filter(val => val.endsWith('M'));
        const kValues = currencyValues.filter(val => val.endsWith('K'));
        
        console.log('📊 Values ending with M:', mValues);
        console.log('📈 Values ending with K:', kValues);
        
        // Get full page text for debugging
        const pageText = await page.evaluate(() => document.body.textContent);
        const hasAverageTrade = pageText.includes('Average Trade');
        console.log('✓ Page contains "Average Trade":', hasAverageTrade);
        
        if (mValues.length > 0) {
            console.log('⚠️  Still showing values in M format:', mValues);
            return false;
        } else if (kValues.length > 0) {
            console.log('✅ Found values in K format:', kValues);
            return true;
        } else {
            console.log('❓ No M or K values found - app might still be loading or have different data');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    } finally {
        await browser.close();
        console.log('🏁 Browser closed');
    }
}

// Run the test
testAverageTradeFormat()
    .then(result => {
        if (result === true) {
            console.log('\n✅ SUCCESS: Average Trade values are showing in K format!');
        } else if (result === false) {
            console.log('\n❌ ISSUE: Average Trade values still showing in M format');
        } else {
            console.log('\n❓ UNCLEAR: Unable to determine format - check screenshot');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    });