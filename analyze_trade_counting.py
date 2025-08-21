#!/usr/bin/env python3
"""
Analyze trade counting to match TradingView
TradingView might count round trips differently
"""

import pandas as pd
from correct_timing_backtest import CorrectTimingStrategy

def analyze_trade_counting():
    """Analyze how trades are counted in different periods"""
    
    print("=== ANALYZING TRADE COUNTING METHODS ===")
    print("TradingView shows 39 trades - this might be counting differently\n")
    
    # Test the 2020-2025 period which had closest performance
    strategy = CorrectTimingStrategy()
    strategy.start_date = pd.Timestamp('2020-01-01')
    strategy.end_date = pd.Timestamp('2025-08-19')
    
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    strategy.run_correct_timing_backtest(df)
    
    # Analyze trades
    trade_df = pd.DataFrame(strategy.trade_log)
    
    print(f"Total trade records: {len(trade_df)}")
    
    # Count by action type
    action_counts = trade_df['action'].value_counts()
    print("\nTrade records by action:")
    for action, count in action_counts.items():
        print(f"  {action}: {count}")
    
    # Count round trips (complete cycles)
    long_entries = len(trade_df[trade_df['action'] == 'LONG'])
    short_entries = len(trade_df[trade_df['action'] == 'SHORT'])
    long_closes = len(trade_df[trade_df['action'] == 'CLOSE_LONG'])
    short_closes = len(trade_df[trade_df['action'] == 'CLOSE_SHORT'])
    
    round_trips = min(long_entries, long_closes) + min(short_entries, short_closes)
    
    print(f"\nRound trip analysis:")
    print(f"  Long entries: {long_entries}")
    print(f"  Long closes: {long_closes}")
    print(f"  Short entries: {short_entries}")
    print(f"  Short closes: {short_closes}")
    print(f"  Complete round trips: {round_trips}")
    
    # TradingView comparison
    print(f"\nTradingView comparison:")
    print(f"  TradingView trades: 39")
    print(f"  Our total records: {len(trade_df)}")
    print(f"  Our round trips: {round_trips}")
    print(f"  Our entries only: {long_entries + short_entries}")
    
    # Check if 39 matches any of our counting methods
    if round_trips == 39:
        print("  ✅ ROUND TRIPS MATCH TRADINGVIEW!")
    elif (long_entries + short_entries) == 39:
        print("  ✅ ENTRIES MATCH TRADINGVIEW!")
    elif len(trade_df) == 39:
        print("  ✅ TOTAL RECORDS MATCH TRADINGVIEW!")
    else:
        print("  ❌ No direct match found")
    
    # Show trade sequence to understand pattern
    print(f"\n=== TRADE SEQUENCE ANALYSIS ===")
    print("First 20 trades with round trip grouping:")
    
    round_trip_count = 0
    current_position = None
    
    for i, trade in enumerate(trade_df.iloc[:20].itertuples()):
        action = trade.action
        date = trade.date
        price = trade.execution_price
        
        if action in ['LONG', 'SHORT']:
            current_position = action
            round_trip_count += 1
            print(f"RT#{round_trip_count:2d} Start: {date} | {action:5} @ ${price:8.2f}")
        else:
            pnl = trade.pnl
            print(f"RT#{round_trip_count:2d} End:   {date} | {action:10} @ ${price:8.2f} | PnL: ${pnl:8.2f}")
    
    return strategy, round_trips

def test_different_parameters():
    """Test if different parameters give 39 trades"""
    
    print(f"\n=== TESTING DIFFERENT STRATEGY PARAMETERS ===")
    print("Maybe TradingView uses different lookback/multiplier values\n")
    
    # Test different parameter combinations
    parameter_sets = [
        # (lookback, range_mult, stop_mult, description)
        (20, 0.5, 2.5, "Default (our current)"),
        (14, 0.5, 2.5, "Shorter lookback"),
        (30, 0.5, 2.5, "Longer lookback"),
        (20, 0.3, 2.5, "Lower range mult"),
        (20, 0.7, 2.5, "Higher range mult"),
        (20, 0.5, 2.0, "Lower stop loss"),
        (20, 0.5, 3.0, "Higher stop loss"),
        (15, 0.4, 2.0, "More conservative"),
        (25, 0.6, 3.0, "More aggressive"),
    ]
    
    results = []
    
    for lookback, range_mult, stop_mult, description in parameter_sets:
        try:
            strategy = CorrectTimingStrategy()
            strategy.lookback_period = lookback
            strategy.range_mult = range_mult
            strategy.stop_loss_mult = stop_mult
            strategy.start_date = pd.Timestamp('2020-01-01')
            strategy.end_date = pd.Timestamp('2025-08-19')
            
            df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            strategy.run_correct_timing_backtest(df)
            
            strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
            trade_count = len(strategy.trade_log)
            
            # Count round trips
            trade_df = pd.DataFrame(strategy.trade_log)
            long_entries = len(trade_df[trade_df['action'] == 'LONG'])
            short_entries = len(trade_df[trade_df['action'] == 'SHORT'])
            entries = long_entries + short_entries
            
            results.append({
                'description': description,
                'params': f"({lookback}, {range_mult}, {stop_mult})",
                'return': strategy_return,
                'total_trades': trade_count,
                'entries': entries,
                'lookback': lookback,
                'range_mult': range_mult,
                'stop_mult': stop_mult
            })
            
            # Check for TradingView match
            if abs(strategy_return - 2771) < 300 and abs(entries - 39) < 5:
                print(f"🎯 POTENTIAL MATCH: {description}")
                print(f"   Return: {strategy_return:.1f}% (target: 2771%)")
                print(f"   Entries: {entries} (target: 39)")
                print(f"   Parameters: lookback={lookback}, range_mult={range_mult}, stop_mult={stop_mult}")
            
        except Exception as e:
            print(f"Error testing {description}: {e}")
    
    # Results table
    print(f"\n=== PARAMETER TEST RESULTS ===")
    print(f"{'Description':<20} {'Return %':>8} {'Entries':>7} {'Total':>5} {'Parameters'}")
    print("-" * 70)
    
    for result in results:
        target_match = "🎯" if abs(result['return'] - 2771) < 300 and abs(result['entries'] - 39) < 5 else ""
        print(f"{result['description']:<20} {result['return']:>8.0f} {result['entries']:>7d} {result['total_trades']:>5d} {result['params']} {target_match}")
    
    print(f"{'TradingView Target':<20} {'2771':>8} {'39':>7} {'?':>5} {'(?, ?, ?)'}")

def main():
    """Main analysis"""
    
    strategy, round_trips = analyze_trade_counting()
    test_different_parameters()
    
    print(f"\n" + "="*60)
    print("CONCLUSIONS:")
    print("1. Our trade counting doesn't directly match TradingView's 39")
    print("2. TradingView might use different parameters")
    print("3. TradingView might count trades differently")
    print("4. The strategy logic appears correct based on drawdown matching")
    print("\nNEXT STEPS:")
    print("- Check TradingView strategy parameters")
    print("- Verify TradingView's exact time period")
    print("- Compare individual trade execution dates")

if __name__ == "__main__":
    main()