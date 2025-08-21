#!/usr/bin/env python3
"""
Match the new TradingView results: +55,417.26% return, 71 trades
"""

import pandas as pd
from correct_timing_backtest import CorrectTimingStrategy

def test_for_massive_returns():
    """Test periods and parameters to match +55,417% return with 71 trades"""
    
    print("=== MATCHING NEW TRADINGVIEW RESULTS ===")
    print("Target: +55,417.26% return, 71 trades, 44.59% max drawdown")
    print("Data: Coinbase BTC-USD\n")
    
    # Test different periods that could generate such massive returns
    test_periods = [
        # Very early periods (where such massive gains are possible)
        ('2015-01-01', '2025-08-19', 'Full period 2015-2025'),
        ('2016-01-01', '2025-08-19', '2016-2025'),
        ('2017-01-01', '2025-08-19', '2017-2025'),
        ('2015-01-01', '2024-12-31', '2015-2024'),
        ('2015-01-01', '2023-12-31', '2015-2023'),
        
        # Different start points
        ('2014-01-01', '2025-08-19', '2014-2025 (if data exists)'),
        ('2015-06-01', '2025-08-19', 'Mid-2015 to 2025'),
        ('2015-01-01', '2021-12-31', '2015-2021'),
    ]
    
    results = []
    
    for start_date, end_date, description in test_periods:
        print(f"Testing {description}: {start_date} to {end_date}")
        
        try:
            strategy = CorrectTimingStrategy()
            strategy.start_date = pd.Timestamp(start_date)
            strategy.end_date = pd.Timestamp(end_date)
            
            # Load Coinbase data
            df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            
            if len(df) < 100:
                print("  Insufficient data")
                continue
            
            strategy.run_correct_timing_backtest(df)
            
            # Calculate metrics
            strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
            trade_count = len(strategy.trade_log)
            
            # Calculate max drawdown
            daily_df = pd.DataFrame(strategy.daily_log)
            daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
            daily_df['peak'] = daily_df['total_equity'].cummax()
            daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
            max_drawdown = abs(daily_df['drawdown'].min())
            
            # Win rate
            trade_df = pd.DataFrame(strategy.trade_log)
            closed_trades = trade_df[trade_df['pnl'] != 0]
            win_rate = 0
            if len(closed_trades) > 0:
                winning_trades = closed_trades[closed_trades['pnl'] > 0]
                win_rate = len(winning_trades) / len(closed_trades) * 100
            
            # Price range
            first_price = df['close'].iloc[0]
            last_price = df['close'].iloc[-1]
            
            print(f"  Return: {strategy_return:,.0f}%")
            print(f"  Trades: {trade_count}")
            print(f"  Max DD: {max_drawdown:.1f}%")
            print(f"  Win Rate: {win_rate:.1f}%")
            print(f"  Price: ${first_price:.2f} → ${last_price:.2f}")
            
            # Check for matches
            return_close = abs(strategy_return - 55417) < 5000
            trade_close = abs(trade_count - 71) < 10
            drawdown_close = abs(max_drawdown - 44.59) < 10
            
            match_score = sum([return_close, trade_close, drawdown_close])
            
            if return_close:
                print("  ✅ RETURN MATCHES!")
            if trade_close:
                print("  ✅ TRADE COUNT MATCHES!")
            if drawdown_close:
                print("  ✅ DRAWDOWN MATCHES!")
            
            if match_score >= 2:
                print("  🎯 STRONG MATCH FOUND!")
                
                # Show detailed results
                print(f"  Final Equity: ${strategy.equity:,.0f}")
                
                # Show first 10 trades
                print("  First 10 trades:")
                for i, trade in enumerate(strategy.trade_log[:10]):
                    pnl_str = f"PnL:${trade.get('pnl', 0):8.0f}" if trade.get('pnl', 0) != 0 else "Entry      "
                    print(f"    {i+1:2d}. {trade['date']} | {trade['action']:10} @ ${trade['execution_price']:8.2f} | {pnl_str}")
            
            results.append({
                'description': description,
                'return': strategy_return,
                'trades': trade_count,
                'drawdown': max_drawdown,
                'win_rate': win_rate,
                'match_score': match_score,
                'start_price': first_price,
                'end_price': last_price
            })
            
            print()
            
        except Exception as e:
            print(f"  Error: {e}\n")
    
    # Summary table
    print("=== SUMMARY OF PERIOD TESTS ===")
    print(f"{'Period':<25} {'Return %':>10} {'Trades':>7} {'DrawD%':>7} {'Win%':>5} {'Score':>5}")
    print("-" * 70)
    
    for result in results:
        score_indicator = "🎯" if result['match_score'] >= 2 else "✅" if result['match_score'] == 1 else ""
        print(f"{result['description']:<25} {result['return']:>10.0f} {result['trades']:>7d} "
              f"{result['drawdown']:>7.1f} {result['win_rate']:>5.1f} {result['match_score']:>5d} {score_indicator}")
    
    print(f"{'TradingView Target':<25} {'55417':>10} {'71':>7} {'44.6':>7} {'52.1':>5} {'3':>5} 🎯")
    
    return results

def test_different_parameters_for_massive_gains():
    """Test different strategy parameters to achieve massive gains"""
    
    print(f"\n=== TESTING PARAMETERS FOR MASSIVE GAINS ===")
    
    # For massive gains, we probably need an early start date
    base_start = '2015-01-01'
    base_end = '2025-08-19'
    
    parameter_sets = [
        # (lookback, range_mult, stop_mult, description)
        (20, 0.5, 2.5, "Default"),
        (10, 0.3, 2.0, "Aggressive short-term"),
        (15, 0.4, 2.0, "Moderately aggressive"),
        (25, 0.6, 3.0, "Conservative"),
        (30, 0.7, 3.5, "Very conservative"),
        (5, 0.2, 1.5, "Ultra aggressive"),
        (50, 0.8, 4.0, "Ultra conservative"),
    ]
    
    print(f"Testing period: {base_start} to {base_end}")
    print(f"Target: 71 trades with ~55,000% return\n")
    
    for lookback, range_mult, stop_mult, description in parameter_sets:
        try:
            strategy = CorrectTimingStrategy()
            strategy.lookback_period = lookback
            strategy.range_mult = range_mult
            strategy.stop_loss_mult = stop_mult
            strategy.start_date = pd.Timestamp(base_start)
            strategy.end_date = pd.Timestamp(base_end)
            
            df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            strategy.run_correct_timing_backtest(df)
            
            strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
            trade_count = len(strategy.trade_log)
            
            print(f"{description:<20}: {strategy_return:>10.0f}% | {trade_count:>3d} trades | Params({lookback}, {range_mult}, {stop_mult})")
            
            # Check for close matches
            if abs(trade_count - 71) < 5:
                print(f"  ✅ TRADE COUNT CLOSE!")
            if abs(strategy_return - 55417) < 10000:
                print(f"  ✅ RETURN CLOSE!")
                
        except Exception as e:
            print(f"{description:<20}: Error - {e}")

def main():
    """Main execution"""
    
    results = test_for_massive_returns()
    test_different_parameters_for_massive_gains()
    
    print(f"\n" + "="*60)
    print("FINDINGS:")
    print("1. Looking for +55,417% return with 71 trades")
    print("2. This suggests a very early start date (2015 or earlier)")
    print("3. The massive return indicates compounding from very low Bitcoin prices")
    print("4. Need to find the exact period and parameters TradingView used")

if __name__ == "__main__":
    main()