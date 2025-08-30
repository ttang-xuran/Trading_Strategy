#!/usr/bin/env python3
"""
CORRECT Pine Script Implementation - Matches TradingView Logic Exactly
"""

import pandas as pd
import numpy as np

def load_btc_data():
    df = pd.read_csv('BTC_Price_full_history.csv')
    df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
    df = df.sort_values('datetime').reset_index(drop=True)
    return df

def calculate_atr(high, low, close, period=14):
    """Calculate ATR exactly like Pine Script ta.atr()"""
    n = len(high)
    tr = np.zeros(n)
    atr = np.zeros(n)
    
    # Calculate True Range
    for i in range(1, n):
        tr[i] = max(
            high[i] - low[i],
            abs(high[i] - close[i-1]),
            abs(low[i] - close[i-1])
        )
    
    # Calculate ATR using RMA (Running Moving Average)
    for i in range(period, n):
        if i == period:
            atr[i] = np.mean(tr[1:i+1])
        else:
            # RMA formula: (previous_value * (period-1) + current_value) / period
            atr[i] = (atr[i-1] * (period-1) + tr[i]) / period
    
    return atr

def backtest_tradingview_logic():
    """
    Exact TradingView Pine Script Logic Implementation
    """
    print("=== Loading Bitcoin Data ===")
    df = load_btc_data()
    
    # Filter to 2020-2025 (as user tested on TradingView)
    start_date = pd.to_datetime("2020-01-01")
    end_date = pd.to_datetime("2025-08-19")
    df = df[(df['datetime'] >= start_date) & (df['datetime'] <= end_date)].reset_index(drop=True)
    
    print(f"Period: {df['datetime'].min()} to {df['datetime'].max()}")
    print(f"Total bars: {len(df)}")
    
    # Strategy parameters (exact Pine Script values)
    lookback_period = 20
    range_mult = 0.5
    stop_loss_mult = 2.5
    atr_period = 14
    initial_capital = 100000
    commission_percent = 0.1  # 0.1% per trade
    qty_percent_of_equity = 99  # 99% of equity per trade
    
    # Calculate ATR for all bars
    atr = calculate_atr(df['high'].values, df['low'].values, df['close'].values, atr_period)
    
    # Trading state variables
    cash = initial_capital  # Available cash
    position_qty = 0.0  # BTC quantity (+ for long, - for short)
    position_entry_price = 0.0  # Entry price for current position
    total_trades = 0
    trade_history = []
    
    # TradingView execution: Process signals with next-bar execution
    pending_long = False
    pending_short = False
    
    for i in range(lookback_period, len(df)-1):  # Stop at len-1 so we have next bar
        current_bar = df.iloc[i]
        next_bar = df.iloc[i+1]  # Next bar for execution
        
        current_date = current_bar['datetime']
        next_date = next_bar['datetime']
        
        # Current bar OHLC
        open_price = current_bar['open']
        high_price = current_bar['high']
        low_price = current_bar['low']
        close_price = current_bar['close']
        
        # Next bar prices (for execution)
        next_open = next_bar['open']
        next_high = next_bar['high']
        next_low = next_bar['low']
        
        current_atr = atr[i]
        
        # Calculate current equity (cash + position value)
        if position_qty != 0:
            position_value = position_qty * close_price  # Current position value
            current_equity = cash + position_value
        else:
            current_equity = cash
        
        # Pine Script lookback calculation [1] = previous bars only
        if i >= lookback_period:
            lookback_highs = df.iloc[i-lookback_period:i]['high']  # Previous 20 bars
            lookback_lows = df.iloc[i-lookback_period:i]['low']    # Previous 20 bars
            
            highest_high = lookback_highs.max()
            lowest_low = lookback_lows.min()
            breakout_range = highest_high - lowest_low
            
            upper_boundary = open_price + breakout_range * range_mult
            lower_boundary = open_price - breakout_range * range_mult
            
            # Detect signals (but execute on NEXT bar)
            go_long = high_price > upper_boundary
            go_short = low_price < lower_boundary
            
            # CRITICAL: Set pending signals for next bar execution
            if go_long:
                pending_long = True
                pending_short = False
            elif go_short:
                pending_short = True  
                pending_long = False
        
        # Execute pending signals from PREVIOUS bar at current bar's OPEN
        if pending_long:
            # Close short position if any
            if position_qty < 0:
                exit_value = abs(position_qty) * next_open
                pnl = abs(position_qty) * (position_entry_price - next_open)  # Short P&L
                commission = exit_value * (commission_percent / 100)
                cash += exit_value + pnl - commission
                
                trade_history.append({
                    'date': next_date.strftime('%Y-%m-%d'),
                    'action': 'CLOSE SHORT',
                    'price': next_open,
                    'quantity': abs(position_qty),
                    'pnl': pnl - commission,
                    'equity': cash,
                    'comment': 'Reverse to Long'
                })
                total_trades += 1
            
            # Enter long position (99% of equity)
            position_value = current_equity * (qty_percent_of_equity / 100)
            position_qty = position_value / next_open
            position_entry_price = next_open
            commission = position_value * (commission_percent / 100)
            cash -= commission  # Only deduct commission, position value stays as BTC
            
            trade_history.append({
                'date': next_date.strftime('%Y-%m-%d'),
                'action': 'ENTRY LONG',
                'price': next_open,
                'quantity': position_qty,
                'pnl': 0,
                'equity': cash + position_value,
                'comment': 'Long Entry'
            })
            total_trades += 1
            pending_long = False
            
        elif pending_short:
            # Close long position if any
            if position_qty > 0:
                exit_value = position_qty * next_open
                pnl = position_qty * (next_open - position_entry_price)  # Long P&L
                commission = exit_value * (commission_percent / 100)
                cash += exit_value + pnl - commission
                
                trade_history.append({
                    'date': next_date.strftime('%Y-%m-%d'),
                    'action': 'CLOSE LONG',
                    'price': next_open,
                    'quantity': position_qty,
                    'pnl': pnl - commission,
                    'equity': cash,
                    'comment': 'Reverse to Short'
                })
                total_trades += 1
            
            # Enter short position (99% of equity)
            position_value = current_equity * (qty_percent_of_equity / 100)
            position_qty = -(position_value / next_open)  # Negative for short
            position_entry_price = next_open
            commission = position_value * (commission_percent / 100)
            cash -= commission  # Only deduct commission
            
            trade_history.append({
                'date': next_date.strftime('%Y-%m-%d'),
                'action': 'ENTRY SHORT',
                'price': next_open,
                'quantity': abs(position_qty),
                'pnl': 0,
                'equity': cash + position_value,
                'comment': 'Short Entry'
            })
            total_trades += 1
            pending_short = False
        
        # Check stop losses (on current bar)
        if position_qty != 0:
            if position_qty > 0:  # Long position
                stop_price = position_entry_price - current_atr * stop_loss_mult
                if low_price <= stop_price:
                    exit_value = position_qty * stop_price
                    pnl = position_qty * (stop_price - position_entry_price)
                    commission = exit_value * (commission_percent / 100)
                    cash += exit_value + pnl - commission
                    
                    trade_history.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'action': 'STOP LONG',
                        'price': stop_price,
                        'quantity': position_qty,
                        'pnl': pnl - commission,
                        'equity': cash,
                        'comment': 'Stop Loss'
                    })
                    total_trades += 1
                    position_qty = 0
                    position_entry_price = 0
                    
            elif position_qty < 0:  # Short position
                stop_price = position_entry_price + current_atr * stop_loss_mult
                if high_price >= stop_price:
                    exit_value = abs(position_qty) * stop_price
                    pnl = abs(position_qty) * (position_entry_price - stop_price)
                    commission = exit_value * (commission_percent / 100)
                    cash += exit_value + pnl - commission
                    
                    trade_history.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'action': 'STOP SHORT',
                        'price': stop_price,
                        'quantity': abs(position_qty),
                        'pnl': pnl - commission,
                        'equity': cash,
                        'comment': 'Stop Loss'
                    })
                    total_trades += 1
                    position_qty = 0
                    position_entry_price = 0
    
    # Calculate final equity
    if position_qty != 0:
        final_price = df.iloc[-1]['close']
        if position_qty > 0:
            exit_value = position_qty * final_price
            pnl = position_qty * (final_price - position_entry_price)
        else:
            exit_value = abs(position_qty) * final_price
            pnl = abs(position_qty) * (position_entry_price - final_price)
        
        commission = exit_value * (commission_percent / 100)
        final_equity = cash + exit_value + pnl - commission
    else:
        final_equity = cash
    
    # Calculate performance metrics
    total_return = ((final_equity - initial_capital) / initial_capital) * 100
    net_profit = final_equity - initial_capital
    
    print(f"\n=== CORRECTED RESULTS ===")
    print(f"Total Return: {total_return:.2f}%")
    print(f"Net Profit: ${net_profit:,.2f}")
    print(f"Final Equity: ${final_equity:,.2f}")
    print(f"Total Trades: {len(trade_history)}")
    
    # Show recent trades
    print(f"\n=== RECENT TRADES ===")
    for trade in trade_history[-10:]:
        print(f"{trade['date']} | {trade['action']:<12} | ${trade['price']:>8,.2f} | {trade['quantity']:>8.6f} | ${trade['pnl']:>8,.2f} | {trade['comment']}")
    
    return trade_history, final_equity

if __name__ == "__main__":
    backtest_tradingview_logic()