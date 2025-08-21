#!/usr/bin/env python3
"""
Compare Coinbase vs Binance backtests for the same overlapping period
Provide yearly breakdown for both data sources
"""

import pandas as pd
import numpy as np
from exact_pine_script_implementation import ExactPineScriptStrategy

def run_backtest_for_period(data_file, start_date, end_date, source_name):
    """Run backtest for specific period"""
    
    print(f"\n=== {source_name.upper()} BACKTEST ({start_date} to {end_date}) ===")
    
    # Initialize strategy with specific date range
    strategy = ExactPineScriptStrategy()
    strategy.start_date = pd.Timestamp(start_date)
    strategy.end_date = pd.Timestamp(end_date)
    
    # Load and prepare data
    df = strategy.load_and_prepare_data(data_file)
    
    print(f"Data range: {df.index[0]} to {df.index[-1]}")
    print(f"Total bars: {len(df)}")
    
    # Run backtest
    strategy.run_exact_backtest(df)
    
    # Calculate results
    final_return = (strategy.equity / strategy.initial_capital - 1) * 100
    
    # Calculate win rate
    trades_df = pd.DataFrame(strategy.trades)
    if not trades_df.empty:
        pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
        if len(pnl_trades) > 0:
            winning_trades = pnl_trades[pnl_trades['pnl'] > 0]
            win_rate = len(winning_trades) / len(pnl_trades) * 100
        else:
            win_rate = 0
    else:
        win_rate = 0
    
    # Calculate max drawdown
    if strategy.daily_data:
        daily_df = pd.DataFrame(strategy.daily_data)
        daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
        daily_df['peak'] = daily_df['total_equity'].cummax()
        daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
        max_drawdown = abs(daily_df['drawdown'].min())
    else:
        max_drawdown = 0
    
    print(f"Final Results:")
    print(f"  Total Return: {final_return:.1f}%")
    print(f"  Total Trades: {len(strategy.trades)}")
    print(f"  Win Rate: {win_rate:.1f}%")
    print(f"  Max Drawdown: {max_drawdown:.1f}%")
    print(f"  Final Equity: ${strategy.equity:,.0f}")
    
    return {
        'strategy': strategy,
        'final_return': final_return,
        'total_trades': len(strategy.trades),
        'win_rate': win_rate,
        'max_drawdown': max_drawdown,
        'final_equity': strategy.equity
    }

