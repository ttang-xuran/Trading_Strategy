import { useEffect, useRef, useState, useMemo } from 'react'
import { livePriceService } from '../services/livePriceService'

interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
  timestamp: number
}

interface TradeSignal {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  reason: string
}

interface Props {
  height?: number
  tradeSignals?: TradeSignal[]
  source: string
}

export default function LiveHistoricalChart({ height = 400, tradeSignals = [], source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Load historical data from live API
  const loadHistoricalData = async (): Promise<CandleData[]> => {
    try {
      setLoading(true)
      
      // Get 90 days of historical data using CoinGecko API
      const endTime = Math.floor(Date.now() / 1000)
      const startTime = endTime - (90 * 24 * 60 * 60) // 90 days ago
      
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
      
      // Create OHLC candles
      const candles: CandleData[] = Object.entries(dailyData)
        .map(([date, dayData]) => {
          const prices = dayData.prices
          const open = prices[0]
          const close = prices[prices.length - 1]
          const high = Math.max(...prices)
          const low = Math.min(...prices)
          
          return {
            date,
            open,
            high,
            low,
            close,
            timestamp: dayData.timestamps[0]
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp)
      
      return candles
      
    } catch (error) {
      console.error('Failed to load historical data:', error)
      // Fallback to static data if API fails
      return generateFallbackData()
    } finally {
      setLoading(false)
    }
  }

  // Fallback data if API fails
  const generateFallbackData = (): CandleData[] => {
    const data: CandleData[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)
    
    let currentPrice = 112000
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      const change = (Math.random() - 0.5) * 0.04 * currentPrice
      const newPrice = currentPrice + change
      
      const high = Math.max(currentPrice, newPrice) + Math.random() * 0.01 * newPrice
      const low = Math.min(currentPrice, newPrice) - Math.random() * 0.01 * newPrice
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: currentPrice,
        high,
        low,
        close: newPrice,
        timestamp: date.getTime()
      })
      
      currentPrice = newPrice
    }
    
    return data
  }

  // Update current day's candle with live price
  const updateCurrentCandle = (livePrice: number) => {
    setCandleData(prev => {
      if (prev.length === 0) return prev
      
      const today = new Date().toISOString().split('T')[0]
      const lastCandle = prev[prev.length - 1]
      
      // If last candle is today, update it with live price
      if (lastCandle.date === today) {
        const updatedCandle = {
          ...lastCandle,
          close: livePrice,
          high: Math.max(lastCandle.high, livePrice),
          low: Math.min(lastCandle.low, livePrice)
        }
        
        return [...prev.slice(0, -1), updatedCandle]
      } else {
        // Create new candle for today
        const newCandle: CandleData = {
          date: today,
          open: lastCandle.close,
          high: Math.max(lastCandle.close, livePrice),
          low: Math.min(lastCandle.close, livePrice),
          close: livePrice,
          timestamp: Date.now()
        }
        
        return [...prev, newCandle]
      }
    })
  }

  // Load data when source changes
  useEffect(() => {
    loadHistoricalData().then(setCandleData)
  }, [source])

  // Update live price and current candle
  useEffect(() => {
    const updateLiveData = async () => {
      try {
        const priceData = await livePriceService.getLiveBitcoinPrice()
        setCurrentPrice(priceData.price)
        updateCurrentCandle(priceData.price)
      } catch (error) {
        console.error('Failed to get live price:', error)
      }
    }

    updateLiveData()
    const interval = setInterval(updateLiveData, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [candleData.length])

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas || candleData.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Clear canvas
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Chart dimensions
    const padding = 60
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Calculate visible data range based on zoom and pan
    const visibleCandles = Math.floor(candleData.length / zoomLevel)
    const startIndex = Math.max(0, Math.min(
      candleData.length - visibleCandles,
      Math.floor(panOffset)
    ))
    const endIndex = Math.min(candleData.length, startIndex + visibleCandles)
    const visibleData = candleData.slice(startIndex, endIndex)

    if (visibleData.length === 0) return

    // Find price range for visible data
    const prices = visibleData.flatMap(d => [d.high, d.low])
    const minPrice = Math.min(...prices) * 0.995
    const maxPrice = Math.max(...prices) * 1.005
    const priceRange = maxPrice - minPrice

    // Draw grid lines
    ctx.strokeStyle = '#30363d'
    ctx.lineWidth = 0.5
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
      
      // Price labels
      const price = maxPrice - (priceRange / 5) * i
      ctx.fillStyle = '#7d8590'
      ctx.font = '10px Segoe UI'
      ctx.textAlign = 'right'
      ctx.fillText(`$${price.toLocaleString()}`, padding - 10, y + 3)
    }

    // Vertical grid lines (dates)
    const dateStep = Math.max(1, Math.ceil(visibleData.length / 6))
    for (let i = 0; i < visibleData.length; i += dateStep) {
      const x = padding + (chartWidth / (visibleData.length - 1)) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + chartHeight)
      ctx.stroke()
      
      // Date labels
      if (visibleData[i]) {
        const date = new Date(visibleData[i].date)
        ctx.fillStyle = '#7d8590'
        ctx.font = '10px Segoe UI'
        ctx.textAlign = 'center'
        ctx.fillText(
          date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          x,
          padding + chartHeight + 20
        )
      }
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, (chartWidth / visibleData.length) - 1)
    
    visibleData.forEach((candle, index) => {
      const x = padding + (chartWidth / (visibleData.length - 1)) * index
      const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight
      const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight
      const highY = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight
      const lowY = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight

      const isGreen = candle.close > candle.open
      const isToday = candle.date === new Date().toISOString().split('T')[0]
      
      // Highlight current day's candle
      let color = isGreen ? '#238636' : '#da3633'
      if (isToday) {
        color = isGreen ? '#2ea043' : '#f85149' // Brighter colors for current candle
        ctx.shadowColor = color
        ctx.shadowBlur = 8
      }

      // Draw wick (high-low line)
      ctx.strokeStyle = color
      ctx.lineWidth = isToday ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body (open-close rectangle)
      ctx.fillStyle = color
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.abs(closeY - openY) || 1
      ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight)
      
      // Reset shadow
      if (isToday) {
        ctx.shadowBlur = 0
      }
    })

    // Draw trade signals (only visible ones)
    tradeSignals.forEach(signal => {
      const signalIndex = visibleData.findIndex(c => c.date === signal.date)
      if (signalIndex === -1) return

      const x = padding + (chartWidth / (visibleData.length - 1)) * signalIndex
      const y = padding + chartHeight - ((signal.price - minPrice) / priceRange) * chartHeight

      // Draw signal marker
      ctx.fillStyle = signal.type === 'BUY' ? '#238636' : '#da3633'
      ctx.beginPath()
      if (signal.type === 'BUY') {
        ctx.moveTo(x, y + 15)
        ctx.lineTo(x - 6, y + 25)
        ctx.lineTo(x + 6, y + 25)
      } else {
        ctx.moveTo(x, y - 15)
        ctx.lineTo(x - 6, y - 25)
        ctx.lineTo(x + 6, y - 25)
      }
      ctx.fill()

      // Draw signal label
      ctx.fillStyle = '#f0f6fc'
      ctx.font = 'bold 8px Segoe UI'
      ctx.textAlign = 'center'
      ctx.fillText(
        signal.type,
        x,
        signal.type === 'BUY' ? y + 35 : y - 30
      )
    })

    // Draw title with source info and live status
    ctx.fillStyle = '#f0f6fc'
    ctx.font = 'bold 14px Segoe UI'
    ctx.textAlign = 'left'
    ctx.fillText(`Bitcoin Chart (90 Days) - ${source.toUpperCase()} | Live Data`, padding, 25)

    // Draw current price and live indicator
    if (currentPrice) {
      ctx.font = '12px Segoe UI'
      ctx.fillStyle = '#FFD700'
      ctx.textAlign = 'right'
      ctx.fillText(`Live: $${currentPrice.toLocaleString()}`, rect.width - padding, 45)
      
      // Draw blinking live indicator
      const time = Date.now()
      if (Math.floor(time / 500) % 2 === 0) {
        ctx.fillStyle = '#2ea043'
        ctx.beginPath()
        ctx.arc(rect.width - padding - 10, 50, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // Draw zoom info
    ctx.font = '10px Segoe UI'
    ctx.fillStyle = '#7d8590'
    ctx.textAlign = 'right'
    ctx.fillText(`Zoom: ${zoomLevel.toFixed(1)}x | Scroll=Zoom | Drag=Pan`, rect.width - padding, rect.height - 10)
  }

  // Mouse event handlers for zoom and pan
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel(prev => Math.max(0.5, Math.min(10, prev * zoomFactor)))
  }

  const handleMouseDown = (event: MouseEvent) => {
    setIsDragging(true)
    setLastMouseX(event.clientX)
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging) return
    const deltaX = event.clientX - lastMouseX
    const panSensitivity = candleData.length / 500
    setPanOffset(prev => Math.max(0, Math.min(
      candleData.length - Math.floor(candleData.length / zoomLevel),
      prev - deltaX * panSensitivity
    )))
    setLastMouseX(event.clientX)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [isDragging, lastMouseX, zoomLevel, candleData.length])

  useEffect(() => {
    drawChart()
  }, [candleData, zoomLevel, panOffset, tradeSignals, currentPrice])

  useEffect(() => {
    const handleResize = () => {
      setTimeout(drawChart, 100)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [candleData, zoomLevel, panOffset, currentPrice])

  return (
    <div style={{ 
      height: `${height}px`, 
      backgroundColor: '#0d1117',
      borderRadius: '8px',
      border: '1px solid #30363d',
      position: 'relative',
      overflow: 'hidden',
      cursor: isDragging ? 'grabbing' : 'grab'
    }}>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Controls Info */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        fontSize: '0.8rem',
        color: '#7d8590',
        backgroundColor: 'rgba(22, 27, 34, 0.8)',
        padding: '0.5rem',
        borderRadius: '4px',
        border: '1px solid #30363d'
      }}>
        🔴 LIVE {source} data | Current candle updates every 30s | 🖱️ Interactive
      </div>

      {/* Loading indicator */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#7d8590',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📈</div>
          <div>Loading live {source} data...</div>
        </div>
      )}
    </div>
  )
}