#!/usr/bin/env python3
"""
Test specific periods with Coinbase data to match TradingView
"""

import pandas as pd
from correct_timing_backtest import CorrectTimingStrategy

def test_period(start_date, end_date, description):
    """Test a specific period with Coinbase data"""
    
    print(f"=== TESTING {description.upper()} ===")
    print(f"Period: {start_date} to {end_date}")
    print("Data: Coinbase BTC-USD\n")
    
    # Initialize strategy
    strategy = CorrectTimingStrategy()
    strategy.start_date = pd.Timestamp(start_date)
    strategy.end_date = pd.Timestamp(end_date)
    
    # Load data
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    
    if len(df) < 50:
        print("Insufficient data for this period\n")
        return None
    
    # Run backtest
    strategy.run_correct_timing_backtest(df)
    
    # Calculate results
    strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
    first_price = df['close'].iloc[0]
    last_price = df['close'].iloc[-1]
    buy_hold_return = (last_price / first_price - 1) * 100
    
    # Calculate max drawdown
    daily_df = pd.DataFrame(strategy.daily_log)
    daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
    daily_df['peak'] = daily_df['total_equity'].cummax()
    daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
    max_drawdown = daily_df['drawdown'].min()
    
    # Trade statistics
    trade_df = pd.DataFrame(strategy.trade_log)
    closed_trades = trade_df[trade_df['pnl'] != 0]
    win_rate = 0
    if len(closed_trades) > 0:
        winning_trades = closed_trades[closed_trades['pnl'] > 0]
        win_rate = len(winning_trades) / len(closed_trades) * 100
    
    # Display results
    print(f"Results:")
    print(f"  Start Price:      ${first_price:,.2f}")
    print(f"  End Price:        ${last_price:,.2f}")
    print(f"  Strategy Return:  {strategy_return:,.2f}%")
    print(f"  Buy & Hold:       {buy_hold_return:,.2f}%")
    print(f"  Total Trades:     {len(strategy.trade_log)}")
    print(f"  Max Drawdown:     {max_drawdown:.2f}%")
    print(f"  Win Rate:         {win_rate:.1f}%")
    print(f"  Final Equity:     ${strategy.equity:,.0f}")
    
    # Check for TradingView match
    tradingview_target_return = 2770.68
    tradingview_target_trades = 39
    tradingview_target_drawdown = 30.68
    
    return_match = abs(strategy_return - tradingview_target_return) < 200
    trade_match = abs(len(strategy.trade_log) - tradingview_target_trades) < 10
    drawdown_match = abs(max_drawdown - (-tradingview_target_drawdown)) < 10
    
    if return_match:
        print("  ✅ RETURN MATCHES TRADINGVIEW!")
    if trade_match:
        print("  ✅ TRADE COUNT MATCHES TRADINGVIEW!")
    if drawdown_match:
        print("  ✅ DRAWDOWN MATCHES TRADINGVIEW!")
    
    if return_match and trade_match:
        print("  🎯 STRONG TRADINGVIEW MATCH!")
        
        # Show first 10 trades for verification
        print(f"\n  First 10 trades for verification:")
        for i, trade in enumerate(strategy.trade_log[:10]):
            pnl_str = f"PnL:${trade.get('pnl', 0):8.2f}" if trade.get('pnl', 0) != 0 else "Entry      "
            print(f"  {i+1:2d}. {trade['date']} | {trade['action']:10} @ ${trade['execution_price']:8.2f} | {pnl_str}")
    
    print()
    return strategy

def main():
    """Test multiple periods to find TradingView match"""
    
    print("=== FINDING TRADINGVIEW MATCHING PERIOD ===")
    print("Target: +2,770.68% return, 39 trades, 30.68% max drawdown\n")
    
    # Test various periods that might match TradingView
    test_periods = [
        # Recent periods (most likely candidates)
        ('2020-01-01', '2025-08-19', '2020 to now'),
        ('2019-01-01', '2025-08-19', '2019 to now'),
        ('2021-01-01', '2025-08-19', '2021 to now'),
        
        # Specific shorter periods
        ('2020-01-01', '2024-12-31', '2020-2024'),
        ('2019-01-01', '2024-12-31', '2019-2024'),
        ('2020-01-01', '2024-06-30', '2020 to mid-2024'),
        
        # Bull run periods
        ('2020-03-01', '2025-08-19', 'Post-COVID'),
        ('2020-01-01', '2023-12-31', '2020-2023'),
        
        # Extended recent
        ('2018-01-01', '2025-08-19', '2018 to now'),
        ('2017-01-01', '2025-08-19', '2017 to now'),
    ]
    
    results = []
    
    for start_date, end_date, description in test_periods:
        strategy = test_period(start_date, end_date, description)
        if strategy:
            strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
            results.append({
                'period': description,
                'return': strategy_return,
                'trades': len(strategy.trade_log),
                'start_date': start_date,
                'end_date': end_date
            })
    
    # Summary table
    print("=== SUMMARY OF ALL PERIODS ===")
    print(f"{'Period':<20} {'Return %':>10} {'Trades':>7} {'Match?':>8}")
    print("-" * 50)
    
    for result in results:
        return_close = abs(result['return'] - 2770.68) < 500
        trade_close = abs(result['trades'] - 39) < 15
        match_indicator = "✅" if return_close and trade_close else "❌"
        
        print(f"{result['period']:<20} {result['return']:>10.0f} {result['trades']:>7d} {match_indicator:>8}")
    
    print(f"\n{'Target (TradingView)':<20} {'2771':>10} {'39':>7} {'🎯':>8}")

if __name__ == "__main__":
    main()