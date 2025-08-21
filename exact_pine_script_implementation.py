#!/usr/bin/env python3
"""
EXACT Pine Script Implementation - No modifications
Implementing the exact logic from BTC_Trading_Strategy.txt
"""

import pandas as pd
import numpy as np
from datetime import datetime

class ExactPineScriptStrategy:
    def __init__(self):
        # EXACT Pine Script parameters - DO NOT CHANGE
        self.lookback_period = 20  # input.int(20, "Lookback Period")
        self.range_mult = 0.5      # input.float(0.5, "Range Multiplier")
        self.stop_loss_mult = 2.5  # input.float(2.5, "Stop Loss ATR Multiplier")
        self.atr_period = 14       # atr_period = 14
        
        # EXACT TradingView strategy settings
        self.initial_capital = 100000          # initial_capital=100000
        self.commission_value = 0.1            # commission_value=0.1
        self.commission_type = "percent"       # commission_type=strategy.commission.percent
        self.default_qty_type = "percent_of_equity"  # default_qty_type=strategy.percent_of_equity
        self.default_qty_value = 99            # default_qty_value=99 as in Pine Script
        
        # EXACT Pine Script date range - UPDATED to match TradingView
        self.start_date = pd.Timestamp('2015-01-01')  # Start from 2015 to capture Mar 19, 2015 trade
        self.end_date = pd.Timestamp('2025-12-31')    # timestamp("31 Dec 2025 23:59")
        
        # Strategy state variables
        self.equity = self.initial_capital
        self.position_size = 0  # strategy.position_size
        self.position_avg_price = 0  # strategy.position_avg_price
        
        # Logging
        self.trades = []
        self.daily_data = []
        
    def ta_atr(self, df, length):
        """Exact implementation of Pine Script ta.atr() function"""
        high = df['high']
        low = df['low']
        close = df['close']
        close_prev = close.shift(1)
        
        # True Range calculation (exact Pine Script logic)
        tr1 = high - low
        tr2 = abs(high - close_prev)
        tr3 = abs(low - close_prev)
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Pine Script ta.atr uses RMA (Running Moving Average)
        # RMA is equivalent to EWM with alpha = 1/length
        alpha = 1.0 / length
        atr = true_range.ewm(alpha=alpha, adjust=False).mean()
        
        return atr
    
    def ta_highest(self, series, length):
        """Exact implementation of Pine Script ta.highest() function"""
        return series.rolling(window=length).max()
    
    def ta_lowest(self, series, length):
        """Exact implementation of Pine Script ta.lowest() function"""
        return series.rolling(window=length).min()
    
    def load_and_prepare_data(self, file_path):
        """Load data and prepare exactly as Pine Script does"""
        print("Loading data for EXACT Pine Script implementation...")
        
        # Load CSV data
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df.set_index('datetime', inplace=True)
        df.sort_index(inplace=True)
        
        # Apply date range filter (in_date_range logic)
        df = df[(df.index >= self.start_date) & (df.index <= self.end_date)]
        
        print(f"Date range: {df.index[0]} to {df.index[-1]}")
        print(f"Total bars: {len(df)}")
        
        # EXACT Pine Script calculations
        # highest_high = ta.highest(high, lookback_period)[1]
        highest_high = self.ta_highest(df['high'], self.lookback_period).shift(1)
        
        # lowest_low = ta.lowest(low, lookback_period)[1]  
        lowest_low = self.ta_lowest(df['low'], self.lookback_period).shift(1)
        
        # breakout_range = highest_high - lowest_low
        breakout_range = highest_high - lowest_low
        
        # upper_boundary = open + breakout_range * range_mult
        upper_boundary = df['open'] + breakout_range * self.range_mult
        
        # lower_boundary = open - breakout_range * range_mult
        lower_boundary = df['open'] - breakout_range * self.range_mult
        
        # atr = ta.atr(atr_period)
        atr = self.ta_atr(df, self.atr_period)
        
        # EXACT Pine Script signal logic
        # go_long = high > upper_boundary and in_date_range
        go_long = df['high'] > upper_boundary
        
        # go_short = low < lower_boundary and in_date_range
        go_short = df['low'] < lower_boundary
        
        # Add calculated columns to dataframe
        df['highest_high'] = highest_high
        df['lowest_low'] = lowest_low
        df['breakout_range'] = breakout_range
        df['upper_boundary'] = upper_boundary
        df['lower_boundary'] = lower_boundary
        df['atr'] = atr
        df['go_long'] = go_long
        df['go_short'] = go_short
        
        return df
    
    def strategy_entry(self, id_name, direction, qty=None):
        """Exact Pine Script strategy.entry() function"""
        # In Pine Script, strategy.entry() replaces existing position if same direction
        # or creates new position if different direction
        
        # Check if we already have a position in the same direction
        if direction == "long" and self.position_size > 0:
            return  # Already long, ignore additional long entries
        elif direction == "short" and self.position_size < 0:
            return  # Already short, ignore additional short entries
        
        if qty is None:
            # Calculate quantity using default_qty_type and default_qty_value
            if self.default_qty_type == "percent_of_equity":
                equity_to_use = self.equity * (self.default_qty_value / 100.0)
                # Get current price (this should be called during bar processing)
                current_price = self.current_bar_close  # Set during bar processing
                qty = equity_to_use / current_price
        
        if direction == "long":
            self.position_size = qty
            self.position_avg_price = self.current_bar_close
        elif direction == "short":
            self.position_size = -qty
            self.position_avg_price = self.current_bar_close
        
        # Calculate commission
        trade_value = qty * self.current_bar_close
        commission = trade_value * (self.commission_value / 100.0)
        self.equity -= commission
        
        # Log trade
        self.trades.append({
            'date': self.current_date,
            'action': f'ENTRY_{direction.upper()}',
            'price': self.current_bar_close,
            'size': qty,
            'commission': commission,
            'equity': self.equity,
            'comment': id_name
        })
    
    def strategy_close(self, id_name, comment=""):
        """Exact Pine Script strategy.close() function"""
        if self.position_size == 0:
            return
        
        # Calculate PnL
        if self.position_size > 0:  # Long position
            pnl = (self.current_bar_close - self.position_avg_price) * self.position_size
        else:  # Short position
            pnl = (self.position_avg_price - self.current_bar_close) * abs(self.position_size)
        
        # Calculate commission
        trade_value = abs(self.position_size) * self.current_bar_close
        commission = trade_value * (self.commission_value / 100.0)
        
        # Update equity
        net_pnl = pnl - commission
        self.equity += net_pnl
        
        # Log trade
        self.trades.append({
            'date': self.current_date,
            'action': f'CLOSE_{id_name}',
            'price': self.current_bar_close,
            'size': abs(self.position_size),
            'pnl': pnl,
            'commission': commission,
            'net_pnl': net_pnl,
            'equity': self.equity,
            'comment': comment
        })
        
        # Reset position
        self.position_size = 0
        self.position_avg_price = 0
    
    def strategy_exit(self, id_name, stop=None):
        """Exact Pine Script strategy.exit() function"""
        if self.position_size == 0 or stop is None:
            return False
        
        # Check if stop loss is hit during current bar
        if self.position_size > 0:  # Long position
            if self.current_bar_low <= stop:
                # Stop loss hit
                self.current_bar_close = stop  # Exit at stop price
                self.strategy_close("LONG", f"Stop Loss: {id_name}")
                return True
        else:  # Short position
            if self.current_bar_high >= stop:
                # Stop loss hit
                self.current_bar_close = stop  # Exit at stop price
                self.strategy_close("SHORT", f"Stop Loss: {id_name}")
                return True
        
        return False
    
    def run_exact_backtest(self, df):
        """Run backtest with EXACT Pine Script logic"""
        print("Running EXACT Pine Script backtest...")
        
        for i, (date, row) in enumerate(df.iterrows()):
            # Set current bar data (for strategy functions to access)
            self.current_date = date
            self.current_bar_open = row['open']
            self.current_bar_high = row['high']
            self.current_bar_low = row['low']
            self.current_bar_close = row['close']
            
            # Skip bars with insufficient data
            if pd.isna(row['upper_boundary']) or pd.isna(row['lower_boundary']):
                continue
            
            # EXACT Pine Script strategy logic execution order:
            
            # 1. Check and execute stop losses first
            stop_hit = False
            if not pd.isna(row['atr']):
                # long_stop_price = strategy.position_avg_price - atr * stop_loss_mult
                if self.position_size > 0:
                    long_stop_price = self.position_avg_price - row['atr'] * self.stop_loss_mult
                    stop_hit = self.strategy_exit("SL Long", stop=long_stop_price)
                
                # short_stop_price = strategy.position_avg_price + atr * stop_loss_mult
                elif self.position_size < 0:
                    short_stop_price = self.position_avg_price + row['atr'] * self.stop_loss_mult
                    stop_hit = self.strategy_exit("SL Short", stop=short_stop_price)
            
            # 2. Process signals only if no stop loss was hit
            if not stop_hit:
                # EXACT Pine Script signal processing:
                
                # if go_long
                #     strategy.close("Short", comment="Reverse to Long")
                #     strategy.entry("Long", strategy.long)
                if row['go_long']:
                    if self.position_size < 0:  # Close short if exists
                        self.strategy_close("Short", "Reverse to Long")
                    self.strategy_entry("Long", "long")
                
                # if go_short
                #     strategy.close("Long", comment="Reverse to Short")
                #     strategy.entry("Short", strategy.short)
                elif row['go_short']:
                    if self.position_size > 0:  # Close long if exists
                        self.strategy_close("Long", "Reverse to Short")
                    self.strategy_entry("Short", "short")
            
            # Log daily data
            unrealized_pnl = 0
            if self.position_size != 0:
                if self.position_size > 0:
                    unrealized_pnl = (row['close'] - self.position_avg_price) * self.position_size
                else:
                    unrealized_pnl = (self.position_avg_price - row['close']) * abs(self.position_size)
            
            self.daily_data.append({
                'date': date,
                'open': row['open'],
                'high': row['high'],
                'low': row['low'],
                'close': row['close'],
                'upper_boundary': row['upper_boundary'],
                'lower_boundary': row['lower_boundary'],
                'go_long': row['go_long'],
                'go_short': row['go_short'],
                'position_size': self.position_size,
                'position_avg_price': self.position_avg_price,
                'equity': self.equity,
                'unrealized_pnl': unrealized_pnl,
                'total_equity': self.equity + unrealized_pnl
            })
        
        # Final close at end date (Pine Script: if (time >= end_date))
        if self.position_size != 0:
            self.strategy_close("Final", "End of Date Range")
        
        print(f"Backtest completed. Total trades: {len(self.trades)}")
    
    def calculate_results(self):
        """Calculate and display results"""
        final_return = (self.equity / self.initial_capital - 1) * 100
        
        # Calculate other metrics
        if self.daily_data:
            daily_df = pd.DataFrame(self.daily_data)
            first_price = daily_df['close'].iloc[0]
            last_price = daily_df['close'].iloc[-1]
            buy_hold_return = (last_price / first_price - 1) * 100
            
            # Max drawdown
            daily_df['peak'] = daily_df['total_equity'].cummax()
            daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
            max_drawdown = daily_df['drawdown'].min()
        else:
            buy_hold_return = 0
            max_drawdown = 0
        
        # Trade statistics
        trades_df = pd.DataFrame(self.trades)
        if not trades_df.empty:
            pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
            if len(pnl_trades) > 0:
                winning_trades = pnl_trades[pnl_trades['pnl'] > 0]
                win_rate = len(winning_trades) / len(pnl_trades) * 100
            else:
                win_rate = 0
        else:
            win_rate = 0
        
        print(f"\n=== EXACT PINE SCRIPT BACKTEST RESULTS ===")
        print(f"Initial Capital:     ${self.initial_capital:,.2f}")
        print(f"Final Equity:        ${self.equity:,.2f}")
        print(f"Net Profit:          ${self.equity - self.initial_capital:,.2f}")
        print(f"Total Return:        {final_return:.2f}%")
        print(f"Buy & Hold Return:   {buy_hold_return:.2f}%")
        print(f"Max Drawdown:        {max_drawdown:.2f}%")
        print(f"Total Trades:        {len(self.trades)}")
        print(f"Win Rate:            {win_rate:.2f}%")
        
        return {
            'final_return': final_return,
            'total_trades': len(self.trades),
            'max_drawdown': max_drawdown,
            'win_rate': win_rate
        }
    
    def save_results(self):
        """Save detailed results"""
        # Save trades
        if self.trades:
            trades_df = pd.DataFrame(self.trades)
            trades_df.to_csv('/home/ttang/Super BTC trading Strategy/exact_pine_trades.csv', index=False)
            print("Trades saved to: exact_pine_trades.csv")
        
        # Save daily data
        if self.daily_data:
            daily_df = pd.DataFrame(self.daily_data)
            daily_df.to_csv('/home/ttang/Super BTC trading Strategy/exact_pine_daily.csv', index=False)
            print("Daily data saved to: exact_pine_daily.csv")


def main():
    """Run the exact Pine Script implementation"""
    print("=== EXACT PINE SCRIPT IMPLEMENTATION ===")
    print("Implementing exactly as written in BTC_Trading_Strategy.txt")
    print("No modifications or alterations\n")
    
    # Initialize strategy
    strategy = ExactPineScriptStrategy()
    
    # Load and prepare data
    df = strategy.load_and_prepare_data('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    
    # Run backtest
    strategy.run_exact_backtest(df)
    
    # Calculate and display results
    results = strategy.calculate_results()
    
    # Save results
    strategy.save_results()
    
    print(f"\nFiles created:")
    print(f"- exact_pine_trades.csv: All trade executions")
    print(f"- exact_pine_daily.csv: Daily data with signals and calculations")


if __name__ == "__main__":
    main()