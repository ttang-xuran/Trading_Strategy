#!/usr/bin/env python3
"""
Optimize strategy parameters using Coinbase data
Find the best performing parameter combinations
"""

import pandas as pd
import numpy as np
from itertools import product
from exact_pine_script_implementation import ExactPineScriptStrategy

def optimize_strategy_parameters():
    """Optimize the strategy parameters for best performance"""
    
    print("=== STRATEGY PARAMETER OPTIMIZATION ===")
    print("Finding best performing parameter combinations using Coinbase data")
    
    # Parameter ranges to test
    parameter_ranges = {
        'lookback_period': [10, 15, 20, 25, 30, 35, 40],
        'range_mult': [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
        'stop_loss_mult': [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5]
    }
    
    total_combinations = len(list(product(*parameter_ranges.values())))
    print(f"Testing {total_combinations} parameter combinations")
    print(f"Lookback periods: {parameter_ranges['lookback_period']}")
    print(f"Range multipliers: {parameter_ranges['range_mult']}")
    print(f"Stop loss multipliers: {parameter_ranges['stop_loss_mult']}")
    
    results = []
    current = 0
    
    for lookback, range_mult, stop_mult in product(*parameter_ranges.values()):
        current += 1
        
        try:
            # Initialize strategy with test parameters
            strategy = ExactPineScriptStrategy()
            strategy.lookback_period = lookback
            strategy.range_mult = range_mult
            strategy.stop_loss_mult = stop_mult
            
            # Run backtest
            df = strategy.load_and_prepare_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            strategy.run_exact_backtest(df)
            
            # Calculate metrics
            final_return = (strategy.equity / strategy.initial_capital - 1) * 100
            trade_count = len(strategy.trades)
            
            # Calculate win rate
            trades_df = pd.DataFrame(strategy.trades)
            win_rate = 0
            if not trades_df.empty:
                pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
                if len(pnl_trades) > 0:
                    winning_trades = pnl_trades[pnl_trades['pnl'] > 0]
                    win_rate = len(winning_trades) / len(pnl_trades) * 100
            
            # Calculate max drawdown
            max_drawdown = 0
            if strategy.daily_data:
                daily_df = pd.DataFrame(strategy.daily_data)
                daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
                daily_df['peak'] = daily_df['total_equity'].cummax()
                daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
                max_drawdown = abs(daily_df['drawdown'].min())
            
            # Calculate Sharpe-like ratio
            risk_adjusted_return = final_return / (max_drawdown + 1)
            
            # Calculate profit factor
            profit_factor = 0
            if not trades_df.empty:
                pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
                if len(pnl_trades) > 0:
                    winning_pnl = pnl_trades[pnl_trades['pnl'] > 0]['pnl'].sum()
                    losing_pnl = abs(pnl_trades[pnl_trades['pnl'] < 0]['pnl'].sum())
                    if losing_pnl > 0:
                        profit_factor = winning_pnl / losing_pnl
            
            result = {
                'lookback': lookback,
                'range_mult': range_mult,
                'stop_mult': stop_mult,
                'final_return': final_return,
                'trade_count': trade_count,
                'win_rate': win_rate,
                'max_drawdown': max_drawdown,
                'risk_adjusted_return': risk_adjusted_return,
                'profit_factor': profit_factor,
                'final_equity': strategy.equity
            }
            
            results.append(result)
            
            # Progress indicator
            if current % 50 == 0:
                print(f"Progress: {current}/{total_combinations} ({current/total_combinations*100:.1f}%)")
                
        except Exception as e:
            continue
    
    return results

def analyze_optimization_results(results):
    """Analyze and display optimization results"""
    
    if not results:
        print("No results to analyze!")
        return None
    
    results_df = pd.DataFrame(results)
    
    print(f"\n{'='*80}")
    print("OPTIMIZATION RESULTS")
    print(f"{'='*80}")
    
    print(f"Total parameter combinations tested: {len(results_df)}")
    print(f"Return range: {results_df['final_return'].min():,.1f}% to {results_df['final_return'].max():,.1f}%")
    print(f"Trade count range: {results_df['trade_count'].min()} to {results_df['trade_count'].max()}")
    print(f"Win rate range: {results_df['win_rate'].min():.1f}% to {results_df['win_rate'].max():.1f}%")
    
    # Current baseline (20, 0.5, 2.5)
    baseline = results_df[
        (results_df['lookback'] == 20) & 
        (results_df['range_mult'] == 0.5) & 
        (results_df['stop_mult'] == 2.5)
    ]
    
    if len(baseline) > 0:
        baseline_row = baseline.iloc[0]
        print(f"\nCurrent baseline (20, 0.5, 2.5):")
        print(f"  Return: {baseline_row['final_return']:,.1f}%")
        print(f"  Trades: {baseline_row['trade_count']}")
        print(f"  Win Rate: {baseline_row['win_rate']:.1f}%")
        print(f"  Max DD: {baseline_row['max_drawdown']:.1f}%")
    
    # Top performers by different metrics
    print(f"\n🏆 TOP 10 BY TOTAL RETURN:")
    top_return = results_df.nlargest(10, 'final_return')
    print(f"{'Rank':<4} {'Parameters':<20} {'Return %':<12} {'Trades':<7} {'Win %':<6} {'Max DD %':<8} {'Risk-Adj':<8}")
    print("-" * 75)
    for i, (_, row) in enumerate(top_return.iterrows()):
        params = f"({int(row['lookback'])}, {row['range_mult']}, {row['stop_mult']})"
        print(f"{i+1:<4} {params:<20} {row['final_return']:<11,.0f} {row['trade_count']:<7} "
              f"{row['win_rate']:<5.1f} {row['max_drawdown']:<7.1f} {row['risk_adjusted_return']:<7.1f}")
    
    print(f"\n⚖️  TOP 10 BY RISK-ADJUSTED RETURN:")
    top_risk_adj = results_df.nlargest(10, 'risk_adjusted_return')
    print(f"{'Rank':<4} {'Parameters':<20} {'Risk-Adj':<9} {'Return %':<12} {'Trades':<7} {'Max DD %':<8}")
    print("-" * 70)
    for i, (_, row) in enumerate(top_risk_adj.iterrows()):
        params = f"({int(row['lookback'])}, {row['range_mult']}, {row['stop_mult']})"
        print(f"{i+1:<4} {params:<20} {row['risk_adjusted_return']:<8.1f} {row['final_return']:<11,.0f} "
              f"{row['trade_count']:<7} {row['max_drawdown']:<7.1f}")
    
    print(f"\n💰 TOP 10 BY PROFIT FACTOR:")
    top_profit = results_df.nlargest(10, 'profit_factor')
    print(f"{'Rank':<4} {'Parameters':<20} {'Profit Factor':<12} {'Return %':<12} {'Win %':<6}")
    print("-" * 65)
    for i, (_, row) in enumerate(top_profit.iterrows()):
        params = f"({int(row['lookback'])}, {row['range_mult']}, {row['stop_mult']})"
        print(f"{i+1:<4} {params:<20} {row['profit_factor']:<11.2f} {row['final_return']:<11,.0f} {row['win_rate']:<5.1f}")
    
    # Parameter impact analysis
    print(f"\n📊 PARAMETER IMPACT ANALYSIS:")
    
    print(f"\nAverage Return by Lookback Period:")
    lookback_impact = results_df.groupby('lookback')['final_return'].mean().round(0)
    for lookback, avg_return in lookback_impact.items():
        print(f"  {lookback:2d}: {avg_return:8,.0f}%")
    
    print(f"\nAverage Return by Range Multiplier:")
    range_impact = results_df.groupby('range_mult')['final_return'].mean().round(0)
    for range_mult, avg_return in range_impact.items():
        print(f"  {range_mult}: {avg_return:8,.0f}%")
    
    print(f"\nAverage Return by Stop Loss Multiplier:")
    stop_impact = results_df.groupby('stop_mult')['final_return'].mean().round(0)
    for stop_mult, avg_return in stop_impact.items():
        print(f"  {stop_mult}: {avg_return:8,.0f}%")
    
    return results_df

def test_best_parameters(results_df):
    """Test the best parameters and show detailed results"""
    
    if results_df is None or len(results_df) == 0:
        return
    
    print(f"\n{'='*80}")
    print("TESTING BEST PARAMETERS")
    print(f"{'='*80}")
    
    # Get top 3 parameters by different metrics
    best_return = results_df.loc[results_df['final_return'].idxmax()]
    best_risk_adj = results_df.loc[results_df['risk_adjusted_return'].idxmax()]
    best_profit = results_df.loc[results_df['profit_factor'].idxmax()]
    
    test_cases = [
        ("Best Return", best_return),
        ("Best Risk-Adjusted", best_risk_adj),
        ("Best Profit Factor", best_profit)
    ]
    
    for name, row in test_cases:
        print(f"\n{name}: ({int(row['lookback'])}, {row['range_mult']}, {row['stop_mult']})")
        print(f"  Final Return: {row['final_return']:,.1f}%")
        print(f"  Total Trades: {row['trade_count']}")
        print(f"  Win Rate: {row['win_rate']:.1f}%")
        print(f"  Max Drawdown: {row['max_drawdown']:.1f}%")
        print(f"  Risk-Adjusted Return: {row['risk_adjusted_return']:.1f}")
        print(f"  Profit Factor: {row['profit_factor']:.2f}")
        print(f"  Final Equity: ${row['final_equity']:,.0f}")

def main():
    """Main optimization execution"""
    
    print("PARAMETER OPTIMIZATION FOR TRADING STRATEGY")
    print("Using Coinbase BTC data (2015-2025)")
    
    # Run optimization
    results = optimize_strategy_parameters()
    
    # Analyze results
    results_df = analyze_optimization_results(results)
    
    # Test best parameters
    test_best_parameters(results_df)
    
    # Save results
    if results_df is not None and len(results_df) > 0:
        results_df.to_csv('/home/ttang/Super BTC trading Strategy/optimization_results.csv', index=False)
        print(f"\n📁 Results saved to: optimization_results.csv")
        
        print(f"\n{'='*80}")
        print("OPTIMIZATION COMPLETE")
        print("Use the best parameters from above in your strategy implementation")
        print(f"{'='*80}")

if __name__ == "__main__":
    main()