def analyze_yearly_performance(strategy, source_name):
    """Analyze yearly performance for a strategy"""
    
    print(f"\n=== {source_name.upper()} YEARLY BREAKDOWN ===")
    
    if not strategy.trades:
        print("No trades to analyze")
        return []
    
    # Convert to DataFrames
    trades_df = pd.DataFrame(strategy.trades)
    trades_df['date'] = pd.to_datetime(trades_df['date'])
    trades_df['year'] = trades_df['date'].dt.year
    
    daily_df = pd.DataFrame(strategy.daily_data)
    daily_df['date'] = pd.to_datetime(daily_df['date'])
    daily_df['year'] = daily_df['date'].dt.year
    
    # Get unique years
    years = sorted(trades_df['year'].unique())
    
    print(f"{'Year':<6} {'Trades':<7} {'PnL ($)':<15} {'Return %':<10} {'Win Rate %':<11} {'Max DD %':<10}")
    print("-" * 70)
    
    initial_capital = 100000
    yearly_results = []
    
    for year in years:
        year_trades = trades_df[trades_df['year'] == year].copy()
        year_daily = daily_df[daily_df['year'] == year].copy()
        
        if len(year_trades) == 0:
            continue
            
        # Count trades (only entry trades to avoid double counting)
        entry_trades = year_trades[year_trades['action'].str.contains('ENTRY')]
        trade_count = len(entry_trades)
        
        # Calculate PnL for the year
        year_start_equity = year_trades['equity'].iloc[0] if len(year_trades) > 0 else initial_capital
        year_end_equity = year_trades['equity'].iloc[-1] if len(year_trades) > 0 else initial_capital
        
        # Find starting equity from previous year
        if year == years[0]:
            start_equity = initial_capital
        else:
            prev_year_trades = trades_df[trades_df['year'] < year]
            if len(prev_year_trades) > 0:
                start_equity = prev_year_trades['equity'].iloc[-1]
            else:
                start_equity = initial_capital
        
        year_pnl = year_end_equity - start_equity
        year_return = (year_end_equity / start_equity - 1) * 100 if start_equity > 0 else 0
        
        # Calculate win rate
        closed_trades = year_trades[year_trades['pnl'].notna() & (year_trades['pnl'] != 0)]
        if len(closed_trades) > 0:
            winning_trades = closed_trades[closed_trades['pnl'] > 0]
            win_rate = len(winning_trades) / len(closed_trades) * 100
        else:
            win_rate = 0
        
        # Calculate max drawdown for the year
        if len(year_daily) > 0:
            year_daily_sorted = year_daily.sort_values('date')
            year_daily_sorted['total_equity'] = year_daily_sorted['total_equity'].fillna(year_daily_sorted['equity'])
            year_daily_sorted['peak'] = year_daily_sorted['total_equity'].cummax()
            year_daily_sorted['drawdown'] = (year_daily_sorted['total_equity'] - year_daily_sorted['peak']) / year_daily_sorted['peak'] * 100
            max_drawdown = abs(year_daily_sorted['drawdown'].min()) if not year_daily_sorted['drawdown'].isna().all() else 0
        else:
            max_drawdown = 0
        
        print(f"{year:<6} {trade_count:<7} ${year_pnl:<14,.0f} {year_return:<9.1f} {win_rate:<10.1f} {max_drawdown:<9.1f}")
        
        yearly_results.append({
            'year': year,
            'source': source_name,
            'trades': trade_count,
            'pnl': year_pnl,
            'return': year_return,
            'win_rate': win_rate,
            'max_drawdown': max_drawdown,
            'start_equity': start_equity,
            'end_equity': year_end_equity
        })
    
    return yearly_results

def compare_yearly_results(coinbase_yearly, binance_yearly):
    """Compare yearly results side by side"""
    
    print(f"\n{'='*80}")
    print("SIDE-BY-SIDE YEARLY COMPARISON")
    print(f"{'='*80}")
    
    # Create comparison table
    print(f"{'Year':<6} {'CB Trades':<9} {'BN Trades':<9} {'CB Return%':<11} {'BN Return%':<11} {'CB WinR%':<9} {'BN WinR%':<9} {'CB DD%':<8} {'BN DD%':<8}")
    print("-" * 80)
    
    # Get all years from both sources
    cb_years = {r['year']: r for r in coinbase_yearly}
    bn_years = {r['year']: r for r in binance_yearly}
    all_years = sorted(set(cb_years.keys()) | set(bn_years.keys()))
    
    total_comparison = []
    
    for year in all_years:
        cb_data = cb_years.get(year, {'trades': 0, 'return': 0, 'win_rate': 0, 'max_drawdown': 0})
        bn_data = bn_years.get(year, {'trades': 0, 'return': 0, 'win_rate': 0, 'max_drawdown': 0})
        
        print(f"{year:<6} {cb_data['trades']:<9} {bn_data['trades']:<9} "
              f"{cb_data['return']:<10.1f} {bn_data['return']:<10.1f} "
              f"{cb_data['win_rate']:<8.1f} {bn_data['win_rate']:<8.1f} "
              f"{cb_data['max_drawdown']:<7.1f} {bn_data['max_drawdown']:<7.1f}")
        
        total_comparison.append({
            'year': year,
            'cb_trades': cb_data['trades'],
            'bn_trades': bn_data['trades'],
            'cb_return': cb_data['return'],
            'bn_return': bn_data['return'],
            'trade_diff': bn_data['trades'] - cb_data['trades'],
            'return_diff': bn_data['return'] - cb_data['return']
        })
    
    return total_comparison

