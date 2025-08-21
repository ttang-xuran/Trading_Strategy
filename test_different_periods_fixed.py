#!/usr/bin/env python3
"""
Test the fixed implementation on different time periods to match TradingView
"""

import pandas as pd
from fixed_pine_script_backtest import FixedPineScriptStrategy

def test_multiple_periods():
    """Test different periods to find TradingView match"""
    
    periods_to_test = [
        # Original period
        ('2020-01-01', '2025-08-19', "Current period"),
        
        # Extended periods for massive gains
        ('2010-01-01', '2025-08-19', "From early Bitcoin"),
        ('2011-01-01', '2025-08-19', "From $0.30 era"), 
        ('2012-01-01', '2025-08-19', "From $5 era"),
        ('2013-01-01', '2025-08-19', "From $11 era"),
        
        # Different end dates
        ('2020-01-01', '2024-11-01', "To peak season"),
        ('2019-01-01', '2025-08-19', "Extended recent"),
    ]
    
    results = []
    
    print("=== TESTING FIXED STRATEGY ON MULTIPLE PERIODS ===\n")
    
    for start_date, end_date, description in periods_to_test:
        print(f"Testing {description}: {start_date} to {end_date}")
        
        try:
            strategy = FixedPineScriptStrategy()
            strategy.start_date = pd.Timestamp(start_date)
            strategy.end_date = pd.Timestamp(end_date)
            
            df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
            
            if len(df) < 50:
                print("  Insufficient data\n")
                continue
                
            strategy.run_fixed_backtest(df)
            
            # Calculate results
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
            
            print(f"  Start Price: ${first_price:,.6f}")
            print(f"  End Price:   ${last_price:,.2f}")
            print(f"  B&H Return:  {buy_hold_return:,.0f}%")
            print(f"  Strategy:    {strategy_return:,.0f}%")
            print(f"  Trades:      {len(strategy.trade_log)}")
            print(f"  Final Equity: ${strategy.equity:,.0f}")
            
            # Check for TradingView matches
            if abs(buy_hold_return - 1082970) < 100000:  # B&H match
                print("  *** POTENTIAL B&H MATCH! ***")
            if abs(strategy_return - 2766628) < 500000:  # Strategy match
                print("  *** POTENTIAL STRATEGY MATCH! ***")
            if len(strategy.trade_log) > 140 and len(strategy.trade_log) < 170:  # Trade count match
                print("  *** TRADE COUNT CLOSE! ***")
                
            print()
            
        except Exception as e:
            print(f"  Error: {e}\n")
    
    # Find best matches
    print("=== SUMMARY OF RESULTS ===")
    for result in results:
        print(f"{result['description']:20}: Strategy {result['strategy_return']:8.0f}%, "
              f"B&H {result['buy_hold_return']:8.0f}%, Trades {result['total_trades']:3d}")
    
    return results

if __name__ == "__main__":
    results = test_multiple_periods()