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
   * Get live Bitcoin price from specific source
   */
  async getLiveBitcoinPrice(source: string = 'coinbase'): Promise<LivePriceData> {
    const now = Date.now()
    
    // Return cached data if still valid (but check if source matches)
    if (this.cache && now < this.cacheExpiry && this.cache.source.toLowerCase().includes(source.toLowerCase())) {
      return this.cache
    }

    try {
      let priceData: LivePriceData

      switch (source.toLowerCase()) {
        case 'coinbase':
          priceData = await this.fetchFromCoinbase()
          break
        case 'bitstamp':
          priceData = await this.fetchFromBitstamp()
          break
        case 'binance':
          priceData = await this.fetchFromBinance()
          break
        case 'coingecko':
          priceData = await this.fetchFromCoinGecko()
          break
        default:
          console.log(`Unknown source: ${source}, falling back to CoinGecko`)
          priceData = await this.fetchFromCoinGecko()
      }

      // Cache the result
      this.cache = priceData
      this.cacheExpiry = now + this.CACHE_DURATION

      return priceData

    } catch (error) {
      console.error(`Failed to fetch live Bitcoin price from ${source}:`, error)
      
      // Fallback to mock data if all APIs fail
      return {
        price: 112831.18, 
        change24h: -3421.13,
        changePercent24h: -2.94,
        timestamp: new Date().toISOString(),
        source: `${source} (Fallback)`
      }
    }
  }

  private async fetchFromCoinbase(): Promise<LivePriceData> {
    const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=BTC')
    if (!response.ok) throw new Error('Coinbase API failed')
    
    const data = await response.json()
    const price = parseFloat(data.data.rates.USD)
    
    return {
      price,
      change24h: 0, // Coinbase doesn't provide 24h change in this endpoint
      changePercent24h: 0,
      timestamp: new Date().toISOString(),
      source: 'Coinbase'
    }
  }

  private async fetchFromBitstamp(): Promise<LivePriceData> {
    const response = await fetch('https://www.bitstamp.net/api/v2/ticker/btcusd/')
    if (!response.ok) throw new Error('Bitstamp API failed')
    
    const data = await response.json()
    
    return {
      price: parseFloat(data.last),
      change24h: parseFloat(data.last) - parseFloat(data.open),
      changePercent24h: ((parseFloat(data.last) - parseFloat(data.open)) / parseFloat(data.open)) * 100,
      timestamp: new Date().toISOString(),
      source: 'Bitstamp'
    }
  }

  private async fetchFromBinance(): Promise<LivePriceData> {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
    if (!response.ok) throw new Error('Binance API failed')
    
    const data = await response.json()
    
    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      timestamp: new Date().toISOString(),
      source: 'Binance'
    }
  }

  private async fetchFromCoinGecko(): Promise<LivePriceData> {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { 'Accept': 'application/json' } }
    )
    if (!response.ok) throw new Error('CoinGecko API failed')
    
    const data = await response.json()
    const bitcoinData = data.bitcoin
    
    return {
      price: bitcoinData.usd,
      change24h: bitcoinData.usd_24h_change || 0,
      changePercent24h: bitcoinData.usd_24h_change || 0,
      timestamp: new Date().toISOString(),
      source: 'CoinGecko'
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