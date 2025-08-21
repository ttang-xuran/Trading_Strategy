#!/usr/bin/env python3
"""
Download Binance BTC/USDT data and backtest the exact Pine Script strategy
"""

import pandas as pd
import numpy as np
import requests
import time
from datetime import datetime, timezone
from exact_pine_script_implementation import ExactPineScriptStrategy

def download_binance_data(symbol="BTCUSDT", interval="1d", start_date="2015-01-01", end_date="2025-08-19"):
    """Download historical data from Binance API"""
    
    print(f"Downloading Binance {symbol} data from {start_date} to {end_date}...")
    
    # Convert dates to timestamps
    start_ts = int(pd.Timestamp(start_date).timestamp() * 1000)
    end_ts = int(pd.Timestamp(end_date).timestamp() * 1000)
    
    # Binance API endpoint
    url = "https://api.binance.com/api/v3/klines"
    
    all_data = []
    current_start = start_ts
    
    while current_start < end_ts:
        params = {
            'symbol': symbol,
            'interval': interval,
            'startTime': current_start,
            'endTime': end_ts,
            'limit': 1000  # Max limit per request
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                break
            
            all_data.extend(data)
            
            # Update start time for next batch
            current_start = data[-1][6] + 1  # Close time + 1ms
            
            print(f"Downloaded {len(data)} candles, total: {len(all_data)}")
            
            # Respect rate limits
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Error downloading data: {e}")
            break
    
    if not all_data:
        print("No data downloaded!")
        return None
    
    # Convert to DataFrame
    df = pd.DataFrame(all_data, columns=[
        'open_time', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades_count', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])
    
    # Convert to proper data types
    df['datetime'] = pd.to_datetime(df['open_time'], unit='ms')
    df['open'] = df['open'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['close'] = df['close'].astype(float)
    df['volume'] = df['volume'].astype(float)
    
    # Keep only necessary columns
    df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
    
    # Set datetime as index
    df.set_index('datetime', inplace=True)
    df.sort_index(inplace=True)
    
    # Filter to exact date range
    start_filter = pd.Timestamp(start_date)
    end_filter = pd.Timestamp(end_date)
    df = df[(df.index >= start_filter) & (df.index <= end_filter)]
    
    print(f"Final dataset: {len(df)} candles from {df.index[0]} to {df.index[-1]}")
    print(f"Price range: ${df['close'].min():.2f} - ${df['close'].max():.2f}")
    
    return df

def save_binance_data(df, filename):
    """Save Binance data in the same format as our existing data"""
    
    # Reset index to get datetime as column
    df_save = df.reset_index()
    
    # Format datetime to match existing format (M/D/YYYY)
    df_save['datetime'] = df_save['datetime'].dt.strftime('%m/%d/%Y')
    
    # Save to CSV
    df_save.to_csv(filename, index=False)
    print(f"Binance data saved to: {filename}")

def compare_data_sources():
    """Compare Coinbase vs Binance data"""
    
    print("\n=== COMPARING DATA SOURCES ===")
    
    # Load Coinbase data
    coinbase_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv')
    coinbase_df['datetime'] = pd.to_datetime(coinbase_df['datetime'], format='%m/%d/%Y')
    coinbase_df.set_index('datetime', inplace=True)
    
    # Load Binance data
    binance_df = pd.read_csv('/home/ttang/Super BTC trading Strategy/BTC_Binance_Historical.csv')
    binance_df['datetime'] = pd.to_datetime(binance_df['datetime'], format='%m/%d/%Y')
    binance_df.set_index('datetime', inplace=True)
    
    # Find common date range
    start_date = max(coinbase_df.index[0], binance_df.index[0])
    end_date = min(coinbase_df.index[-1], binance_df.index[-1])
    
    print(f"Comparison period: {start_date} to {end_date}")
    
    # Filter to common range
    coinbase_common = coinbase_df[(coinbase_df.index >= start_date) & (coinbase_df.index <= end_date)]
    binance_common = binance_df[(binance_df.index >= start_date) & (binance_df.index <= end_date)]
    
    print(f"Coinbase candles: {len(coinbase_common)}")
    print(f"Binance candles: {len(binance_common)}")
    
    # Compare price ranges
    print(f"\nPrice Ranges:")
    print(f"Coinbase: ${coinbase_common['close'].min():.2f} - ${coinbase_common['close'].max():.2f}")
    print(f"Binance:  ${binance_common['close'].min():.2f} - ${binance_common['close'].max():.2f}")
    
    # Compare on overlapping dates
    if len(coinbase_common) > 0 and len(binance_common) > 0:
        # Merge on date
        comparison = pd.merge(coinbase_common, binance_common, left_index=True, right_index=True, suffixes=('_cb', '_bn'))
        
        if len(comparison) > 0:
            # Calculate price differences
            comparison['close_diff'] = abs(comparison['close_cb'] - comparison['close_bn'])
            comparison['close_diff_pct'] = (comparison['close_diff'] / comparison['close_cb']) * 100
            
            print(f"\nPrice Difference Analysis ({len(comparison)} overlapping dates):")
            print(f"Average price difference: ${comparison['close_diff'].mean():.2f}")
            print(f"Max price difference: ${comparison['close_diff'].max():.2f}")
            print(f"Average percentage difference: {comparison['close_diff_pct'].mean():.3f}%")
            print(f"Max percentage difference: {comparison['close_diff_pct'].max():.3f}%")
            
            # Show some sample comparisons
            print(f"\nSample price comparisons:")
            print(f"{'Date':<12} {'Coinbase':<10} {'Binance':<10} {'Diff %':<8}")
            print("-" * 45)
            for i in range(min(5, len(comparison))):
                row = comparison.iloc[i]
                date_str = row.name.strftime('%Y-%m-%d')
                cb_price = row['close_cb']
                bn_price = row['close_bn']
                diff_pct = row['close_diff_pct']
                print(f"{date_str:<12} ${cb_price:<9.2f} ${bn_price:<9.2f} {diff_pct:<7.3f}%")

def run_binance_backtest():
    """Run backtest with Binance data"""
    
    print("\n=== BINANCE BACKTEST ===")
    print("Running exact Pine Script implementation with Binance BTC/USDT data")
    
    # Initialize strategy
    strategy = ExactPineScriptStrategy()
    
    # Load and prepare Binance data
    df = strategy.load_and_prepare_data('/home/ttang/Super BTC trading Strategy/BTC_Binance_Historical.csv')
    
    # Run backtest
    strategy.run_exact_backtest(df)
    
    # Calculate results
    results = strategy.calculate_results()
    
    # Save results with Binance suffix
    if strategy.trades:
        trades_df = pd.DataFrame(strategy.trades)
        trades_df.to_csv('/home/ttang/Super BTC trading Strategy/binance_trades.csv', index=False)
        print("Binance trades saved to: binance_trades.csv")
    
    if strategy.daily_data:
        daily_df = pd.DataFrame(strategy.daily_data)
        daily_df.to_csv('/home/ttang/Super BTC trading Strategy/binance_daily.csv', index=False)
        print("Binance daily data saved to: binance_daily.csv")
    
    return results

def compare_backtest_results():
    """Compare Coinbase vs Binance backtest results"""
    
    print("\n=== BACKTEST COMPARISON ===")
    
    try:
        # Load Coinbase results
        coinbase_trades = pd.read_csv('/home/ttang/Super BTC trading Strategy/exact_pine_trades.csv')
        
        # Load Binance results
        binance_trades = pd.read_csv('/home/ttang/Super BTC trading Strategy/binance_trades.csv')
        
        # Calculate metrics for both
        def calculate_metrics(trades_df, name):
            if len(trades_df) == 0:
                return {}
            
            initial_capital = 100000
            final_equity = trades_df['equity'].iloc[-1] if 'equity' in trades_df.columns else initial_capital
            total_return = (final_equity / initial_capital - 1) * 100
            
            # Win rate
            pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
            if len(pnl_trades) > 0:
                winning_trades = pnl_trades[pnl_trades['pnl'] > 0]
                win_rate = len(winning_trades) / len(pnl_trades) * 100
            else:
                win_rate = 0
            
            return {
                'name': name,
                'trades': len(trades_df),
                'final_equity': final_equity,
                'total_return': total_return,
                'win_rate': win_rate
            }
        
        coinbase_metrics = calculate_metrics(coinbase_trades, "Coinbase")
        binance_metrics = calculate_metrics(binance_trades, "Binance")
        
        print(f"{'Metric':<20} {'Coinbase':<15} {'Binance':<15} {'Difference':<15}")
        print("-" * 70)
        print(f"{'Total Trades':<20} {coinbase_metrics['trades']:<15} {binance_metrics['trades']:<15} {binance_metrics['trades'] - coinbase_metrics['trades']:<15}")
        print(f"{'Final Equity':<20} ${coinbase_metrics['final_equity']:<14,.0f} ${binance_metrics['final_equity']:<14,.0f} ${binance_metrics['final_equity'] - coinbase_metrics['final_equity']:<14,.0f}")
        print(f"{'Total Return %':<20} {coinbase_metrics['total_return']:<14.1f}% {binance_metrics['total_return']:<14.1f}% {binance_metrics['total_return'] - coinbase_metrics['total_return']:<14.1f}%")
        print(f"{'Win Rate %':<20} {coinbase_metrics['win_rate']:<14.1f}% {binance_metrics['win_rate']:<14.1f}% {binance_metrics['win_rate'] - coinbase_metrics['win_rate']:<14.1f}%")
        
    except Exception as e:
        print(f"Error comparing results: {e}")

def main():
    """Main execution"""
    
    print("=== BINANCE DATA DOWNLOAD AND BACKTEST ===")
    
    # Download Binance data
    binance_df = download_binance_data(
        symbol="BTCUSDT",
        interval="1d", 
        start_date="2015-01-01",
        end_date="2025-08-19"
    )
    
    if binance_df is None:
        print("Failed to download Binance data!")
        return
    
    # Save Binance data
    save_binance_data(binance_df, '/home/ttang/Super BTC trading Strategy/BTC_Binance_Historical.csv')
    
    # Compare data sources
    compare_data_sources()
    
    # Run backtest with Binance data
    binance_results = run_binance_backtest()
    
    # Compare results
    compare_backtest_results()
    
    print("\n" + "="*60)
    print("BINANCE BACKTEST COMPLETED")
    print("Files created:")
    print("- BTC_Binance_Historical.csv: Raw Binance data")
    print("- binance_trades.csv: Binance backtest trades")
    print("- binance_daily.csv: Binance daily data")

if __name__ == "__main__":
    main()