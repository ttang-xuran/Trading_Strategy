#!/usr/bin/env python3
"""
Download BTC data from alternative sources and test optimized strategy
"""

import pandas as pd
import numpy as np
import requests
import time
from datetime import datetime, timedelta
from exact_pine_script_implementation import ExactPineScriptStrategy

def download_yahoo_finance_data():
    """Download BTC data from Yahoo Finance"""
    
    print("=== DOWNLOADING BTC DATA FROM YAHOO FINANCE ===")
    
    try:
        import yfinance as yf
        print("Using yfinance library...")
        
        # Download BTC-USD data from Yahoo Finance
        ticker = "BTC-USD"
        start_date = "2015-01-01"
        end_date = "2025-08-19"
        
        print(f"Downloading {ticker} from {start_date} to {end_date}...")
        
        btc_data = yf.download(ticker, start=start_date, end=end_date, interval="1d")
        
        if btc_data.empty:
            print("No data received from Yahoo Finance")
            return None
        
        # Clean and format data
        btc_data = btc_data.reset_index()
        btc_data.columns = [col.lower() for col in btc_data.columns]
        
        # Rename columns to match our format
        btc_data = btc_data.rename(columns={
            'date': 'datetime',
            'adj close': 'adj_close'
        })
        
        # Keep only necessary columns
        btc_data = btc_data[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        
        print(f"Downloaded {len(btc_data)} candles from Yahoo Finance")
        print(f"Date range: {btc_data['datetime'].min()} to {btc_data['datetime'].max()}")
        print(f"Price range: ${btc_data['close'].min():.2f} - ${btc_data['close'].max():.2f}")
        
        return btc_data
        
    except ImportError:
        print("yfinance not available, trying manual download...")
        return download_yahoo_manual()

def download_yahoo_manual():
    """Manual download from Yahoo Finance API"""
    
    print("Attempting manual Yahoo Finance download...")
    
    # Yahoo Finance API endpoint
    end_timestamp = int(time.time())
    start_timestamp = int(datetime(2015, 1, 1).timestamp())
    
    url = f"https://query1.finance.yahoo.com/v7/finance/download/BTC-USD"
    params = {
        'period1': start_timestamp,
        'period2': end_timestamp,
        'interval': '1d',
        'events': 'history'
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        # Parse CSV data
        from io import StringIO
        csv_data = StringIO(response.text)
        df = pd.read_csv(csv_data)
        
        # Clean data
        df['Date'] = pd.to_datetime(df['Date'])
        df = df.rename(columns={'Date': 'datetime'})
        df.columns = [col.lower() for col in df.columns]
        
        # Remove null values
        df = df.dropna()
        
        print(f"Downloaded {len(df)} candles via manual method")
        return df
        
    except Exception as e:
        print(f"Manual download failed: {e}")
        return None

def download_cryptocompare_data():
    """Download data from CryptoCompare API"""
    
    print("\n=== DOWNLOADING BTC DATA FROM CRYPTOCOMPARE ===")
    
    url = "https://min-api.cryptocompare.com/data/v2/histoday"
    
    all_data = []
    to_timestamp = int(time.time())
    
    # Download in chunks (CryptoCompare has 2000 day limit per request)
    while to_timestamp > int(datetime(2015, 1, 1).timestamp()):
        params = {
            'fsym': 'BTC',
            'tsym': 'USD',
            'limit': 2000,
            'toTs': to_timestamp
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data['Response'] == 'Success':
                chunk_data = data['Data']['Data']
                all_data.extend(chunk_data)
                
                # Update timestamp for next chunk
                if chunk_data:
                    to_timestamp = chunk_data[0]['time'] - 86400  # Go back one day
                else:
                    break
                    
                print(f"Downloaded chunk: {len(chunk_data)} candles")
                time.sleep(0.1)  # Rate limiting
            else:
                print(f"API Error: {data.get('Message', 'Unknown error')}")
                break
                
        except Exception as e:
            print(f"Error downloading from CryptoCompare: {e}")
            break
    
    if all_data:
        # Convert to DataFrame
        df = pd.DataFrame(all_data)
        df['datetime'] = pd.to_datetime(df['time'], unit='s')
        df = df.rename(columns={
            'open': 'open',
            'high': 'high', 
            'low': 'low',
            'close': 'close',
            'volumefrom': 'volume'
        })
        
        # Keep only necessary columns
        df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        
        # Sort by date and remove duplicates
        df = df.sort_values('datetime').drop_duplicates(subset=['datetime'])
        
        # Filter date range
        df = df[(df['datetime'] >= '2015-01-01') & (df['datetime'] <= '2025-08-19')]
        
        print(f"Final CryptoCompare dataset: {len(df)} candles")
        print(f"Date range: {df['datetime'].min()} to {df['datetime'].max()}")
        print(f"Price range: ${df['close'].min():.2f} - ${df['close'].max():.2f}")
        
        return df
    
    return None

def save_alternative_data(df, source_name):
    """Save alternative data in our standard format"""
    
    # Format datetime to match existing format (M/D/YYYY)
    df_save = df.copy()
    df_save['datetime'] = df_save['datetime'].dt.strftime('%m/%d/%Y')
    
    filename = f'/home/ttang/Super BTC trading Strategy/BTC_{source_name}_Historical.csv'
    df_save.to_csv(filename, index=False)
    print(f"{source_name} data saved to: {filename}")
    
    return filename

def test_strategy_on_alternative_data(data_file, source_name):
    """Test optimized strategy on alternative data source"""
    
    print(f"\n=== TESTING OPTIMIZED STRATEGY ON {source_name.upper()} DATA ===")
    
    # Initialize strategy with optimized parameters
    strategy = ExactPineScriptStrategy()
    strategy.lookback_period = 25
    strategy.range_mult = 0.4
    strategy.stop_loss_mult = 2.0
    
    try:
        # Load and prepare data
        df = strategy.load_and_prepare_data(data_file)
        
        print(f"Data loaded: {len(df)} candles from {df.index[0]} to {df.index[-1]}")
        
        # Run backtest
        strategy.run_exact_backtest(df)
        
        # Calculate results
        final_return = (strategy.equity / strategy.initial_capital - 1) * 100
        trade_count = len(strategy.trades)
        
        # Calculate win rate
        trades_df = pd.DataFrame(strategy.trades)
        win_rate = 0
        if not trades_df.empty:
            pnl_trades = trades_df[trades_df.get('pnl', 0) != 0]
            if len(pnl_trades) > 0:
                winning_trades = pnl_trades[pnl_trades['pnl'] > 0]
                win_rate = len(winning_trades) / len(pnl_trades) * 100
        
        # Calculate max drawdown
        max_drawdown = 0
        if strategy.daily_data:
            daily_df = pd.DataFrame(strategy.daily_data)
            daily_df['total_equity'] = daily_df['total_equity'].fillna(daily_df['equity'])
            daily_df['peak'] = daily_df['total_equity'].cummax()
            daily_df['drawdown'] = (daily_df['total_equity'] - daily_df['peak']) / daily_df['peak'] * 100
            max_drawdown = abs(daily_df['drawdown'].min())
        
        print(f"\n{source_name.upper()} BACKTEST RESULTS:")
        print(f"  Final Return: {final_return:,.1f}%")
        print(f"  Total Trades: {trade_count}")
        print(f"  Win Rate: {win_rate:.1f}%")
        print(f"  Max Drawdown: {max_drawdown:.1f}%")
        print(f"  Final Equity: ${strategy.equity:,.0f}")
        
        # Save results
        trades_filename = f'/home/ttang/Super BTC trading Strategy/{source_name.lower()}_optimized_trades.csv'
        if strategy.trades:
            trades_df.to_csv(trades_filename, index=False)
            print(f"  Trades saved to: {trades_filename}")
        
        return {
            'source': source_name,
            'final_return': final_return,
            'trade_count': trade_count,
            'win_rate': win_rate,
            'max_drawdown': max_drawdown,
            'final_equity': strategy.equity
        }
        
    except Exception as e:
        print(f"Error testing {source_name} data: {e}")
        return None

def compare_all_sources():
    """Compare results across all data sources"""
    
    print(f"\n{'='*80}")
    print("COMPARISON ACROSS ALL DATA SOURCES")
    print(f"{'='*80}")
    
    # Load existing results
    sources_data = []
    
    # Try to load Coinbase results
    try:
        coinbase_trades = pd.read_csv('/home/ttang/Super BTC trading Strategy/optimized_trades.csv')
        coinbase_final_equity = coinbase_trades['equity'].iloc[-1]
        coinbase_return = (coinbase_final_equity / 100000 - 1) * 100
        coinbase_trade_count = len(coinbase_trades)
        
        coinbase_pnl_trades = coinbase_trades[coinbase_trades.get('pnl', 0) != 0]
        if len(coinbase_pnl_trades) > 0:
            coinbase_winning = coinbase_pnl_trades[coinbase_pnl_trades['pnl'] > 0]
            coinbase_win_rate = len(coinbase_winning) / len(coinbase_pnl_trades) * 100
        else:
            coinbase_win_rate = 0
        
        sources_data.append({
            'source': 'Coinbase',
            'final_return': coinbase_return,
            'trade_count': coinbase_trade_count,
            'win_rate': coinbase_win_rate,
            'final_equity': coinbase_final_equity
        })
        
    except Exception as e:
        print(f"Could not load Coinbase results: {e}")
    
    # Try to load Binance results
    try:
        binance_trades = pd.read_csv('/home/ttang/Super BTC trading Strategy/binance_optimized_trades.csv')
        binance_final_equity = binance_trades['equity'].iloc[-1]
        binance_return = (binance_final_equity / 100000 - 1) * 100
        binance_trade_count = len(binance_trades)
        
        binance_pnl_trades = binance_trades[binance_trades.get('pnl', 0) != 0]
        if len(binance_pnl_trades) > 0:
            binance_winning = binance_pnl_trades[binance_pnl_trades['pnl'] > 0]
            binance_win_rate = len(binance_winning) / len(binance_pnl_trades) * 100
        else:
            binance_win_rate = 0
        
        sources_data.append({
            'source': 'Binance',
            'final_return': binance_return,
            'trade_count': binance_trade_count,
            'win_rate': binance_win_rate,
            'final_equity': binance_final_equity
        })
        
    except Exception as e:
        print(f"Could not load Binance results: {e}")
    
    return sources_data

def main():
    """Main execution"""
    
    print("TESTING OPTIMIZED STRATEGY ON ALTERNATIVE DATA SOURCES")
    print("Parameters: (25, 0.4, 2.0)")
    
    all_results = []
    
    # Try Yahoo Finance
    print("\n" + "="*60)
    yahoo_data = download_yahoo_finance_data()
    if yahoo_data is not None:
        yahoo_file = save_alternative_data(yahoo_data, "YahooFinance")
        yahoo_result = test_strategy_on_alternative_data(yahoo_file, "YahooFinance")
        if yahoo_result:
            all_results.append(yahoo_result)
    
    # Try CryptoCompare
    print("\n" + "="*60)
    crypto_data = download_cryptocompare_data()
    if crypto_data is not None:
        crypto_file = save_alternative_data(crypto_data, "CryptoCompare")
        crypto_result = test_strategy_on_alternative_data(crypto_file, "CryptoCompare")
        if crypto_result:
            all_results.append(crypto_result)
    
    # Compare all sources
    existing_results = compare_all_sources()
    all_results.extend(existing_results)
    
    if all_results:
        print(f"\n{'='*80}")
        print("FINAL COMPARISON - ALL DATA SOURCES")
        print(f"{'='*80}")
        
        print(f"{'Source':<15} {'Return %':<12} {'Trades':<8} {'Win %':<8} {'Final Equity':<15}")
        print("-" * 65)
        
        for result in all_results:
            print(f"{result['source']:<15} {result['final_return']:<11,.0f} {result['trade_count']:<8} "
                  f"{result['win_rate']:<7.1f} ${result['final_equity']:<14,.0f}")
        
        # Find best and worst
        if len(all_results) > 1:
            best_return = max(all_results, key=lambda x: x['final_return'])
            worst_return = min(all_results, key=lambda x: x['final_return'])
            
            print(f"\nBest Performance: {best_return['source']} ({best_return['final_return']:,.0f}%)")
            print(f"Worst Performance: {worst_return['source']} ({worst_return['final_return']:,.0f}%)")
            
            return_spread = best_return['final_return'] - worst_return['final_return']
            print(f"Performance Spread: {return_spread:,.0f}%")

if __name__ == "__main__":
    main()