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

type TimeRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y' | '3Y' | '5Y' | '10Y'

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
  
  // Hover state for OHLC tooltip
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  
  // Fallback notification state
  const [fallbackNotification, setFallbackNotification] = useState<{
    show: boolean
    requestedSource: string
    actualSource: string
    reason: string
  }>({
    show: false,
    requestedSource: '',
    actualSource: '',
    reason: ''
  })

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
      case '2Y': return 730
      case '3Y': return 1095
      case '5Y': return 1825
      case '10Y': return 3650
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
      console.log(`Requesting ${days} days of data for ${timeframe} from ${source}`)
      console.log(`Date range: ${new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()} to ${new Date().toISOString()}`)
      
      const historicalData = await livePriceService.getHistoricalData(source, days)
      
      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data received from livePriceService')
      }
      
      // Check if we got fallback data and show notification
      const fallbackInfo = (historicalData as any)._fallbackInfo
      if (fallbackInfo) {
        setFallbackNotification({
          show: true,
          requestedSource: fallbackInfo.requestedSource.toUpperCase(),
          actualSource: fallbackInfo.actualSource.toUpperCase(),
          reason: fallbackInfo.reason
        })
        
        // Auto-hide notification after 8 seconds
        setTimeout(() => {
          setFallbackNotification(prev => ({ ...prev, show: false }))
        }, 8000)
      } else {
        // Clear any existing notification if we successfully used the requested source
        setFallbackNotification(prev => ({ ...prev, show: false }))
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
      
      // Log date range of received data for debugging
      if (candles.length > 0) {
        console.log(`Data date range: ${candles[0].date} to ${candles[candles.length - 1].date}`)
        console.log(`First candle:`, candles[0])
        console.log(`Last candle:`, candles[candles.length - 1])
      }
      
      return candles.sort((a, b) => a.timestamp - b.timestamp)
      
    } catch (error) {
      console.error(`Failed to load REAL historical data from ${source}:`, error)
      
      // If all APIs fail (likely CORS in production), show helpful error message
      // Still no random data - but provide clear guidance
      throw new Error(`Unable to load real market data from ${source}. This may be due to CORS restrictions in the browser. Please try refreshing or use a different data source.`)
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

    // SHOW ALL DATA - let the user pan/zoom to see different ranges
    // Calculate max visible candles based on timeframe
    let maxVisibleCandles: number
    switch (selectedTimeRange) {
      case '1M': 
        maxVisibleCandles = Math.min(candleData.length, 30)
        break
      case '3M': 
        maxVisibleCandles = Math.min(candleData.length, 90)
        break
      case '6M':
        maxVisibleCandles = Math.min(candleData.length, 180) // Show full 6 months
        break
      case 'YTD':
        maxVisibleCandles = candleData.length // Show all YTD data
        break
      case '1Y':
        maxVisibleCandles = Math.min(candleData.length, 365) // Show full year
        break
      case '2Y':
        maxVisibleCandles = Math.min(candleData.length, 730) // Show full 2 years
        break
      case '3Y':
        maxVisibleCandles = Math.min(candleData.length, 1095) // Show full 3 years
        break
      case '5Y':
        maxVisibleCandles = Math.min(candleData.length, 1825) // Show full 5 years
        break
      case '10Y':
        maxVisibleCandles = Math.min(candleData.length, 3650) // Show full 10 years
        break
      default:
        maxVisibleCandles = Math.min(candleData.length, 180)
    }
    const baseVisibleCandles = Math.min(maxVisibleCandles, candleData.length)
    const visibleCandles = Math.floor(baseVisibleCandles / zoomLevel)
    
    // Calculate data range to display
    let startIndex, endIndex
    if (['2Y', '3Y', '5Y', '10Y'].includes(selectedTimeRange)) {
      // For long timeframes: show complete historical data but start from RECENT data
      // Fix: Start from the end (recent data) unless user has specifically panned backward
      if (panOffset === 0) {
        // Default to showing the most recent data for long timeframes
        startIndex = Math.max(0, candleData.length - visibleCandles)
        endIndex = candleData.length
      } else {
        // User has panned, show the requested range
        startIndex = Math.max(0, Math.min(candleData.length - visibleCandles, Math.floor(panOffset)))
        endIndex = Math.min(candleData.length, startIndex + visibleCandles)
      }
      console.log(`${selectedTimeRange} timeframe: showing ${endIndex - startIndex} candles from ${candleData[startIndex]?.date || 'N/A'} to ${candleData[endIndex - 1]?.date || 'N/A'} (Total dataset: ${candleData.length} candles)`)
    } else {
      // For other timeframes, show most recent data first
      startIndex = Math.max(0, Math.min(
        candleData.length - visibleCandles,
        Math.floor(panOffset)
      ))
      endIndex = Math.min(candleData.length, startIndex + visibleCandles)
    }
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

    // Calculate adaptive candlestick width based on data density
    const candleSpacing = chartWidth / visibleData.length
    
    // Adaptive width: fewer candles = thicker bars, more candles = thinner but still visible
    let candleWidth: number
    if (visibleData.length <= 50) {
      // Few candles: make them thick (up to 40px)
      candleWidth = Math.max(24, Math.min(40, candleSpacing * 0.9))
    } else if (visibleData.length <= 100) {
      // Medium number: moderate thickness (12-24px)
      candleWidth = Math.max(12, Math.min(24, candleSpacing * 0.8))
    } else {
      // Many candles: thinner but visible (4-12px)
      candleWidth = Math.max(4, Math.min(12, candleSpacing * 0.7))
    }
    
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
      // FIXED: Use full candleData for proper lookback calculation, not just visibleData
      const boundaries = visibleData.map((candle, visibleIndex) => {
        // Find the actual index in the full dataset
        const actualIndex = startIndex + visibleIndex
        if (actualIndex < lookbackPeriod) return null
        
        // Get lookback data from the FULL dataset (previous 20 bars)
        const lookbackData = candleData.slice(Math.max(0, actualIndex - lookbackPeriod), actualIndex)
        if (lookbackData.length === 0) return null
        
        const highestHigh = Math.max(...lookbackData.map(d => d.high))
        const lowestLow = Math.min(...lookbackData.map(d => d.low))
        const breakoutRange = highestHigh - lowestLow
        
        return {
          upperBoundary: candle.open + breakoutRange * rangeMultiplier,
          lowerBoundary: candle.open - breakoutRange * rangeMultiplier,
          x: padding + (chartWidth / (visibleData.length - 1)) * visibleIndex
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
    
    // More controlled zoom with smaller increments to prevent chart from getting messed up
    const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05 // Reduced from 0.9/1.1 to 0.95/1.05
    const newZoomLevel = Math.max(0.5, Math.min(10, zoomLevel * zoomFactor))
    
    // Only update if the zoom level actually changes significantly (prevent micro-changes)
    if (Math.abs(newZoomLevel - zoomLevel) > 0.01) {
      setZoomLevel(newZoomLevel)
    }
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsDragging(true)
    setLastMouseX(event.clientX)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    // Update mouse position for tooltip
    setMousePosition({ x: event.clientX, y: event.clientY })
    
    // Handle dragging
    if (isDragging) {
      event.preventDefault()
      const deltaX = event.clientX - lastMouseX
      // Fixed pan sensitivity - prevent chart from getting messed up
      const panSensitivity = Math.min(1.0, Math.max(0.2, candleData.length / 1000)) // Controlled sensitivity
      const newPanOffset = prev => {
        const maxOffset = candleData.length - Math.floor(candleData.length / zoomLevel)
        return Math.max(0, Math.min(maxOffset, prev - deltaX * panSensitivity))
      }
      setPanOffset(newPanOffset)
      setLastMouseX(event.clientX)
      return
    }
    
    // Detect hover over candlesticks
    const padding = 60
    const chartWidth = rect.width - padding * 2
    
    // Calculate visible data range (same logic as in drawChart)
    let maxVisibleCandles: number
    switch (selectedTimeRange) {
      case '1M': 
        maxVisibleCandles = Math.min(candleData.length, 30)
        break
      case '3M': 
        maxVisibleCandles = Math.min(candleData.length, 90)
        break
      case '6M':
        maxVisibleCandles = Math.min(candleData.length, 180)
        break
      case 'YTD':
        maxVisibleCandles = candleData.length
        break
      case '1Y':
        maxVisibleCandles = Math.min(candleData.length, 365)
        break
      case '2Y':
        maxVisibleCandles = Math.min(candleData.length, 730)
        break
      case '3Y':
        maxVisibleCandles = Math.min(candleData.length, 1095)
        break
      case '5Y':
        maxVisibleCandles = Math.min(candleData.length, 1825)
        break
      case '10Y':
        maxVisibleCandles = Math.min(candleData.length, 3650)
        break
      default:
        maxVisibleCandles = Math.min(candleData.length, 180)
    }
    
    const baseVisibleCandles = Math.min(maxVisibleCandles, candleData.length)
    const visibleCandles = Math.floor(baseVisibleCandles / zoomLevel)
    
    // Use same logic as chart drawing for consistency
    let startIndex, endIndex
    if (['2Y', '3Y', '5Y', '10Y'].includes(selectedTimeRange)) {
      if (panOffset === 0) {
        startIndex = Math.max(0, candleData.length - visibleCandles)
        endIndex = candleData.length
      } else {
        startIndex = Math.max(0, Math.min(candleData.length - visibleCandles, Math.floor(panOffset)))
        endIndex = Math.min(candleData.length, startIndex + visibleCandles)
      }
    } else {
      startIndex = Math.max(0, Math.min(
        candleData.length - visibleCandles,
        Math.floor(panOffset)
      ))
      endIndex = Math.min(candleData.length, startIndex + visibleCandles)
    }
    const visibleData = candleData.slice(startIndex, endIndex)
    
    if (visibleData.length === 0) {
      setHoveredCandle(null)
      return
    }
    
    // Check if mouse is over a candlestick
    const candleSpacing = chartWidth / visibleData.length
    let candleWidth: number
    if (visibleData.length <= 50) {
      candleWidth = Math.max(24, Math.min(40, candleSpacing * 0.9))
    } else if (visibleData.length <= 100) {
      candleWidth = Math.max(12, Math.min(24, candleSpacing * 0.8))
    } else {
      candleWidth = Math.max(4, Math.min(12, candleSpacing * 0.7))
    }
    
    // Find which candle is under the mouse
    for (let i = 0; i < visibleData.length; i++) {
      const candleX = padding + candleSpacing * i + candleSpacing / 2
      const candleLeft = candleX - candleWidth / 2
      const candleRight = candleX + candleWidth / 2
      
      if (mouseX >= candleLeft && mouseX <= candleRight && mouseY >= padding && mouseY <= rect.height - padding) {
        setHoveredCandle(visibleData[i])
        return
      }
    }
    
    // No candle found under mouse
    setHoveredCandle(null)
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setHoveredCandle(null)
    setMousePosition(null)
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
        {(['1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y', '10Y'] as TimeRange[]).map(timeframe => (
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

      {/* OHLC Hover Tooltip */}
      {hoveredCandle && mousePosition && (
        <div style={{
          position: 'fixed',
          left: mousePosition.x + 15,
          top: mousePosition.y - 10,
          backgroundColor: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid #30363d',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#f0f6fc',
          fontFamily: 'monospace',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#58a6ff' }}>
            {hoveredCandle.date}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 8px' }}>
            <span style={{ color: '#8b949e' }}>Open:</span>
            <span>${hoveredCandle.open < 1 ? hoveredCandle.open.toFixed(6) : hoveredCandle.open.toLocaleString()}</span>
            <span style={{ color: '#8b949e' }}>High:</span>
            <span style={{ color: '#238636' }}>${hoveredCandle.high < 1 ? hoveredCandle.high.toFixed(6) : hoveredCandle.high.toLocaleString()}</span>
            <span style={{ color: '#8b949e' }}>Low:</span>
            <span style={{ color: '#da3633' }}>${hoveredCandle.low < 1 ? hoveredCandle.low.toFixed(6) : hoveredCandle.low.toLocaleString()}</span>
            <span style={{ color: '#8b949e' }}>Close:</span>
            <span>${hoveredCandle.close < 1 ? hoveredCandle.close.toFixed(6) : hoveredCandle.close.toLocaleString()}</span>
          </div>
        </div>
      )}
      
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

      {/* Fallback Notification */}
      {fallbackNotification.show && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(253, 126, 20, 0.15)',
          border: '1px solid #fd7e14',
          borderRadius: '6px',
          padding: '12px 16px',
          fontSize: '12px',
          color: '#f0f6fc',
          maxWidth: '500px',
          zIndex: 15,
          boxShadow: '0 4px 12px rgba(253, 126, 20, 0.2)'
        }}>
          <div style={{ fontWeight: 'bold', color: '#fd7e14', marginBottom: '4px' }}>
            📊 Data Source Fallback
          </div>
          <div style={{ color: '#e6edf3', lineHeight: '1.4' }}>
            Requested <strong>{fallbackNotification.requestedSource}</strong> but using <strong style={{ color: '#fd7e14' }}>{fallbackNotification.actualSource}</strong>
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>
            Reason: {fallbackNotification.reason}
          </div>
        </div>
      )}
    </div>
  )
}