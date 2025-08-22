import { useState, useEffect, useMemo } from 'react'
import LiveHistoricalChart from './components/LiveHistoricalChart'
import { livePriceService } from './services/livePriceService'
import './index.css'

// Mock data for now to get the basic layout working
const mockPerformanceData = {
  total_return_percent: 75862.74,
  total_trades: 154,
  win_rate_percent: 24.68,
  max_drawdown_percent: -48.24,
  profit_factor: 2.11,
  average_trade: 1000000,
  net_profit: 75862740,
  gross_profit: 150400000,
  gross_loss: 74537260,
  winning_trades: 38,
  losing_trades: 116,
  peak_equity: 175962736,
  final_equity: 175962736,
  long_trades: 77,
  short_trades: 77
}

const initialPrice = {
  price: 0,
  change24h: 0,
  timestamp: new Date().toISOString()
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedSource, setSelectedSource] = useState('bitstamp')
  const [livePrice, setLivePrice] = useState(initialPrice)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trades'>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const tradesPerPage = 10

  const handleRefreshData = () => {
    setCurrentTime(new Date())
    setRefreshKey(prev => prev + 1) // Force chart to reload data
  }

  // Apply real Adaptive Volatility Breakout strategy to historical Bitcoin data
  const generateAllTrades = async () => {
    const trades = []
    
    try {
      // Get real historical Bitcoin data (4 years from 2020-2024)
      const endTime = Math.floor(new Date('2024-08-19').getTime() / 1000)
      const startTime = Math.floor(new Date('2020-01-01').getTime() / 1000)
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${startTime}&to=${endTime}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data')
      }
      
      const data = await response.json()
      const prices = data.prices || []
      
      // Convert to daily OHLC data
      const dailyData: { [key: string]: { prices: number[], timestamps: number[] } } = {}
      
      prices.forEach(([timestamp, price]: [number, number]) => {
        const date = new Date(timestamp).toISOString().split('T')[0]
        if (!dailyData[date]) {
          dailyData[date] = { prices: [], timestamps: [] }
        }
        dailyData[date].prices.push(price)
        dailyData[date].timestamps.push(timestamp)
      })
      
      // Create OHLC candles for strategy calculation
      const ohlcData = Object.entries(dailyData)
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
      
      // Apply Adaptive Volatility Breakout Strategy
      // Strategy parameters (same as Pine Script)
      const lookbackPeriod = 20
      const rangeMultiplier = 0.5
      const stopLossMultiplier = 2.5
      const atrPeriod = 14
      const initialCapital = 100000
      
      let equity = initialCapital
      let position = null // null, 'LONG', or 'SHORT'
      let entryPrice = 0
      let entryDate = null
      let positionSize = 0
      
      // Calculate ATR for stop losses
      const calculateATR = (data: any[], period: number, index: number) => {
        if (index < period) return null
        
        let sum = 0
        for (let i = Math.max(0, index - period + 1); i <= index; i++) {
          const current = data[i]
          const previous = i > 0 ? data[i - 1] : current
          
          const tr = Math.max(
            current.high - current.low,
            Math.abs(current.high - previous.close),
            Math.abs(current.low - previous.close)
          )
          sum += tr
        }
        return sum / period
      }
      
      // Process each day for strategy signals
      for (let i = lookbackPeriod; i < ohlcData.length; i++) {
        const currentBar = ohlcData[i]
        const atr = calculateATR(ohlcData, atrPeriod, i)
        
        // Calculate breakout levels (lookback period)
        const lookbackBars = ohlcData.slice(Math.max(0, i - lookbackPeriod), i)
        const highestHigh = Math.max(...lookbackBars.map(bar => bar.high))
        const lowestLow = Math.min(...lookbackBars.map(bar => bar.low))
        const breakoutRange = highestHigh - lowestLow
        
        const upperBoundary = currentBar.open + breakoutRange * rangeMultiplier
        const lowerBoundary = currentBar.open - breakoutRange * rangeMultiplier
        
        // Check for entry signals (no current position)
        if (!position) {
          // Long entry: price breaks above upper boundary
          if (currentBar.high > upperBoundary) {
            position = 'LONG'
            entryPrice = upperBoundary
            entryDate = currentBar.date
            positionSize = (equity * 0.95) / entryPrice // Use 95% of equity
            
            trades.push({
              date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              action: 'ENTRY LONG',
              price: entryPrice,
              size: positionSize,
              pnl: null,
              equity: equity,
              comment: 'Breakout Long Entry Signal'
            })
          }
          // Short entry: price breaks below lower boundary  
          else if (currentBar.low < lowerBoundary) {
            position = 'SHORT'
            entryPrice = lowerBoundary
            entryDate = currentBar.date
            positionSize = (equity * 0.95) / entryPrice // Use 95% of equity
            
            trades.push({
              date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              action: 'ENTRY SHORT',
              price: entryPrice,
              size: positionSize,
              pnl: null,
              equity: equity,
              comment: 'Breakout Short Entry Signal'
            })
          }
        }
        // Check for exit signals (current position exists)
        else {
          let exitPrice = null
          let exitReason = ''
          
          if (position === 'LONG') {
            // Long stop loss
            const stopLoss = entryPrice - (atr * stopLossMultiplier)
            if (currentBar.low <= stopLoss) {
              exitPrice = stopLoss
              exitReason = 'Stop Loss'
            }
            // Reverse signal - short entry
            else if (currentBar.low < lowerBoundary) {
              exitPrice = lowerBoundary
              exitReason = 'Reverse to Short'
              
              // Calculate P&L for long position
              const longPnl = (exitPrice - entryPrice) * positionSize
              equity += longPnl
              
              trades.push({
                date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                action: 'CLOSE LONG',
                price: exitPrice,
                size: positionSize,
                pnl: longPnl,
                equity: equity,
                comment: exitReason
              })
              
              // Immediately enter short position
              position = 'SHORT'
              entryPrice = exitPrice
              positionSize = (equity * 0.95) / entryPrice
              
              trades.push({
                date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                action: 'ENTRY SHORT',
                price: entryPrice,
                size: positionSize,
                pnl: null,
                equity: equity,
                comment: 'Breakout Short Entry Signal'
              })
              continue
            }
          }
          else if (position === 'SHORT') {
            // Short stop loss
            const stopLoss = entryPrice + (atr * stopLossMultiplier)
            if (currentBar.high >= stopLoss) {
              exitPrice = stopLoss
              exitReason = 'Stop Loss'
            }
            // Reverse signal - long entry
            else if (currentBar.high > upperBoundary) {
              exitPrice = upperBoundary
              exitReason = 'Reverse to Long'
              
              // Calculate P&L for short position
              const shortPnl = (entryPrice - exitPrice) * positionSize
              equity += shortPnl
              
              trades.push({
                date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                action: 'CLOSE SHORT',
                price: exitPrice,
                size: positionSize,
                pnl: shortPnl,
                equity: equity,
                comment: exitReason
              })
              
              // Immediately enter long position
              position = 'LONG'
              entryPrice = exitPrice
              positionSize = (equity * 0.95) / entryPrice
              
              trades.push({
                date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                action: 'ENTRY LONG',
                price: entryPrice,
                size: positionSize,
                pnl: null,
                equity: equity,
                comment: 'Breakout Long Entry Signal'
              })
              continue
            }
          }
          
          // Execute exit if conditions met
          if (exitPrice !== null) {
            let pnl = 0
            if (position === 'LONG') {
              pnl = (exitPrice - entryPrice) * positionSize
            } else if (position === 'SHORT') {
              pnl = (entryPrice - exitPrice) * positionSize
            }
            
            equity += pnl
            
            trades.push({
              date: currentBar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              action: `CLOSE ${position}`,
              price: exitPrice,
              size: positionSize,
              pnl: pnl,
              equity: equity,
              comment: exitReason
            })
            
            position = null
          }
        }
      }
      
      return trades.reverse() // Most recent first
      
    } catch (error) {
      console.error('Failed to generate real strategy trades:', error)
      // Return empty array if API fails
      return []
    }
  }

  const [allTrades, setAllTrades] = useState<any[]>([])
  const [tradesLoading, setTradesLoading] = useState(true)
  
  // Load real strategy trades on component mount
  useEffect(() => {
    const loadTrades = async () => {
      setTradesLoading(true)
      try {
        const trades = await generateAllTrades()
        setAllTrades(trades)
      } catch (error) {
        console.error('Failed to load trades:', error)
        setAllTrades([])
      } finally {
        setTradesLoading(false)
      }
    }
    
    loadTrades()
  }, [])
  
  // Pagination logic
  const totalPages = Math.ceil(allTrades.length / tradesPerPage)
  const startIndex = (currentPage - 1) * tradesPerPage
  const endIndex = startIndex + tradesPerPage
  const currentTrades = allTrades.slice(startIndex, endIndex)

  // CSV download function
  const downloadTradesCSV = () => {
    const headers = ['Date', 'Action', 'Price', 'Size', 'P&L', 'Equity', 'Comment']
    const csvContent = [
      headers.join(','),
      ...allTrades.map(trade => [
        trade.date,
        trade.action,
        trade.price.toFixed(2),
        trade.size.toFixed(4),
        trade.pnl ? trade.pnl.toFixed(2) : '',
        trade.equity.toFixed(2),
        `"${trade.comment}"`
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `btc_trades_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Generate real equity curve data from trades
  const generateEquityData = () => {
    if (allTrades.length === 0) {
      // Return default starting point while loading
      return [{
        date: new Date('2020-01-01'),
        equity: 100000
      }]
    }
    
    // Use the actual trades to create equity curve
    const equityPoints = []
    const startingEquity = 100000
    
    // Start with initial capital
    equityPoints.push({
      date: new Date('2020-01-01'),
      equity: startingEquity
    })
    
    // Add equity points from actual trades (in chronological order)
    const chronologicalTrades = [...allTrades].reverse()
    chronologicalTrades.forEach(trade => {
      equityPoints.push({
        date: new Date(trade.date),
        equity: trade.equity
      })
    })
    
    // Sort by date to ensure proper chronological order
    return equityPoints.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const drawEquityCurve = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Clear canvas
    ctx.fillStyle = '#161b22'
    ctx.fillRect(0, 0, rect.width, rect.height)

    const equityData = generateEquityData()
    const padding = 50
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Find min/max equity values
    const equityValues = equityData.map(d => d.equity)
    const minEquity = Math.min(...equityValues) * 0.95
    const maxEquity = Math.max(...equityValues) * 1.05

    // Draw grid lines
    ctx.strokeStyle = '#30363d'
    ctx.lineWidth = 0.5
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
      
      // Equity labels
      const equityValue = maxEquity - ((maxEquity - minEquity) / 5) * i
      ctx.fillStyle = '#7d8590'
      ctx.font = '10px Segoe UI'
      ctx.textAlign = 'right'
      ctx.fillText(`$${(equityValue / 1000000).toFixed(1)}M`, padding - 10, y + 3)
    }

    // Draw equity curve
    ctx.strokeStyle = '#238636'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    equityData.forEach((point, index) => {
      const x = padding + (chartWidth / (equityData.length - 1)) * index
      const y = padding + chartHeight - ((point.equity - minEquity) / (maxEquity - minEquity)) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()

    // Add fill under curve
    ctx.lineTo(padding + chartWidth, padding + chartHeight)
    ctx.lineTo(padding, padding + chartHeight)
    ctx.closePath()
    ctx.fillStyle = 'rgba(35, 134, 54, 0.1)'
    ctx.fill()

    // Draw date labels
    ctx.fillStyle = '#7d8590'
    ctx.font = '10px Segoe UI'
    ctx.textAlign = 'center'
    const dateStep = Math.max(1, Math.floor(equityData.length / 6))
    for (let i = 0; i < equityData.length; i += dateStep) {
      const x = padding + (chartWidth / (equityData.length - 1)) * i
      const date = equityData[i].date
      ctx.fillText(
        date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
        x,
        rect.height - 10
      )
    }

    // Add title
    ctx.fillStyle = '#f0f6fc'
    ctx.font = 'bold 12px Segoe UI'
    ctx.textAlign = 'left'
    ctx.fillText('Portfolio Equity Growth', padding, 20)
  }

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Real live price updates
  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const priceData = await livePriceService.getLiveBitcoinPrice()
        setLivePrice({
          price: priceData.price,
          change24h: priceData.change24h || 0,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Failed to fetch live price:', error)
      }
    }

    // Fetch immediately
    fetchLivePrice()
    
    // Then fetch every 30 seconds
    const interval = setInterval(fetchLivePrice, 30000)
    return () => clearInterval(interval)
  }, [selectedSource])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#f0f6fc',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            margin: '0 0 0.5rem 0',
            color: '#f0f6fc'
          }}>
            🚀 BTC Strategy
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#7d8590',
            opacity: 0.9 
          }}>
            Adaptive Volatility Breakout
          </p>
        </header>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <select 
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'white',
              color: 'black'
            }}
          >
            <option value="coinbase">Coinbase Pro (Active)</option>
            <option value="binance">Binance</option>
            <option value="bitstamp">Bitstamp</option>
          </select>
          
          <button
            onClick={handleRefreshData}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#2f81f7',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Refresh Data
          </button>

          <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#7d8590' }}>
            Selected: {selectedSource.toUpperCase()} | Last updated: {currentTime.toLocaleString()}
          </div>
        </div>

        {/* Performance Metrics - 6 cards in a row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📈 Total Return
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#238636' }}>
              +{mockPerformanceData.total_return_percent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Net Profit: ${(mockPerformanceData.net_profit / 1000000).toFixed(1)}M
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📊 Total Trades
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f0f6fc' }}>
              {mockPerformanceData.total_trades}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Winners: {mockPerformanceData.winning_trades} | Losers: {mockPerformanceData.losing_trades}
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              🎯 Win Rate
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#238636' }}>
              +{mockPerformanceData.win_rate_percent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              {mockPerformanceData.winning_trades} / {mockPerformanceData.total_trades} trades
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📉 Max Drawdown
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#da3633' }}>
              {mockPerformanceData.max_drawdown_percent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Peak: ${(mockPerformanceData.peak_equity / 1000000).toFixed(1)}M
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              📊 Profit Factor
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#238636' }}>
              {mockPerformanceData.profit_factor.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Gross Profit: ${(mockPerformanceData.gross_profit / 1000000).toFixed(1)}M
            </div>
          </div>

          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#7d8590', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              💰 Average Trade
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fd7e14' }}>
              ${(mockPerformanceData.average_trade / 1000000).toFixed(1)}M
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
              Avg Winner: $4.0M | Avg Loser: $1.8M
            </div>
          </div>
        </div>

        {/* Bitcoin Price Display */}
        <div style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#7d8590', marginBottom: '0.25rem' }}>
              Bitcoin - {selectedSource.toUpperCase()}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f0f6fc' }}>
              {livePrice.price > 0 ? `$${livePrice.price.toLocaleString()}` : 'Loading...'}
            </div>
          </div>
          <div style={{ 
            color: livePrice.change24h >= 0 ? '#238636' : '#da3633',
            fontSize: '1.1rem'
          }}>
            {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24h.toFixed(2)}%
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#7d8590' }}>
            🔴 Live | Updated: {new Date(livePrice.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Chart Section */}
        <div style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, color: '#f0f6fc' }}>
              Bitcoin (BTC/USD) - {selectedSource.toUpperCase()}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['1M', '3M', '6M', 'YTD', '1Y', 'All'].map(period => (
                <button
                  key={period}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    border: '1px solid #30363d',
                    backgroundColor: period === '6M' ? '#2f81f7' : 'transparent',
                    color: period === '6M' ? 'white' : '#7d8590',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <LiveHistoricalChart 
              key={refreshKey}
              height={400}
              source={selectedSource}
              tradeSignals={[
                { date: '2025-07-01', type: 'BUY', price: 115000, reason: 'Volatility Breakout' },
                { date: '2025-07-15', type: 'SELL', price: 118000, reason: 'Stop Loss' },
                { date: '2025-08-01', type: 'BUY', price: 117000, reason: 'Reversal Signal' },
                { date: '2025-08-10', type: 'SELL', price: 119000, reason: 'Take Profit' }
              ]} 
            />
            
            {/* Live Price Overlay */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              backgroundColor: 'rgba(22, 27, 34, 0.9)',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '1rem',
              minWidth: '200px',
              zIndex: 10
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                <span style={{ fontWeight: 'bold', color: '#f0f6fc' }}>Live Bitcoin Price</span>
              </div>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#FFD700',
                marginBottom: '0.5rem'
              }}>
                {livePrice.price > 0 ? `$${livePrice.price.toLocaleString()}` : 'Loading...'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
                <div>24h Change: <span style={{ 
                  color: livePrice.change24h >= 0 ? '#238636' : '#da3633' 
                }}>
                  {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24h.toFixed(2)}%
                </span></div>
                <div>Updated: {new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div style={{
          backgroundColor: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #30363d' 
          }}>
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'performance', label: 'Performance' }, 
              { key: 'trades', label: 'List of trades' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab.key ? '#21262d' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.key ? '#2f81f7' : 'transparent'}`,
                  color: activeTab === tab.key ? '#f0f6fc' : '#7d8590',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? '600' : '400'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '1rem' }}>
            {activeTab === 'overview' && (
              <div>
                <h3 style={{ marginBottom: '1rem', color: '#f0f6fc' }}>Strategy Overview</h3>
                <p style={{ marginBottom: '1rem', color: '#7d8590' }}>
                  Adaptive Volatility Breakout strategy with reversal capability, 
                  optimized for Bitcoin trading across multiple data sources.
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem' 
                }}>
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Strategy Parameters</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Lookback Period: 20</div>
                      <div>Range Multiplier: 0.5</div>
                      <div>Stop Loss Multiplier: 2.5</div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Data Source</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Coinbase Pro</div>
                      <div>Total Candles: 3,884</div>
                      <div>Timeframe: 1D</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div>
                <h3 style={{ marginBottom: '2rem', color: '#f0f6fc' }}>Detailed Performance Analysis</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem' 
                }}>
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Returns & Profitability</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Total Return: <span style={{ color: '#238636' }}>{mockPerformanceData.total_return_percent.toFixed(1)}%</span></div>
                      <div>Net Profit: ${mockPerformanceData.net_profit.toLocaleString()}</div>
                      <div>Gross Profit: ${mockPerformanceData.gross_profit.toLocaleString()}</div>
                      <div>Gross Loss: ${mockPerformanceData.gross_loss.toLocaleString()}</div>
                      <div>Profit Factor: {mockPerformanceData.profit_factor.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Trade Statistics</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Total Trades: {mockPerformanceData.total_trades}</div>
                      <div>Winning Trades: {mockPerformanceData.winning_trades}</div>
                      <div>Losing Trades: {mockPerformanceData.losing_trades}</div>
                      <div>Win Rate: {mockPerformanceData.win_rate_percent.toFixed(1)}%</div>
                      <div>Average Trade: ${mockPerformanceData.average_trade.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Risk Metrics</h4>
                    <div style={{ fontSize: '0.9rem', color: '#7d8590' }}>
                      <div>Max Drawdown: <span style={{ color: '#da3633' }}>{mockPerformanceData.max_drawdown_percent.toFixed(1)}%</span></div>
                      <div>Peak Equity: ${mockPerformanceData.peak_equity.toLocaleString()}</div>
                      <div>Final Equity: ${mockPerformanceData.final_equity.toLocaleString()}</div>
                      <div>Long Trades: {mockPerformanceData.long_trades}</div>
                      <div>Short Trades: {mockPerformanceData.short_trades}</div>
                    </div>
                  </div>
                </div>
                
                {/* Equity Curve Chart */}
                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ color: '#f0f6fc', marginBottom: '1rem' }}>Equity Curve Over Time</h4>
                  <div style={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    padding: '1rem',
                    height: '300px',
                    position: 'relative'
                  }}>
                    <canvas 
                      ref={(canvas) => {
                        if (canvas) drawEquityCurve(canvas)
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trades' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#f0f6fc' }}>Trade History ({allTrades.length} trades)</h3>
                  <button
                    onClick={downloadTradesCSV}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#238636',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    📥 Download CSV
                  </button>
                </div>
                
                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 2fr',
                    gap: '1rem',
                    padding: '0.5rem',
                    backgroundColor: '#21262d',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontWeight: 'bold',
                    color: '#f0f6fc'
                  }}>
                    <div>Date</div>
                    <div>Action</div>
                    <div>Price</div>
                    <div>Size</div>
                    <div>P&L</div>
                    <div>Equity</div>
                    <div>Comment</div>
                  </div>
                  
                  {tradesLoading ? (
                    <div style={{ 
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#7d8590'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
                      <div>Loading real market data and calculating strategy trades...</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        Applying Adaptive Volatility Breakout algorithm to 2020-2024 Bitcoin data
                      </div>
                    </div>
                  ) : currentTrades.map((trade, index) => (
                    <div key={index} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 2fr',
                      gap: '1rem',
                      padding: '0.5rem',
                      backgroundColor: index % 2 === 0 ? '#161b22' : 'transparent',
                      borderRadius: '4px',
                      color: '#7d8590'
                    }}>
                      <div>{trade.date}</div>
                      <div style={{ 
                        color: trade.action.includes('ENTRY') ? '#238636' : 
                              trade.action.includes('CLOSE') ? '#da3633' : '#fd7e14'
                      }}>
                        {trade.action}
                      </div>
                      <div>${trade.price.toLocaleString()}</div>
                      <div>{trade.size.toFixed(4)}</div>
                      <div style={{ 
                        color: trade.pnl && trade.pnl > 0 ? '#238636' : trade.pnl && trade.pnl < 0 ? '#da3633' : '#7d8590'
                      }}>
                        {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toLocaleString()}` : '-'}
                      </div>
                      <div>${trade.equity.toLocaleString()}</div>
                      <div>{trade.comment}</div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  padding: '1rem 0'
                }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      backgroundColor: currentPage === 1 ? '#161b22' : '#21262d',
                      color: currentPage === 1 ? '#7d8590' : '#f0f6fc',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Previous
                  </button>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #30363d',
                            borderRadius: '4px',
                            backgroundColor: currentPage === pageNum ? '#2f81f7' : '#21262d',
                            color: currentPage === pageNum ? 'white' : '#f0f6fc',
                            cursor: 'pointer',
                            fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                          }}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      backgroundColor: currentPage === totalPages ? '#161b22' : '#21262d',
                      color: currentPage === totalPages ? '#7d8590' : '#f0f6fc',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next →
                  </button>
                  
                  <div style={{ marginLeft: '1rem', color: '#7d8590', fontSize: '0.9rem' }}>
                    Page {currentPage} of {totalPages} | Showing {startIndex + 1}-{Math.min(endIndex, allTrades.length)} of {allTrades.length} trades
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App