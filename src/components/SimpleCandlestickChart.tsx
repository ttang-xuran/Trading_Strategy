import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
)

interface CandleData {
  x: string
  o: number // open
  h: number // high
  l: number // low
  c: number // close
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

export default function SimpleCandlestickChart({ height = 400, tradeSignals = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)

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
        x: date.toISOString().split('T')[0],
        o: open,
        h: high,
        l: low,
        c: close,
      })
      
      currentPrice = newPrice
    }
    
    return data
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const candleData = generateCandleData()

    // Create custom candlestick chart using line chart
    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: candleData.map(d => d.x),
        datasets: [
          {
            label: 'Bitcoin Price',
            data: candleData.map(d => d.c), // Close prices
            borderColor: '#2f81f7',
            backgroundColor: 'rgba(47, 129, 247, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'High',
            data: candleData.map(d => d.h),
            borderColor: 'rgba(35, 134, 54, 0.3)',
            borderWidth: 1,
            fill: false,
            pointRadius: 0,
            borderDash: [2, 2],
          },
          {
            label: 'Low',
            data: candleData.map(d => d.l),
            borderColor: 'rgba(218, 54, 51, 0.3)',
            borderWidth: 1,
            fill: false,
            pointRadius: 0,
            borderDash: [2, 2],
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#7d8590',
              font: {
                size: 11
              },
              filter: (legendItem) => {
                return legendItem.text === 'Bitcoin Price'
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(22, 27, 34, 0.9)',
            titleColor: '#f0f6fc',
            bodyColor: '#7d8590',
            borderColor: '#30363d',
            borderWidth: 1,
            callbacks: {
              title: (context) => {
                const index = context[0].dataIndex
                return candleData[index]?.x || ''
              },
              label: (context) => {
                const index = context.dataIndex
                const candle = candleData[index]
                if (!candle) return ''
                
                if (context.dataset.label === 'Bitcoin Price') {
                  return [
                    `Open: $${candle.o.toLocaleString()}`,
                    `High: $${candle.h.toLocaleString()}`,
                    `Low: $${candle.l.toLocaleString()}`,
                    `Close: $${candle.c.toLocaleString()}`
                  ]
                }
                return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: {
                day: 'MMM dd'
              }
            },
            grid: {
              color: 'rgba(48, 54, 61, 0.5)',
            },
            ticks: {
              color: '#7d8590',
              maxTicksLimit: 8
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(48, 54, 61, 0.5)',
            },
            ticks: {
              color: '#7d8590',
              callback: function(value) {
                return '$' + Number(value).toLocaleString()
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        hover: {
          mode: 'index',
          intersect: false,
        },
        animation: {
          duration: 0 // Disable animations for performance
        }
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [tradeSignals])

  return (
    <div style={{ 
      height: `${height}px`, 
      backgroundColor: '#0d1117',
      borderRadius: '8px',
      border: '1px solid #30363d',
      padding: '1rem',
      position: 'relative'
    }}>
      <canvas ref={canvasRef} />
      
      {/* Trade Signal Indicators */}
      {tradeSignals.length > 0 && (
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
          📊 {tradeSignals.length} trade signals plotted
        </div>
      )}
    </div>
  )
}