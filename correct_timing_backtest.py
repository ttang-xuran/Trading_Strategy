#!/usr/bin/env python3
"""
CORRECT TIMING Pine Script Implementation
Key Fix: Execution happens at OPEN of NEXT bar after signal detection
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class CorrectTimingStrategy:
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
        
        # Signal tracking for next bar execution
        self.pending_signal = None  # Will store: {'type': 'LONG'/'SHORT', 'reason': '...'}
        
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
        print("Loading Bitcoin data for CORRECT TIMING backtest...")
        
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df.set_index('datetime', inplace=True)
        df.sort_index(inplace=True)
        
        # Filter date range
        df = df[(df.index >= self.start_date) & (df.index <= self.end_date)]
        
        # Calculate ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # Calculate boundaries using [1] shift like Pine Script
        df['highest_high'] = df['high'].rolling(window=self.lookback_period).max().shift(1)
        df['lowest_low'] = df['low'].rolling(window=self.lookback_period).min().shift(1)
        df['breakout_range'] = df['highest_high'] - df['lowest_low']
        df['upper_boundary'] = df['open'] + df['breakout_range'] * self.range_mult
        df['lower_boundary'] = df['open'] - df['breakout_range'] * self.range_mult
        
        # Generate signals (detected during current bar)
        df['go_long'] = df['high'] > df['upper_boundary']
        df['go_short'] = df['low'] < df['lower_boundary']
        
        print(f"Loaded {len(df)} bars from {df.index[0]} to {df.index[-1]}")
        return df
    
    def calculate_position_size_value(self, price):
        """Calculate position size using percent of equity"""
        equity_to_use = self.equity * (self.qty_value / 100.0)
        return equity_to_use / price
    
    def log_trade(self, action, price, timestamp, reason="", bar_index=None):
        """Log trade execution"""
        self.trade_id += 1
        
        if action == "CLOSE":
            # Calculate PnL
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
                'bar_index': bar_index,
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
            
            trade_value = new_position_size * price
            commission = trade_value * self.commission_rate
            self.equity -= commission
            
            self.trade_log.append({
                'trade_id': self.trade_id,
                'bar_index': bar_index,
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
    
    def check_stop_loss(self, row, timestamp, bar_index):
        """Check stop loss during current bar"""
        if self.position_size == 0 or pd.isna(row['atr']):
            return False
        
        atr = row['atr']
        
        if self.position_size > 0:  # Long position
            stop_price = self.position_avg_price - atr * self.stop_loss_mult
            if row['low'] <= stop_price:
                # Stop loss triggered - execute immediately during the bar
                self.log_trade("CLOSE", stop_price, timestamp, "SL Long", bar_index)
                return True
                
        elif self.position_size < 0:  # Short position  
            stop_price = self.position_avg_price + atr * self.stop_loss_mult
            if row['high'] >= stop_price:
                # Stop loss triggered - execute immediately during the bar
                self.log_trade("CLOSE", stop_price, timestamp, "SL Short", bar_index)
                return True
        
        return False
    
    def detect_signals(self, row):
        """Detect signals during current bar (execution happens NEXT bar)"""
        if pd.isna(row['upper_boundary']) or pd.isna(row['lower_boundary']):
            return None
        
        go_long = row['go_long']
        go_short = row['go_short']
        
        # Pine Script logic - signals detected this bar, executed next bar
        if go_long:
            # Close short if exists, then go long
            if self.position_size < 0:
                return {'type': 'REVERSE_TO_LONG', 'reason': 'Reverse to Long'}
            elif self.position_size <= 0:  # No position or just closed
                return {'type': 'LONG', 'reason': 'Long Entry'}
                
        elif go_short:
            # Close long if exists, then go short
            if self.position_size > 0:
                return {'type': 'REVERSE_TO_SHORT', 'reason': 'Reverse to Short'}
            elif self.position_size >= 0:  # No position or just closed
                return {'type': 'SHORT', 'reason': 'Short Entry'}
        
        return None
    
    def execute_pending_signal(self, open_price, timestamp, bar_index):
        """Execute pending signal at open of current bar"""
        if self.pending_signal is None:
            return "HOLD", None, ""
        
        signal = self.pending_signal
        self.pending_signal = None  # Clear pending signal
        
        if signal['type'] == 'REVERSE_TO_LONG':
            # Close existing short, then go long
            if self.position_size < 0:
                self.log_trade("CLOSE", open_price, timestamp, "Reverse to Long", bar_index)
            # Enter long
            self.log_trade("LONG", open_price, timestamp, "Long Entry", bar_index)
            return "LONG_ENTRY", open_price, signal['reason']
            
        elif signal['type'] == 'REVERSE_TO_SHORT':
            # Close existing long, then go short
            if self.position_size > 0:
                self.log_trade("CLOSE", open_price, timestamp, "Reverse to Short", bar_index)
            # Enter short
            self.log_trade("SHORT", open_price, timestamp, "Short Entry", bar_index)
            return "SHORT_ENTRY", open_price, signal['reason']
            
        elif signal['type'] == 'LONG':
            self.log_trade("LONG", open_price, timestamp, "Long Entry", bar_index)
            return "LONG_ENTRY", open_price, signal['reason']
            
        elif signal['type'] == 'SHORT':
            self.log_trade("SHORT", open_price, timestamp, "Short Entry", bar_index)
            return "SHORT_ENTRY", open_price, signal['reason']
        
        return "HOLD", None, ""
    
    def run_correct_timing_backtest(self, df):
        """Run backtest with CORRECT TradingView timing"""
        print("Running CORRECT TIMING backtest...")
        
        for i, (timestamp, row) in enumerate(df.iterrows()):
            date_str = timestamp.strftime('%Y-%m-%d')
            
            # 1. Execute any pending signal from previous bar at OPEN price
            action, exec_price, reason = self.execute_pending_signal(row['open'], timestamp, i)
            
            # 2. Check stop loss during current bar (immediate execution)
            stop_hit = self.check_stop_loss(row, timestamp, i)
            
            if stop_hit:
                action = "STOP_LOSS"
                exec_price = self.trade_log[-1]['execution_price']
                reason = "Stop loss triggered"
            
            # 3. Detect signals for NEXT bar execution
            signal = self.detect_signals(row)
            if signal is not None:
                self.pending_signal = signal
            
            # 4. Log daily entry
            daily_entry = {
                'bar_index': i,
                'date': date_str,
                'open': row['open'],
                'high': row['high'],
                'low': row['low'],
                'close': row['close'],
                'upper_boundary': row.get('upper_boundary', np.nan),
                'lower_boundary': row.get('lower_boundary', np.nan),
                'go_long_signal': row.get('go_long', False),
                'go_short_signal': row.get('go_short', False),
                'pending_signal': signal['type'] if signal else None,
                'action_executed': action,
                'execution_price': exec_price,
                'reason': reason,
                'position_size': self.position_size,
                'position_avg_price': self.position_avg_price,
                'equity': self.equity
            }
            
            # Calculate unrealized PnL
            if self.position_size != 0:
                if self.position_size > 0:
                    unrealized_pnl = (row['close'] - self.position_avg_price) * self.position_size
                else:
                    unrealized_pnl = (self.position_avg_price - row['close']) * abs(self.position_size)
            else:
                unrealized_pnl = 0
                
            daily_entry['unrealized_pnl'] = unrealized_pnl
            daily_entry['total_equity'] = self.equity + unrealized_pnl
            
            self.daily_log.append(daily_entry)
        
        # Execute any final pending signal
        if self.pending_signal is not None:
            final_row = df.iloc[-1]
            self.execute_pending_signal(final_row['close'], df.index[-1], len(df)-1)
        
        # Close final position
        if self.position_size != 0:
            final_row = df.iloc[-1]
            self.log_trade("CLOSE", final_row['close'], df.index[-1], "End of backtest", len(df)-1)
        
        print(f"CORRECT TIMING backtest completed with {len(self.trade_log)} trades")
    
    def save_logs(self, daily_file="correct_timing_daily_log.csv", trade_file="correct_timing_trade_log.csv"):
        """Save logs"""
        if self.daily_log:
            daily_df = pd.DataFrame(self.daily_log)
            daily_df.to_csv(f'/home/ttang/Super BTC trading Strategy/{daily_file}', index=False, float_format='%.6f')
            print(f"Daily log saved to {daily_file}")
        
        if self.trade_log:
            trade_df = pd.DataFrame(self.trade_log)
            trade_df.to_csv(f'/home/ttang/Super BTC trading Strategy/{trade_file}', index=False, float_format='%.6f')
            print(f"Trade log saved to {trade_file}")
    
    def print_results_summary(self):
        """Print results summary"""
        strategy_return = (self.equity / self.initial_capital - 1) * 100
        
        first_price = self.daily_log[0]['close']
        last_price = self.daily_log[-1]['close']
        buy_hold_return = (last_price / first_price - 1) * 100
        
        print(f"\n=== CORRECT TIMING RESULTS ===")
        print(f"Initial Capital: ${self.initial_capital:,.2f}")
        print(f"Final Equity:    ${self.equity:,.2f}")
        print(f"Strategy Return: {strategy_return:.2f}%")
        print(f"Buy Hold Return: {buy_hold_return:.2f}%")
        print(f"Outperformance:  {strategy_return - buy_hold_return:.2f}%")
        print(f"Total Trades:    {len(self.trade_log)}")
        
        if self.trade_log:
            trade_df = pd.DataFrame(self.trade_log)
            trade_counts = trade_df['action'].value_counts()
            print(f"\nTrade breakdown:")
            for action, count in trade_counts.items():
                print(f"  {action}: {count}")
        
        print(f"\nFirst 10 trades (with bar timing):")
        for i, trade in enumerate(self.trade_log[:10]):
            print(f"{i+1:2d}. Bar {trade.get('bar_index', '?'):4d} | {trade['date']} | "
                  f"{trade['action']:10} @ ${trade['execution_price']:8.2f} | "
                  f"Size:{trade['position_size']:8.4f} | PnL:${trade.get('pnl', 0):8.2f}")


def main():
    """Run CORRECT TIMING backtest"""
    print("=== CORRECT TIMING PINE SCRIPT BACKTEST ===")
    print("Key Fix: Signals detected on bar N, executed at open of bar N+1\n")
    
    strategy = CorrectTimingStrategy()
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_correct_timing_backtest(df)
    strategy.save_logs()
    strategy.print_results_summary()
    
    print(f"\n=== COMPARISON WITH PREVIOUS RESULTS ===")
    print(f"Wrong Timing Result:  +1,826%")
    print(f"Correct Timing Result: {((strategy.equity/strategy.initial_capital - 1) * 100):.0f}%")
    print(f"TradingView Target:   +2,766,628%")


if __name__ == "__main__":
    main()