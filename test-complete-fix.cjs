const http = require('http');

function makeRequest(method, params) {
    const data = JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: Date.now()
    });

    const options = {
        hostname: 'localhost',
        port: 3006,
        path: '/mcp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testCompleteFix() {
    console.log('🚀 Testing complete Average Trade K format fix...');
    
    try {
        // Navigate to the updated application
        console.log('📍 Navigating to trading strategy app...');
        const navResult = await makeRequest('goto', {
            url: 'https://trading-strategy-n7aifyac8-tonys-projects-297706df.vercel.app/'
        });
        console.log('Navigation result:', navResult);

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Log in
        console.log('🔑 Logging in...');
        await makeRequest('fill', { selector: 'input[type="text"]', text: 'tony' });
        await makeRequest('fill', { selector: 'input[type="password"]', text: '123' });
        await makeRequest('click', { selector: 'button[type="submit"]' });
        
        // Wait for login
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Get page content to check the Average Trade formatting
        console.log('📄 Getting page content...');
        const contentResult = await makeRequest('get_page_content', {});
        console.log('Raw content result:', contentResult);

        if (contentResult && contentResult.result && contentResult.result.content) {
            const content = contentResult.result.content;
            
            // Look for Average Trade section
            console.log('\n🔍 CHECKING AVERAGE TRADE FORMATTING:');
            
            // Check if we can find the Average Trade section
            if (content.includes('💰 Average Trade')) {
                const lines = content.split('\n');
                let inAverageTradeSection = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.includes('💰 Average Trade')) {
                        inAverageTradeSection = true;
                        console.log(`Found: ${line}`);
                        
                        // Check the next few lines for the actual value
                        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                            const nextLine = lines[j].trim();
                            if (nextLine && nextLine.includes('$')) {
                                console.log(`Value: ${nextLine}`);
                                
                                // Check if it uses K format instead of M
                                if (nextLine.includes('K') && !nextLine.includes('M')) {
                                    console.log('✅ SUCCESS: Average Trade is now using K format!');
                                } else if (nextLine.includes('M')) {
                                    console.log('❌ ISSUE: Average Trade still uses M format');
                                } else {
                                    console.log('ℹ️ INFO: Average Trade format unclear, value:', nextLine);
                                }
                                break;
                            }
                        }
                        break;
                    }
                }
                
                // Also check for the Avg Winner/Loser line
                const avgWinnerLoseLine = lines.find(line => 
                    line.includes('Avg Winner') && line.includes('Avg Loser')
                );
                if (avgWinnerLoseLine) {
                    console.log(`Sub-values: ${avgWinnerLoseLine.trim()}`);
                    if (avgWinnerLoseLine.includes('K')) {
                        console.log('✅ Sub-values correctly use K format');
                    }
                }
                
            } else {
                console.log('❌ Could not find Average Trade section in page content');
            }
        } else {
            console.log('❌ No content received from page');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testCompleteFix();