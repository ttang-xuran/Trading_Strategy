#!/usr/bin/env python3
"""
Backtest using exact Coinbase BTC-USD data from 2015 to now
This should match TradingView exactly since we're using the same data source
"""

import pandas as pd
import matplotlib.pyplot as plt
from correct_timing_backtest import CorrectTimingStrategy

def run_coinbase_backtest():
    """Run backtest using Coinbase data from 2015 to now"""
    
    print("=== BACKTESTING WITH COINBASE BTC-USD DATA ===")
    print("Period: 2015-01-01 to 2025-08-19")
    print("Data Source: Coinbase (same as TradingView)")
    print("This should match TradingView results exactly!\n")
    
    # Initialize strategy
    strategy = CorrectTimingStrategy()
    strategy.start_date = pd.Timestamp('2015-01-01')
    strategy.end_date = pd.Timestamp('2025-08-19')
    
    # Load Coinbase data
    try:
        df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    except FileNotFoundError:
        print("ERROR: BTC_Coinbase_Historical.csv not found!")
        print("Please run fetch_coinbase_data.py first")
        return None
    
    # Run backtest
    strategy.run_correct_timing_backtest(df)
    
    # Save logs with Coinbase prefix
    strategy.save_logs("coinbase_daily_log.csv", "coinbase_trade_log.csv")
    
    # Calculate comprehensive results
    calculate_comprehensive_results(strategy, df)
    
    # Create comparison analysis
    create_tradingview_comparison(strategy)
    
    return strategy

def calculate_comprehensive_results(strategy, df):
    """Calculate and display comprehensive results"""
    
    # Basic performance metrics
    strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
    first_price = df['close'].iloc[0]
    last_price = df['close'].iloc[-1]
    buy_hold_return = (last_price / first_price - 1) * 100
    
    print("=== COINBASE DATA BACKTEST RESULTS ===")
    print(f"Data Source:         Coinbase BTC-USD (via Yahoo Finance)")
    print(f"Initial Capital:     ${strategy.initial_capital:,.2f}")
    print(f"Final Equity:        ${strategy.equity:,.2f}")
    print(f"Net Profit:          ${strategy.equity - strategy.initial_capital:,.2f}")
    print(f"Strategy Return:     {strategy_return:,.2f}%")
    print(f"Buy & Hold Return:   {buy_hold_return:,.2f}%")
    print(f"Outperformance:      {strategy_return - buy_hold_return:,.2f}%")
    print(f"Total Trades:        {len(strategy.trade_log)}")
    print()
    
    # Risk metrics
    if strategy.trade_log:
        trade_df = pd.DataFrame(strategy.trade_log)
        closed_trades = trade_df[trade_df['pnl'] != 0]
        
        if len(closed_trades) > 0:
            winning_trades = closed_trades[closed_trades['pnl'] > 0]
            losing_trades = closed_trades[closed_trades['pnl'] < 0]
            
            win_rate = len(winning_trades) / len(closed_trades) * 100
            avg_win = winning_trades['pnl'].mean() if len(winning_trades) > 0 else 0
            avg_loss = losing_trades['pnl'].mean() if len(losing_trades) > 0 else 0
            profit_factor = abs(winning_trades['pnl'].sum() / losing_trades['pnl'].sum()) if len(losing_trades) > 0 else float('inf')
            
            print("=== TRADING STATISTICS ===")
            print(f"Win Rate:            {win_rate:.2f}%")
            print(f"Profit Factor:       {profit_factor:.2f}")
            print(f"Average Win:         ${avg_win:,.2f}")
            print(f"Average Loss:        ${avg_loss:,.2f}")
            print(f"Winning Trades:      {len(winning_trades)}")
            print(f"Losing Trades:       {len(losing_trades)}")
            print(f"Largest Win:         ${winning_trades['pnl'].max():,.2f}")
            print(f"Largest Loss:        ${losing_trades['pnl'].min():,.2f}")
            print()
    
    # Calculate max drawdown
    daily_df = pd.DataFrame(strategy.daily_log)
    daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
    daily_df['peak'] = daily_df['total_equity'].cummax()
    daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
    max_drawdown = daily_df['drawdown'].min()
    
    print("=== RISK METRICS ===")
    print(f"Max Drawdown:        {max_drawdown:.2f}%")
    
    # Calculate annualized metrics
    years = (pd.to_datetime(df.index[-1]) - pd.to_datetime(df.index[0])).days / 365.25
    annualized_return = ((strategy.equity / strategy.initial_capital) ** (1/years) - 1) * 100
    annualized_bh = ((last_price / first_price) ** (1/years) - 1) * 100
    
    print(f"Annualized Return:   {annualized_return:.2f}%")
    print(f"Annualized B&H:      {annualized_bh:.2f}%")
    print(f"Years Tested:        {years:.1f}")
    print()

