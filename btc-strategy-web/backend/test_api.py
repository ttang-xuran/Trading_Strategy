#!/usr/bin/env python3
"""
Test script for BTC Trading Strategy API
Verifies that all endpoints work correctly with existing data
"""

import asyncio
import sys
import os

# Add parent directory to path to import our strategy
sys.path.append('/home/ttang/Super BTC trading Strategy')
sys.path.append('/home/ttang/Super BTC trading Strategy/btc-strategy-web/backend')

from app.services.data_service import DataService
from app.services.backtest_service import BacktestService

async def test_data_service():
    """Test the data service functionality"""
    print("=== TESTING DATA SERVICE ===")
    
    data_service = DataService()
    
    # Test getting available sources
    print("\n1. Testing get_available_sources()...")
    try:
        sources = await data_service.get_available_sources()
        print(f"✓ Found {len(sources)} data sources:")
        for source in sources:
            print(f"  - {source.display_name} ({source.name}): {source.status}")
            if source.total_candles:
                print(f"    Candles: {source.total_candles:,}")
            if source.date_range:
                print(f"    Range: {source.date_range['start']} to {source.date_range['end']}")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test loading chart data for coinbase
    print("\n2. Testing get_chart_data('coinbase')...")
    try:
        chart_data = await data_service.get_chart_data('coinbase', days=30)
        print(f"✓ Loaded {len(chart_data.candles)} candles for coinbase")
        print(f"  Source: {chart_data.source}")
        print(f"  Timeframe: {chart_data.timeframe}")
        print(f"  Total candles: {chart_data.total_candles}")
        if chart_data.candles:
            latest = chart_data.candles[-1]
            print(f"  Latest price: ${latest.close:,.2f}")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    print("✓ Data service tests passed!")
    return True

async def test_backtest_service():
    """Test the backtest service functionality"""
    print("\n=== TESTING BACKTEST SERVICE ===")
    
    backtest_service = BacktestService()
    
    # Test running backtest on coinbase data
    print("\n1. Testing run_backtest('coinbase')...")
    try:
        parameters = {
            "lookback_period": 25,
            "range_mult": 0.4,
            "stop_loss_mult": 2.0,
            "atr_period": 14
        }
        
        result = await backtest_service.run_backtest('coinbase', parameters)
        
        print(f"✓ Backtest completed for {result.source}")
        print(f"  Parameters: {result.parameters.lookback_period}, {result.parameters.range_mult}, {result.parameters.stop_loss_mult}")
        print(f"  Total return: {result.performance_metrics.total_return_percent:.1f}%")
        print(f"  Total trades: {result.performance_metrics.total_trades}")
        print(f"  Win rate: {result.performance_metrics.win_rate_percent:.1f}%")
        print(f"  Max drawdown: {result.performance_metrics.max_drawdown_percent:.1f}%")
        print(f"  Trade signals: {len(result.trade_signals)}")
        print(f"  Equity points: {len(result.equity_curve.equity_points)}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test getting individual components
    print("\n2. Testing individual component methods...")
    try:
        # Test trade signals
        signals = await backtest_service.get_trade_signals('coinbase')
        print(f"✓ Got {len(signals)} trade signals")
        
        # Test performance metrics
        metrics = await backtest_service.get_performance_metrics('coinbase')
        print(f"✓ Got performance metrics: {metrics.total_return_percent:.1f}% return")
        
        # Test equity curve
        equity_curve = await backtest_service.get_equity_curve('coinbase')
        print(f"✓ Got equity curve with {len(equity_curve.equity_points)} points")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    print("✓ Backtest service tests passed!")
    return True

async def test_multiple_sources():
    """Test multiple data sources"""
    print("\n=== TESTING MULTIPLE SOURCES ===")
    
    data_service = DataService()
    backtest_service = BacktestService()
    
    # Get available sources
    sources = await data_service.get_available_sources()
    active_sources = [s.name for s in sources if s.status == 'active']
    
    print(f"Testing {len(active_sources)} active sources: {', '.join(active_sources)}")
    
    results = {}
    for source in active_sources[:3]:  # Test first 3 sources
        try:
            print(f"\nTesting {source}...")
            metrics = await backtest_service.get_performance_metrics(source)
            results[source] = metrics.total_return_percent
            print(f"  ✓ {source}: {metrics.total_return_percent:.1f}% return")
        except Exception as e:
            print(f"  ✗ {source}: Error - {e}")
            continue
    
    if results:
        best_source = max(results.items(), key=lambda x: x[1])
        worst_source = min(results.items(), key=lambda x: x[1])
        print(f"\n📊 RESULTS SUMMARY:")
        print(f"  Best: {best_source[0]} ({best_source[1]:.1f}%)")
        print(f"  Worst: {worst_source[0]} ({worst_source[1]:.1f}%)")
        
    return True

async def main():
    """Main test function"""
    print("🚀 STARTING BTC TRADING STRATEGY API TESTS")
    print("=" * 50)
    
    # Test data service
    if not await test_data_service():
        print("❌ Data service tests failed!")
        return False
    
    # Test backtest service
    if not await test_backtest_service():
        print("❌ Backtest service tests failed!")
        return False
    
    # Test multiple sources
    if not await test_multiple_sources():
        print("❌ Multiple sources test failed!")
        return False
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS PASSED! API is ready to use.")
    print("\nTo start the API server:")
    print("cd /home/ttang/Super BTC trading Strategy/btc-strategy-web/backend")
    print("pip install -r requirements.txt")
    print("uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    
    return True

if __name__ == "__main__":
    asyncio.run(main())