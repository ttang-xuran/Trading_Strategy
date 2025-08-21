#!/usr/bin/env python3
"""
Quick parameter optimization - focused parameter ranges
"""

import pandas as pd
import numpy as np
from itertools import product
from exact_pine_script_implementation import ExactPineScriptStrategy

def quick_optimize():
    """Quick optimization with focused parameter ranges"""
    
    print("=== QUICK PARAMETER OPTIMIZATION ===")
    
    # Smaller, focused parameter ranges
    parameter_ranges = {
        'lookback_period': [15, 20, 25, 30, 35],      # 5 values
        'range_mult': [0.4, 0.5, 0.6, 0.7],          # 4 values  
        'stop_loss_mult': [2.0, 2.5, 3.0, 3.5]       # 4 values
    }
    
    total_combinations = len(list(product(*parameter_ranges.values())))
    print(f"Testing {total_combinations} parameter combinations")
    
    results = []
    current = 0
    
    for lookback, range_mult, stop_mult in product(*parameter_ranges.values()):
        current += 1
        print(f"Testing ({lookback}, {range_mult}, {stop_mult}) - {current}/{total_combinations}")
        
        try:
            strategy = ExactPineScriptStrategy()
            strategy.lookback_period = lookback
            strategy.range_mult = range_mult
            strategy.stop_loss_mult = stop_mult
            
            df = strategy.load_and_prepare_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
            strategy.run_exact_backtest(df)
            
            final_return = (strategy.equity / strategy.initial_capital - 1) * 100
            trade_count = len(strategy.trades)
            
            # Win rate
            trades_df = pd.DataFrame(strategy.trades)
            win_rate = 0
            if not trades_df.empty:
                pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
                if len(pnl_trades) > 0:
                    winning_trades = pnl_trades[pnl_trades['pnl'] > 0]
                    win_rate = len(winning_trades) / len(pnl_trades) * 100
            
            # Max drawdown
            max_drawdown = 0
            if strategy.daily_data:
                daily_df = pd.DataFrame(strategy.daily_data)
                daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
                daily_df['peak'] = daily_df['total_equity'].cummax()
                daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
                max_drawdown = abs(daily_df['drawdown'].min())
            
            risk_adjusted_return = final_return / (max_drawdown + 1)
            
            result = {
                'lookback': lookback,
                'range_mult': range_mult,
                'stop_mult': stop_mult,
                'final_return': final_return,
                'trade_count': trade_count,
                'win_rate': win_rate,
                'max_drawdown': max_drawdown,
                'risk_adjusted_return': risk_adjusted_return,
                'final_equity': strategy.equity
            }
            
            results.append(result)
            print(f"  Result: {final_return:,.0f}%, {trade_count} trades, {win_rate:.1f}% win rate")
            
        except Exception as e:
            print(f"  Error: {e}")
            continue
    
    return results

def display_results(results):
    """Display optimization results"""
    
    if not results:
        print("No results!")
        return
    
    results_df = pd.DataFrame(results)
    
    print(f"\n{'='*80}")
    print("OPTIMIZATION RESULTS")
    print(f"{'='*80}")
    
    # Current baseline
    baseline = results_df[
        (results_df['lookback'] == 20) & 
        (results_df['range_mult'] == 0.5) & 
        (results_df['stop_mult'] == 2.5)
    ]
    
    if len(baseline) > 0:
        baseline_row = baseline.iloc[0]
        print(f"Baseline (20, 0.5, 2.5): {baseline_row['final_return']:,.0f}%, {baseline_row['trade_count']} trades")
    
    # Top 10 by return
    print(f"\nTOP 10 BY RETURN:")
    top_return = results_df.nlargest(10, 'final_return')
    print(f"{'Rank':<4} {'Parameters':<15} {'Return %':<12} {'Trades':<7} {'Win %':<6} {'Max DD %':<8}")
    print("-" * 60)
    for i, (_, row) in enumerate(top_return.iterrows()):
        params = f"({int(row['lookback'])},{row['range_mult']},{row['stop_mult']})"
        print(f"{i+1:<4} {params:<15} {row['final_return']:<11,.0f} {row['trade_count']:<7} "
              f"{row['win_rate']:<5.1f} {row['max_drawdown']:<7.1f}")
    
    # Top 10 by risk-adjusted return
    print(f"\nTOP 10 BY RISK-ADJUSTED RETURN:")
    top_risk = results_df.nlargest(10, 'risk_adjusted_return')
    print(f"{'Rank':<4} {'Parameters':<15} {'Risk-Adj':<9} {'Return %':<12} {'Max DD %':<8}")
    print("-" * 55)
    for i, (_, row) in enumerate(top_risk.iterrows()):
        params = f"({int(row['lookback'])},{row['range_mult']},{row['stop_mult']})"
        print(f"{i+1:<4} {params:<15} {row['risk_adjusted_return']:<8.1f} {row['final_return']:<11,.0f} {row['max_drawdown']:<7.1f}")
    
    # Save results
    results_df.to_csv('/home/ttang/Super BTC trading Strategy/quick_optimization_results.csv', index=False)
    print(f"\nResults saved to: quick_optimization_results.csv")
    
    # Best parameter recommendation
    best_return = results_df.loc[results_df['final_return'].idxmax()]
    best_risk = results_df.loc[results_df['risk_adjusted_return'].idxmax()]
    
    print(f"\n{'='*60}")
    print("RECOMMENDED PARAMETERS:")
    print(f"Best Return: ({int(best_return['lookback'])}, {best_return['range_mult']}, {best_return['stop_mult']})")
    print(f"  {best_return['final_return']:,.0f}%, {best_return['trade_count']} trades, {best_return['win_rate']:.1f}% win rate")
    
    print(f"Best Risk-Adjusted: ({int(best_risk['lookback'])}, {best_risk['range_mult']}, {best_risk['stop_mult']})")
    print(f"  {best_risk['final_return']:,.0f}%, {best_risk['trade_count']} trades, {best_risk['risk_adjusted_return']:.1f} risk-adj")
    print(f"{'='*60}")

def main():
    """Main execution"""
    
    print("QUICK PARAMETER OPTIMIZATION")
    print("Testing focused parameter ranges for best performance")
    
    results = quick_optimize()
    display_results(results)

if __name__ == "__main__":
    main()