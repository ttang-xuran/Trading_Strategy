#!/usr/bin/env python3
"""
Debug Pine Script strategy by manually checking first few trades
"""

import pandas as pd
import numpy as np
from datetime import datetime

def load_btc_data():
    df = pd.read_csv('BTC_Price_full_history.csv')
    df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
    df = df.sort_values('datetime').reset_index(drop=True)
    return df

def debug_first_trades():
    df = load_btc_data()
    
    # Filter to start date
    start_dt = pd.to_datetime("2014-11-30")
    df = df[df['datetime'] >= start_dt].reset_index(drop=True)
    
    print("=== First 10 bars from 2014-11-30 ===")
    for i in range(min(10, len(df))):
        bar = df.iloc[i]
        print(f"{i}: {bar['datetime'].strftime('%Y-%m-%d')} | O:{bar['open']:.2f} H:{bar['high']:.2f} L:{bar['low']:.2f} C:{bar['close']:.2f}")
    
    print(f"\n=== Checking first potential signal after lookback period ===")
    
    lookback_period = 20
    range_mult = 0.5
    
    # Check first bar where we can calculate signals (after lookback)
    i = lookback_period + 1  # First bar we can trade
    if i >= len(df):
        print("Not enough data")
        return
    
    current_bar = df.iloc[i]
    print(f"\nBar {i}: {current_bar['datetime'].strftime('%Y-%m-%d')}")
    print(f"OHLC: {current_bar['open']:.2f}, {current_bar['high']:.2f}, {current_bar['low']:.2f}, {current_bar['close']:.2f}")
    
    # Calculate boundaries
    lookback_highs = df.iloc[i-lookback_period-1:i]['high']  # Previous bars only
    lookback_lows = df.iloc[i-lookback_period-1:i]['low']
    
    highest_high = lookback_highs.max()
    lowest_low = lookback_lows.min()
    breakout_range = highest_high - lowest_low
    
    upper_boundary = current_bar['open'] + breakout_range * range_mult
    lower_boundary = current_bar['open'] - breakout_range * range_mult
    
    print(f"Lookback period: {lookback_period}")
    print(f"Highest High (last {lookback_period} bars): {highest_high:.2f}")
    print(f"Lowest Low (last {lookback_period} bars): {lowest_low:.2f}")
    print(f"Breakout Range: {breakout_range:.2f}")
    print(f"Upper Boundary: {upper_boundary:.2f}")
    print(f"Lower Boundary: {lower_boundary:.2f}")
    
    # Check signals
    go_long = current_bar['high'] > upper_boundary
    go_short = current_bar['low'] < lower_boundary
    
    print(f"Go Long Signal (H>{upper_boundary:.2f}): {go_long}")
    print(f"Go Short Signal (L<{lower_boundary:.2f}): {go_short}")
    
    if go_long or go_short:
        print(f"\n🚀 FIRST SIGNAL FOUND!")
        equity = 100000
        position_value = equity * 0.99
        entry_price = current_bar['close']
        position_size = position_value / entry_price
        
        print(f"Entry Price (Close): ${entry_price:.2f}")
        print(f"Position Value (99% of ${equity}): ${position_value:.2f}")
        print(f"Position Size: {position_size:.6f} BTC")
    else:
        print("No signal on this bar, checking next few bars...")
        
        # Check next 10 bars for first signal
        for j in range(i+1, min(i+20, len(df))):
            bar = df.iloc[j]
            
            # Recalculate boundaries for this bar
            lookback_highs = df.iloc[j-lookback_period-1:j]['high']
            lookback_lows = df.iloc[j-lookback_period-1:j]['low']
            
            highest_high = lookback_highs.max()
            lowest_low = lookback_lows.min()
            breakout_range = highest_high - lowest_low
            
            upper_boundary = bar['open'] + breakout_range * range_mult
            lower_boundary = bar['open'] - breakout_range * range_mult
            
            go_long = bar['high'] > upper_boundary
            go_short = bar['low'] < lower_boundary
            
            if go_long or go_short:
                print(f"\n🚀 FIRST SIGNAL FOUND on bar {j}!")
                print(f"Date: {bar['datetime'].strftime('%Y-%m-%d')}")
                print(f"Signal: {'LONG' if go_long else 'SHORT'}")
                print(f"Entry Price: ${bar['close']:.2f}")
                break
        else:
            print("No signals found in first 20 bars after lookback period")

if __name__ == "__main__":
    debug_first_trades()