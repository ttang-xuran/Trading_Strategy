#!/usr/bin/env python3
"""
Download Latest Bitcoin Data Script
Updates data files with the most recent Bitcoin price data
"""

import yfinance as yf
import pandas as pd
import requests
import time
from datetime import datetime, timedelta
import os
import sys

def download_yahoo_finance_data():
    """Download data from Yahoo Finance"""
    print("📈 Downloading from Yahoo Finance...")
    
    try:
        # Download Bitcoin data
        btc = yf.Ticker("BTC-USD")
        data = btc.history(start="2015-01-01", end=datetime.now().strftime('%Y-%m-%d'))
        
        if data.empty:
            print("❌ No data from Yahoo Finance")
            return None
        
        # Format data
        df = data.reset_index()
        df.columns = [col.lower() for col in df.columns]
        df['datetime'] = df['date'].dt.strftime('%m/%d/%Y')
        df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        
        # Save to file
        output_path = "../BTC_Yahoo_Historical.csv"
        df.to_csv(output_path, index=False)
        
        print(f"✅ Yahoo Finance: {len(df)} candles saved to {output_path}")
        return df
        
    except Exception as e:
        print(f"❌ Yahoo Finance error: {e}")
        return None

def download_coinbase_data():
    """Download data from Coinbase Pro API"""
    print("🪙 Downloading from Coinbase...")
    
    try:
        url = "https://api.exchange.coinbase.com/products/BTC-USD/candles"
        
        # Get data for the last 300 days (max allowed)
        end_time = datetime.now()
        start_time = end_time - timedelta(days=300)
        
        params = {
            'start': start_time.isoformat(),
            'end': end_time.isoformat(),
            'granularity': 86400  # 1 day
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        if not data:
            print("❌ No data from Coinbase")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(data, columns=['timestamp', 'low', 'high', 'open', 'close', 'volume'])
        df['datetime'] = pd.to_datetime(df['timestamp'], unit='s').dt.strftime('%m/%d/%Y')
        df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        df = df.sort_values('datetime')
        
        # Append to existing file or create new
        output_path = "../BTC_Coinbase_Historical.csv"
        if os.path.exists(output_path):
            existing_df = pd.read_csv(output_path)
            # Remove duplicates and combine
            combined_df = pd.concat([existing_df, df]).drop_duplicates(subset=['datetime'])
            combined_df = combined_df.sort_values('datetime')
            combined_df.to_csv(output_path, index=False)
            print(f"✅ Coinbase: Updated with {len(df)} new candles")
        else:
            df.to_csv(output_path, index=False)
            print(f"✅ Coinbase: {len(df)} candles saved to {output_path}")
        
        return df
        
    except Exception as e:
        print(f"❌ Coinbase error: {e}")
        return None

def download_kraken_data():
    """Download data from Kraken API"""
    print("🐙 Downloading from Kraken...")
    
    try:
        url = "https://api.kraken.com/0/public/OHLC"
        params = {
            'pair': 'XXBTZUSD',
            'interval': 1440  # 1 day
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data['error']:
            print(f"❌ Kraken API Error: {data['error']}")
            return None
        
        # Extract OHLC data
        pair_data = data['result']['XXBTZUSD']
        
        # Convert to DataFrame
        df = pd.DataFrame(pair_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'vwap', 'volume', 'count'])
        df['datetime'] = pd.to_datetime(df['timestamp'], unit='s').dt.strftime('%m/%d/%Y')
        df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        
        # Append to existing file
        output_path = "../BTC_Kraken_Historical.csv"
        if os.path.exists(output_path):
            existing_df = pd.read_csv(output_path)
            # Remove duplicates and combine
            combined_df = pd.concat([existing_df, df]).drop_duplicates(subset=['datetime'])
            combined_df = combined_df.sort_values('datetime')
            combined_df.to_csv(output_path, index=False)
            print(f"✅ Kraken: Updated with {len(df)} candles")
        else:
            df.to_csv(output_path, index=False)
            print(f"✅ Kraken: {len(df)} candles saved to {output_path}")
        
        return df
        
    except Exception as e:
        print(f"❌ Kraken error: {e}")
        return None

def main():
    """Main function"""
    print("🚀 Starting daily Bitcoin data update...")
    print(f"📅 Current time: {datetime.now()}")
    
    # Change to the data directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(script_dir))
    os.chdir(data_dir)
    
    successful_downloads = 0
    
    # Download from different sources
    sources = [
        ("Yahoo Finance", download_yahoo_finance_data),
        ("Coinbase", download_coinbase_data),
        ("Kraken", download_kraken_data)
    ]
    
    for source_name, download_func in sources:
        try:
            result = download_func()
            if result is not None:
                successful_downloads += 1
                time.sleep(1)  # Rate limiting
            else:
                print(f"⚠️  {source_name}: No data retrieved")
        except Exception as e:
            print(f"❌ {source_name}: Unexpected error - {e}")
    
    print(f"\n📊 Update Summary:")
    print(f"  Successful: {successful_downloads}/{len(sources)} sources")
    
    if successful_downloads > 0:
        print("🎉 Data update completed successfully!")
        return 0
    else:
        print("💥 All data sources failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())