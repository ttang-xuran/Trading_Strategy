import { useEffect, useRef } from 'react'

interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
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
}

export default function BasicCandlestickChart({ height = 400, tradeSignals = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate realistic Bitcoin OHLC data for the last 90 days
  const generateCandleData = (): CandleData[] => {
    const data: CandleData[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)
    
    let currentPrice = 65000 + Math.random() * 25000
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      // Generate realistic price movement
      const volatility = 0.025
      const priceChange = (Math.random() - 0.5) * volatility * currentPrice
      const newPrice = currentPrice + priceChange
      
      const high = Math.max(currentPrice, newPrice) + Math.random() * 0.015 * newPrice
      const low = Math.min(currentPrice, newPrice) - Math.random() * 0.015 * newPrice
      const open = currentPrice
      const close = newPrice
      
      data.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
      })
      
      currentPrice = newPrice
    }
    
    return data
  }

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const candleData = generateCandleData()
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2 // Higher resolution
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Clear canvas
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Chart dimensions
    const padding = 60
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Find price range
    const prices = candleData.flatMap(d => [d.high, d.low])
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
    const dateStep = Math.ceil(candleData.length / 6)
    for (let i = 0; i < candleData.length; i += dateStep) {
      const x = padding + (chartWidth / (candleData.length - 1)) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + chartHeight)
      ctx.stroke()
      
      // Date labels
      if (candleData[i]) {
        const date = new Date(candleData[i].date)
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
    const candleWidth = Math.max(2, chartWidth / candleData.length - 1)
    
    candleData.forEach((candle, index) => {
      const x = padding + (chartWidth / (candleData.length - 1)) * index
      const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight
      const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight
      const highY = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight
      const lowY = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight

      const isGreen = candle.close > candle.open
      const color = isGreen ? '#238636' : '#da3633'

      // Draw wick (high-low line)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body (open-close rectangle)
      ctx.fillStyle = color
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.abs(closeY - openY) || 1
      ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight)
    })

    // Draw trade signals
    tradeSignals.forEach(signal => {
      const signalIndex = candleData.findIndex(c => c.date === signal.date)
      if (signalIndex === -1) return

      const x = padding + (chartWidth / (candleData.length - 1)) * signalIndex
      const y = padding + chartHeight - ((signal.price - minPrice) / priceRange) * chartHeight

      // Draw signal marker
      ctx.fillStyle = signal.type === 'BUY' ? '#238636' : '#da3633'
      ctx.beginPath()
      if (signal.type === 'BUY') {
        // Up arrow
        ctx.moveTo(x, y + 15)
        ctx.lineTo(x - 6, y + 25)
        ctx.lineTo(x + 6, y + 25)
      } else {
        // Down arrow
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

    // Draw title
    ctx.fillStyle = '#f0f6fc'
    ctx.font = 'bold 14px Segoe UI'
    ctx.textAlign = 'left'
    ctx.fillText('Bitcoin Price Chart (90 Days)', padding, 25)

    // Draw legend
    ctx.font = '10px Segoe UI'
    ctx.fillStyle = '#7d8590'
    ctx.fillText('Green: Price Up | Red: Price Down | Arrows: Trade Signals', padding, rect.height - 10)
  }

  useEffect(() => {
    drawChart()

    const handleResize = () => {
      setTimeout(drawChart, 100) // Debounce resize
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [tradeSignals])

  return (
    <div style={{ 
      height: `${height}px`, 
      backgroundColor: '#0d1117',
      borderRadius: '8px',
      border: '1px solid #30363d',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Trade Signal Info */}
      {tradeSignals.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          fontSize: '0.8rem',
          color: '#7d8590',
          backgroundColor: 'rgba(22, 27, 34, 0.8)',
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid #30363d'
        }}>
          📊 {tradeSignals.length} trade signals
        </div>
      )}
    </div>
  )
}