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
        port: 3001,
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

async function testTradingStrategy() {
    console.log('🚀 Testing MCP Browser Server...');
    
    try {
        // Try to navigate to the trading strategy URL
        console.log('📍 Navigating to trading strategy app...');
        const navResult = await makeRequest('goto', {
            url: 'https://trading-strategy-k74euptj7-tonys-projects-297706df.vercel.app/'
        });
        console.log('Navigation result:', navResult);

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Try to get page content
        console.log('📄 Getting page content...');
        const contentResult = await makeRequest('get_page_content', {});
        console.log('Content result:', contentResult);

        // Try to find elements containing "Average Trade"
        console.log('🔍 Looking for Average Trade elements...');
        const elementsResult = await makeRequest('find_elements', {
            selector: '*'
        });
        console.log('Elements result:', elementsResult);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testTradingStrategy();