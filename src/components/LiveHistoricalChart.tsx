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
  onTimeframeChange?: (timeframe: string) => void
}

type TimeRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'All'

export default function LiveHistoricalChart({ height = 400, tradeSignals = [], source, onTimeframeChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMouseX, setLastMouseX] = useState(0)
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('6M')
  const [allHistoricalData, setAllHistoricalData] = useState<CandleData[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Get number of days for each timeframe
  const getTimeframeDays = (timeframe: TimeRange): number => {
    switch (timeframe) {
      case '1M': return 30
      case '3M': return 90
      case '6M': return 180
      case 'YTD': 
        const yearStart = new Date(new Date().getFullYear(), 0, 1)
        return Math.floor((Date.now() - yearStart.getTime()) / (1000 * 60 * 60 * 24))
      case '1Y': return 365
      case 'All': return 365 // Limited by free API
      default: return 180
    }
  }

  // Load historical data using livePriceService for REAL market data
  const loadHistoricalData = async (timeframe: TimeRange = '6M'): Promise<CandleData[]> => {
    try {
      setLoading(true)
      console.log(`Loading REAL historical data from ${source} for timeframe ${timeframe}`)
      
      // Get historical data based on timeframe using the reliable livePriceService
      const days = getTimeframeDays(timeframe)
      const historicalData = await livePriceService.getHistoricalData(source, days)
      
      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data received from livePriceService')
      }
      
      // Convert the livePriceService data format to our CandleData format
      const candles: CandleData[] = historicalData.map(item => ({
        date: item.date ? item.date.toISOString().split('T')[0] : new Date(item.timestamp).toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        timestamp: item.date ? item.date.getTime() : item.timestamp
      }))
      
      console.log(`Successfully loaded ${candles.length} REAL candles from ${source} livePriceService`)
      return candles.sort((a, b) => a.timestamp - b.timestamp)
      
    } catch (error) {
      console.error(`Failed to load REAL historical data from ${source}:`, error)
      
      // IMPORTANT: DO NOT fall back to random data - throw the error
      // This ensures we only show real market data, never simulated data
      throw new Error(`Unable to load real historical data from ${source}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Show error message instead of generating fake data
  const showDataError = (error: string) => {
    console.error('Cannot load real historical data:', error)
    setCandleData([]) // Clear any existing data
    setLoading(false)
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

  // Handle timeframe changes
  const handleTimeframeChange = async (timeframe: TimeRange) => {
    setSelectedTimeRange(timeframe)
    setZoomLevel(1) // Reset zoom when changing timeframe
    setPanOffset(0) // Reset pan when changing timeframe
    
    // Notify parent component about timeframe change for backtesting
    if (onTimeframeChange) {
      onTimeframeChange(timeframe)
    }
    
    // Refresh live price to ensure consistency
    try {
      const priceData = await livePriceService.getLiveBitcoinPrice()
      setCurrentPrice(priceData.price)
    } catch (error) {
      console.error('Failed to refresh live price on timeframe change:', error)
    }
    
    try {
      const data = await loadHistoricalData(timeframe)
      setCandleData(data)
      setAllHistoricalData(data)
    } catch (error) {
      console.error(`Failed to load historical data for timeframe ${timeframe}:`, error)
      showDataError(error.message)
    }
  }

  // Load data when source or timeframe changes
  useEffect(() => {
    loadHistoricalData(selectedTimeRange)
      .then(data => {
        setCandleData(data)
        setAllHistoricalData(data)
      })
      .catch(error => {
        console.error(`Failed to load initial historical data from ${source}:`, error)
        showDataError(error.message)
      })
    
    // Sync initial timeframe with parent
    if (onTimeframeChange) {
      onTimeframeChange(selectedTimeRange)
    }
  }, [source, selectedTimeRange])

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

    // Calculate visible data range based on zoom and pan - fewer candles = thicker bars
    // Adjust visible candles based on timeframe to ensure thick candlesticks
    let maxVisibleCandles: number
    switch (selectedTimeRange) {
      case '1M': 
        maxVisibleCandles = 30
        break
      case '3M': 
        maxVisibleCandles = 25
        break
      case '6M':
      case 'YTD':
      case '1Y':
        maxVisibleCandles = 15 // Much fewer for longer timeframes
        break
      case 'All':
        maxVisibleCandles = 10 // Very few for maximum data to ensure thick bars
        break
      default:
        maxVisibleCandles = 20
    }
    const baseVisibleCandles = Math.min(maxVisibleCandles, candleData.length)
    const visibleCandles = Math.floor(baseVisibleCandles / zoomLevel)
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

    // Calculate proper candlestick width for daily data - make them MUCH thicker and more visible
    const candleSpacing = chartWidth / visibleData.length
    const candleWidth = Math.max(24, Math.min(40, candleSpacing * 0.9)) // Much larger: minimum 24px width, maximum 40px
    
    console.log(`Chart debug: visibleData.length=${visibleData.length}, chartWidth=${chartWidth}, candleSpacing=${candleSpacing}, candleWidth=${candleWidth}`)
    
    visibleData.forEach((candle, index) => {
      const x = padding + candleSpacing * index + candleSpacing / 2
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

      // Draw wick (high-low line) - make it MUCH thicker  
      ctx.strokeStyle = color
      ctx.lineWidth = isToday ? 4 : 3 // Increased thickness
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body (open-close rectangle) - ensure minimum height for visibility
      ctx.fillStyle = color
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.max(8, Math.abs(closeY - openY)) // Increased minimum to 8px height
      
      // Draw thick rectangle for the candlestick body
      ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight)
      
      // Add border for better definition
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.strokeRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight)
      
      // Reset shadow
      if (isToday) {
        ctx.shadowBlur = 0
      }
    })

    // Draw Adaptive Volatility Breakout boundaries
    if (visibleData.length > 20) {
      const lookbackPeriod = 20
      const rangeMultiplier = 0.5
      
      // Calculate upper and lower boundaries for each visible candle
      const boundaries = visibleData.map((candle, index) => {
        if (index < lookbackPeriod) return null
        
        // Get lookback data (previous 20 bars)
        const lookbackData = visibleData.slice(Math.max(0, index - lookbackPeriod), index)
        const highestHigh = Math.max(...lookbackData.map(d => d.high))
        const lowestLow = Math.min(...lookbackData.map(d => d.low))
        const breakoutRange = highestHigh - lowestLow
        
        return {
          upperBoundary: candle.open + breakoutRange * rangeMultiplier,
          lowerBoundary: candle.open - breakoutRange * rangeMultiplier,
          x: padding + (chartWidth / (visibleData.length - 1)) * index
        }
      })
      
      // Draw upper boundary line
      ctx.strokeStyle = '#238636'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.beginPath()
      let firstPoint = true
      boundaries.forEach(boundary => {
        if (!boundary) return
        const y = padding + chartHeight - ((boundary.upperBoundary - minPrice) / priceRange) * chartHeight
        if (firstPoint) {
          ctx.moveTo(boundary.x, y)
          firstPoint = false
        } else {
          ctx.lineTo(boundary.x, y)
        }
      })
      ctx.stroke()
      
      // Draw lower boundary line
      ctx.strokeStyle = '#da3633'
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 2
      ctx.beginPath()
      firstPoint = true
      boundaries.forEach(boundary => {
        if (!boundary) return
        const y = padding + chartHeight - ((boundary.lowerBoundary - minPrice) / priceRange) * chartHeight
        if (firstPoint) {
          ctx.moveTo(boundary.x, y)
          firstPoint = false
        } else {
          ctx.lineTo(boundary.x, y)
        }
      })
      ctx.stroke()
      
      // Draw labels for the most recent boundaries
      const lastBoundary = boundaries[boundaries.length - 1]
      if (lastBoundary) {
        // Upper boundary label
        const upperY = padding + chartHeight - ((lastBoundary.upperBoundary - minPrice) / priceRange) * chartHeight
        ctx.fillStyle = '#238636'
        ctx.font = 'bold 10px Segoe UI'
        ctx.textAlign = 'right'
        ctx.fillText(`Long Signal: $${lastBoundary.upperBoundary.toLocaleString()}`, rect.width - padding - 10, upperY - 5)
        
        // Lower boundary label
        const lowerY = padding + chartHeight - ((lastBoundary.lowerBoundary - minPrice) / priceRange) * chartHeight
        ctx.fillStyle = '#da3633'
        ctx.font = 'bold 10px Segoe UI'
        ctx.textAlign = 'right'
        ctx.fillText(`Short Signal: $${lastBoundary.lowerBoundary.toLocaleString()}`, rect.width - padding - 10, lowerY + 15)
      }
      
      // Reset line dash
      ctx.setLineDash([])
    }

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
    event.stopPropagation()
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel(prev => Math.max(0.5, Math.min(10, prev * zoomFactor)))
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsDragging(true)
    setLastMouseX(event.clientX)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return
    event.preventDefault()
    const deltaX = event.clientX - lastMouseX
    const panSensitivity = candleData.length / 1000
    setPanOffset(prev => Math.max(0, Math.min(
      candleData.length - Math.floor(candleData.length / zoomLevel),
      prev - deltaX * panSensitivity
    )))
    setLastMouseX(event.clientX)
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [zoomLevel])

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
    <div 
      ref={containerRef}
      style={{ 
        backgroundColor: '#0d1117',
        borderRadius: '8px',
        border: '1px solid #30363d',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Timeframe Buttons */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '4px',
        zIndex: 10
      }}>
        {(['1M', '3M', '6M', 'YTD', '1Y', 'All'] as TimeRange[]).map(timeframe => (
          <button
            key={timeframe}
            onClick={() => handleTimeframeChange(timeframe)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #30363d',
              backgroundColor: selectedTimeRange === timeframe ? '#2f81f7' : 'rgba(22, 27, 34, 0.8)',
              color: selectedTimeRange === timeframe ? 'white' : '#7d8590',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: selectedTimeRange === timeframe ? 'bold' : 'normal'
            }}
          >
            {timeframe}
          </button>
        ))}
      </div>

      <div style={{ 
        height: `${height}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}>
        <canvas 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'block'
          }}
        />
      </div>
      
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
          <div>Loading REAL {source} market data...</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
            No simulated data - only authentic market prices
          </div>
        </div>
      )}

      {/* Error indicator - when real data cannot be loaded */}
      {!loading && candleData.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#f85149',
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'rgba(22, 27, 34, 0.95)',
          border: '1px solid #30363d',
          borderRadius: '8px',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Real Market Data Unavailable
          </div>
          <div style={{ fontSize: '0.9rem', color: '#8b949e', marginBottom: '1rem' }}>
            Unable to load authentic historical Bitcoin data from {source.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#7d8590' }}>
            • Check internet connection<br/>
            • Try selecting a different data source<br/>
            • We never show simulated data - only real market prices
          </div>
        </div>
      )}
    </div>
  )
}