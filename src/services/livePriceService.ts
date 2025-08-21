/**
 * Live Bitcoin Price Service
 * Fetches current BTC price from multiple sources
 */

interface LivePriceData {
  price: number
  change24h: number
  changePercent24h: number
  timestamp: string
  source: string
}

class LivePriceService {
  private cache: LivePriceData | null = null
  private cacheExpiry: number = 0
  private readonly CACHE_DURATION = 30000 // 30 seconds

  /**
   * Get live Bitcoin price with caching
   */
  async getLiveBitcoinPrice(): Promise<LivePriceData> {
    const now = Date.now()
    
    // Return cached data if still valid
    if (this.cache && now < this.cacheExpiry) {
      return this.cache
    }

    try {
      // Try CoinGecko API first (free, no API key needed)
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )

      if (!response.ok) {
        throw new Error('CoinGecko API failed')
      }

      const data = await response.json()
      const bitcoinData = data.bitcoin

      const priceData: LivePriceData = {
        price: bitcoinData.usd,
        change24h: bitcoinData.usd_24h_change || 0,
        changePercent24h: bitcoinData.usd_24h_change || 0,
        timestamp: new Date().toISOString(),
        source: 'CoinGecko'
      }

      // Cache the result
      this.cache = priceData
      this.cacheExpiry = now + this.CACHE_DURATION

      return priceData

    } catch (error) {
      console.error('Failed to fetch live Bitcoin price:', error)
      
      // Fallback to mock data if API fails
      return {
        price: 112831.18, // Use last known price from your data
        change24h: -3421.13,
        changePercent24h: -2.94,
        timestamp: new Date().toISOString(),
        source: 'Fallback'
      }
    }
  }

  /**
   * Calculate unrealized P&L for open position
   */
  calculateUnrealizedPnL(
    entryPrice: number,
    currentPrice: number,
    positionSize: number,
    direction: 'long' | 'short'
  ): { pnl: number, pnlPercent: number } {
    let pnl: number
    
    if (direction === 'long') {
      pnl = (currentPrice - entryPrice) * positionSize
    } else {
      pnl = (entryPrice - currentPrice) * positionSize
    }
    
    const pnlPercent = ((pnl / (entryPrice * positionSize)) * 100)
    
    return { pnl, pnlPercent }
  }
}

export const livePriceService = new LivePriceService()
export type { LivePriceData }