// Debug win rate calculation
console.log('=== WIN RATE DEBUG ===');

// From the logs we know:
const totalTrades = 22;
const winningTrades = 8;
const losingTrades = 3;
const closingTrades = 11; // This is winningTrades + losingTrades

console.log(`Total Trades: ${totalTrades}`);
console.log(`Winning Trades: ${winningTrades}`);  
console.log(`Losing Trades: ${losingTrades}`);
console.log(`Closing Trades: ${closingTrades}`);

// Current calculation (from the code)
const currentWinRate = closingTrades > 0 ? (winningTrades / closingTrades) * 100 : 0;
console.log(`\nCurrent Win Rate Calculation:`);
console.log(`(${winningTrades} / ${closingTrades}) * 100 = ${currentWinRate.toFixed(2)}%`);

// What it SHOULD be:
console.log(`\nExpected: ${winningTrades} winners out of ${closingTrades} trades = ${currentWinRate.toFixed(2)}%`);

// Check if 36.36% is half of the correct answer
console.log(`\nIs 36.36% exactly half of ${currentWinRate.toFixed(2)}%?`);
console.log(`${currentWinRate.toFixed(2)} ÷ 2 = ${(currentWinRate / 2).toFixed(2)}%`);

// Check if the issue is that it's dividing by total trades instead of closing trades
const incorrectWinRate = (winningTrades / totalTrades) * 100;
console.log(`\nIf calculated as (${winningTrades} / ${totalTrades}) * 100 = ${incorrectWinRate.toFixed(2)}%`);