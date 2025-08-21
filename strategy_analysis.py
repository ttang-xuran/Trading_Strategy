#!/usr/bin/env python3
"""
Detailed analysis of the Adaptive Volatility Breakout Strategy results
"""

import pandas as pd
import numpy as np
from btc_strategy_backtest import BTCTradingStrategy
import matplotlib.pyplot as plt

def analyze_strategy_performance():
    """Perform detailed analysis of strategy performance"""
    
    # Re-run the strategy to get detailed results
    strategy = BTCTradingStrategy()
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_backtest(df)
    
    # Convert trades to DataFrame for analysis
    trades_df = pd.DataFrame(strategy.trades)
    equity_df = pd.DataFrame(strategy.equity_curve)
    
    print("=== DETAILED STRATEGY ANALYSIS ===\n")
    
    # Trade type analysis
    print("TRADE TYPE BREAKDOWN:")
    if not trades_df.empty:
        trade_counts = trades_df['type'].value_counts()
        for trade_type, count in trade_counts.items():
            print(f"{trade_type:20}: {count}")
        print()
    
    # Monthly performance analysis
    print("MONTHLY PERFORMANCE ANALYSIS:")
    equity_df['timestamp'] = pd.to_datetime(equity_df['timestamp'])
    equity_df.set_index('timestamp', inplace=True)
    equity_df['monthly_return'] = equity_df['equity'].resample('M').last().pct_change() * 100
    
    monthly_stats = equity_df['equity'].resample('M').last().pct_change() * 100
    print(f"Best Month:     {monthly_stats.max():.2f}%")
    print(f"Worst Month:    {monthly_stats.min():.2f}%")
    print(f"Avg Month:      {monthly_stats.mean():.2f}%")
    print(f"Volatile Months: {len(monthly_stats[abs(monthly_stats) > 20])}")
    print()
    
    # Trade duration analysis
    if len(trades_df) > 1:
        print("TRADE DURATION ANALYSIS:")
        entry_trades = trades_df[trades_df['type'].isin(['long', 'short'])]
        exit_trades = trades_df[~trades_df['type'].isin(['long', 'short'])]
        
        if len(entry_trades) > 0 and len(exit_trades) > 0:
            # Calculate average time between trades
            trade_intervals = []
            for i in range(1, len(entry_trades)):
                interval = (entry_trades.iloc[i]['timestamp'] - entry_trades.iloc[i-1]['timestamp']).days
                trade_intervals.append(interval)
            
            if trade_intervals:
                print(f"Avg Days Between Trades: {np.mean(trade_intervals):.1f}")
                print(f"Min Days Between Trades: {min(trade_intervals)}")
                print(f"Max Days Between Trades: {max(trade_intervals)}")
        print()
    
    # PnL distribution analysis
    pnl_trades = trades_df[trades_df['pnl'] != 0]
    if not pnl_trades.empty:
        print("PNL DISTRIBUTION ANALYSIS:")
        pnl_values = pnl_trades['pnl']
        print(f"Total PnL:           ${pnl_values.sum():.2f}")
        print(f"Average PnL:         ${pnl_values.mean():.2f}")
        print(f"Median PnL:          ${pnl_values.median():.2f}")
        print(f"PnL Std Dev:         ${pnl_values.std():.2f}")
        print(f"Profit Factor:       {abs(pnl_values[pnl_values > 0].sum() / pnl_values[pnl_values < 0].sum()):.2f}")
        print()
    
    # Drawdown periods analysis
    equity_df['cummax'] = equity_df['equity'].cummax()
    equity_df['drawdown'] = (equity_df['equity'] - equity_df['cummax']) / equity_df['cummax'] * 100
    
    print("DRAWDOWN ANALYSIS:")
    print(f"Max Drawdown:        {equity_df['drawdown'].min():.2f}%")
    print(f"Avg Drawdown:        {equity_df['drawdown'].mean():.2f}%")
    
    # Find drawdown periods
    in_drawdown = equity_df['drawdown'] < -1  # More than 1% drawdown
    drawdown_periods = []
    start_dd = None
    
    for i, is_dd in enumerate(in_drawdown):
        if is_dd and start_dd is None:
            start_dd = i
        elif not is_dd and start_dd is not None:
            drawdown_periods.append(i - start_dd)
            start_dd = None
    
    if drawdown_periods:
        print(f"Avg Drawdown Period: {np.mean(drawdown_periods):.1f} days")
        print(f"Longest Drawdown:    {max(drawdown_periods)} days")
    print()
    
    # Strategy parameter sensitivity analysis
    print("STRATEGY INSIGHTS:")
    
    # Check signal frequency
    signal_data = df[['go_long', 'go_short']].copy()
    long_signals = signal_data['go_long'].sum()
    short_signals = signal_data['go_short'].sum()
    total_bars = len(df)
    
    print(f"Long signals:        {long_signals} ({long_signals/total_bars*100:.2f}% of bars)")
    print(f"Short signals:       {short_signals} ({short_signals/total_bars*100:.2f}% of bars)")
    print(f"Signal frequency:    {(long_signals + short_signals)/total_bars*100:.2f}% of bars")
    
    # Check boundary hit frequency
    df['hit_upper'] = df['high'] > df['upper_boundary']
    df['hit_lower'] = df['low'] < df['lower_boundary']
    
    print(f"Upper boundary hits: {df['hit_upper'].sum()}")
    print(f"Lower boundary hits: {df['hit_lower'].sum()}")
    
    # Volatility analysis
    df['volatility'] = df['close'].pct_change().rolling(20).std() * np.sqrt(252) * 100
    print(f"Avg BTC Volatility:  {df['volatility'].mean():.1f}%")
    print(f"Max BTC Volatility:  {df['volatility'].max():.1f}%")
    print()
    
    # Buy and hold comparison
    buy_hold_return = (df['close'].iloc[-1] / df['close'].iloc[0] - 1) * 100
    print(f"Buy & Hold Return:   {buy_hold_return:.2f}%")
    print(f"Strategy Return:     {(strategy.equity / strategy.initial_capital - 1) * 100:.2f}%")
    print(f"Outperformance:      {(strategy.equity / strategy.initial_capital - 1) * 100 - buy_hold_return:.2f}%")

