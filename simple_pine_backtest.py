#!/usr/bin/env python3
"""
Simple Pine Script Implementation - Focus on EXACT Logic Matching
"""

import pandas as pd
import numpy as np

def load_data():
    df = pd.read_csv('BTC_Price_full_history.csv')
    df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
    return df.sort_values('datetime').reset_index(drop=True)

def simple_atr(high, low, close, period=14):
    """Simple ATR calculation"""
    tr = np.zeros(len(high))
    for i in range(1, len(high)):
        tr[i] = max(high[i] - low[i], 
                   abs(high[i] - close[i-1]), 
                   abs(low[i] - close[i-1]))
    
    # Simple moving average for ATR
    atr = np.zeros(len(high))
    for i in range(period, len(high)):
        atr[i] = np.mean(tr[max(0, i-period+1):i+1])
    
    return atr

def run_simple_backtest():
    df = load_data()
    
    # Filter to 2020-2025 to match your TradingView test
    df = df[(df['datetime'] >= '2020-01-01') & (df['datetime'] <= '2025-08-19')].reset_index(drop=True)
    print(f"Testing period: {df['datetime'].min()} to {df['datetime'].max()}")
    print(f"Total days: {len(df)}")
    
    # Pine Script parameters
    lookback = 20
    range_mult = 0.5
    stop_mult = 2.5
    
    # Calculate ATR
    atr = simple_atr(df['high'].values, df['low'].values, df['close'].values, 14)
    
    # Very simple tracking - like Pine Script
    equity = 100000.0
    position = None  # 'LONG', 'SHORT', or None
    entry_price = 0.0
    trades = []
    
    for i in range(lookback + 1, len(df)):
        bar = df.iloc[i]
        
        # Previous lookback bars (Pine Script [1] offset)
        prev_bars = df.iloc[i-lookback:i]
        highest_high = prev_bars['high'].max()
        lowest_low = prev_bars['low'].min()
        
        # Boundaries
        range_val = highest_high - lowest_low
        upper = bar['open'] + range_val * range_mult
        lower = bar['open'] - range_val * range_mult
        
        # Signals
        long_signal = bar['high'] > upper
        short_signal = bar['low'] < lower
        
        # Simple reversal logic
        if long_signal:
            if position == 'SHORT':
                # Close short, calculate P&L
                pnl_pct = (entry_price - bar['close']) / entry_price
                equity *= (1 + pnl_pct * 0.99)  # 99% position size
                trades.append(f"CLOSE SHORT @ {bar['close']:.2f}, P&L%: {pnl_pct*100:.2f}%")
            
            # Enter long
            position = 'LONG'
            entry_price = bar['close']
            trades.append(f"ENTRY LONG @ {entry_price:.2f}")
            
        elif short_signal:
            if position == 'LONG':
                # Close long, calculate P&L
                pnl_pct = (bar['close'] - entry_price) / entry_price
                equity *= (1 + pnl_pct * 0.99)  # 99% position size
                trades.append(f"CLOSE LONG @ {bar['close']:.2f}, P&L%: {pnl_pct*100:.2f}%")
            
            # Enter short
            position = 'SHORT'
            entry_price = bar['close']
            trades.append(f"ENTRY SHORT @ {entry_price:.2f}")
        
        # Simple stop loss check
        elif position:
            if position == 'LONG':
                stop = entry_price - atr[i] * stop_mult
                if bar['low'] <= stop:
                    pnl_pct = (stop - entry_price) / entry_price
                    equity *= (1 + pnl_pct * 0.99)
                    trades.append(f"STOP LONG @ {stop:.2f}, P&L%: {pnl_pct*100:.2f}%")
                    position = None
                    
            elif position == 'SHORT':
                stop = entry_price + atr[i] * stop_mult
                if bar['high'] >= stop:
                    pnl_pct = (entry_price - stop) / entry_price
                    equity *= (1 + pnl_pct * 0.99)
                    trades.append(f"STOP SHORT @ {stop:.2f}, P&L%: {pnl_pct*100:.2f}%")
                    position = None
    
    # Results
    total_return = ((equity - 100000) / 100000) * 100
    print(f"\nSIMPLE BACKTEST RESULTS:")
    print(f"Final Equity: ${equity:,.2f}")
    print(f"Total Return: {total_return:.2f}%")
    print(f"Total Signals: {len(trades)}")
    
    print(f"\nLast 10 trades:")
    for trade in trades[-10:]:
        print(trade)
    
    return equity, trades

if __name__ == "__main__":
    run_simple_backtest()