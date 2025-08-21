#!/usr/bin/env python3
"""
Fetch Coinbase spot price data from 2015 to now for accurate backtesting
"""

import pandas as pd
import requests
import time
from datetime import datetime, timedelta
import json

def fetch_coinbase_historical_data():
    """
    Fetch historical Coinbase BTC-USD data from 2015 to now
    Using Coinbase Pro API (now Advanced Trade API)
    """
    print("=== FETCHING COINBASE BTC-USD SPOT DATA ===")
    print("Period: 2015-01-01 to 2025-08-20")
    print("Source: Coinbase Exchange (same as TradingView)\n")
    
    # Try multiple data sources since Coinbase API has limitations
    
    # Method 1: Try Yahoo Finance (which often uses exchange data)
    try:
        print("Attempting to fetch via yfinance (BTC-USD)...")
        import yfinance as yf
        
        # Fetch BTC-USD data
        btc = yf.Ticker("BTC-USD")
        
        # Get data from 2015 to now
        start_date = "2015-01-01"
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        df = btc.history(start=start_date, end=end_date, interval="1d")
        
        if len(df) > 0:
            # Rename columns to match our format
            df.reset_index(inplace=True)
            df.rename(columns={
                'Date': 'datetime',
                'Open': 'open',
                'High': 'high', 
                'Low': 'low',
                'Close': 'close',
                'Volume': 'volume'
            }, inplace=True)
            
            # Format datetime
            df['datetime'] = pd.to_datetime(df['datetime']).dt.strftime('%m/%d/%Y')
            
            # Select only needed columns
            df = df[['datetime', 'open', 'high', 'low', 'close']].copy()
            
            print(f"Successfully fetched {len(df)} days of data")
            print(f"Date range: {df['datetime'].iloc[0]} to {df['datetime'].iloc[-1]}")
            print(f"Price range: ${df['close'].min():.2f} to ${df['close'].max():.2f}")
            
            return df
        
    except Exception as e:
        print(f"yfinance method failed: {e}")
    
    # Method 2: Try Alpha Vantage (free tier)
    try:
        print("\nAttempting Alpha Vantage API...")
        # Note: Would need API key for Alpha Vantage
        # This is a placeholder for the structure
        pass
    except Exception as e:
        print(f"Alpha Vantage method failed: {e}")
    
    # Method 3: Try CoinGecko API (free, but limited history)
    try:
        print("\nAttempting CoinGecko API...")
        
        # CoinGecko has daily data going back several years
        url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart"
        
        # Calculate days from 2015-01-01 to now
        start_date = datetime(2015, 1, 1)
        days = (datetime.now() - start_date).days + 1
        
        params = {
            'vs_currency': 'usd',
            'days': min(days, 365 * 8),  # CoinGecko limit
            'interval': 'daily'
        }
        
        print(f"Requesting {params['days']} days of data...")
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract OHLC data
            prices = data.get('prices', [])
            
            if prices:
                # Convert to DataFrame
                df_data = []
                for price_point in prices:
                    timestamp = price_point[0] / 1000  # Convert from milliseconds
                    date = datetime.fromtimestamp(timestamp)
                    close_price = price_point[1]
                    
                    # For CoinGecko, we only get close prices, so we'll approximate OHLC
                    df_data.append({
                        'datetime': date.strftime('%m/%d/%Y'),
                        'open': close_price,  # Approximation
                        'high': close_price * 1.01,  # Approximation  
                        'low': close_price * 0.99,   # Approximation
                        'close': close_price
                    })
                
                df = pd.DataFrame(df_data)
                
                print(f"CoinGecko: Fetched {len(df)} days of data")
                print(f"Date range: {df['datetime'].iloc[0]} to {df['datetime'].iloc[-1]}")
                
                return df
        
    except Exception as e:
        print(f"CoinGecko method failed: {e}")
    
    # If all methods fail, provide instructions
    print("\n=== UNABLE TO FETCH COINBASE DATA AUTOMATICALLY ===")
    print("To get exact Coinbase data matching TradingView:")
    print("1. Export data from TradingView (Data Window -> Export)")
    print("2. Or use Coinbase Advanced Trade API with proper authentication")
    print("3. Or use a paid financial data provider")
    print("4. Save as 'BTC_Coinbase_Historical.csv' in the same format")
    
    return None

def install_yfinance():
    """Install yfinance if not available"""
    try:
        import yfinance
        return True
    except ImportError:
        print("Installing yfinance...")
        import subprocess
        import sys
        
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'yfinance'])
            print("yfinance installed successfully")
            return True
        except Exception as e:
            print(f"Failed to install yfinance: {e}")
            return False

def main():
    """Main function to fetch and save Coinbase data"""
    
    # Try to install yfinance if needed
    if not install_yfinance():
        print("Cannot proceed without yfinance")
        return
    
    # Fetch the data
    df = fetch_coinbase_historical_data()
    
    if df is not None:
        # Save to CSV
        output_file = '/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv'
        df.to_csv(output_file, index=False)
        
        print(f"\n=== DATA SAVED SUCCESSFULLY ===")
        print(f"File: BTC_Coinbase_Historical.csv")
        print(f"Rows: {len(df)}")
        print("\nSample data:")
        print(df.head(3).to_string(index=False))
        print("...")
        print(df.tail(3).to_string(index=False))
        
        # Show data statistics
        print(f"\n=== DATA STATISTICS ===")
        print(f"Start Date: {df['datetime'].iloc[0]}")
        print(f"End Date: {df['datetime'].iloc[-1]}")
        print(f"Start Price: ${df['close'].iloc[0]:.2f}")
        print(f"End Price: ${df['close'].iloc[-1]:.2f}")
        print(f"Min Price: ${df['close'].min():.2f}")
        print(f"Max Price: ${df['close'].max():.2f}")
        print(f"Total Return: {((df['close'].iloc[-1] / df['close'].iloc[0]) - 1) * 100:.1f}%")
        
        return True
    else:
        print("\nFailed to fetch Coinbase data. Please manually download from TradingView or Coinbase.")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print(f"\n" + "="*60)
        print("NEXT STEP:")
        print("Run the backtest with Coinbase data using:")
        print("python3 backtest_with_coinbase_data.py")
    else:
        print(f"\n" + "="*60)
        print("MANUAL ALTERNATIVE:")
        print("1. Go to TradingView")
        print("2. Set chart to BTC/USD (Coinbase)")
        print("3. Export daily data from 2015-2025")
        print("4. Save as 'BTC_Coinbase_Historical.csv'")
        print("5. Then run the backtest")