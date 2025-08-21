#!/usr/bin/env python3
"""
Debug script to match TradingView results exactly
"""

import pandas as pd
import numpy as np
from btc_strategy_corrected import CorrectedBTCStrategy

def test_different_periods():
    """Test different time periods to match TradingView B&H return"""
    
    df = pd.read_csv('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
    df.set_index('datetime', inplace=True)
    df.sort_index(inplace=True)
    
    print("=== TESTING DIFFERENT TIME PERIODS ===")
    print("TradingView B&H Return: +1,082,970%")
    print()
    
    # Test various start dates
    test_periods = [
        ('2020-01-01', '2025-08-19'),
        ('2020-01-01', '2024-12-31'), 
        ('2019-01-01', '2025-08-19'),
        ('2021-01-01', '2025-08-19'),
        ('2020-01-01', '2024-11-01'),
        ('2020-03-01', '2025-08-19'),  # After COVID crash
    ]
    
    for start_date, end_date in test_periods:
        try:
            start_ts = pd.Timestamp(start_date)
            end_ts = pd.Timestamp(end_date)
            
            period_df = df[(df.index >= start_ts) & (df.index <= end_ts)]
            
            if len(period_df) > 0:
                start_price = period_df['close'].iloc[0]
                end_price = period_df['close'].iloc[-1]
                bh_return = ((end_price / start_price) - 1) * 100
                
                print(f"{start_date} to {end_date}")
                print(f"  Start Price: ${start_price:,.2f}")
                print(f"  End Price:   ${end_price:,.2f}")
                print(f"  B&H Return:  {bh_return:,.2f}%")
                
                # Check if this matches TradingView
                if abs(bh_return - 1082970) < 50000:  # Within 50k% tolerance
                    print(f"  *** POTENTIAL MATCH! ***")
                print()
        except:
            continue

def test_early_bitcoin_period():
    """Test very early Bitcoin period where massive gains were possible"""
    
    df = pd.read_csv('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
    df.set_index('datetime', inplace=True)
    df.sort_index(inplace=True)
    
    print("=== TESTING EARLY BITCOIN PERIODS ===")
    
    # Very early periods
    early_periods = [
        ('2010-01-01', '2020-12-31'),
        ('2009-01-01', '2020-12-31'), 
        ('2011-01-01', '2021-12-31'),
        ('2012-01-01', '2022-12-31'),
        ('2013-01-01', '2023-12-31'),
    ]
    
    for start_date, end_date in early_periods:
        try:
            start_ts = pd.Timestamp(start_date)
            end_ts = pd.Timestamp(end_date)
            
            period_df = df[(df.index >= start_ts) & (df.index <= end_ts)]
            
            if len(period_df) > 0:
                start_price = period_df['close'].iloc[0]
                end_price = period_df['close'].iloc[-1]
                bh_return = ((end_price / start_price) - 1) * 100
                
                print(f"{start_date} to {end_date}")
                print(f"  Start Price: ${start_price:,.6f}")
                print(f"  End Price:   ${end_price:,.2f}")
                print(f"  B&H Return:  {bh_return:,.0f}%")
                
                if abs(bh_return - 1082970) < 100000:  # Within 100k% tolerance
                    print(f"  *** POTENTIAL MATCH! ***")
                    
                    # Run strategy for this period
                    print(f"  Running strategy for this period...")
                    strategy = CorrectedBTCStrategy()
                    strategy.start_date = start_ts
                    strategy.end_date = end_ts
                    
                    strategy_df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
                    strategy.run_backtest(strategy_df)
                    
                    strategy_return = ((strategy.equity / strategy.initial_capital) - 1) * 100
                    print(f"  Strategy Return: {strategy_return:,.0f}%")
                    
                    if abs(strategy_return - 2766628) < 500000:  # Within 500k% tolerance
                        print(f"  *** STRATEGY MATCH TOO! ***")
                        
                print()
        except Exception as e:
            print(f"Error with {start_date} to {end_date}: {e}")
            continue

def check_data_quality():
    """Check for data quality issues"""
    
    df = pd.read_csv('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
    df.set_index('datetime', inplace=True)
    
    print("=== DATA QUALITY CHECK ===")
    print(f"Total rows: {len(df)}")
    print(f"Date range: {df.index.min()} to {df.index.max()}")
    print(f"Missing values: {df.isnull().sum().sum()}")
    print()
    
    # Check for unrealistic price jumps
    df['price_change'] = df['close'].pct_change()
    big_moves = df[abs(df['price_change']) > 0.5]  # >50% daily moves
    
    print(f"Days with >50% moves: {len(big_moves)}")
    if len(big_moves) > 0:
        print("Biggest daily moves:")
        print(big_moves.nlargest(5, 'price_change')[['close', 'price_change']])
    print()
    
    # Check earliest meaningful prices (when BTC had real value)
    meaningful_data = df[df['close'] > 0.01]  # More than 1 cent
    print(f"First meaningful price date: {meaningful_data.index[0]}")
    print(f"First meaningful price: ${meaningful_data['close'].iloc[0]:.4f}")

if __name__ == "__main__":
    check_data_quality()
    print("\n" + "="*50)
    test_different_periods()
    print("\n" + "="*50)
    test_early_bitcoin_period()