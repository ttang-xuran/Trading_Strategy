#!/usr/bin/env python3
"""
Download BTC data from alternative sources and test optimized strategy (Fixed)
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
        
        btc_data = yf.download(ticker, start=start_date, end=end_date, interval="1d", auto_adjust=True, prepost=True, threads=True)
        
        if btc_data.empty:
            print("No data received from Yahoo Finance")
            return None
        
        # Reset index to get Date as column
        btc_data = btc_data.reset_index()
        
        # Handle MultiIndex columns if present
        if isinstance(btc_data.columns, pd.MultiIndex):
            btc_data.columns = [col[0] if col[1] == '' else f"{col[0]}_{col[1]}" for col in btc_data.columns]
        
        # Convert column names to lowercase
        btc_data.columns = [str(col).lower().replace(' ', '_') for col in btc_data.columns]
        
        # Rename columns to match our format
        column_mapping = {
            'date': 'datetime',
            'adj_close': 'adj_close'
        }
        
        for old_col, new_col in column_mapping.items():
            if old_col in btc_data.columns:
                btc_data = btc_data.rename(columns={old_col: new_col})
        
        # Ensure we have the required columns
        required_cols = ['datetime', 'open', 'high', 'low', 'close', 'volume']
        
        # Check which columns we actually have
        print(f"Available columns: {list(btc_data.columns)}")
        
        # Try to map columns if they have different names
        if 'datetime' not in btc_data.columns and 'date' in btc_data.columns:
            btc_data = btc_data.rename(columns={'date': 'datetime'})
        
        # Keep only necessary columns that exist
        available_cols = [col for col in required_cols if col in btc_data.columns]
        btc_data = btc_data[available_cols]
        
        # Remove any rows with null values
        btc_data = btc_data.dropna()
        
        print(f"Downloaded {len(btc_data)} candles from Yahoo Finance")
        print(f"Date range: {btc_data['datetime'].min()} to {btc_data['datetime'].max()}")
        print(f"Price range: ${btc_data['close'].min():.2f} - ${btc_data['close'].max():.2f}")
        
        return btc_data
        
    except Exception as e:
        print(f"Yahoo Finance download failed: {e}")
        return None

def download_cryptocompare_data():
    """Download data from CryptoCompare API"""
    
    print("\n=== DOWNLOADING BTC DATA FROM CRYPTOCOMPARE ===")
    
    url = "https://min-api.cryptocompare.com/data/v2/histoday"
    
    all_data = []
    to_timestamp = int(time.time())
    
    # Download in chunks (CryptoCompare has 2000 day limit per request)
    attempts = 0
    max_attempts = 5
    
    while to_timestamp > int(datetime(2015, 1, 1).timestamp()) and attempts < max_attempts:
        params = {
            'fsym': 'BTC',
            'tsym': 'USD',
            'limit': 2000,
            'toTs': to_timestamp
        }
        
        try:
            print(f"Downloading chunk {attempts + 1}...")
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data['Response'] == 'Success':
                chunk_data = data['Data']['Data']
                all_data.extend(chunk_data)
                
                # Update timestamp for next chunk
                if chunk_data:
                    to_timestamp = chunk_data[0]['time'] - 86400  # Go back one day
                    print(f"Downloaded {len(chunk_data)} candles, total: {len(all_data)}")
                else:
                    break
                    
                time.sleep(0.5)  # Rate limiting
                attempts += 1
            else:
                print(f"API Error: {data.get('Message', 'Unknown error')}")
                break
                
        except Exception as e:
            print(f"Error downloading chunk {attempts + 1}: {e}")
            attempts += 1
            time.sleep(1)
            
            if attempts >= max_attempts:
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
    
    print("No data retrieved from CryptoCompare")
    return None

def download_coingecko_data():
    """Download data from CoinGecko API"""
    
    print("\n=== DOWNLOADING BTC DATA FROM COINGECKO ===")
    
    url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
    
    # CoinGecko uses days parameter
    start_date = datetime(2015, 1, 1)
    days_since = (datetime.now() - start_date).days
    
    params = {
        'vs_currency': 'usd',
        'days': min(days_since, 365 * 10),  # Max 10 years for free API
        'interval': 'daily'
    }
    
    try:
        print(f"Requesting {params['days']} days of data...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if 'prices' in data:
            # Extract price data
            prices = data['prices']
            
            # Convert to DataFrame
            df = pd.DataFrame(prices, columns=['timestamp', 'close'])
            df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
            
            # CoinGecko doesn't provide OHLC for daily data in free tier
            # We'll use close price for all OHLC values as approximation
            df['open'] = df['close']
            df['high'] = df['close']
            df['low'] = df['close']
            df['volume'] = 0  # Volume not available in this endpoint
            
            # Keep only necessary columns
            df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
            
            # Filter date range
            df = df[(df['datetime'] >= '2015-01-01') & (df['datetime'] <= '2025-08-19')]
            
            print(f"Downloaded {len(df)} candles from CoinGecko")
            print(f"Date range: {df['datetime'].min()} to {df['datetime'].max()}")
            print(f"Price range: ${df['close'].min():.2f} - ${df['close'].max():.2f}")
            print("Note: CoinGecko free API only provides close prices, using as OHLC approximation")
            
            return df
        else:
            print("No price data in CoinGecko response")
            return None
            
    except Exception as e:
        print(f"Error downloading from CoinGecko: {e}")
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

def compare_all_sources(new_results):
    """Compare results across all data sources"""
    
    print(f"\n{'='*80}")
    print("COMPARISON ACROSS ALL DATA SOURCES")
    print(f"{'='*80}")
    
    all_results = new_results.copy()
    
    # Try to load existing results
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
        
        all_results.append({
            'source': 'Coinbase',
            'final_return': coinbase_return,
            'trade_count': coinbase_trade_count,
            'win_rate': coinbase_win_rate,
            'final_equity': coinbase_final_equity,
            'max_drawdown': 48.2  # From previous analysis
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
        
        all_results.append({
            'source': 'Binance',
            'final_return': binance_return,
            'trade_count': binance_trade_count,
            'win_rate': binance_win_rate,
            'final_equity': binance_final_equity,
            'max_drawdown': 49.7  # From previous analysis
        })
        
    except Exception as e:
        print(f"Could not load Binance results: {e}")
    
    if all_results:
        print(f"{'Source':<15} {'Return %':<12} {'Trades':<8} {'Win %':<8} {'Max DD %':<9} {'Final Equity':<15}")
        print("-" * 75)
        
        for result in all_results:
            max_dd = result.get('max_drawdown', 0)
            print(f"{result['source']:<15} {result['final_return']:<11,.0f} {result['trade_count']:<8} "
                  f"{result['win_rate']:<7.1f} {max_dd:<8.1f} ${result['final_equity']:<14,.0f}")
        
        # Find best and worst
        if len(all_results) > 1:
            best_return = max(all_results, key=lambda x: x['final_return'])
            worst_return = min(all_results, key=lambda x: x['final_return'])
            
            print(f"\nBest Performance: {best_return['source']} ({best_return['final_return']:,.0f}%)")
            print(f"Worst Performance: {worst_return['source']} ({worst_return['final_return']:,.0f}%)")
            
            return_spread = best_return['final_return'] - worst_return['final_return']
            print(f"Performance Spread: {return_spread:,.0f}%")
            
            print(f"\n📊 DATA SOURCE IMPACT:")
            print(f"The choice of data source creates a {return_spread:,.0f}% performance difference!")
            print(f"This demonstrates the importance of data quality and consistency.")

def main():
    """Main execution"""
    
    print("TESTING OPTIMIZED STRATEGY ON ALTERNATIVE DATA SOURCES")
    print("Parameters: (25, 0.4, 2.0)")
    
    new_results = []
    
    # Try Yahoo Finance
    print("\n" + "="*60)
    yahoo_data = download_yahoo_finance_data()
    if yahoo_data is not None:
        yahoo_file = save_alternative_data(yahoo_data, "YahooFinance")
        yahoo_result = test_strategy_on_alternative_data(yahoo_file, "YahooFinance")
        if yahoo_result:
            new_results.append(yahoo_result)
    
    # Try CryptoCompare
    print("\n" + "="*60)
    crypto_data = download_cryptocompare_data()
    if crypto_data is not None:
        crypto_file = save_alternative_data(crypto_data, "CryptoCompare")
        crypto_result = test_strategy_on_alternative_data(crypto_file, "CryptoCompare")
        if crypto_result:
            new_results.append(crypto_result)
    
    # Try CoinGecko
    print("\n" + "="*60)
    gecko_data = download_coingecko_data()
    if gecko_data is not None:
        gecko_file = save_alternative_data(gecko_data, "CoinGecko")
        gecko_result = test_strategy_on_alternative_data(gecko_file, "CoinGecko")
        if gecko_result:
            new_results.append(gecko_result)
    
    # Compare all sources
    compare_all_sources(new_results)
    
    if new_results:
        print(f"\n{'='*80}")
        print("ALTERNATIVE DATA SOURCE TESTING COMPLETE")
        print("The optimized strategy has been tested across multiple data providers")
        print("to validate its robustness and identify data source dependencies.")
        print(f"{'='*80}")

if __name__ == "__main__":
    main()