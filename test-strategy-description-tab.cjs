const https = require('https');
const fs = require('fs');

const APP_URL = 'https://trading-strategy-6yvqk2zo2-tonys-projects-297706df.vercel.app/';

console.log('🔍 Testing Strategy Description Tab Implementation');
console.log('='.repeat(60));

async function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function testStrategyDescriptionTab() {
    try {
        console.log('📡 Fetching application page...');
        const html = await fetchPage(APP_URL);
        
        console.log('✅ Page fetched successfully');
        console.log(`📄 Page size: ${html.length} characters`);
        
        // Test 1: Check for 4-tab structure
        console.log('\n🧪 Test 1: Verifying 4-tab structure');
        const expectedTabs = ['Overview', 'Strategy Description', 'Performance', 'List of trades'];
        let foundTabs = [];
        
        for (const tab of expectedTabs) {
            if (html.includes(tab)) {
                foundTabs.push(tab);
                console.log(`  ✅ Found: "${tab}"`);
            } else {
                console.log(`  ❌ Missing: "${tab}"`);
            }
        }
        
        const tabTestResult = foundTabs.length === expectedTabs.length;
        console.log(`\n📋 Tab Structure Test: ${tabTestResult ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Expected: ${expectedTabs.length} tabs`);
        console.log(`   Found: ${foundTabs.length} tabs`);
        
        // Test 2: Check for Strategy Description specific content
        console.log('\n🧪 Test 2: Checking Strategy Description content structure');
        const strategyContentPatterns = [
            'Strategy Overview',
            'Entry.*Exit.*Rules',
            'Key Parameters',
            'Market Conditions',
            'tradingStrategies', // Check for strategy data structure
            'Breakout for long and short',
            'Trend Following'
        ];
        
        let foundStrategyContent = [];
        for (const pattern of strategyContentPatterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(html)) {
                foundStrategyContent.push(pattern);
                console.log(`  ✅ Found pattern: "${pattern}"`);
            } else {
                console.log(`  ❌ Missing pattern: "${pattern}"`);
            }
        }
        
        // Test 3: Check for tab switching logic
        console.log('\n🧪 Test 3: Checking tab switching implementation');
        const tabSwitchingPatterns = [
            'activeTab.*===.*description',
            'setActiveTab',
            'onClick.*description',
            'selectedStrategy'
        ];
        
        let foundTabLogic = [];
        for (const pattern of tabSwitchingPatterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(html)) {
                foundTabLogic.push(pattern);
                console.log(`  ✅ Found logic: "${pattern}"`);
            } else {
                console.log(`  ❌ Missing logic: "${pattern}"`);
            }
        }
        
        // Test 4: Check for strategy data structure
        console.log('\n🧪 Test 4: Checking strategy data implementation');
        const strategyNames = ['Breakout for long and short', 'Trend Following', 'Mean Reversion', 'Momentum'];
        let foundStrategies = [];
        
        for (const strategy of strategyNames) {
            if (html.includes(strategy)) {
                foundStrategies.push(strategy);
                console.log(`  ✅ Found strategy: "${strategy}"`);
            } else {
                console.log(`  ❌ Missing strategy: "${strategy}"`);
            }
        }
        
        // Test 5: Check for development messages
        console.log('\n🧪 Test 5: Checking development status messages');
        const devPatterns = ['Under Development', 'Coming Soon', 'Not Implemented'];
        let foundDevMessages = [];
        
        for (const pattern of devPatterns) {
            if (html.includes(pattern)) {
                foundDevMessages.push(pattern);
                console.log(`  ✅ Found dev message: "${pattern}"`);
            }
        }
        
        // Summary
        console.log('\n📊 SUMMARY');
        console.log('='.repeat(40));
        console.log(`✅ Tab Structure: ${tabTestResult ? 'IMPLEMENTED' : 'MISSING'}`);
        console.log(`📖 Strategy Content: ${foundStrategyContent.length}/${strategyContentPatterns.length} patterns found`);
        console.log(`🔄 Tab Logic: ${foundTabLogic.length}/${tabSwitchingPatterns.length} patterns found`);
        console.log(`📋 Strategy Data: ${foundStrategies.length}/${strategyNames.length} strategies found`);
        console.log(`🚧 Development Messages: ${foundDevMessages.length} found`);
        
        const overallSuccess = tabTestResult && foundStrategyContent.length >= 3 && foundTabLogic.length >= 2;
        console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '✅ SUCCESS' : '⚠️ NEEDS ATTENTION'}`);
        
        // Save detailed results
        const results = {
            timestamp: new Date().toISOString(),
            url: APP_URL,
            pageSize: html.length,
            tests: {
                tabStructure: {
                    passed: tabTestResult,
                    expected: expectedTabs,
                    found: foundTabs
                },
                strategyContent: {
                    patterns: strategyContentPatterns,
                    found: foundStrategyContent
                },
                tabLogic: {
                    patterns: tabSwitchingPatterns,
                    found: foundTabLogic
                },
                strategies: {
                    expected: strategyNames,
                    found: foundStrategies
                },
                devMessages: foundDevMessages
            },
            overallSuccess
        };
        
        fs.writeFileSync('strategy-description-test-results.json', JSON.stringify(results, null, 2));
        console.log('\n💾 Detailed results saved to: strategy-description-test-results.json');
        
        return overallSuccess;
        
    } catch (error) {
        console.error('❌ Error testing Strategy Description tab:', error.message);
        return false;
    }
}

// Run the test
testStrategyDescriptionTab().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
});