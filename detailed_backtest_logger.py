#!/usr/bin/env python3
"""
Detailed backtest with comprehensive logging for TradingView comparison
"""

import pandas as pd
import numpy as np
from datetime import datetime
import csv

class DetailedBTCStrategy:
    def __init__(self):
        # Strategy Parameters
        self.lookback_period = 20
        self.range_mult = 0.5
        self.stop_loss_mult = 2.5
        self.atr_period = 14
        
        # Trading Parameters
        self.initial_capital = 100000.0
        self.commission_rate = 0.001  # 0.1%
        self.qty_value = 99  # 99% of equity
        
        # Date Range
        self.start_date = pd.Timestamp('2020-01-01')
        self.end_date = pd.Timestamp('2025-12-31')
        
        # Position tracking
        self.position_size = 0.0
        self.position_avg_price = 0.0
        self.equity = self.initial_capital
        self.trade_id = 0
        
        # Logging
        self.daily_log = []
        self.trade_log = []
        
    def calculate_atr(self, df, period=14):
        """Calculate ATR using RMA like Pine Script"""
        high = df['high']
        low = df['low']
        close_prev = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close_prev)
        tr3 = abs(low - close_prev)
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        alpha = 1.0 / period
        atr = true_range.ewm(alpha=alpha, adjust=False).mean()
        
        return atr
    
    def load_data(self, file_path):
        """Load and prepare data"""
        print("Loading Bitcoin data for detailed logging...")
        
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df.set_index('datetime', inplace=True)
        df.sort_index(inplace=True)
        
        # Filter date range
        df = df[(df.index >= self.start_date) & (df.index <= self.end_date)]
        
        # Calculate ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # Calculate boundaries
        df['highest_high_prev'] = df['high'].rolling(window=self.lookback_period).max().shift(1)
        df['lowest_low_prev'] = df['low'].rolling(window=self.lookback_period).min().shift(1)
        df['breakout_range'] = df['highest_high_prev'] - df['lowest_low_prev']
        df['upper_boundary'] = df['open'] + df['breakout_range'] * self.range_mult
        df['lower_boundary'] = df['open'] - df['breakout_range'] * self.range_mult
        
        # Generate signals
        df['go_long'] = df['high'] > df['upper_boundary']
        df['go_short'] = df['low'] < df['lower_boundary']
        
        print(f"Loaded {len(df)} bars from {df.index[0]} to {df.index[-1]}")
        return df
    
    def calculate_position_size(self, price):
        """Calculate position size using percent of equity"""
        equity_to_use = self.equity * (self.qty_value / 100.0)
        shares = equity_to_use / price
        return shares
    
    def calculate_current_pnl(self, current_price):
        """Calculate current unrealized PnL"""
        if self.position_size == 0:
            return 0.0
        
        if self.position_size > 0:  # Long
            return (current_price - self.position_avg_price) * self.position_size
        else:  # Short
            return (self.position_avg_price - current_price) * abs(self.position_size)
    
    def calculate_stop_loss_price(self, atr):
        """Calculate stop loss price"""
        if self.position_size == 0 or pd.isna(atr):
            return None
        
        if self.position_size > 0:  # Long
            return self.position_avg_price - atr * self.stop_loss_mult
        else:  # Short
            return self.position_avg_price + atr * self.stop_loss_mult
    
    def execute_trade(self, action, price, timestamp, reason="", stop_hit=False):
        """Execute a trade and log it"""
        self.trade_id += 1
        
        old_position_size = self.position_size
        old_avg_price = self.position_avg_price
        old_equity = self.equity
        
        if action == "LONG":
            # Close short if exists
            if self.position_size < 0:
                close_pnl = (self.position_avg_price - price) * abs(self.position_size)
                trade_value = abs(self.position_size) * price
                commission = trade_value * self.commission_rate
                net_pnl = close_pnl - commission
                self.equity += net_pnl
                
                # Log close trade
                self.trade_log.append({
                    'trade_id': self.trade_id,
                    'date': timestamp.strftime('%Y-%m-%d'),
                    'action': 'CLOSE_SHORT',
                    'execution_price': price,
                    'position_size': abs(self.position_size),
                    'pnl': close_pnl,
                    'commission': commission,
                    'net_pnl': net_pnl,
                    'equity_after': self.equity,
                    'reason': f"Reverse to Long - {reason}"
                })
                self.trade_id += 1
            
            # Open long
            new_position_size = self.calculate_position_size(price)
            self.position_size = new_position_size
            self.position_avg_price = price
            
            trade_value = new_position_size * price
            commission = trade_value * self.commission_rate
            self.equity -= commission
            
            # Log open trade
            self.trade_log.append({
                'trade_id': self.trade_id,
                'date': timestamp.strftime('%Y-%m-%d'),
                'action': 'LONG',
                'execution_price': price,
                'position_size': new_position_size,
                'pnl': 0,
                'commission': commission,
                'net_pnl': -commission,
                'equity_after': self.equity,
                'reason': reason
            })
            
        elif action == "SHORT":
            # Close long if exists
            if self.position_size > 0:
                close_pnl = (price - self.position_avg_price) * self.position_size
                trade_value = self.position_size * price
                commission = trade_value * self.commission_rate
                net_pnl = close_pnl - commission
                self.equity += net_pnl
                
                # Log close trade
                self.trade_log.append({
                    'trade_id': self.trade_id,
                    'date': timestamp.strftime('%Y-%m-%d'),
                    'action': 'CLOSE_LONG',
                    'execution_price': price,
                    'position_size': self.position_size,
                    'pnl': close_pnl,
                    'commission': commission,
                    'net_pnl': net_pnl,
                    'equity_after': self.equity,
                    'reason': f"Reverse to Short - {reason}"
                })
                self.trade_id += 1
            
            # Open short
            new_position_size = self.calculate_position_size(price)
            self.position_size = -new_position_size
            self.position_avg_price = price
            
            trade_value = new_position_size * price
            commission = trade_value * self.commission_rate
            self.equity -= commission
            
            # Log open trade
            self.trade_log.append({
                'trade_id': self.trade_id,
                'date': timestamp.strftime('%Y-%m-%d'),
                'action': 'SHORT',
                'execution_price': price,
                'position_size': new_position_size,
                'pnl': 0,
                'commission': commission,
                'net_pnl': -commission,
                'equity_after': self.equity,
                'reason': reason
            })
            
        elif action == "CLOSE":
            if self.position_size != 0:
                # Calculate PnL
                if self.position_size > 0:  # Closing long
                    close_pnl = (price - self.position_avg_price) * self.position_size
                    action_name = "CLOSE_LONG"
                else:  # Closing short
                    close_pnl = (self.position_avg_price - price) * abs(self.position_size)
                    action_name = "CLOSE_SHORT"
                
                trade_value = abs(self.position_size) * price
                commission = trade_value * self.commission_rate
                net_pnl = close_pnl - commission
                self.equity += net_pnl
                
                # Log close trade
                self.trade_log.append({
                    'trade_id': self.trade_id,
                    'date': timestamp.strftime('%Y-%m-%d'),
                    'action': action_name,
                    'execution_price': price,
                    'position_size': abs(self.position_size),
                    'pnl': close_pnl,
                    'commission': commission,
                    'net_pnl': net_pnl,
                    'equity_after': self.equity,
                    'reason': reason
                })
                
                # Reset position
                self.position_size = 0
                self.position_avg_price = 0
    
    def run_detailed_backtest(self, df):
        """Run backtest with detailed daily logging"""
        print("Running detailed backtest with comprehensive logging...")
        
        for i, (timestamp, row) in enumerate(df.iterrows()):
            date_str = timestamp.strftime('%Y-%m-%d')
            
            # Calculate stop loss price
            stop_loss_price = self.calculate_stop_loss_price(row['atr'])
            
            # Calculate current PnL
            current_pnl = self.calculate_current_pnl(row['close'])
            current_equity = self.equity + current_pnl
            
            # Initialize daily log entry
            daily_entry = {
                'date': date_str,
                'open': row['open'],
                'high': row['high'],
                'low': row['low'],
                'close': row['close'],
                'atr': row['atr'],
                'upper_boundary': row['upper_boundary'],
                'lower_boundary': row['lower_boundary'],
                'go_long_signal': row['go_long'],
                'go_short_signal': row['go_short'],
                'position_size_before': self.position_size,
                'position_avg_price_before': self.position_avg_price,
                'equity_before': self.equity,
                'unrealized_pnl': current_pnl,
                'total_equity': current_equity,
                'stop_loss_price': stop_loss_price,
                'action': 'HOLD',
                'execution_price': None,
                'reason': '',
                'position_size_after': self.position_size,
                'equity_after': self.equity
            }
            
            # Check for valid data
            if pd.isna(row['upper_boundary']) or pd.isna(row['lower_boundary']):
                daily_entry['action'] = 'NO_DATA'
                daily_entry['reason'] = 'Insufficient data for boundaries'
                self.daily_log.append(daily_entry)
                continue
            
            # Check stop loss first
            stop_hit = False
            if stop_loss_price is not None:
                if self.position_size > 0 and row['low'] <= stop_loss_price:
                    # Long stop loss hit
                    exit_price = min(stop_loss_price, row['low'])
                    self.execute_trade("CLOSE", exit_price, timestamp, "Stop Loss Long", True)
                    daily_entry['action'] = 'STOP_LOSS_LONG'
                    daily_entry['execution_price'] = exit_price
                    daily_entry['reason'] = f"Stop loss hit at {exit_price:.2f}"
                    stop_hit = True
                    
                elif self.position_size < 0 and row['high'] >= stop_loss_price:
                    # Short stop loss hit
                    exit_price = max(stop_loss_price, row['high'])
                    self.execute_trade("CLOSE", exit_price, timestamp, "Stop Loss Short", True)
                    daily_entry['action'] = 'STOP_LOSS_SHORT'
                    daily_entry['execution_price'] = exit_price
                    daily_entry['reason'] = f"Stop loss hit at {exit_price:.2f}"
                    stop_hit = True
            
            # Check for new signals if no stop loss
            if not stop_hit:
                if row['go_long']:
                    entry_price = max(row['open'], row['upper_boundary'])
                    self.execute_trade("LONG", entry_price, timestamp, "Breakout Long")
                    daily_entry['action'] = 'LONG_ENTRY'
                    daily_entry['execution_price'] = entry_price
                    daily_entry['reason'] = f"Long breakout signal at {entry_price:.2f}"
                    
                elif row['go_short']:
                    entry_price = min(row['open'], row['lower_boundary'])
                    self.execute_trade("SHORT", entry_price, timestamp, "Breakout Short")
                    daily_entry['action'] = 'SHORT_ENTRY'
                    daily_entry['execution_price'] = entry_price
                    daily_entry['reason'] = f"Short breakout signal at {entry_price:.2f}"
            
            # Update final values
            daily_entry['position_size_after'] = self.position_size
            daily_entry['position_avg_price_after'] = self.position_avg_price
            daily_entry['equity_after'] = self.equity
            daily_entry['unrealized_pnl_after'] = self.calculate_current_pnl(row['close'])
            daily_entry['total_equity_after'] = self.equity + daily_entry['unrealized_pnl_after']
            
            self.daily_log.append(daily_entry)
        
        # Close final position
        if self.position_size != 0:
            final_row = df.iloc[-1]
            self.execute_trade("CLOSE", final_row['close'], df.index[-1], "End of backtest")
        
        print(f"Backtest completed with {len(self.trade_log)} trades")
    
    def save_detailed_logs(self, daily_file="detailed_daily_log.csv", trade_file="detailed_trade_log.csv"):
        """Save comprehensive logs to CSV files"""
        
        # Save daily log
        if self.daily_log:
            daily_df = pd.DataFrame(self.daily_log)
            daily_df.to_csv(f'/home/ttang/Super BTC trading Strategy/{daily_file}', index=False, float_format='%.6f')
            print(f"Daily log saved to {daily_file}")
            
            # Print summary of daily log
            print(f"\nDaily log contains {len(daily_df)} days")
            action_counts = daily_df['action'].value_counts()
            print("Daily actions summary:")
            for action, count in action_counts.items():
                print(f"  {action}: {count}")
        
        # Save trade log
        if self.trade_log:
            trade_df = pd.DataFrame(self.trade_log)
            trade_df.to_csv(f'/home/ttang/Super BTC trading Strategy/{trade_file}', index=False, float_format='%.6f')
            print(f"Trade log saved to {trade_file}")
            
            # Print trade summary
            print(f"\nTrade log contains {len(trade_df)} trades")
            trade_counts = trade_df['action'].value_counts()
            print("Trade actions summary:")
            for action, count in trade_counts.items():
                print(f"  {action}: {count}")
    
    def print_sample_logs(self, num_days=10, num_trades=10):
        """Print sample logs for verification"""
        print(f"\n=== SAMPLE DAILY LOG (first {num_days} days) ===")
        for i, entry in enumerate(self.daily_log[:num_days]):
            if entry['action'] != 'HOLD':
                print(f"{entry['date']}: {entry['action']} - {entry['reason']}")
                print(f"  Price: O:{entry['open']:.2f} H:{entry['high']:.2f} L:{entry['low']:.2f} C:{entry['close']:.2f}")
                if not pd.isna(entry['upper_boundary']):
                    print(f"  Boundaries: Upper:{entry['upper_boundary']:.2f} Lower:{entry['lower_boundary']:.2f}")
                avg_price = entry.get('position_avg_price_after', 0)
                print(f"  Position: {entry['position_size_after']:.6f} @ {avg_price:.2f}")
                print(f"  Equity: {entry.get('total_equity_after', entry['equity_after']):.2f}")
                print()
        
        print(f"\n=== SAMPLE TRADE LOG (first {num_trades} trades) ===")
        for i, trade in enumerate(self.trade_log[:num_trades]):
            print(f"Trade {trade['trade_id']}: {trade['date']} - {trade['action']}")
            print(f"  Price: {trade['execution_price']:.2f}, Size: {trade['position_size']:.6f}")
            print(f"  PnL: {trade['pnl']:.2f}, Commission: {trade['commission']:.2f}")
            print(f"  Net PnL: {trade['net_pnl']:.2f}, Equity: {trade['equity_after']:.2f}")
            print(f"  Reason: {trade['reason']}")
            print()


def main():
    """Run detailed backtest with comprehensive logging"""
    print("=== DETAILED BACKTEST WITH COMPREHENSIVE LOGGING ===\n")
    
    strategy = DetailedBTCStrategy()
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_detailed_backtest(df)
    
    # Save logs
    strategy.save_detailed_logs()
    
    # Print samples
    strategy.print_sample_logs(15, 15)
    
    # Final summary
    final_return = ((strategy.equity / strategy.initial_capital) - 1) * 100
    print(f"\n=== FINAL SUMMARY ===")
    print(f"Initial Capital: ${strategy.initial_capital:,.2f}")
    print(f"Final Equity:    ${strategy.equity:,.2f}")
    print(f"Total Return:    {final_return:.2f}%")
    print(f"Total Trades:    {len(strategy.trade_log)}")
    
    print(f"\nLog files created:")
    print(f"- detailed_daily_log.csv: Complete daily data with all calculations")
    print(f"- detailed_trade_log.csv: All trade executions with PnL details")


if __name__ == "__main__":
    main()