#!/usr/bin/env python3
"""
Daily Data Update Script for BTC Trading Strategy
This script can be run via cron job or GitHub Actions to update data daily
"""

import sys
import os
import asyncio
import logging
from datetime import datetime

# Add parent directory to path
sys.path.append('/home/ttang/Super BTC trading Strategy')
sys.path.append('/home/ttang/Super BTC trading Strategy/btc-strategy-web/backend')

from app.services.data_service import DataService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def update_all_data_sources():
    """Update all data sources"""
    logger.info("🚀 Starting daily data update...")
    
    data_service = DataService()
    
    try:
        # Get all available sources
        sources = await data_service.get_available_sources()
        active_sources = [s.name for s in sources if s.status == 'active']
        
        logger.info(f"Found {len(active_sources)} active sources: {', '.join(active_sources)}")
        
        # Update each source
        update_results = []
        for source in active_sources:
            logger.info(f"Updating {source}...")
            result = await data_service.update_source_data(source)
            update_results.append(result)
            
            if result.status == 'success':
                logger.info(f"✅ {source}: Updated successfully")
            else:
                logger.error(f"❌ {source}: Update failed - {result.error_message}")
        
        # Summary
        successful = [r for r in update_results if r.status == 'success']
        failed = [r for r in update_results if r.status == 'failed']
        
        logger.info(f"\n📊 UPDATE SUMMARY:")
        logger.info(f"  Successful: {len(successful)}")
        logger.info(f"  Failed: {len(failed)}")
        
        if failed:
            logger.warning(f"  Failed sources: {', '.join([r.source for r in failed])}")
        
        return len(failed) == 0
        
    except Exception as e:
        logger.error(f"❌ Data update failed: {e}")
        return False

def main():
    """Main function"""
    start_time = datetime.now()
    logger.info(f"Daily data update started at {start_time}")
    
    # Run the async update
    success = asyncio.run(update_all_data_sources())
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info(f"Daily data update completed in {duration:.1f} seconds")
    
    if success:
        logger.info("🎉 All data sources updated successfully!")
        sys.exit(0)
    else:
        logger.error("💥 Some data sources failed to update")
        sys.exit(1)

if __name__ == "__main__":
    main()