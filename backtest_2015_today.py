#!/usr/bin/env python3
"""
Backtest from 2015 to today - focusing on signal matching
"""

import pandas as pd
import matplotlib.pyplot as plt
from correct_timing_backtest import CorrectTimingStrategy

def run_2015_to_today_backtest():
    """Run backtest from 2015-01-01 to today"""
    
    print("=== BACKTESTING FROM 2015 TO TODAY ===")
    print("Period: 2015-01-01 to 2025-08-19")
    print("Note: Should match TradingView after 2019\n")
    
    # Initialize strategy
    strategy = CorrectTimingStrategy()
    strategy.start_date = pd.Timestamp('2015-01-01')
    strategy.end_date = pd.Timestamp('2025-08-19')
    
    # Load data and run backtest
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_correct_timing_backtest(df)
    
    # Save logs with detailed info
    strategy.save_logs("backtest_2015_today_daily.csv", "backtest_2015_today_trades.csv")
    
    # Calculate performance metrics
    strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
    first_price = df['close'].iloc[0]
    last_price = df['close'].iloc[-1]
    buy_hold_return = (last_price / first_price - 1) * 100
    
    # Print results
    print("=== RESULTS (2015-2025) ===")
    print(f"Initial Capital:     ${strategy.initial_capital:,.2f}")
    print(f"Final Equity:        ${strategy.equity:,.2f}")
    print(f"Net Profit:          ${strategy.equity - strategy.initial_capital:,.2f}")
    print(f"Strategy Return:     {strategy_return:,.2f}%")
    print(f"Buy & Hold Return:   {buy_hold_return:,.2f}%")
    print(f"Outperformance:      {strategy_return - buy_hold_return:,.2f}%")
    print(f"Total Trades:        {len(strategy.trade_log)}")
    print()
    
    # Break down by periods
    analyze_by_periods(strategy)
    
    # Show recent trades (post-2019) for verification
    print("=== POST-2019 TRADES (Should match TradingView) ===")
    post_2019_trades = [t for t in strategy.trade_log if t['date'] >= '2019-01-01']
    print(f"Total post-2019 trades: {len(post_2019_trades)}")
    
    for i, trade in enumerate(post_2019_trades[:15]):  # Show first 15 post-2019 trades
        pnl_str = f"PnL:${trade.get('pnl', 0):8.2f}" if trade.get('pnl', 0) != 0 else "Entry      "
        print(f"{i+1:2d}. {trade['date']} | {trade['action']:10} @ ${trade['execution_price']:8.2f} | {pnl_str}")
    
    # Show pre-2019 vs post-2019 performance
    pre_2019_trades = [t for t in strategy.trade_log if t['date'] < '2019-01-01']
    
    print(f"\n=== PERIOD BREAKDOWN ===")
    print(f"Pre-2019 trades:  {len(pre_2019_trades)} (signals may not match TradingView)")
    print(f"Post-2019 trades: {len(post_2019_trades)} (should match TradingView exactly)")
    
    return strategy

def analyze_by_periods(strategy):
    """Analyze performance by different periods"""
    
    # Calculate equity at key dates
    daily_df = pd.DataFrame(strategy.daily_log)
    daily_df['date'] = pd.to_datetime(daily_df['date'])
    
    key_dates = [
        ('2015-01-01', 'Start'),
        ('2018-01-01', 'Pre-signal issues end'),
        ('2019-01-01', 'TradingView match begins'),
        ('2020-01-01', 'COVID period'),
        ('2021-01-01', 'Bull run'),
        ('2025-08-19', 'End')
    ]
    
    print("=== PERIOD ANALYSIS ===")
    prev_equity = strategy.initial_capital
    prev_date = '2015-01-01'
    
    for date_str, description in key_dates:
        date_data = daily_df[daily_df['date'] <= date_str]
        if len(date_data) > 0:
            current_equity = date_data['total_equity'].iloc[-1]
            if pd.isna(current_equity):
                current_equity = date_data['equity'].iloc[-1]
            
            period_return = (current_equity / prev_equity - 1) * 100 if prev_equity > 0 else 0
            
            print(f"{prev_date} to {date_str} ({description})")
            print(f"  Equity: ${prev_equity:12,.0f} → ${current_equity:12,.0f}")
            print(f"  Return: {period_return:8.1f}%")
            print()
            
            prev_equity = current_equity
            prev_date = date_str

def create_detailed_analysis():
    """Create detailed signal analysis for debugging"""
    
    print("\n=== CREATING DETAILED SIGNAL ANALYSIS ===")
    
    # Load the daily log
    try:
        daily_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/backtest_2015_today_daily.csv')
        
        # Focus on periods with signals
        signal_days = daily_df[
            (daily_df['go_long_signal'] == True) | 
            (daily_df['go_short_signal'] == True)
        ]
        
        print(f"Total signal days: {len(signal_days)}")
        
        # Show signals by year
        signal_days['year'] = pd.to_datetime(signal_days['date']).dt.year
        signals_by_year = signal_days['year'].value_counts().sort_index()
        
        print("\nSignals by year:")
        for year, count in signals_by_year.items():
            print(f"  {year}: {count} signals")
        
        # Show pre-2019 vs post-2019 signals
        pre_2019_signals = signal_days[signal_days['year'] < 2019]
        post_2019_signals = signal_days[signal_days['year'] >= 2019]
        
        print(f"\nPre-2019 signals:  {len(pre_2019_signals)} (may not match TradingView)")
        print(f"Post-2019 signals: {len(post_2019_signals)} (should match TradingView)")
        
        # Save focused analysis
        pre_2019_signals.to_csv('/home/ttang/Super BTC trading Strategy/pre_2019_signals.csv', index=False)
        post_2019_signals.to_csv('/home/ttang/Super BTC trading Strategy/post_2019_signals.csv', index=False)
        
        print("\nDetailed signal files created:")
        print("- pre_2019_signals.csv (for debugging signal differences)")
        print("- post_2019_signals.csv (should match TradingView)")
        
    except Exception as e:
        print(f"Could not create detailed analysis: {e}")

if __name__ == "__main__":
    strategy = run_2015_to_today_backtest()
    create_detailed_analysis()
    
    print("\n" + "="*60)
    print("SUMMARY:")
    print("- 2015-2018: Signals may differ from TradingView")
    print("- 2019+: Should match TradingView trade-by-trade")
    print("- Use the CSV files to compare specific signals and trades")