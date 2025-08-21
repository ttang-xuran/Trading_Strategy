#!/usr/bin/env python3
"""
Corrected Adaptive Volatility Breakout Strategy - Matching TradingView Exactly
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class CorrectedBTCStrategy:
    def __init__(self):
        # Strategy Parameters (exact Pine Script match)
        self.lookback_period = 20
        self.range_mult = 0.5
        self.stop_loss_mult = 2.5
        self.atr_period = 14
        
        # Trading Parameters (exact TradingView match)
        self.initial_capital = 100000.0
        self.commission_rate = 0.001  # 0.1% commission per trade
        self.qty_type = 'percent_of_equity'
        self.qty_value = 99  # 99% of equity
        
        # Date Range
        self.start_date = pd.Timestamp('2020-01-01')
        self.end_date = pd.Timestamp('2025-12-31')
        
        # Position tracking
        self.position_size = 0.0  # Current position size (shares or contracts)
        self.position_avg_price = 0.0  # Average entry price
        self.equity = self.initial_capital  # Current equity
        
        # Results tracking
        self.trades = []
        self.equity_curve = []
        
    def calculate_atr(self, df, period=14):
        """Calculate Average True Range exactly like Pine Script"""
        high = df['high']
        low = df['low'] 
        close_prev = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close_prev)
        tr3 = abs(low - close_prev)
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Use RMA (exponential moving average) like Pine Script ta.atr
        alpha = 1.0 / period
        atr = true_range.ewm(alpha=alpha, adjust=False).mean()
        
        return atr
    
    def load_data(self, file_path):
        """Load and prepare data exactly like Pine Script"""
        print("Loading Bitcoin data for corrected backtest...")
        
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df.set_index('datetime', inplace=True)
        df.sort_index(inplace=True)
        
        # Filter date range
        df = df[(df.index >= self.start_date) & (df.index <= self.end_date)]
        
        # Calculate ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # Calculate highest/lowest with [1] offset like Pine Script
        df['highest_high_prev'] = df['high'].rolling(window=self.lookback_period).max().shift(1)
        df['lowest_low_prev'] = df['low'].rolling(window=self.lookback_period).min().shift(1)
        
        # Calculate breakout range and boundaries
        df['breakout_range'] = df['highest_high_prev'] - df['lowest_low_prev']
        df['upper_boundary'] = df['open'] + df['breakout_range'] * self.range_mult
        df['lower_boundary'] = df['open'] - df['breakout_range'] * self.range_mult
        
        # Generate signals - triggers when price breaks boundaries DURING the bar
        df['go_long'] = df['high'] > df['upper_boundary']
        df['go_short'] = df['low'] < df['lower_boundary']
        
        print(f"Loaded {len(df)} bars from {df.index[0]} to {df.index[-1]}")
        return df
    
    def calculate_position_size(self, price):
        """Calculate position size using percent_of_equity like TradingView"""
        # TradingView: default_qty_type=strategy.percent_of_equity, default_qty_value=99
        equity_to_use = self.equity * (self.qty_value / 100.0)
        position_value = equity_to_use
        shares = position_value / price
        return shares
    
    def execute_entry(self, direction, price, timestamp, comment=""):
        """Execute entry exactly like TradingView strategy.entry()"""
        
        # Calculate new position size based on current equity
        new_position_size = self.calculate_position_size(price)
        
        if direction == "long":
            # Close any existing short position first
            if self.position_size < 0:
                self.close_position(price, timestamp, "Reverse to Long")
            
            # Enter long position
            self.position_size = new_position_size
            self.position_avg_price = price
            
            # Calculate commission on the trade value
            trade_value = new_position_size * price
            commission = trade_value * self.commission_rate
            self.equity -= commission
            
            self.trades.append({
                'timestamp': timestamp,
                'type': 'Long',
                'price': price,
                'size': new_position_size,
                'commission': commission,
                'comment': comment,
                'equity_before': self.equity + commission,
                'equity_after': self.equity
            })
            
        elif direction == "short":
            # Close any existing long position first
            if self.position_size > 0:
                self.close_position(price, timestamp, "Reverse to Short")
            
            # Enter short position
            self.position_size = -new_position_size
            self.position_avg_price = price
            
            # Calculate commission on the trade value
            trade_value = new_position_size * price
            commission = trade_value * self.commission_rate
            self.equity -= commission
            
            self.trades.append({
                'timestamp': timestamp,
                'type': 'Short',
                'price': price,
                'size': new_position_size,
                'commission': commission,
                'comment': comment,
                'equity_before': self.equity + commission,
                'equity_after': self.equity
            })
    
    def close_position(self, price, timestamp, comment=""):
        """Close current position exactly like TradingView strategy.close()"""
        if self.position_size == 0:
            return
        
        # Calculate P&L
        if self.position_size > 0:  # Closing long
            pnl = (price - self.position_avg_price) * self.position_size
        else:  # Closing short
            pnl = (self.position_avg_price - price) * abs(self.position_size)
        
        # Calculate commission
        trade_value = abs(self.position_size) * price
        commission = trade_value * self.commission_rate
        
        # Update equity
        net_pnl = pnl - commission
        self.equity += net_pnl
        
        self.trades.append({
            'timestamp': timestamp,
            'type': f'Close {"Long" if self.position_size > 0 else "Short"}',
            'price': price,
            'size': abs(self.position_size),
            'pnl': pnl,
            'commission': commission,
            'net_pnl': net_pnl,
            'comment': comment,
            'equity_after': self.equity
        })
        
        # Reset position
        self.position_size = 0
        self.position_avg_price = 0
    
    def check_stop_loss(self, row, timestamp):
        """Check stop loss exactly like Pine Script strategy.exit()"""
        if self.position_size == 0 or pd.isna(row['atr']):
            return False
        
        atr = row['atr']
        
        if self.position_size > 0:  # Long position
            stop_price = self.position_avg_price - atr * self.stop_loss_mult
            if row['low'] <= stop_price:
                # Stop loss triggered - exit at stop price or worse
                exit_price = min(stop_price, row['low'])  # Use the worse price
                self.close_position(exit_price, timestamp, "SL Long")
                return True
                
        elif self.position_size < 0:  # Short position
            stop_price = self.position_avg_price + atr * self.stop_loss_mult
            if row['high'] >= stop_price:
                # Stop loss triggered - exit at stop price or worse
                exit_price = max(stop_price, row['high'])  # Use the worse price
                self.close_position(exit_price, timestamp, "SL Short")
                return True
        
        return False
    
    def update_equity_curve(self, price, timestamp):
        """Update equity curve with current unrealized P&L"""
        unrealized_pnl = 0
        
        if self.position_size > 0:  # Long position
            unrealized_pnl = (price - self.position_avg_price) * self.position_size
        elif self.position_size < 0:  # Short position
            unrealized_pnl = (self.position_avg_price - price) * abs(self.position_size)
        
        current_equity = self.equity + unrealized_pnl
        
        self.equity_curve.append({
            'timestamp': timestamp,
            'equity': current_equity,
            'price': price,
            'position_size': self.position_size,
            'unrealized_pnl': unrealized_pnl
        })
    
    def run_backtest(self, df):
        """Run backtest with exact TradingView behavior"""
        print("Running corrected backtest...")
        
        for i, (timestamp, row) in enumerate(df.iterrows()):
            # Skip if insufficient data
            if pd.isna(row['upper_boundary']) or pd.isna(row['lower_boundary']):
                self.update_equity_curve(row['close'], timestamp)
                continue
            
            # Check stop losses first (can happen any time during the bar)
            stop_hit = self.check_stop_loss(row, timestamp)
            
            # Only check for new signals if no stop loss was hit
            if not stop_hit:
                # Check for signals - Pine Script checks these conditions during the bar
                if row['go_long']:
                    # Execute long entry - use a price between open and high where signal triggered
                    entry_price = max(row['open'], row['upper_boundary'])  # Price when signal triggered
                    self.execute_entry("long", entry_price, timestamp, "Long Entry")
                
                elif row['go_short']:
                    # Execute short entry - use a price between open and low where signal triggered  
                    entry_price = min(row['open'], row['lower_boundary'])  # Price when signal triggered
                    self.execute_entry("short", entry_price, timestamp, "Short Entry")
            
            # Update equity curve at bar close
            self.update_equity_curve(row['close'], timestamp)
        
        # Close final position at end date
        if self.position_size != 0:
            final_row = df.iloc[-1]
            self.close_position(final_row['close'], df.index[-1], "End of Date Range")
            
        print(f"Backtest completed. Total trade records: {len(self.trades)}")
    
    def calculate_metrics(self):
        """Calculate performance metrics matching TradingView"""
        if not self.trades or not self.equity_curve:
            return {}
        
        equity_df = pd.DataFrame(self.equity_curve)
        
        # Net profit
        net_profit = self.equity - self.initial_capital
        net_profit_pct = (net_profit / self.initial_capital) * 100
        
        # Calculate buy & hold return
        first_price = equity_df['price'].iloc[0]
        last_price = equity_df['price'].iloc[-1]
        buy_hold_return = ((last_price / first_price) - 1) * 100
        
        # Max equity and drawdown
        equity_df['peak'] = equity_df['equity'].cummax()
        equity_df['drawdown'] = equity_df['equity'] - equity_df['peak']
        equity_df['drawdown_pct'] = (equity_df['drawdown'] / equity_df['peak']) * 100
        
        max_drawdown_pct = equity_df['drawdown_pct'].min()
        max_equity = equity_df['equity'].max()
        
        # Trade analysis
        entry_trades = [t for t in self.trades if t['type'] in ['Long', 'Short']]
        long_trades = [t for t in self.trades if t['type'] == 'Long']
        short_trades = [t for t in self.trades if t['type'] == 'Short']
        
        # PnL analysis
        closed_trades = [t for t in self.trades if 'pnl' in t]
        if closed_trades:
            gross_profit = sum(t['pnl'] for t in closed_trades if t['pnl'] > 0)
            gross_loss = abs(sum(t['pnl'] for t in closed_trades if t['pnl'] < 0))
            total_commission = sum(t.get('commission', 0) for t in self.trades)
        else:
            gross_profit = gross_loss = total_commission = 0
        
        return {
            'Net Profit': f"${net_profit:,.2f} ({net_profit_pct:.2f}%)",
            'Gross Profit': f"${gross_profit:,.2f}",
            'Gross Loss': f"${gross_loss:,.2f}",
            'Total Commission': f"${total_commission:,.2f}",
            'Buy & Hold Return': f"{buy_hold_return:.2f}%",
            'Max Equity': f"${max_equity:,.2f}",
            'Max Drawdown': f"{max_drawdown_pct:.2f}%",
            'Total Entries': len(entry_trades),
            'Long Trades': len(long_trades),
            'Short Trades': len(short_trades),
            'Final Equity': f"${self.equity:,.2f}"
        }
    
    def print_trade_log(self, limit=20):
        """Print recent trades for debugging"""
        print(f"\n=== RECENT TRADES (last {limit}) ===")
        recent_trades = self.trades[-limit:]
        
        for trade in recent_trades:
            timestamp = trade['timestamp'].strftime('%Y-%m-%d')
            trade_type = trade['type']
            price = trade['price']
            size = trade.get('size', 0)
            comment = trade.get('comment', '')
            
            if 'pnl' in trade:
                pnl = trade['pnl']
                equity = trade.get('equity_after', 0)
                print(f"{timestamp} | {trade_type:12} | ${price:8.2f} | Size: {size:8.2f} | PnL: ${pnl:10.2f} | Equity: ${equity:12.2f} | {comment}")
            else:
                equity = trade.get('equity_after', 0)
                print(f"{timestamp} | {trade_type:12} | ${price:8.2f} | Size: {size:8.2f} | Entry     | Equity: ${equity:12.2f} | {comment}")


def main():
    """Run corrected backtest"""
    print("=== CORRECTED TradingView-Matching Backtest ===\n")
    
    strategy = CorrectedBTCStrategy()
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    strategy.run_backtest(df)
    
    # Display results
    metrics = strategy.calculate_metrics()
    
    print("\n=== CORRECTED RESULTS ===")
    for key, value in metrics.items():
        print(f"{key:20}: {value}")
    
    # Show recent trades
    strategy.print_trade_log(20)
    
    # Quick comparison with TradingView results
    print(f"\n=== COMPARISON WITH TRADINGVIEW ===")
    print(f"TradingView Net Profit: +2,766,628%")
    print(f"Python Net Profit:      {((strategy.equity/strategy.initial_capital - 1) * 100):.0f}%")
    print(f"TradingView B&H Return: +1,082,970%")
    
    final_price = df['close'].iloc[-1]
    first_price = df['close'].iloc[0] 
    bh_return = ((final_price / first_price) - 1) * 100
    print(f"Python B&H Return:      {bh_return:.0f}%")
    

if __name__ == "__main__":
    main()