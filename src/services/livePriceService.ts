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
   * Get real historical OHLC data from specific source
   */
  async getHistoricalData(source: string, days: number = 90): Promise<any[]> {
    console.log(`getHistoricalData called: source=${source}, days=${days}`)
    try {
      let result: any[]
      switch (source.toLowerCase()) {
        case 'coinbase':
          console.log('Fetching from Coinbase...')
          result = await this.fetchCoinbaseHistorical(days)
          break
        case 'bitstamp':
          console.log('Fetching from Bitstamp...')
          result = await this.fetchBitstampHistorical(days)
          break
        case 'binance':
          console.log('Fetching from Binance...')
          result = await this.fetchBinanceHistorical(days)
          break
        case 'coingecko':
          console.log('Fetching from CoinGecko...')
          result = await this.fetchCoinGeckoHistorical(days)
          break
        default:
          console.log(`Unknown source: ${source}, falling back to CoinGecko`)
          result = await this.fetchCoinGeckoHistorical(days)
      }
      console.log(`Historical data fetch result: ${result.length} candles`)
      if (result.length === 0) {
        throw new Error(`No data returned from ${source} API`)
      }
      return result
    } catch (error) {
      console.error(`Failed to fetch historical data from ${source} for ${days} days:`, error)
      
      // Try fallback to a different API if the first one fails
      console.log('Attempting fallback to Binance API...')
      try {
        const fallbackResult = await this.fetchBinanceHistorical(Math.min(days, 1000))
        console.log(`Fallback successful: ${fallbackResult.length} candles from Binance`)
        return fallbackResult
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        throw new Error(`Both primary (${source}) and fallback (Binance) APIs failed`)
      }
    }
  }

  private async fetchCoinbaseHistorical(days: number): Promise<any[]> {
    // Coinbase Pro API for historical candles
    let startTime: Date, endTime: Date
    
    if (days >= 9999) {
      // For "All" request, get maximum available data (Coinbase started trading BTC in 2015)
      startTime = new Date('2015-01-01') // Coinbase Pro launch
      endTime = new Date()
      console.log('Fetching ALL Coinbase data from 2015 to now')
    } else {
      // Regular date range request
      endTime = new Date()
      startTime = new Date()
      startTime.setDate(startTime.getDate() - days)
      console.log(`Fetching ${days} days of Coinbase data`)
    }
    
    const response = await fetch(
      `https://api.exchange.coinbase.com/products/BTC-USD/candles?start=${startTime.toISOString()}&end=${endTime.toISOString()}&granularity=86400`
    )
    
    if (!response.ok) throw new Error('Coinbase historical API failed')
    const data = await response.json()
    
    // Convert Coinbase format [timestamp, low, high, open, close, volume] to our format
    return data.map((candle: number[]) => ({
      date: new Date(candle[0] * 1000),
      open: candle[3],
      high: candle[2], 
      low: candle[1],
      close: candle[4],
      timestamp: candle[0] * 1000
    })).sort((a: any, b: any) => a.timestamp - b.timestamp)
  }

  private async fetchBitstampHistorical(days: number): Promise<any[]> {
    // Bitstamp OHLC API
    const step = 86400 // Daily candles
    let limit: number
    
    if (days >= 9999) {
      // For "All" request, get maximum available data (Bitstamp limit is ~1000)
      limit = 1000 // Bitstamp API maximum
      console.log('Fetching ALL Bitstamp data (1000 days max)')
    } else {
      limit = Math.min(days, 1000) // API limit
      console.log(`Fetching ${limit} days of Bitstamp data`)
    }
    
    const response = await fetch(
      `https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=${step}&limit=${limit}`
    )
    
    if (!response.ok) throw new Error('Bitstamp historical API failed')
    
    const data = await response.json()
    
    return data.data.ohlc.map((candle: any) => ({
      date: new Date(parseInt(candle.timestamp) * 1000),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low), 
      close: parseFloat(candle.close),
      timestamp: parseInt(candle.timestamp) * 1000
    })).sort((a: any, b: any) => a.timestamp - b.timestamp)
  }

  private async fetchBinanceHistorical(days: number): Promise<any[]> {
    // Binance klines API - use limit only for better compatibility
    let limit: number
    
    if (days >= 9999) {
      // For "All" request, get maximum available data (Binance limit is 1000)
      limit = 1000 // Binance API maximum
      console.log('Fetching ALL Binance data (1000 days max)')
    } else {
      limit = Math.min(days, 1000) // API limit is 1000
      console.log(`Binance API call: limit=${limit}`)
    }
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`
    )
    
    if (!response.ok) throw new Error('Binance historical API failed')
    
    const data = await response.json()
    
    // Convert Binance format to our format
    return data.map((candle: any[]) => ({
      date: new Date(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      timestamp: candle[0]
    })).sort((a: any, b: any) => a.timestamp - b.timestamp)
  }

  private async fetchCoinGeckoHistorical(days: number): Promise<any[]> {
    // CoinGecko historical prices (limited to avoid rate limits)
    let limitedDays: number
    
    if (days >= 9999) {
      // For "All" request, try to get more data (CoinGecko free limit is ~365 days)
      limitedDays = 365 // Maximum for free API
      console.log('Fetching ALL CoinGecko data (365 days max for free API)')
    } else {
      limitedDays = Math.min(days, 365) // Use up to 365 days
      console.log(`Fetching ${limitedDays} days of CoinGecko data`)
    }
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${limitedDays}&interval=daily`
    )
    
    if (!response.ok) throw new Error('CoinGecko historical API failed')
    
    const data = await response.json()
    const prices = data.prices || []
    
    // Convert to daily OHLC (CoinGecko only gives price points, so we approximate)
    const dailyData: { [key: string]: { prices: number[], timestamps: number[] } } = {}
    
    prices.forEach(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp).toISOString().split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = { prices: [], timestamps: [] }
      }
      dailyData[date].prices.push(price)
      dailyData[date].timestamps.push(timestamp)
    })
    
    return Object.entries(dailyData)
      .map(([date, dayData]) => {
        const prices = dayData.prices
        const open = prices[0]
        const close = prices[prices.length - 1]
        const high = Math.max(...prices)
        const low = Math.min(...prices)
        
        return {
          date: new Date(date),
          open,
          high,
          low,
          close,
          timestamp: dayData.timestamps[0]
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp)
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