#!/usr/bin/env python3
"""
Adaptive Volatility Breakout Strategy [Reversal Enabled] - Python Implementation
Converted from Pine Script v5 with TradingView execution behavior
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timezone
import warnings
warnings.filterwarnings('ignore')

class BTCTradingStrategy:
    def __init__(self):
        # Strategy Parameters (matching Pine Script defaults)
        self.lookback_period = 20
        self.range_mult = 0.5
        self.stop_loss_mult = 2.5
        self.atr_period = 14
        
        # Trading Parameters
        self.initial_capital = 100000
        self.commission_rate = 0.001  # 0.1% commission
        self.position_size_pct = 0.99  # 99% of equity
        
        # Date Range (matching Pine Script defaults)
        self.start_date = pd.Timestamp('2020-01-01')
        self.end_date = pd.Timestamp('2025-12-31')
        
        # Position tracking
        self.position = 0  # 0=no position, 1=long, -1=short
        self.position_size = 0
        self.entry_price = 0
        self.equity = self.initial_capital
        self.cash = self.initial_capital
        
        # Results tracking
        self.trades = []
        self.equity_curve = []
        
    def calculate_atr(self, df, period=14):
        """Calculate Average True Range"""
        high = df['high']
        low = df['low'] 
        close = df['close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean()
        
        return atr
    
    def load_data(self, file_path):
        """Load and prepare historical data"""
        print("Loading historical Bitcoin data...")
        
        # Read CSV file
        df = pd.read_csv(file_path)
        
        # Convert datetime column
        df['datetime'] = pd.to_datetime(df['datetime'], format='%m/%d/%Y')
        df.set_index('datetime', inplace=True)
        
        # Sort by date
        df.sort_index(inplace=True)
        
        # Filter date range
        df = df[(df.index >= self.start_date) & (df.index <= self.end_date)]
        
        # Calculate ATR
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # Calculate rolling highest high and lowest low (using previous bars)
        df['highest_high'] = df['high'].rolling(window=self.lookback_period).max().shift(1)
        df['lowest_low'] = df['low'].rolling(window=self.lookback_period).min().shift(1)
        
        # Calculate breakout range and boundaries
        df['breakout_range'] = df['highest_high'] - df['lowest_low']
        df['upper_boundary'] = df['open'] + df['breakout_range'] * self.range_mult
        df['lower_boundary'] = df['open'] - df['breakout_range'] * self.range_mult
        
        # Generate signals
        df['go_long'] = df['high'] > df['upper_boundary']
        df['go_short'] = df['low'] < df['lower_boundary']
        
        print(f"Data loaded: {len(df)} bars from {df.index[0]} to {df.index[-1]}")
        return df
    
    def execute_trade(self, signal_type, price, timestamp):
        """Execute a trade with TradingView-like behavior"""
        
        # Calculate position size based on current equity
        trade_value = self.equity * self.position_size_pct
        shares = trade_value / price
        commission = trade_value * self.commission_rate
        
        if signal_type == 'long':
            # Close short position if exists
            if self.position == -1:
                pnl = (self.entry_price - price) * abs(self.position_size) - commission
                self.cash += pnl + abs(self.position_size) * self.entry_price
                self.trades.append({
                    'timestamp': timestamp,
                    'type': 'close_short',
                    'price': price,
                    'size': abs(self.position_size),
                    'pnl': pnl,
                    'equity': self.equity + pnl
                })
                self.equity += pnl
            
            # Open long position
            self.position = 1
            self.position_size = shares
            self.entry_price = price
            self.cash -= trade_value
            
            self.trades.append({
                'timestamp': timestamp,
                'type': 'long',
                'price': price,
                'size': shares,
                'pnl': 0,
                'equity': self.equity
            })
            
        elif signal_type == 'short':
            # Close long position if exists
            if self.position == 1:
                pnl = (price - self.entry_price) * self.position_size - commission
                self.cash += pnl + self.position_size * self.entry_price
                self.trades.append({
                    'timestamp': timestamp,
                    'type': 'close_long',
                    'price': price,
                    'size': self.position_size,
                    'pnl': pnl,
                    'equity': self.equity + pnl
                })
                self.equity += pnl
            
            # Open short position
            self.position = -1
            self.position_size = -shares
            self.entry_price = price
            self.cash += trade_value  # We receive cash when shorting
            
            self.trades.append({
                'timestamp': timestamp,
                'type': 'short',
                'price': price,
                'size': shares,
                'pnl': 0,
                'equity': self.equity
            })
    
    def check_stop_loss(self, row, timestamp):
        """Check and execute stop loss orders"""
        if self.position == 0:
            return False
            
        atr = row['atr']
        if pd.isna(atr):
            return False
            
        if self.position == 1:  # Long position
            stop_price = self.entry_price - atr * self.stop_loss_mult
            if row['low'] <= stop_price:
                # Stop loss hit
                exit_price = min(row['open'], stop_price)  # Use opening price or stop price, whichever is worse
                pnl = (exit_price - self.entry_price) * self.position_size - (self.equity * self.position_size_pct * self.commission_rate)
                self.cash += self.position_size * exit_price
                self.equity += pnl
                
                self.trades.append({
                    'timestamp': timestamp,
                    'type': 'stop_loss_long',
                    'price': exit_price,
                    'size': self.position_size,
                    'pnl': pnl,
                    'equity': self.equity
                })
                
                self.position = 0
                self.position_size = 0
                self.entry_price = 0
                return True
                
        elif self.position == -1:  # Short position
            stop_price = self.entry_price + atr * self.stop_loss_mult
            if row['high'] >= stop_price:
                # Stop loss hit
                exit_price = max(row['open'], stop_price)  # Use opening price or stop price, whichever is worse
                pnl = (self.entry_price - exit_price) * abs(self.position_size) - (self.equity * self.position_size_pct * self.commission_rate)
                self.cash += abs(self.position_size) * self.entry_price  # Return the borrowed shares value
                self.equity += pnl
                
                self.trades.append({
                    'timestamp': timestamp,
                    'type': 'stop_loss_short',
                    'price': exit_price,
                    'size': abs(self.position_size),
                    'pnl': pnl,
                    'equity': self.equity
                })
                
                self.position = 0
                self.position_size = 0
                self.entry_price = 0
                return True
        
        return False
    
    def update_equity(self, current_price):
        """Update current equity based on unrealized PnL"""
        if self.position == 0:
            return self.cash
        
        if self.position == 1:  # Long position
            unrealized_pnl = (current_price - self.entry_price) * self.position_size
        else:  # Short position
            unrealized_pnl = (self.entry_price - current_price) * abs(self.position_size)
        
        return self.cash + unrealized_pnl
    
    def run_backtest(self, df):
        """Run the backtest with TradingView execution behavior"""
        print("Running backtest...")
        
        for i, (timestamp, row) in enumerate(df.iterrows()):
            # Skip rows with insufficient data
            if pd.isna(row['upper_boundary']) or pd.isna(row['lower_boundary']):
                continue
            
            # Check stop loss first (can happen any time during the bar)
            stop_hit = self.check_stop_loss(row, timestamp)
            
            # Only check for new signals if no stop loss was hit
            if not stop_hit:
                # Check for long signal (reversal enabled)
                if row['go_long']:
                    self.execute_trade('long', row['close'], timestamp)
                
                # Check for short signal (reversal enabled)
                elif row['go_short']:
                    self.execute_trade('short', row['close'], timestamp)
            
            # Update equity curve
            current_equity = self.update_equity(row['close'])
            self.equity_curve.append({
                'timestamp': timestamp,
                'equity': current_equity,
                'price': row['close']
            })
        
        # Close any remaining position at the end
        if self.position != 0:
            final_row = df.iloc[-1]
            if self.position == 1:
                pnl = (final_row['close'] - self.entry_price) * self.position_size - (self.equity * self.position_size_pct * self.commission_rate)
            else:
                pnl = (self.entry_price - final_row['close']) * abs(self.position_size) - (self.equity * self.position_size_pct * self.commission_rate)
            
            self.equity += pnl
            self.trades.append({
                'timestamp': df.index[-1],
                'type': 'close_final',
                'price': final_row['close'],
                'size': abs(self.position_size),
                'pnl': pnl,
                'equity': self.equity
            })
        
        print(f"Backtest completed. Total trades: {len(self.trades)}")
    
    def calculate_metrics(self):
        """Calculate performance metrics"""
        if not self.trades:
            return {}
        
        equity_df = pd.DataFrame(self.equity_curve)
        
        # Basic metrics
        total_return = (self.equity - self.initial_capital) / self.initial_capital * 100
        
        # Calculate returns for Sharpe ratio
        equity_df['returns'] = equity_df['equity'].pct_change()
        annual_return = equity_df['returns'].mean() * 252 * 100
        volatility = equity_df['returns'].std() * np.sqrt(252) * 100
        sharpe_ratio = annual_return / volatility if volatility > 0 else 0
        
        # Maximum drawdown
        equity_df['cummax'] = equity_df['equity'].cummax()
        equity_df['drawdown'] = (equity_df['equity'] - equity_df['cummax']) / equity_df['cummax']
        max_drawdown = equity_df['drawdown'].min() * 100
        
        # Win rate
        profitable_trades = [t for t in self.trades if t.get('pnl', 0) > 0]
        total_trades_with_pnl = [t for t in self.trades if 'pnl' in t and t['pnl'] != 0]
        win_rate = len(profitable_trades) / len(total_trades_with_pnl) * 100 if total_trades_with_pnl else 0
        
        return {
            'Initial Capital': f"${self.initial_capital:,.2f}",
            'Final Equity': f"${self.equity:,.2f}",
            'Total Return': f"{total_return:.2f}%",
            'Annual Return': f"{annual_return:.2f}%",
            'Volatility': f"{volatility:.2f}%",
            'Sharpe Ratio': f"{sharpe_ratio:.2f}",
            'Max Drawdown': f"{max_drawdown:.2f}%",
            'Total Trades': len(total_trades_with_pnl),
            'Win Rate': f"{win_rate:.2f}%",
            'Profitable Trades': len(profitable_trades)
        }
    
    def plot_results(self):
        """Plot backtest results"""
        if not self.equity_curve:
            print("No data to plot")
            return
        
        equity_df = pd.DataFrame(self.equity_curve)
        equity_df.set_index('timestamp', inplace=True)
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        
        # Plot price and equity
        ax1.plot(equity_df.index, equity_df['price'], label='BTC Price', color='orange', alpha=0.7)
        ax1.set_ylabel('BTC Price ($)', color='orange')
        ax1.tick_params(axis='y', labelcolor='orange')
        ax1.set_title('Adaptive Volatility Breakout Strategy - Backtest Results')
        
        ax1_twin = ax1.twinx()
        ax1_twin.plot(equity_df.index, equity_df['equity'], label='Portfolio Equity', color='blue', linewidth=2)
        ax1_twin.set_ylabel('Portfolio Equity ($)', color='blue')
        ax1_twin.tick_params(axis='y', labelcolor='blue')
        
        # Plot drawdown
        equity_df['cummax'] = equity_df['equity'].cummax()
        equity_df['drawdown'] = (equity_df['equity'] - equity_df['cummax']) / equity_df['cummax'] * 100
        
        ax2.fill_between(equity_df.index, equity_df['drawdown'], 0, color='red', alpha=0.3)
        ax2.plot(equity_df.index, equity_df['drawdown'], color='red', linewidth=1)
        ax2.set_ylabel('Drawdown (%)')
        ax2.set_xlabel('Date')
        ax2.set_title('Portfolio Drawdown')
        
        plt.tight_layout()
        plt.savefig('/home/ttang/Super BTC trading Strategy/backtest_results.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("Chart saved as 'backtest_results.png'")


def main():
    """Main execution function"""
    print("=== Adaptive Volatility Breakout Strategy Backtest ===\n")
    
    # Initialize strategy
    strategy = BTCTradingStrategy()
    
    # Load data
    df = strategy.load_data('/home/ttang/Super BTC trading Strategy/BTC_Price_full_history.csv')
    
    # Run backtest
    strategy.run_backtest(df)
    
    # Calculate and display results
    metrics = strategy.calculate_metrics()
    
    print("\n=== BACKTEST RESULTS ===")
    for key, value in metrics.items():
        print(f"{key:20}: {value}")
    
    # Display trade summary
    print(f"\n=== TRADE SUMMARY ===")
    trades_df = pd.DataFrame(strategy.trades)
    if not trades_df.empty:
        print(f"First Trade: {trades_df.iloc[0]['timestamp'].strftime('%Y-%m-%d')} - {trades_df.iloc[0]['type']}")
        print(f"Last Trade:  {trades_df.iloc[-1]['timestamp'].strftime('%Y-%m-%d')} - {trades_df.iloc[-1]['type']}")
        
        # Show PnL distribution
        pnl_trades = trades_df[trades_df['pnl'] != 0]['pnl']
        if len(pnl_trades) > 0:
            print(f"Average Trade PnL: ${pnl_trades.mean():.2f}")
            print(f"Best Trade: ${pnl_trades.max():.2f}")
            print(f"Worst Trade: ${pnl_trades.min():.2f}")
    
    # Plot results
    strategy.plot_results()


if __name__ == "__main__":
    main()