#!/usr/bin/env python3
"""
Backtest the corrected strategy from 2013 to today
"""

import pandas as pd
import matplotlib.pyplot as plt
from correct_timing_backtest import CorrectTimingStrategy

def run_2013_to_today_backtest():
    """Run backtest from 2013-01-01 to today"""
    
    print("=== BACKTESTING FROM 2013 TO TODAY ===")
    print("Period: 2013-01-01 to 2025-08-19\n")
    
    # Initialize strategy
    strategy = CorrectTimingStrategy()
    strategy.start_date = pd.Timestamp('2013-01-01')
    strategy.end_date = pd.Timestamp('2025-08-19')  # Today
    
    # Load data and run backtest
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_correct_timing_backtest(df)
    
    # Save logs
    strategy.save_logs("backtest_2013_today_daily.csv", "backtest_2013_today_trades.csv")
    
    # Calculate performance metrics
    strategy_return = (strategy.equity / strategy.initial_capital - 1) * 100
    first_price = df['close'].iloc[0]
    last_price = df['close'].iloc[-1]
    buy_hold_return = (last_price / first_price - 1) * 100
    
    # Calculate additional metrics
    daily_df = pd.DataFrame(strategy.daily_log)
    daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
    
    # Max drawdown
    daily_df['peak'] = daily_df['total_equity'].cummax()
    daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
    max_drawdown = daily_df['drawdown'].min()
    
    # Win rate
    if strategy.trade_log:
        trade_df = pd.DataFrame(strategy.trade_log)
        closed_trades = trade_df[trade_df['pnl'] != 0]
        if len(closed_trades) > 0:
            winning_trades = closed_trades[closed_trades['pnl'] > 0]
            win_rate = len(winning_trades) / len(closed_trades) * 100
            avg_win = winning_trades['pnl'].mean() if len(winning_trades) > 0 else 0
            avg_loss = closed_trades[closed_trades['pnl'] < 0]['pnl'].mean()
            profit_factor = abs(winning_trades['pnl'].sum() / closed_trades[closed_trades['pnl'] < 0]['pnl'].sum()) if len(closed_trades[closed_trades['pnl'] < 0]) > 0 else float('inf')
        else:
            win_rate = avg_win = avg_loss = profit_factor = 0
    else:
        win_rate = avg_win = avg_loss = profit_factor = 0
    
    # Print comprehensive results
    print("=== COMPREHENSIVE RESULTS (2013-2025) ===")
    print(f"Initial Capital:     ${strategy.initial_capital:,.2f}")
    print(f"Final Equity:        ${strategy.equity:,.2f}")
    print(f"Net Profit:          ${strategy.equity - strategy.initial_capital:,.2f}")
    print(f"Strategy Return:     {strategy_return:,.2f}%")
    print(f"Buy & Hold Return:   {buy_hold_return:,.2f}%")
    print(f"Outperformance:      {strategy_return - buy_hold_return:,.2f}%")
    print()
    
    print("=== RISK METRICS ===")
    print(f"Max Drawdown:        {max_drawdown:.2f}%")
    print(f"Total Trades:        {len(strategy.trade_log)}")
    print(f"Win Rate:            {win_rate:.2f}%")
    print(f"Profit Factor:       {profit_factor:.2f}")
    print(f"Average Win:         ${avg_win:,.2f}")
    print(f"Average Loss:        ${avg_loss:,.2f}")
    print()
    
    print("=== PERIOD ANALYSIS ===")
    print(f"Start Date:          {df.index[0].strftime('%Y-%m-%d')}")
    print(f"End Date:            {df.index[-1].strftime('%Y-%m-%d')}")
    print(f"Total Days:          {len(df)}")
    print(f"Start Price:         ${first_price:,.2f}")
    print(f"End Price:           ${last_price:,.2f}")
    print(f"Price Appreciation:  {((last_price/first_price - 1) * 100):,.1f}%")
    print()
    
    # Trade breakdown
    if strategy.trade_log:
        trade_df = pd.DataFrame(strategy.trade_log)
        trade_counts = trade_df['action'].value_counts()
        print("=== TRADE BREAKDOWN ===")
        for action, count in trade_counts.items():
            print(f"{action:12}: {count}")
        print()
    
    # Annual returns
    daily_df['date'] = pd.to_datetime(daily_df['date'])
    daily_df.set_index('date', inplace=True)
    
    print("=== ANNUAL PERFORMANCE ===")
    annual_returns = []
    for year in range(2013, 2026):
        year_data = daily_df[daily_df.index.year == year]
        if len(year_data) > 0:
            start_equity = year_data['total_equity'].iloc[0]
            end_equity = year_data['total_equity'].iloc[-1]
            if start_equity > 0:
                annual_return = (end_equity / start_equity - 1) * 100
                annual_returns.append((year, annual_return, start_equity, end_equity))
                print(f"{year}: {annual_return:8.1f}% (${start_equity:12,.0f} → ${end_equity:12,.0f})")
    
    # First 10 trades
    print(f"\n=== FIRST 10 TRADES ===")
    for i, trade in enumerate(strategy.trade_log[:10]):
        pnl_str = f"PnL:${trade.get('pnl', 0):8.2f}" if trade.get('pnl', 0) != 0 else "Entry      "
        print(f"{i+1:2d}. {trade['date']} | {trade['action']:10} @ ${trade['execution_price']:8.2f} | "
              f"Size:{trade['position_size']:8.4f} | {pnl_str}")
    
    # Create simple performance chart
    create_performance_chart(daily_df, strategy_return, buy_hold_return)
    
    return strategy, daily_df

def create_performance_chart(daily_df, strategy_return, buy_hold_return):
    """Create a performance chart"""
    
    try:
        # Calculate buy & hold equity curve
        first_price = daily_df['close'].iloc[0]
        daily_df['bh_equity'] = (daily_df['close'] / first_price) * 100000  # Start with $100k
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        
        # Plot 1: Equity curves
        ax1.plot(daily_df.index, daily_df['total_equity'], label=f'Strategy ({strategy_return:.0f}%)', 
                color='green', linewidth=2)
        ax1.plot(daily_df.index, daily_df['bh_equity'], label=f'Buy & Hold ({buy_hold_return:.0f}%)', 
                color='blue', linewidth=1, alpha=0.7)
        ax1.set_ylabel('Portfolio Value ($)')
        ax1.set_title('Strategy Performance: 2013-2025')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        ax1.set_yscale('log')  # Log scale to handle large range
        
        # Plot 2: Drawdown
        daily_df['peak'] = daily_df['total_equity'].cummax()
        daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
        
        ax2.fill_between(daily_df.index, daily_df['drawdown'], 0, 
                        color='red', alpha=0.3, label='Drawdown')
        ax2.plot(daily_df.index, daily_df['drawdown'], color='red', linewidth=1)
        ax2.set_ylabel('Drawdown (%)')
        ax2.set_xlabel('Date')
        ax2.set_title('Strategy Drawdown')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('/home/ttang/Super BTC trading Strategy/backtest_2013_2025_performance.png', 
                   dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Performance chart saved as 'backtest_2013_2025_performance.png'")
        
    except Exception as e:
        print(f"Could not create chart: {e}")

if __name__ == "__main__":
    strategy, daily_df = run_2013_to_today_backtest()