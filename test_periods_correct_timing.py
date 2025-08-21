#!/usr/bin/env python3
"""
Test correct timing on different periods to match TradingView
"""

import pandas as pd
from correct_timing_backtest import CorrectTimingStrategy

def test_periods_with_correct_timing():
    """Test different periods with correct execution timing"""
    
    periods = [
        ('2020-01-01', '2025-08-19', "Current period"),
        ('2010-01-01', '2025-08-19', "From early Bitcoin"), 
        ('2011-01-01', '2025-08-19', "From $0.30 era"),
        ('2012-01-01', '2025-08-19', "From $5 era"),
        ('2013-01-01', '2025-08-19', "From $11 era"),
        ('2013-01-01', '2023-12-31', "From $11 to 2023"),
        ('2010-07-01', '2021-01-01', "Early massive period"),
        ('2019-01-01', '2025-08-19', "Extended recent"),
    ]
    
    results = []
    
    print("=== TESTING CORRECT TIMING ON MULTIPLE PERIODS ===\n")
    
    for start_date, end_date, description in periods:
        print(f"Testing {description}: {start_date} to {end_date}")
        
        try:
            strategy = CorrectTimingStrategy()
            strategy.start_date = pd.Timestamp(start_date)
            strategy.end_date = pd.Timestamp(end_date)
            
            df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
            
            if len(df) < 50:
                print("  Insufficient data\n")
                continue
                
            strategy.run_correct_timing_backtest(df)
            
            strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
            
            first_price = df['close'].iloc[0]
            last_price = df['close'].iloc[-1]
            buy_hold_return = (last_price / first_price - 1) * 100
            
            result = {
                'period': f"{start_date} to {end_date}",
                'description': description,
                'start_price': first_price,
                'end_price': last_price,
                'buy_hold_return': buy_hold_return,
                'strategy_return': strategy_return,
                'total_trades': len(strategy.trade_log),
                'final_equity': strategy.equity
            }
            
            results.append(result)
            
            print(f"  Start: ${first_price:,.6f} | End: ${last_price:,.2f}")
            print(f"  B&H:   {buy_hold_return:>12,.0f}% | Strategy: {strategy_return:>12,.0f}%")
            print(f"  Trades: {len(strategy.trade_log):3d} | Final Equity: ${strategy.equity:>12,.0f}")
            
            # Check for matches
            if abs(buy_hold_return - 1082970) < 100000:
                print("  *** POTENTIAL B&H MATCH! ***")
            if abs(strategy_return - 2766628) < 500000:
                print("  *** POTENTIAL STRATEGY MATCH! ***")
            if strategy_return > 1000000:  # Over 1M%
                print("  *** MASSIVE GAINS! ***")
                
            print()
            
        except Exception as e:
            print(f"  Error: {e}\n")
    
    # Summary table
    print("=== SUMMARY OF CORRECT TIMING RESULTS ===")
    print(f"{'Description':<20} {'Strategy %':>12} {'B&H %':>12} {'Trades':>7}")
    print("-" * 55)
    for result in results:
        print(f"{result['description']:<20} {result['strategy_return']:>12,.0f} "
              f"{result['buy_hold_return']:>12,.0f} {result['total_trades']:>7d}")
    
    return results

if __name__ == "__main__":
    results = test_periods_with_correct_timing()