def plot_detailed_analysis():
    """Create detailed analysis plots"""
    
    strategy = BTCTradingStrategy()
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_backtest(df)
    
    trades_df = pd.DataFrame(strategy.trades)
    equity_df = pd.DataFrame(strategy.equity_curve)
    equity_df['timestamp'] = pd.to_datetime(equity_df['timestamp'])
    equity_df.set_index('timestamp', inplace=True)
    
    fig, axes = plt.subplots(2, 2, figsize=(20, 12))
    
    # Plot 1: Strategy boundaries and signals
    sample_data = df.iloc[-500:].copy()  # Last 500 bars for clarity
    ax1 = axes[0, 0]
    ax1.plot(sample_data.index, sample_data['close'], label='BTC Price', color='black', linewidth=1)
    ax1.plot(sample_data.index, sample_data['upper_boundary'], label='Upper Boundary', color='green', alpha=0.7)
    ax1.plot(sample_data.index, sample_data['lower_boundary'], label='Lower Boundary', color='red', alpha=0.7)
    
    # Mark signals
    long_signals = sample_data[sample_data['go_long']]
    short_signals = sample_data[sample_data['go_short']]
    
    ax1.scatter(long_signals.index, long_signals['close'], color='green', marker='^', s=50, label='Long Signal')
    ax1.scatter(short_signals.index, short_signals['close'], color='red', marker='v', s=50, label='Short Signal')
    
    ax1.set_title('Strategy Signals and Boundaries (Last 500 bars)')
    ax1.set_ylabel('Price ($)')
    ax1.legend()
    
    # Plot 2: PnL distribution
    ax2 = axes[0, 1]
    pnl_trades = trades_df[trades_df['pnl'] != 0]['pnl']
    if not pnl_trades.empty:
        ax2.hist(pnl_trades, bins=20, alpha=0.7, color='blue')
        ax2.axvline(pnl_trades.mean(), color='red', linestyle='--', label=f'Mean: ${pnl_trades.mean():.0f}')
        ax2.set_title('Trade PnL Distribution')
        ax2.set_xlabel('PnL ($)')
        ax2.set_ylabel('Frequency')
        ax2.legend()
    
    # Plot 3: Rolling Sharpe ratio
    ax3 = axes[1, 0]
    equity_df['returns'] = equity_df['equity'].pct_change()
    rolling_sharpe = equity_df['returns'].rolling(252).mean() / equity_df['returns'].rolling(252).std() * np.sqrt(252)
    ax3.plot(equity_df.index, rolling_sharpe)
    ax3.set_title('Rolling 1-Year Sharpe Ratio')
    ax3.set_ylabel('Sharpe Ratio')
    ax3.axhline(0, color='red', linestyle='--', alpha=0.5)
    
    # Plot 4: Monthly returns heatmap
    ax4 = axes[1, 1]
    monthly_returns = equity_df['equity'].resample('M').last().pct_change() * 100
    monthly_returns_pivot = monthly_returns.to_frame()
    monthly_returns_pivot['year'] = monthly_returns_pivot.index.year
    monthly_returns_pivot['month'] = monthly_returns_pivot.index.month
    
    # Create a simple scatter plot instead of heatmap
    ax4.scatter(monthly_returns_pivot['month'], monthly_returns_pivot['year'], 
               c=monthly_returns_pivot['equity'], cmap='RdYlGn', s=50)
    ax4.set_title('Monthly Returns')
    ax4.set_xlabel('Month')
    ax4.set_ylabel('Year')
    
    plt.tight_layout()
    plt.savefig('/home/ttang/Super BTC trading Strategy/detailed_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("Detailed analysis chart saved as 'detailed_analysis.png'")

if __name__ == "__main__":
    analyze_strategy_performance()
    print("\nGenerating detailed analysis plots...")
    plot_detailed_analysis()