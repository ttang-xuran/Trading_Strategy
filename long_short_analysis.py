#!/usr/bin/env python3
"""
Analyze long vs short trade performance for optimized strategy
"""

import pandas as pd
import numpy as np

def analyze_long_short_performance():
    """Analyze performance split by long and short trades"""
    
    print("=== LONG vs SHORT TRADE ANALYSIS ===")
    print("Analyzing optimized strategy (25, 0.4, 2.0) performance by trade direction")
    
    # Load optimized trades from Coinbase data
    try:
        trades_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/optimized_trades.csv')
        print(f"Loaded {len(trades_df)} total trade records")
    except Exception as e:
        print(f"Error loading trades: {e}")
        return
    
    # Filter to only completed trades with PnL
    completed_trades = trades_df[trades_df['pnl'].notna() & (trades_df['pnl'] != 0)].copy()
    print(f"Found {len(completed_trades)} completed trades with PnL")
    
    if len(completed_trades) == 0:
        print("No completed trades found!")
        return
    
    # Categorize trades by direction based on action
    completed_trades['direction'] = completed_trades['action'].apply(lambda x: 
        'LONG' if 'Long' in x else 'SHORT' if 'Short' in x else 'UNKNOWN')
    
    # Separate long and short trades
    long_trades = completed_trades[completed_trades['direction'] == 'LONG'].copy()
    short_trades = completed_trades[completed_trades['direction'] == 'SHORT'].copy()
    
    print(f"\nTrade Direction Breakdown:")
    print(f"Long trades: {len(long_trades)}")
    print(f"Short trades: {len(short_trades)}")
    
    # Analyze long trades
    if len(long_trades) > 0:
        long_total_pnl = long_trades['pnl'].sum()
        long_winning = long_trades[long_trades['pnl'] > 0]
        long_losing = long_trades[long_trades['pnl'] < 0]
        long_win_rate = len(long_winning) / len(long_trades) * 100
        long_avg_win = long_winning['pnl'].mean() if len(long_winning) > 0 else 0
        long_avg_loss = long_losing['pnl'].mean() if len(long_losing) > 0 else 0
        long_profit_factor = abs(long_winning['pnl'].sum() / long_losing['pnl'].sum()) if len(long_losing) > 0 and long_losing['pnl'].sum() < 0 else float('inf')
        
        print(f"\n🟢 LONG TRADES PERFORMANCE:")
        print(f"  Total Trades: {len(long_trades)}")
        print(f"  Total PnL: ${long_total_pnl:,.0f}")
        print(f"  Win Rate: {long_win_rate:.1f}% ({len(long_winning)} wins, {len(long_losing)} losses)")
        print(f"  Average Win: ${long_avg_win:,.0f}")
        print(f"  Average Loss: ${long_avg_loss:,.0f}")
        print(f"  Profit Factor: {long_profit_factor:.2f}" if long_profit_factor != float('inf') else "  Profit Factor: ∞ (no losses)")
        print(f"  Largest Win: ${long_trades['pnl'].max():,.0f}")
        print(f"  Largest Loss: ${long_trades['pnl'].min():,.0f}")
    
    # Analyze short trades
    if len(short_trades) > 0:
        short_total_pnl = short_trades['pnl'].sum()
        short_winning = short_trades[short_trades['pnl'] > 0]
        short_losing = short_trades[short_trades['pnl'] < 0]
        short_win_rate = len(short_winning) / len(short_trades) * 100
        short_avg_win = short_winning['pnl'].mean() if len(short_winning) > 0 else 0
        short_avg_loss = short_losing['pnl'].mean() if len(short_losing) > 0 else 0
        short_profit_factor = abs(short_winning['pnl'].sum() / short_losing['pnl'].sum()) if len(short_losing) > 0 and short_losing['pnl'].sum() < 0 else float('inf')
        
        print(f"\n🔴 SHORT TRADES PERFORMANCE:")
        print(f"  Total Trades: {len(short_trades)}")
        print(f"  Total PnL: ${short_total_pnl:,.0f}")
        print(f"  Win Rate: {short_win_rate:.1f}% ({len(short_winning)} wins, {len(short_losing)} losses)")
        print(f"  Average Win: ${short_avg_win:,.0f}")
        print(f"  Average Loss: ${short_avg_loss:,.0f}")
        print(f"  Profit Factor: {short_profit_factor:.2f}" if short_profit_factor != float('inf') else "  Profit Factor: ∞ (no losses)")
        print(f"  Largest Win: ${short_trades['pnl'].max():,.0f}")
        print(f"  Largest Loss: ${short_trades['pnl'].min():,.0f}")
    
    # Comparison
    if len(long_trades) > 0 and len(short_trades) > 0:
        print(f"\n⚖️  COMPARISON:")
        print(f"  Long PnL: ${long_total_pnl:,.0f}")
        print(f"  Short PnL: ${short_total_pnl:,.0f}")
        print(f"  Difference: ${long_total_pnl - short_total_pnl:+,.0f} (Long - Short)")
        print(f"  Long Win Rate: {long_win_rate:.1f}%")
        print(f"  Short Win Rate: {short_win_rate:.1f}%")
        print(f"  Win Rate Difference: {long_win_rate - short_win_rate:+.1f}% (Long - Short)")
        
        total_pnl = long_total_pnl + short_total_pnl
        long_contribution = (long_total_pnl / total_pnl * 100) if total_pnl != 0 else 0
        short_contribution = (short_total_pnl / total_pnl * 100) if total_pnl != 0 else 0
        
        print(f"\n📊 CONTRIBUTION TO TOTAL PROFIT:")
        print(f"  Long trades contributed: {long_contribution:.1f}% of total profit")
        print(f"  Short trades contributed: {short_contribution:.1f}% of total profit")
        
        if short_total_pnl < 0:
            print(f"\n⚠️  WARNING: Short trades are indeed losing money!")
            print(f"  Short trades lost: ${abs(short_total_pnl):,.0f}")
            print(f"  This reduces overall performance by {abs(short_contribution):.1f}%")