def create_tradingview_comparison(strategy):
    """Create detailed comparison with TradingView"""
    
    print("=== TRADINGVIEW COMPARISON ===")
    print("Expected TradingView Results (from your screenshot):")
    print("- Net Profit: +$2,882,643.12 (+2,770.68%)")
    print("- Total Trades: 39")
    print("- Max Drawdown: 30.68%")
    print()
    
    # Our results
    strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
    
    print(f"Our Coinbase Results:")
    print(f"- Net Profit: +${strategy.equity - strategy.initial_capital:,.2f} ({strategy_return:.2f}%)")
    print(f"- Total Trades: {len(strategy.trade_log)}")
    
    if strategy.daily_log:
        daily_df = pd.DataFrame(strategy.daily_log)
        daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
        daily_df['peak'] = daily_df['total_equity'].cummax()
        daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
        max_drawdown = daily_df['drawdown'].min()
        print(f"- Max Drawdown: {max_drawdown:.2f}%")
    
    print()
    
    # Trade breakdown by action
    if strategy.trade_log:
        trade_df = pd.DataFrame(strategy.trade_log)
        action_counts = trade_df['action'].value_counts()
        
        print("Trade Action Breakdown:")
        for action, count in action_counts.items():
            print(f"  {action}: {count}")
        print()
    
    # Show first 15 trades for manual verification
    print("=== FIRST 15 TRADES (For TradingView Verification) ===")
    for i, trade in enumerate(strategy.trade_log[:15]):
        pnl_str = f"PnL:${trade.get('pnl', 0):8.2f}" if trade.get('pnl', 0) != 0 else "Entry      "
        print(f"{i+1:2d}. {trade['date']} | {trade['action']:10} @ ${trade['execution_price']:8.2f} | "
              f"Size:{trade['position_size']:8.4f} | {pnl_str}")

def analyze_period_performance(strategy):
    """Analyze performance by different periods"""
    
    print("\n=== PERIOD ANALYSIS ===")
    
    # Break down by major periods
    daily_df = pd.DataFrame(strategy.daily_log)
    daily_df['date'] = pd.to_datetime(daily_df['date'])
    
    periods = [
        ('2015-01-01', '2017-12-31', 'Early Period'),
        ('2018-01-01', '2019-12-31', 'Bear/Recovery'),
        ('2020-01-01', '2021-12-31', 'Bull Run'),
        ('2022-01-01', '2023-12-31', 'Recent Cycle'),
        ('2024-01-01', '2025-08-19', 'Current Year')
    ]
    
    prev_equity = strategy.initial_capital
    
    for start_date, end_date, description in periods:
        period_data = daily_df[
            (daily_df['date'] >= start_date) & 
            (daily_df['date'] <= end_date)
        ]
        
        if len(period_data) > 0:
            start_equity = period_data['total_equity'].iloc[0]
            if pd.isna(start_equity):
                start_equity = period_data['equity'].iloc[0]
            
            end_equity = period_data['total_equity'].iloc[-1]
            if pd.isna(end_equity):
                end_equity = period_data['equity'].iloc[-1]
            
            period_return = (end_equity / start_equity - 1) * 100 if start_equity > 0 else 0
            
            print(f"{description} ({start_date} to {end_date}):")
            print(f"  Return: {period_return:8.1f}%")
            print(f"  Equity: ${start_equity:12,.0f} → ${end_equity:12,.0f}")

def main():
    """Main execution"""
    
    strategy = run_coinbase_backtest()
    
    if strategy:
        analyze_period_performance(strategy)
        
        print(f"\n" + "="*60)
        print("FILES CREATED FOR ANALYSIS:")
        print("- coinbase_daily_log.csv: Daily data with signals and actions")
        print("- coinbase_trade_log.csv: Complete trade execution log")
        print()
        print("VERIFICATION STEPS:")
        print("1. Compare trade dates and prices with TradingView")
        print("2. Verify signal generation matches TradingView boundaries")
        print("3. Check position sizes and PnL calculations")
        print("4. Confirm total return and trade count alignment")
        
        return True
    else:
        return False

if __name__ == "__main__":
    success = main()
    
    if not success:
        print("Backtest failed. Please check data files and try again.")