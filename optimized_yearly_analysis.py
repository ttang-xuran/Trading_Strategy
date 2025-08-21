#!/usr/bin/env python3
"""
Run yearly analysis with optimized parameters (25, 0.4, 2.0)
"""

import pandas as pd
import numpy as np
from exact_pine_script_implementation import ExactPineScriptStrategy

def run_optimized_backtest_with_yearly_analysis():
    """Run backtest with optimized parameters and provide yearly breakdown"""
    
    print("=== OPTIMIZED STRATEGY YEARLY ANALYSIS ===")
    print("Parameters: lookback_period = 25, range_mult = 0.4, stop_loss_mult = 2.0")
    print("Expected: ~75,863% return, ~154 trades")
    
    # Initialize strategy with optimized parameters
    strategy = ExactPineScriptStrategy()
    strategy.lookback_period = 25
    strategy.range_mult = 0.4
    strategy.stop_loss_mult = 2.0
    
    # Run backtest
    df = strategy.load_and_prepare_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    strategy.run_exact_backtest(df)
    
    # Calculate overall results
    final_return = (strategy.equity / strategy.initial_capital - 1) * 100
    
    print(f"\nOVERALL RESULTS:")
    print(f"Final Return: {final_return:,.1f}%")
    print(f"Total Trades: {len(strategy.trades)}")
    print(f"Final Equity: ${strategy.equity:,.0f}")
    
    # Yearly analysis
    if not strategy.trades:
        print("No trades to analyze")
        return
    
    # Convert to DataFrames
    trades_df = pd.DataFrame(strategy.trades)
    trades_df['date'] = pd.to_datetime(trades_df['date'])
    trades_df['year'] = trades_df['date'].dt.year
    
    daily_df = pd.DataFrame(strategy.daily_data)
    daily_df['date'] = pd.to_datetime(daily_df['date'])
    daily_df['year'] = daily_df['date'].dt.year
    
    # Get unique years
    years = sorted(trades_df['year'].unique())
    
    print(f"\nYEARLY BREAKDOWN:")
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
            'trades': trade_count,
            'pnl': year_pnl,
            'return': year_return,
            'win_rate': win_rate,
            'max_drawdown': max_drawdown,
            'start_equity': start_equity,
            'end_equity': year_end_equity
        })
    
    # Summary statistics
    print("\n" + "="*70)
    print("SUMMARY STATISTICS:")
    
    total_trades = sum(r['trades'] for r in yearly_results)
    total_return = (yearly_results[-1]['end_equity'] / initial_capital - 1) * 100
    
    # Overall win rate
    all_closed_trades = trades_df[trades_df['pnl'].notna() & (trades_df['pnl'] != 0)]
    if len(all_closed_trades) > 0:
        all_winning_trades = all_closed_trades[all_closed_trades['pnl'] > 0]
        overall_win_rate = len(all_winning_trades) / len(all_closed_trades) * 100
    else:
        overall_win_rate = 0
    
    # Overall max drawdown
    daily_df_sorted = daily_df.sort_values('date')
    daily_df_sorted['total_equity'] = daily_df_sorted['total_equity'].fillna(daily_df_sorted['equity'])
    daily_df_sorted['peak'] = daily_df_sorted['total_equity'].cummax()
    daily_df_sorted['drawdown'] = (daily_df_sorted['total_equity'] - daily_df_sorted['peak']) / daily_df_sorted['peak'] * 100
    overall_max_drawdown = abs(daily_df_sorted['drawdown'].min())
    
    print(f"Total Period: {years[0]}-{years[-1]}")
    print(f"Total Trades: {total_trades}")
    print(f"Total Return: {total_return:,.1f}%")
    print(f"Overall Win Rate: {overall_win_rate:.1f}%")
    print(f"Overall Max Drawdown: {overall_max_drawdown:.1f}%")
    print(f"Final Equity: ${yearly_results[-1]['end_equity']:,.0f}")
    
    # Best and worst years
    if len(yearly_results) > 1:
        best_year = max(yearly_results, key=lambda x: x['return'])
        worst_year = min(yearly_results, key=lambda x: x['return'])
        
        print(f"\nBest Year: {best_year['year']} (+{best_year['return']:,.1f}%)")
        print(f"Worst Year: {worst_year['year']} ({worst_year['return']:,.1f}%)")
    
    # Save optimized results
    if strategy.trades:
        optimized_trades_df = pd.DataFrame(strategy.trades)
        optimized_trades_df.to_csv('/home/ttang/Super BTC trading Strategy/optimized_trades.csv', index=False)
        print(f"\nOptimized trades saved to: optimized_trades.csv")
    
    if strategy.daily_data:
        optimized_daily_df = pd.DataFrame(strategy.daily_data)
        optimized_daily_df.to_csv('/home/ttang/Super BTC trading Strategy/optimized_daily.csv', index=False)
        print(f"Optimized daily data saved to: optimized_daily.csv")
    
    # Comparison with original
    print(f"\n" + "="*70)
    print("COMPARISON WITH ORIGINAL PARAMETERS:")
    print(f"Original (20, 0.5, 2.5): 8,133% return, 130 trades")
    print(f"Optimized (25, 0.4, 2.0): {total_return:,.0f}% return, {total_trades} trades")
    print(f"Improvement: +{total_return - 8133.5:,.0f}% return, {total_trades - 130:+d} trades")
    print(f"Performance Multiplier: {total_return / 8133.5:.1f}x")
    print(f"{'='*70}")
    
    return yearly_results, strategy

def show_detailed_trades_by_year(strategy):
    """Show detailed trade information by year"""
    
    print(f"\n{'='*80}")
    print("DETAILED TRADE BREAKDOWN BY YEAR (OPTIMIZED PARAMETERS)")
    print(f"{'='*80}")
    
    trades_df = pd.DataFrame(strategy.trades)
    trades_df['date'] = pd.to_datetime(trades_df['date'])
    trades_df['year'] = trades_df['date'].dt.year
    
    years = sorted(trades_df['year'].unique())
    
    for year in years:
        year_trades = trades_df[trades_df['year'] == year].copy()
        
        if len(year_trades) == 0:
            continue
            
        print(f"\n{year} TRADES:")
        print(f"{'Date':<12} {'Action':<15} {'Price':<10} {'PnL':<12} {'Equity':<12}")
        print("-" * 70)
        
        for _, trade in year_trades.iterrows():
            pnl_str = f"${trade.get('pnl', 0):8.0f}" if pd.notna(trade.get('pnl', 0)) and trade.get('pnl', 0) != 0 else "Entry"
            equity_str = f"${trade['equity']:10,.0f}"
            price_str = f"${trade['price']:8.2f}"
            
            print(f"{trade['date'].strftime('%Y-%m-%d'):<12} {trade['action']:<15} {price_str:<10} {pnl_str:<12} {equity_str:<12}")

def main():
    """Main execution"""
    
    yearly_results, strategy = run_optimized_backtest_with_yearly_analysis()
    show_detailed_trades_by_year(strategy)

if __name__ == "__main__":
    main()