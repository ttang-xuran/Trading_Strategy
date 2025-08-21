#!/usr/bin/env python3
"""
Create a simplified comparison summary for TradingView comparison
"""

import pandas as pd

def create_comparison_files():
    """Create simplified files for TradingView comparison"""
    
    # Load the detailed logs
    daily_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/detailed_daily_log.csv')
    trade_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/detailed_trade_log.csv')
    
    # Create a simplified daily summary showing only action days
    action_days = daily_df[daily_df['action'] != 'HOLD'].copy()
    
    # Create simplified comparison format
    comparison_df = action_days[['date', 'open', 'high', 'low', 'close', 'action', 'execution_price', 
                                'position_size_after', 'total_equity_after', 'stop_loss_price']].copy()
    
    comparison_df.columns = ['Date', 'Open', 'High', 'Low', 'Close', 'Action', 'Execution_Price', 
                            'Position_Size', 'Total_Equity', 'Stop_Loss_Price']
    
    comparison_df.to_csv('/home/ttang/Super BTC trading Strategy/tradingview_comparison.csv', 
                        index=False, float_format='%.2f')
    
    # Create trade-by-trade summary
    trade_summary = trade_df[['date', 'action', 'execution_price', 'position_size', 
                             'pnl', 'commission', 'net_pnl', 'equity_after']].copy()
    
    trade_summary.columns = ['Date', 'Action', 'Execution_Price', 'Position_Size', 
                            'PnL', 'Commission', 'Net_PnL', 'Equity_After']
    
    trade_summary.to_csv('/home/ttang/Super BTC trading Strategy/trade_summary.csv', 
                        index=False, float_format='%.2f')
    
    print("=== COMPARISON FILES CREATED ===")
    print("1. tradingview_comparison.csv - Daily actions with key data")
    print("2. trade_summary.csv - All trade executions")
    print()
    
    # Print first few action days for quick comparison
    print("=== FIRST 10 ACTION DAYS ===")
    print(comparison_df.head(10).to_string(index=False))
    
    print(f"\n=== SUMMARY STATISTICS ===")
    print(f"Total action days: {len(comparison_df)}")
    print(f"Total trades: {len(trade_summary)}")
    print(f"Final equity: ${daily_df.iloc[-1]['total_equity_after']:.2f}")
    print(f"Total return: {((daily_df.iloc[-1]['total_equity_after'] / 100000) - 1) * 100:.2f}%")
    
    # Action breakdown
    action_counts = comparison_df['Action'].value_counts()
    print(f"\nAction breakdown:")
    for action, count in action_counts.items():
        print(f"  {action}: {count}")
    
    return comparison_df, trade_summary

if __name__ == "__main__":
    comparison_df, trade_summary = create_comparison_files()