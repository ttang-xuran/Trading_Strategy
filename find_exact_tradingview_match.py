#!/usr/bin/env python3
"""
More targeted search for exact TradingView match
+55,417% return with 71 trades
"""

import pandas as pd
from correct_timing_backtest import CorrectTimingStrategy

def test_early_bitcoin_periods():
    """Test very early Bitcoin periods for massive gains"""
    
    print("=== TESTING VERY EARLY BITCOIN PERIODS ===")
    print("Looking for periods that could generate +55,417% return\n")
    
    # Check our data's earliest date
    df_full = pd.read_csv('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    df_full['datetime'] = pd.to_datetime(df_full['datetime'], format='%m/%d/%Y')
    df_full.set_index('datetime', inplace=True)
    
    print(f"Our data range: {df_full.index[0]} to {df_full.index[-1]}")
    print(f"First price: ${df_full['close'].iloc[0]:.2f}")
    print(f"Lowest price in dataset: ${df_full['close'].min():.2f}")
    print()
    
    # Calculate what starting price would give 55,417% return
    end_price = df_full['close'].iloc[-1]  # Current price
    target_return = 554.17  # 55,417% = 554.17x multiplier
    required_start_price = end_price / target_return
    
    print(f"To achieve 55,417% return:")
    print(f"End price: ${end_price:.2f}")
    print(f"Required start price: ${required_start_price:.2f}")
    print(f"Our actual start price: ${df_full['close'].iloc[0]:.2f}")
    print()
    
    # Find date when Bitcoin was around the required price
    low_price_data = df_full[df_full['close'] <= required_start_price]
    if len(low_price_data) > 0:
        print(f"Bitcoin was ${required_start_price:.2f} or lower on these dates:")
        print(low_price_data.head(10)[['close']])
        
        # Test from the lowest price date
        start_date = low_price_data.index[0]
        print(f"\nTesting from lowest price date: {start_date}")
        
        strategy = CorrectTimingStrategy()
        strategy.start_date = pd.Timestamp(start_date)
        strategy.end_date = pd.Timestamp('2025-08-19')
        
        test_df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
        strategy.run_correct_timing_backtest(test_df)
        
        strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
        print(f"Result: {strategy_return:.0f}% return with {len(strategy.trade_log)} trades")
    
    else:
        print("No data found at the required low price level")

def test_conservative_parameters_fine_tuning():
    """Fine-tune conservative parameters that gave 68 trades (close to 71)"""
    
    print(f"\n=== FINE-TUNING CONSERVATIVE PARAMETERS ===")
    print("Base: (25, 0.6, 3.0) gave 68 trades, need 71")
    print("Testing variations around these parameters\n")
    
    base_period = ('2015-01-01', '2025-08-19')
    
    # Fine-tune around the conservative parameters
    parameter_variations = [
        # Around lookback=25
        (23, 0.6, 3.0, "Lookback 23"),
        (24, 0.6, 3.0, "Lookback 24"),
        (25, 0.6, 3.0, "Base (68 trades)"),
        (26, 0.6, 3.0, "Lookback 26"),
        (27, 0.6, 3.0, "Lookback 27"),
        
        # Around range_mult=0.6
        (25, 0.55, 3.0, "Range 0.55"),
        (25, 0.58, 3.0, "Range 0.58"),
        (25, 0.62, 3.0, "Range 0.62"),
        (25, 0.65, 3.0, "Range 0.65"),
        
        # Around stop_mult=3.0
        (25, 0.6, 2.8, "Stop 2.8"),
        (25, 0.6, 2.9, "Stop 2.9"),
        (25, 0.6, 3.1, "Stop 3.1"),
        (25, 0.6, 3.2, "Stop 3.2"),
        
        # Combinations
        (24, 0.58, 2.9, "Combo 1"),
        (26, 0.62, 3.1, "Combo 2"),
        (23, 0.55, 2.8, "Combo 3"),
    ]
    
    results = []
    
    for lookback, range_mult, stop_mult, description in parameter_variations:
        try:
            strategy = CorrectTimingStrategy()
            strategy.lookback_period = lookback
            strategy.range_mult = range_mult
            strategy.stop_loss_mult = stop_mult
            strategy.start_date = pd.Timestamp(base_period[0])
            strategy.end_date = pd.Timestamp(base_period[1])
            
            df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            strategy.run_correct_timing_backtest(df)
            
            strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
            trade_count = len(strategy.trade_log)
            
            # Calculate max drawdown
            daily_df = pd.DataFrame(strategy.daily_log)
            daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
            daily_df['peak'] = daily_df['total_equity'].cummax()
            daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
            max_drawdown = abs(daily_df['drawdown'].min())
            
            trade_match = abs(trade_count - 71) <= 2
            match_indicator = "🎯" if trade_match else "✅" if abs(trade_count - 71) <= 5 else ""
            
            print(f"{description:<15}: {strategy_return:>8.0f}% | {trade_count:>3d} trades | DD: {max_drawdown:>5.1f}% {match_indicator}")
            
            if trade_match:
                print(f"  *** CLOSE MATCH! Testing for higher returns ***")
                # If we get the right trade count, save for further analysis
                results.append({
                    'params': (lookback, range_mult, stop_mult),
                    'description': description,
                    'return': strategy_return,
                    'trades': trade_count,
                    'drawdown': max_drawdown
                })
            
        except Exception as e:
            print(f"{description:<15}: Error - {e}")
    
    return results

def test_extreme_early_period():
    """Test if there's an even earlier period in our data"""
    
    print(f"\n=== TESTING EXTREME SCENARIOS ===")
    
    # What if TradingView uses different position sizing?
    print("Testing different position sizing approaches:")
    
    strategy = CorrectTimingStrategy()
    strategy.start_date = pd.Timestamp('2015-01-01')
    strategy.end_date = pd.Timestamp('2025-08-19')
    
    # Test with different equity percentages
    for equity_pct in [50, 75, 95, 99, 100]:
        try:
            strategy_test = CorrectTimingStrategy()
            strategy_test.qty_value = equity_pct
            strategy_test.start_date = pd.Timestamp('2015-01-01')
            strategy_test.end_date = pd.Timestamp('2025-08-19')
            
            df = strategy_test.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            strategy_test.run_correct_timing_backtest(df)
            
            strategy_return = (strategy_test.equity / strategy_test.initial_capital - 1) * 100
            
            print(f"  {equity_pct}% equity sizing: {strategy_return:,.0f}% return")
            
        except Exception as e:
            print(f"  {equity_pct}% equity sizing: Error - {e}")

def main():
    """Main execution"""
    
    test_early_bitcoin_periods()
    results = test_conservative_parameters_fine_tuning()
    test_extreme_early_period()
    
    print(f"\n" + "="*60)
    print("ANALYSIS SUMMARY:")
    print("1. TradingView's +55,417% return suggests a very specific configuration")
    print("2. Need to find the exact combination of period + parameters")
    print("3. The 71 trades suggests conservative parameters")
    print("4. May need to check TradingView's exact settings")
    
    if results:
        print(f"\nBest trade count matches found:")
        for result in results:
            print(f"  {result['description']}: {result['trades']} trades, {result['return']:.0f}% return")

if __name__ == "__main__":
    main()