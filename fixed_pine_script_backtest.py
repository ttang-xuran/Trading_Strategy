#!/usr/bin/env python3
"""
FIXED Pine Script Strategy Implementation - Exact TradingView Logic
Key Fix: strategy.entry() doesn't create multiple positions of same direction
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class FixedPineScriptStrategy:
    def __init__(self):
        # Strategy Parameters (exact Pine Script match)
        self.lookback_period = 20
        self.range_mult = 0.5
        self.stop_loss_mult = 2.5
        self.atr_period = 14
        
        # Trading Parameters (exact TradingView match)
        self.initial_capital = 100000.0
        self.commission_rate = 0.001  # 0.1% commission
        self.qty_value = 99  # 99% of equity
        
        # Date Range
        self.start_date = pd.Timestamp('2020-01-01')
        self.end_date = pd.Timestamp('2025-12-31')
        
        # Position tracking
        self.position_size = 0.0  # >0 = long, <0 = short, 0 = no position
        self.position_avg_price = 0.0
        self.equity = self.initial_capital
        self.trade_id = 0
        
        # Logging
        self.daily_log = []
        self.trade_log = []
        
    def calculate_atr(self, df, period=14):
        """Calculate ATR using RMA like Pine Script ta.atr()"""
        high = df['high']
        low = df['low']
        close_prev = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close_prev)
        tr3 = abs(low - close_prev)
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Use RMA (exponential moving average) like Pine Script
        alpha = 1.0 / period
        atr = true_range.ewm(alpha=alpha, adjust=False).mean()
        
        return atr
    
    def load_data(self, file_path):
        """Load and prepare data exactly like Pine Script"""
        print("Loading Bitcoin data for FIXED Pine Script backtest...")
        
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df.set_index('datetime', inplace=True)
        df.sort_index(inplace=True)
        
        # Filter date range  
        df = df[(df.index >= self.start_date) & (df.index <= self.end_date)]
        
        # Calculate ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # Calculate highest/lowest with [1] offset like Pine Script
        df['highest_high'] = df['high'].rolling(window=self.lookback_period).max().shift(1)
        df['lowest_low'] = df['low'].rolling(window=self.lookback_period).min().shift(1)
        
        # Calculate breakout range and boundaries
        df['breakout_range'] = df['highest_high'] - df['lowest_low']
        df['upper_boundary'] = df['open'] + df['breakout_range'] * self.range_mult
        df['lower_boundary'] = df['open'] - df['breakout_range'] * self.range_mult
        
        # Generate signals
        df['go_long'] = df['high'] > df['upper_boundary']
        df['go_short'] = df['low'] < df['lower_boundary']
        
        print(f"Loaded {len(df)} bars from {df.index[0]} to {df.index[-1]}")
        return df
    
    def calculate_position_size_value(self, price):
        """Calculate position size using percent of equity like TradingView"""
        equity_to_use = self.equity * (self.qty_value / 100.0)
        return equity_to_use / price
    
    def log_trade(self, action, price, timestamp, reason=""):
        """Log a trade execution"""
        self.trade_id += 1
        
        if action == "CLOSE":
            # Calculate PnL for closing trade
            if self.position_size > 0:  # Closing long
                pnl = (price - self.position_avg_price) * self.position_size
                action_name = "CLOSE_LONG"
            else:  # Closing short
                pnl = (self.position_avg_price - price) * abs(self.position_size)
                action_name = "CLOSE_SHORT"
            
            trade_value = abs(self.position_size) * price
            commission = trade_value * self.commission_rate
            net_pnl = pnl - commission
            
            self.equity += net_pnl
            
            self.trade_log.append({
                'trade_id': self.trade_id,
                'date': timestamp.strftime('%Y-%m-%d'),
                'action': action_name,
                'execution_price': price,
                'position_size': abs(self.position_size),
                'pnl': pnl,
                'commission': commission,
                'net_pnl': net_pnl,
                'equity_after': self.equity,
                'reason': reason
            })
            
            # Reset position
            self.position_size = 0
            self.position_avg_price = 0
            
        else:  # LONG or SHORT entry
            new_position_size = self.calculate_position_size_value(price)
            
            if action == "LONG":
                self.position_size = new_position_size
            else:  # SHORT
                self.position_size = -new_position_size
            
            self.position_avg_price = price
            
            # Calculate commission
            trade_value = new_position_size * price
            commission = trade_value * self.commission_rate
            self.equity -= commission
            
            self.trade_log.append({
                'trade_id': self.trade_id,
                'date': timestamp.strftime('%Y-%m-%d'),
                'action': action,
                'execution_price': price,
                'position_size': new_position_size,
                'pnl': 0,
                'commission': commission,
                'net_pnl': -commission,
                'equity_after': self.equity,
                'reason': reason
            })
    
    def check_stop_loss(self, row, timestamp):
        """Check and execute stop loss orders exactly like Pine Script strategy.exit()"""
        if self.position_size == 0 or pd.isna(row['atr']):
            return False
        
        atr = row['atr']
        
        if self.position_size > 0:  # Long position
            stop_price = self.position_avg_price - atr * self.stop_loss_mult
            if row['low'] <= stop_price:
                # Stop loss triggered
                exit_price = stop_price
                self.log_trade("CLOSE", exit_price, timestamp, "SL Long")
                return True
                
        elif self.position_size < 0:  # Short position
            stop_price = self.position_avg_price + atr * self.stop_loss_mult
            if row['high'] >= stop_price:
                # Stop loss triggered
                exit_price = stop_price
                self.log_trade("CLOSE", exit_price, timestamp, "SL Short")
                return True
        
        return False
    
    def execute_strategy_logic(self, row, timestamp):
        """Execute the Pine Script strategy logic EXACTLY"""
        
        # Skip if insufficient data
        if pd.isna(row['upper_boundary']) or pd.isna(row['lower_boundary']):
            return "NO_DATA", None, "Insufficient data"
        
        go_long = row['go_long']
        go_short = row['go_short']
        
        # EXACT Pine Script logic:
        # if go_long
        #     strategy.close("Short", comment="Reverse to Long")
        #     strategy.entry("Long", strategy.long)
        #
        # if go_short  
        #     strategy.close("Long", comment="Reverse to Short")
        #     strategy.entry("Short", strategy.short)
        
        if go_long:
            # Close short position if exists
            if self.position_size < 0:
                close_price = max(row['open'], row['upper_boundary'])
                self.log_trade("CLOSE", close_price, timestamp, "Reverse to Long")
            
            # Enter long position (only if not already long)
            if self.position_size <= 0:  # Not long or just closed short
                entry_price = max(row['open'], row['upper_boundary'])
                self.log_trade("LONG", entry_price, timestamp, "Long Entry")
                return "LONG_ENTRY", entry_price, "Breakout long signal"
            
        elif go_short:
            # Close long position if exists
            if self.position_size > 0:
                close_price = min(row['open'], row['lower_boundary'])
                self.log_trade("CLOSE", close_price, timestamp, "Reverse to Short")
            
            # Enter short position (only if not already short)
            if self.position_size >= 0:  # Not short or just closed long
                entry_price = min(row['open'], row['lower_boundary'])
                self.log_trade("SHORT", entry_price, timestamp, "Short Entry")
                return "SHORT_ENTRY", entry_price, "Breakout short signal"
        
        return "HOLD", None, ""
    
    def run_fixed_backtest(self, df):
        """Run backtest with EXACT Pine Script logic"""
        print("Running FIXED Pine Script backtest...")
        
        for i, (timestamp, row) in enumerate(df.iterrows()):
            date_str = timestamp.strftime('%Y-%m-%d')
            
            # Log daily entry
            daily_entry = {
                'date': date_str,
                'open': row['open'],
                'high': row['high'], 
                'low': row['low'],
                'close': row['close'],
                'upper_boundary': row.get('upper_boundary', np.nan),
                'lower_boundary': row.get('lower_boundary', np.nan),
                'go_long_signal': row.get('go_long', False),
                'go_short_signal': row.get('go_short', False),
                'position_before': self.position_size,
                'equity_before': self.equity
            }
            
            # Check stop loss first (can happen any time during bar)
            stop_hit = self.check_stop_loss(row, timestamp)
            
            if stop_hit:
                daily_entry['action'] = 'STOP_LOSS'
                daily_entry['execution_price'] = self.trade_log[-1]['execution_price']
                daily_entry['reason'] = 'Stop loss triggered'
            else:
                # Execute strategy logic
                action, price, reason = self.execute_strategy_logic(row, timestamp)
                daily_entry['action'] = action
                daily_entry['execution_price'] = price
                daily_entry['reason'] = reason
            
            # Update final values
            daily_entry['position_after'] = self.position_size
            daily_entry['equity_after'] = self.equity
            
            # Calculate unrealized PnL
            if self.position_size != 0:
                if self.position_size > 0:  # Long
                    unrealized_pnl = (row['close'] - self.position_avg_price) * self.position_size
                else:  # Short
                    unrealized_pnl = (self.position_avg_price - row['close']) * abs(self.position_size)
            else:
                unrealized_pnl = 0
            
            daily_entry['unrealized_pnl'] = unrealized_pnl
            daily_entry['total_equity'] = self.equity + unrealized_pnl
            
            self.daily_log.append(daily_entry)
        
        # Close final position at end
        if self.position_size != 0:
            final_row = df.iloc[-1]
            self.log_trade("CLOSE", final_row['close'], df.index[-1], "End of backtest")
        
        print(f"FIXED backtest completed with {len(self.trade_log)} trades")
    
    def save_logs(self, daily_file="fixed_daily_log.csv", trade_file="fixed_trade_log.csv"):
        """Save logs to CSV files"""
        if self.daily_log:
            daily_df = pd.DataFrame(self.daily_log)
            daily_df.to_csv(f'/home/ttang/Super BTC trading Strategy/{daily_file}', index=False, float_format='%.6f')
            print(f"Fixed daily log saved to {daily_file}")
        
        if self.trade_log:
            trade_df = pd.DataFrame(self.trade_log)
            trade_df.to_csv(f'/home/ttang/Super BTC trading Strategy/{trade_file}', index=False, float_format='%.6f')
            print(f"Fixed trade log saved to {trade_file}")
    
    def calculate_performance(self):
        """Calculate performance metrics"""
        final_return = (self.equity / self.initial_capital - 1) * 100
        
        # Get first and last prices for buy & hold
        first_price = self.daily_log[0]['close']
        last_price = self.daily_log[-1]['close']
        buy_hold_return = (last_price / first_price - 1) * 100
        
        return {
            'Initial Capital': self.initial_capital,
            'Final Equity': self.equity,
            'Total Return': f"{final_return:.2f}%",
            'Buy Hold Return': f"{buy_hold_return:.2f}%",
            'Total Trades': len(self.trade_log),
            'Outperformance': f"{final_return - buy_hold_return:.2f}%"
        }
    
    def print_comparison_summary(self):
        """Print summary for TradingView comparison"""
        print(f"\n=== FIXED IMPLEMENTATION RESULTS ===")
        
        perf = self.calculate_performance()
        for key, value in perf.items():
            print(f"{key:18}: {value}")
        
        # Trade type breakdown
        if self.trade_log:
            trade_df = pd.DataFrame(self.trade_log)
            trade_counts = trade_df['action'].value_counts()
            print(f"\nTrade breakdown:")
            for action, count in trade_counts.items():
                print(f"  {action:12}: {count}")
        
        # Show first few trades
        print(f"\nFirst 10 trades:")
        for i, trade in enumerate(self.trade_log[:10]):
            print(f"{i+1:2d}. {trade['date']} {trade['action']:10} @ ${trade['execution_price']:8.2f} "
                  f"Size:{trade['position_size']:8.4f} PnL:${trade.get('pnl', 0):8.2f}")


def main():
    """Run the FIXED Pine Script backtest"""
    print("=== FIXED PINE SCRIPT BACKTEST (EXACT TRADINGVIEW LOGIC) ===\n")
    
    strategy = FixedPineScriptStrategy()
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_fixed_backtest(df)
    strategy.save_logs()
    strategy.print_comparison_summary()
    
    print(f"\n=== COMPARISON WITH TRADINGVIEW ===")
    print(f"TradingView Net Profit: +2,766,628%")
    print(f"Fixed Python Result:    {((strategy.equity/strategy.initial_capital - 1) * 100):.0f}%")
    print(f"TradingView Trades:     ~153 (82 Long + 71 Short)")
    print(f"Fixed Python Trades:    {len(strategy.trade_log)}")


if __name__ == "__main__":
    main()