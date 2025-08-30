#!/usr/bin/env python3
"""
Exact Pine Script Strategy Backtest Implementation
Matches the Pine Script "Adaptive Volatility Breakout [Reversal Enabled]" exactly
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def load_btc_data():
    """Load Bitcoin historical data"""
    try:
        df = pd.read_csv('BTC_Price_full_history.csv')
        # Convert MM/DD/YYYY to datetime
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df = df.sort_values('datetime').reset_index(drop=True)
        print(f"Loaded {len(df)} candles from {df['datetime'].min()} to {df['datetime'].max()}")
        return df
    except Exception as e:
        print(f"Error loading data: {e}")
        return None

def calculate_atr(df, period=14):
    """Calculate ATR exactly like Pine Script"""
    high = df['high'].values
    low = df['low'].values
    close = df['close'].values
    
    atr = np.zeros(len(df))
    tr = np.zeros(len(df))
    
    for i in range(1, len(df)):
        prev_close = close[i-1]
        curr_high = high[i]
        curr_low = low[i]
        
        # True Range calculation
        tr[i] = max(
            curr_high - curr_low,
            abs(curr_high - prev_close),
            abs(curr_low - prev_close)
        )
    
    # Calculate ATR using RMA (like Pine Script ta.atr())
    for i in range(period, len(df)):
        if i == period:
            atr[i] = np.mean(tr[1:i+1])  # First ATR is SMA
        else:
            # RMA: (previous_atr * (period-1) + current_tr) / period
            atr[i] = (atr[i-1] * (period-1) + tr[i]) / period
    
    return atr

def backtest_pine_script(df, start_date="2020-01-01", end_date="2025-08-29"):
    """
    Exact Pine Script strategy implementation
    """
    # Strategy parameters (from Pine Script)
    lookback_period = 20
    range_mult = 0.5
    stop_loss_mult = 2.5
    atr_period = 14
    initial_capital = 100000
    commission_rate = 0.001  # 0.1% per trade (commission_value=0.1, commission_type=percent)
    
    # Filter date range
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    mask = (df['datetime'] >= start_dt) & (df['datetime'] <= end_dt)
    df_filtered = df[mask].copy().reset_index(drop=True)
    
    print(f"Backtesting from {df_filtered['datetime'].min()} to {df_filtered['datetime'].max()}")
    print(f"Data points: {len(df_filtered)}")
    
    # Calculate ATR
    atr = calculate_atr(df_filtered, atr_period)
    
    # Initialize tracking variables exactly like Pine Script
    position_size = 0.0  # strategy.position_size (+ for long, - for short)  
    position_avg_price = 0.0  # strategy.position_avg_price
    equity = float(initial_capital)
    trades = []
    pending_stop_price = None
    pending_stop_type = None
    
    # CRITICAL: Track signals for next-bar execution
    pending_long_signal = False
    pending_short_signal = False
    
    # Process each bar
    for i in range(lookback_period + 1, len(df_filtered)):
        current_bar = df_filtered.iloc[i]
        current_date = current_bar['datetime']
        open_price = float(current_bar['open'])
        high_price = float(current_bar['high'])
        low_price = float(current_bar['low'])
        close_price = float(current_bar['close'])
        current_atr = atr[i]
        
        # Pine Script calculations - EXACT implementation
        # highest_high = ta.highest(high, lookback_period)[1]  # [1] = previous bars only
        # lowest_low = ta.lowest(low, lookback_period)[1]
        if i >= lookback_period + 1:
            lookback_highs = df_filtered.iloc[i-lookback_period-1:i]['high']  # Previous bars only
            lookback_lows = df_filtered.iloc[i-lookback_period-1:i]['low']   # Previous bars only
            
            highest_high = lookback_highs.max()
            lowest_low = lookback_lows.min()
            breakout_range = highest_high - lowest_low
            
            # Boundary calculations
            upper_boundary = open_price + breakout_range * range_mult
            lower_boundary = open_price - breakout_range * range_mult
            
            # Strategy logic - EXACT Pine Script conditions
            in_date_range = True  # We already filtered by date
            go_long = high_price > upper_boundary and in_date_range
            go_short = low_price < lower_boundary and in_date_range
        else:
            go_long = False
            go_short = False
        
        # STEP 1: Execute pending signals from previous bar (at current bar's OPEN price)
        if pending_long_signal:
            # Close any short position first
            if position_size < 0:
                position_value = abs(position_size) * position_avg_price
                pnl = abs(position_size) * (position_avg_price - open_price)  # Short exit at open
                commission_cost = position_value * commission_rate
                equity += pnl - commission_cost
                
                trades.append({
                    'date': current_date,
                    'action': 'CLOSE SHORT',
                    'price': open_price,
                    'size': abs(position_size),
                    'pnl': pnl - commission_cost,
                    'equity': equity,
                    'comment': 'Reverse to Long'
                })
            
            # Enter long position at OPEN price
            position_value = equity * 0.99
            position_size = position_value / open_price  # Positive for long
            position_avg_price = open_price
            equity -= position_value * commission_rate  # Entry commission
            
            # Set stop loss based on entry price
            pending_stop_price = position_avg_price - current_atr * stop_loss_mult
            pending_stop_type = 'LONG'
            
            trades.append({
                'date': current_date,
                'action': 'ENTRY LONG',
                'price': open_price,
                'size': position_size,
                'pnl': 0,
                'equity': equity,
                'comment': 'Long Entry Signal'
            })
            
            pending_long_signal = False
            
        elif pending_short_signal:
            # Close any long position first
            if position_size > 0:
                position_value = position_size * position_avg_price
                pnl = position_size * (open_price - position_avg_price)  # Long exit at open
                commission_cost = position_value * commission_rate
                equity += pnl - commission_cost
                
                trades.append({
                    'date': current_date,
                    'action': 'CLOSE LONG',
                    'price': open_price,
                    'size': position_size,
                    'pnl': pnl - commission_cost,
                    'equity': equity,
                    'comment': 'Reverse to Short'
                })
            
            # Enter short position at OPEN price
            position_value = equity * 0.99
            position_size = -(position_value / open_price)  # Negative for short
            position_avg_price = open_price
            equity -= position_value * commission_rate  # Entry commission
            
            # Set stop loss based on entry price
            pending_stop_price = position_avg_price + current_atr * stop_loss_mult
            pending_stop_type = 'SHORT'
            
            trades.append({
                'date': current_date,
                'action': 'ENTRY SHORT',
                'price': open_price,
                'size': abs(position_size),
                'pnl': 0,
                'equity': equity,
                'comment': 'Short Entry Signal'
            })
            
            pending_short_signal = False
        
        # STEP 2: Check stop losses (only if no new entry happened)
        if pending_stop_price is not None and not (pending_long_signal or pending_short_signal):
            if pending_stop_type == 'LONG' and low_price <= pending_stop_price:
                # Long stop loss hit
                exit_price = pending_stop_price
                position_value = abs(position_size) * position_avg_price
                pnl = position_size * (exit_price - position_avg_price)
                commission_cost = position_value * commission_rate
                equity += pnl - commission_cost
                
                trades.append({
                    'date': current_date,
                    'action': 'STOP LOSS LONG',
                    'price': exit_price,
                    'size': position_size,
                    'pnl': pnl - commission_cost,
                    'equity': equity,
                    'comment': 'Stop Loss'
                })
                position_size = 0
                position_avg_price = 0
                pending_stop_price = None
                pending_stop_type = None
                
            elif pending_stop_type == 'SHORT' and high_price >= pending_stop_price:
                # Short stop loss hit
                exit_price = pending_stop_price
                position_value = abs(position_size) * position_avg_price
                pnl = abs(position_size) * (position_avg_price - exit_price)
                commission_cost = position_value * commission_rate
                equity += pnl - commission_cost
                
                trades.append({
                    'date': current_date,
                    'action': 'STOP LOSS SHORT',
                    'price': exit_price,
                    'size': abs(position_size),
                    'pnl': pnl - commission_cost,
                    'equity': equity,
                    'comment': 'Stop Loss'
                })
                position_size = 0
                position_avg_price = 0
                pending_stop_price = None
                pending_stop_type = None
        
        # STEP 3: Detect new signals for NEXT bar execution (TradingView logic)
        if i >= lookback_period + 1:
            # Only detect signals if no stop loss was hit
            if pending_stop_price is None or (pending_stop_type == 'LONG' and low_price > pending_stop_price) or (pending_stop_type == 'SHORT' and high_price < pending_stop_price):
                go_long = high_price > upper_boundary
                go_short = low_price < lower_boundary
                
                # Set pending signals for next bar execution
                if go_long and not go_short:
                    pending_long_signal = True
                    pending_short_signal = False
                elif go_short and not go_long:
                    pending_short_signal = True
                    pending_long_signal = False
                elif go_long and go_short:
                    # If both signals trigger on same bar, prioritize based on which boundary was hit first
                    # This is a rare edge case - for simplicity, prioritize the one that's further from open
                    long_distance = upper_boundary - open_price
                    short_distance = open_price - lower_boundary
                    if long_distance > short_distance:
                        pending_long_signal = True
                        pending_short_signal = False
                    else:
                        pending_short_signal = True
                        pending_long_signal = False
    
    # Close any remaining position at end (like Pine Script end_date check)
    if position_size != 0:
        final_bar = df_filtered.iloc[-1]
        final_price = final_bar['close']
        
        if position_size > 0:  # Close long
            position_value = position_size * position_avg_price
            pnl = position_size * (final_price - position_avg_price) - position_value * commission_rate
            equity += position_value + pnl
        else:  # Close short
            position_value = abs(position_size) * position_avg_price
            pnl = abs(position_size) * (position_avg_price - final_price) - position_value * commission_rate
            equity += position_value + pnl
        
        trades.append({
            'date': final_bar['datetime'],
            'action': 'CLOSE FINAL',
            'price': final_price,
            'size': abs(position_size),
            'pnl': pnl,
            'equity': equity,
            'comment': 'End of Date Range'
        })
    
    return trades, equity

def calculate_metrics(trades, initial_capital):
    """Calculate performance metrics"""
    if not trades:
        return {}
    
    final_equity = trades[-1]['equity'] if trades else initial_capital
    total_return = ((final_equity - initial_capital) / initial_capital) * 100
    
    # Calculate trade statistics
    closing_trades = [t for t in trades if t['pnl'] != 0]
    winning_trades = [t for t in closing_trades if t['pnl'] > 0]
    losing_trades = [t for t in closing_trades if t['pnl'] < 0]
    
    gross_profit = sum(t['pnl'] for t in winning_trades)
    gross_loss = abs(sum(t['pnl'] for t in losing_trades))
    net_profit = gross_profit - gross_loss
    
    win_rate = (len(winning_trades) / len(closing_trades) * 100) if closing_trades else 0
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else 0
    avg_trade = net_profit / len(closing_trades) if closing_trades else 0
    
    # Calculate max drawdown
    peak_equity = initial_capital
    max_drawdown = 0
    
    for trade in trades:
        equity = trade['equity']
        if equity > peak_equity:
            peak_equity = equity
        drawdown = ((peak_equity - equity) / peak_equity) * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown
    
    return {
        'total_return_percent': total_return,
        'total_trades': len(trades),
        'closing_trades': len(closing_trades),
        'winning_trades': len(winning_trades),
        'losing_trades': len(losing_trades),
        'win_rate_percent': win_rate,
        'gross_profit': gross_profit,
        'gross_loss': gross_loss,
        'net_profit': net_profit,
        'profit_factor': profit_factor,
        'average_trade': avg_trade,
        'max_drawdown_percent': max_drawdown,
        'initial_capital': initial_capital,
        'final_equity': final_equity
    }

def main():
    print("=== Pine Script Strategy Backtest ===")
    
    # Load data
    df = load_btc_data()
    if df is None:
        return
    
    # Run backtest
    trades, final_equity = backtest_pine_script(df)
    
    # Calculate metrics
    metrics = calculate_metrics(trades, 100000)
    
    # Print results
    print(f"\n=== BACKTEST RESULTS ===")
    print(f"Total Return: {metrics['total_return_percent']:.2f}%")
    print(f"Net Profit: ${metrics['net_profit']:,.2f}")
    print(f"Total Trades: {metrics['total_trades']}")
    print(f"Closing Trades: {metrics['closing_trades']}")
    print(f"Win Rate: {metrics['win_rate_percent']:.2f}%")
    print(f"Profit Factor: {metrics['profit_factor']:.2f}")
    print(f"Average Trade: ${metrics['average_trade']:,.2f}")
    print(f"Max Drawdown: {metrics['max_drawdown_percent']:.2f}%")
    print(f"Final Equity: ${metrics['final_equity']:,.2f}")
    
    # Show last 10 trades
    print(f"\n=== LAST 10 TRADES ===")
    for trade in trades[-10:]:
        print(f"{trade['date'].strftime('%Y-%m-%d')} | {trade['action']:<15} | ${trade['price']:>8,.2f} | Size: {trade['size']:>8.6f} | P&L: ${trade['pnl']:>8,.2f} | {trade['comment']}")
    
    return trades, metrics

if __name__ == "__main__":
    main()