def analyze_by_year():
    """Analyze long/short performance by year"""
    
    print(f"\n{'='*80}")
    print("YEARLY LONG vs SHORT PERFORMANCE")
    print(f"{'='*80}")
    
    try:
        trades_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/optimized_trades.csv')
        trades_df['date'] = pd.to_datetime(trades_df['date'])
        trades_df['year'] = trades_df['date'].dt.year
    except Exception as e:
        print(f"Error loading data: {e}")
        return
    
    # Filter completed trades
    completed_trades = trades_df[trades_df['pnl'].notna() & (trades_df['pnl'] != 0)].copy()
    completed_trades['direction'] = completed_trades['action'].apply(lambda x: 
        'LONG' if 'Long' in x else 'SHORT' if 'Short' in x else 'UNKNOWN')
    
    years = sorted(completed_trades['year'].unique())
    
    print(f"{'Year':<6} {'Long PnL':<15} {'Short PnL':<15} {'Long Wins':<10} {'Short Wins':<11} {'Better':<8}")
    print("-" * 75)
    
    yearly_summary = []
    
    for year in years:
        year_trades = completed_trades[completed_trades['year'] == year]
        long_year = year_trades[year_trades['direction'] == 'LONG']
        short_year = year_trades[year_trades['direction'] == 'SHORT']
        
        long_pnl = long_year['pnl'].sum() if len(long_year) > 0 else 0
        short_pnl = short_year['pnl'].sum() if len(short_year) > 0 else 0
        
        long_wins = len(long_year[long_year['pnl'] > 0]) if len(long_year) > 0 else 0
        short_wins = len(short_year[short_year['pnl'] > 0]) if len(short_year) > 0 else 0
        
        long_total = len(long_year)
        short_total = len(short_year)
        
        long_win_rate = (long_wins / long_total * 100) if long_total > 0 else 0
        short_win_rate = (short_wins / short_total * 100) if short_total > 0 else 0
        
        better = "LONG" if long_pnl > short_pnl else "SHORT" if short_pnl > long_pnl else "TIE"
        
        print(f"{year:<6} ${long_pnl:<14,.0f} ${short_pnl:<14,.0f} {long_wins}/{long_total:<8} {short_wins}/{short_total:<9} {better:<8}")
        
        yearly_summary.append({
            'year': year,
            'long_pnl': long_pnl,
            'short_pnl': short_pnl,
            'long_better': long_pnl > short_pnl
        })
    
    # Summary
    long_better_years = sum(1 for y in yearly_summary if y['long_better'])
    short_better_years = len(yearly_summary) - long_better_years
    
    print(f"\nYEAR-BY-YEAR SUMMARY:")
    print(f"Years where Long trades performed better: {long_better_years}")
    print(f"Years where Short trades performed better: {short_better_years}")

def show_worst_trades():
    """Show the worst performing trades by direction"""
    
    print(f"\n{'='*80}")
    print("WORST PERFORMING TRADES BY DIRECTION")
    print(f"{'='*80}")
    
    try:
        trades_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/optimized_trades.csv')
        trades_df['date'] = pd.to_datetime(trades_df['date'])
    except Exception as e:
        print(f"Error loading data: {e}")
        return
    
    completed_trades = trades_df[trades_df['pnl'].notna() & (trades_df['pnl'] != 0)].copy()
    completed_trades['direction'] = completed_trades['action'].apply(lambda x: 
        'LONG' if 'Long' in x else 'SHORT' if 'Short' in x else 'UNKNOWN')
    
    # Worst long trades
    long_trades = completed_trades[completed_trades['direction'] == 'LONG']
    worst_long = long_trades.nsmallest(5, 'pnl')
    
    print(f"🔻 WORST 5 LONG TRADES:")
    print(f"{'Date':<12} {'PnL':<12} {'Price':<10} {'Comment':<20}")
    print("-" * 55)
    for _, trade in worst_long.iterrows():
        comment = trade.get('comment', '')[:18]
        print(f"{trade['date'].strftime('%Y-%m-%d'):<12} ${trade['pnl']:<11,.0f} ${trade['price']:<9.2f} {comment:<20}")
    
    # Worst short trades
    short_trades = completed_trades[completed_trades['direction'] == 'SHORT']
    worst_short = short_trades.nsmallest(5, 'pnl')
    
    print(f"\n🔻 WORST 5 SHORT TRADES:")
    print(f"{'Date':<12} {'PnL':<12} {'Price':<10} {'Comment':<20}")
    print("-" * 55)
    for _, trade in worst_short.iterrows():
        comment = trade.get('comment', '')[:18]
        print(f"{trade['date'].strftime('%Y-%m-%d'):<12} ${trade['pnl']:<11,.0f} ${trade['price']:<9.2f} {comment:<20}")

def main():
    """Main execution"""
    
    analyze_long_short_performance()
    analyze_by_year()
    show_worst_trades()
    
    print(f"\n{'='*80}")
    print("CONCLUSION:")
    print("This analysis will show if short trades are indeed dragging down performance")
    print("and whether a long-only strategy might be more profitable.")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()