def create_summary_comparison(coinbase_results, binance_results, comparison_data):
    """Create overall summary comparison"""
    
    print(f"\n{'='*60}")
    print("OVERALL COMPARISON SUMMARY")
    print(f"{'='*60}")
    
    print(f"{'Metric':<25} {'Coinbase':<15} {'Binance':<15} {'Difference':<15}")
    print("-" * 70)
    print(f"{'Period':<25} {'2017-08-17 to 2025-08-19':<15} {'2017-08-17 to 2025-08-19':<15} {'Same':<15}")
    print(f"{'Total Trades':<25} {coinbase_results['total_trades']:<15} {binance_results['total_trades']:<15} {binance_results['total_trades'] - coinbase_results['total_trades']:<15}")
    print(f"{'Final Equity':<25} ${coinbase_results['final_equity']:<14,.0f} ${binance_results['final_equity']:<14,.0f} ${binance_results['final_equity'] - coinbase_results['final_equity']:<14,.0f}")
    print(f"{'Total Return %':<25} {coinbase_results['final_return']:<14.1f}% {binance_results['final_return']:<14.1f}% {binance_results['final_return'] - coinbase_results['final_return']:<14.1f}%")
    print(f"{'Win Rate %':<25} {coinbase_results['win_rate']:<14.1f}% {binance_results['win_rate']:<14.1f}% {binance_results['win_rate'] - coinbase_results['win_rate']:<14.1f}%")
    print(f"{'Max Drawdown %':<25} {coinbase_results['max_drawdown']:<14.1f}% {binance_results['max_drawdown']:<14.1f}% {binance_results['max_drawdown'] - coinbase_results['max_drawdown']:<14.1f}%")
    
    # Calculate some additional insights
    cb_avg_trade_pnl = (coinbase_results['final_equity'] - 100000) / coinbase_results['total_trades'] if coinbase_results['total_trades'] > 0 else 0
    bn_avg_trade_pnl = (binance_results['final_equity'] - 100000) / binance_results['total_trades'] if binance_results['total_trades'] > 0 else 0
    
    print(f"{'Avg PnL per Trade':<25} ${cb_avg_trade_pnl:<14,.0f} ${bn_avg_trade_pnl:<14,.0f} ${bn_avg_trade_pnl - cb_avg_trade_pnl:<14,.0f}")
    
    print(f"\nKey Insights:")
    print(f"1. Trade count difference: {binance_results['total_trades'] - coinbase_results['total_trades']} trades")
    print(f"2. Return difference: {binance_results['final_return'] - coinbase_results['final_return']:.1f} percentage points")
    print(f"3. Data source impact: {'Significant' if abs(binance_results['final_return'] - coinbase_results['final_return']) > 10 else 'Minimal'}")

def main():
    """Main execution"""
    
    print("=== SAME PERIOD COMPARISON: COINBASE VS BINANCE ===")
    print("Backtesting both data sources for identical period: 2017-08-17 to 2025-08-19")
    
    # Define the overlapping period
    start_date = "2017-08-17"
    end_date = "2025-08-19"
    
    # Run backtests for both data sources
    coinbase_results = run_backtest_for_period(
        '/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv',
        start_date, end_date, "Coinbase"
    )
    
    binance_results = run_backtest_for_period(
        '/home/ttang/Super BTC trading Strategy/BTC_Binance_Historical.csv',
        start_date, end_date, "Binance"
    )
    
    # Analyze yearly performance for both
    coinbase_yearly = analyze_yearly_performance(coinbase_results['strategy'], "Coinbase")
    binance_yearly = analyze_yearly_performance(binance_results['strategy'], "Binance")
    
    # Compare yearly results
    comparison_data = compare_yearly_results(coinbase_yearly, binance_yearly)
    
    # Create summary comparison
    create_summary_comparison(coinbase_results, binance_results, comparison_data)
    
    # Save results for this comparison
    if coinbase_results['strategy'].trades:
        cb_trades_df = pd.DataFrame(coinbase_results['strategy'].trades)
        cb_trades_df.to_csv('/home/ttang/Super BTC trading Strategy/coinbase_same_period_trades.csv', index=False)
    
    if binance_results['strategy'].trades:
        bn_trades_df = pd.DataFrame(binance_results['strategy'].trades)
        bn_trades_df.to_csv('/home/ttang/Super BTC trading Strategy/binance_same_period_trades.csv', index=False)
    
    print(f"\nFiles created:")
    print(f"- coinbase_same_period_trades.csv: Coinbase trades for comparison period")
    print(f"- binance_same_period_trades.csv: Binance trades for comparison period")

if __name__ == "__main__":
    main()