"""
Data Service for BTC Trading Strategy API
Handles data fetching, caching, and management from multiple sources
"""

import pandas as pd
import numpy as np
import requests
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import asyncio
import aiofiles
import json

# Add parent directory to access our existing data fetching code
sys.path.append('/home/ttang/Super BTC trading Strategy')

from app.models.strategy_models import DataSource, ChartData, OHLCV, UpdateStatus

class DataService:
    """Service for managing cryptocurrency data from multiple sources"""
    
    def __init__(self):
        self.db_path = "/home/ttang/Super BTC trading Strategy/btc-strategy-web/data/strategy_data.db"
        self.raw_data_path = "/home/ttang/Super BTC trading Strategy/btc-strategy-web/data/raw"
        self.processed_data_path = "/home/ttang/Super BTC trading Strategy/btc-strategy-web/data/processed"
        
        # Ensure directories exist
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        os.makedirs(self.raw_data_path, exist_ok=True)
        os.makedirs(self.processed_data_path, exist_ok=True)
        
        # Initialize database
        self.init_database()
        
        # Data source configurations
        self.sources = {
            "coinbase": {
                "display_name": "Coinbase Pro",
                "file_path": "/home/ttang/Super BTC trading Strategy/BTC_Coinbase_Historical.csv",
                "api_url": None,  # Using existing file
                "status": "active"
            },
            "binance": {
                "display_name": "Binance",
                "file_path": "/home/ttang/Super BTC trading Strategy/BTC_Binance_Historical.csv",
                "api_url": "https://api.binance.com/api/v3/klines",
                "status": "active"
            },
            "kraken": {
                "display_name": "Kraken",
                "file_path": "/home/ttang/Super BTC trading Strategy/BTC_Kraken_Historical.csv",
                "api_url": "https://api.kraken.com/0/public/OHLC",
                "status": "active"
            },
            "bitstamp": {
                "display_name": "Bitstamp",
                "file_path": "/home/ttang/Super BTC trading Strategy/BTC_Bitstamp_Historical.csv",
                "api_url": "https://www.bitstamp.net/api/v2/ohlc/btcusd/",
                "status": "active"
            },
            "cryptocompare": {
                "display_name": "CryptoCompare",
                "file_path": "/home/ttang/Super BTC trading Strategy/BTC_CryptoCompare_Historical.csv",
                "api_url": "https://min-api.cryptocompare.com/data/v2/histoday",
                "status": "active"
            },
            "coinmetrics": {
                "display_name": "Coin Metrics",
                "file_path": "/home/ttang/Super BTC trading Strategy/BTC_CoinMetrics_Historical.csv",
                "api_url": "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics",
                "status": "limited"  # Limited data
            }
        }
    
    def init_database(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS price_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                volume REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(source, timestamp)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS data_sources (
                source TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                status TEXT NOT NULL,
                last_updated DATETIME,
                total_candles INTEGER DEFAULT 0,
                date_range_start DATETIME,
                date_range_end DATETIME,
                error_message TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS backtest_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                parameters TEXT NOT NULL,  -- JSON string
                result_data TEXT NOT NULL, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()
    
    async def get_available_sources(self) -> List[DataSource]:
        """Get list of available data sources with their status"""
        sources = []
        
        for source_key, config in self.sources.items():
            # Check if data file exists and get basic info
            file_path = config["file_path"]
            status = "inactive"
            last_updated = None
            total_candles = 0
            date_range = None
            
            if os.path.exists(file_path):
                try:
                    df = pd.read_csv(file_path)
                    if len(df) > 0:
                        status = "active"
                        total_candles = len(df)
                        
                        # Parse dates
                        df['datetime'] = pd.to_datetime(df['datetime'])
                        date_range = {
                            "start": df['datetime'].min().isoformat(),
                            "end": df['datetime'].max().isoformat()
                        }
                        last_updated = datetime.fromtimestamp(os.path.getmtime(file_path))
                        
                except Exception as e:
                    status = "error"
                    print(f"Error reading {source_key} data: {e}")
            
            sources.append(DataSource(
                name=source_key,
                display_name=config["display_name"],
                status=status,
                last_updated=last_updated,
                total_candles=total_candles,
                date_range=date_range
            ))
        
        return sources
    
    async def get_chart_data(self, source: str, days: int = 365) -> ChartData:
        """Get candlestick chart data for specified source"""
        if source not in self.sources:
            raise ValueError(f"Unknown data source: {source}")
        
        file_path = self.sources[source]["file_path"]
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Data file not found for source: {source}")
        
        # Load data
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime')
        
        # Filter by days if specified
        if days > 0:
            cutoff_date = df['datetime'].max() - timedelta(days=days)
            df = df[df['datetime'] >= cutoff_date]
        
        # Convert to OHLCV objects
        candles = []
        for _, row in df.iterrows():
            candles.append(OHLCV(
                timestamp=row['datetime'],
                open=float(row['open']),
                high=float(row['high']),
                low=float(row['low']),
                close=float(row['close']),
                volume=float(row.get('volume', 0))
            ))
        
        # Calculate strategy boundaries (simplified for now)
        # This would normally come from the backtest service
        upper_boundary = []
        lower_boundary = []
        
        return ChartData(
            candles=candles,
            upper_boundary=upper_boundary,
            lower_boundary=lower_boundary,
            source=source,
            timeframe="1D",
            total_candles=len(candles)
        )
    
    async def update_source_data(self, source: str) -> UpdateStatus:
        """Update data for a specific source"""
        if source not in self.sources:
            return UpdateStatus(
                source=source,
                status="failed",
                last_attempt=datetime.now(),
                error_message="Unknown source"
            )
        
        try:
            # For now, we'll just check if the file exists and is recent
            file_path = self.sources[source]["file_path"]
            
            if os.path.exists(file_path):
                last_modified = datetime.fromtimestamp(os.path.getmtime(file_path))
                
                # If file is less than 1 day old, consider it updated
                if datetime.now() - last_modified < timedelta(hours=24):
                    return UpdateStatus(
                        source=source,
                        status="success",
                        last_attempt=datetime.now(),
                        last_success=last_modified
                    )
            
            # Here you would implement actual data fetching logic
            # For now, return success if file exists
            return UpdateStatus(
                source=source,
                status="success" if os.path.exists(file_path) else "failed",
                last_attempt=datetime.now(),
                last_success=datetime.now() if os.path.exists(file_path) else None
            )
            
        except Exception as e:
            return UpdateStatus(
                source=source,
                status="failed",
                last_attempt=datetime.now(),
                error_message=str(e)
            )
    
    async def update_all_sources(self):
        """Update data for all sources"""
        tasks = []
        for source in self.sources.keys():
            tasks.append(self.update_source_data(source))
        
        results = await asyncio.gather(*tasks)
        return results
    
    def get_latest_price(self, source: str) -> Optional[float]:
        """Get latest price for a source"""
        try:
            file_path = self.sources[source]["file_path"]
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                return float(df['close'].iloc[-1])
            return None
        except Exception:
            return None
    
    def load_historical_data(self, source: str) -> pd.DataFrame:
        """Load historical data as pandas DataFrame"""
        file_path = self.sources[source]["file_path"]
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Data file not found for source: {source}")
        
        df = pd.read_csv(file_path)
        df['datetime'] = pd.to_datetime(df['datetime'])
        return df.set_index('datetime').sort_index()