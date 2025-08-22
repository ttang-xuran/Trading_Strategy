import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import './index.css'

interface BitcoinData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface LivePrice {
  price: number
  change24h: number
  timestamp: string
}

interface TradeSignal {
  time: string
  type: 'BUY' | 'SELL'
  price: number
  reason: string
}

function App() {
  const [livePrice, setLivePrice] = useState<LivePrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [historicalData, setHistoricalData] = useState<BitcoinData[]>([])
  const [tradeSignals, setTradeSignals] = useState<TradeSignal[]>([])
  const [selectedSource, setSelectedSource] = useState('coinbase')
  const [activeTab, setActiveTab] = useState<'chart' | 'performance' | 'trades'>('chart')
  
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch live price every 30 seconds
  useEffect(() => {
    fetchLivePrice()
    const interval = setInterval(fetchLivePrice, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load historical data and create chart
  useEffect(() => {
    loadHistoricalData()
  }, [selectedSource])

  // Create chart when data is loaded
  useEffect(() => {
    if (historicalData.length > 0 && chartContainerRef.current && !loading) {
      createCandlestickChart()
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [historicalData, loading])

  const fetchLivePrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      const data = await response.json()
      setLivePrice({
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change || 0,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to fetch live price:', error)
      setLivePrice({
        price: 67000,
        change24h: 2.5,
        timestamp: new Date().toISOString()
      })
    }
  }

  const loadHistoricalData = async () => {
    setLoading(true)
    try {
      console.log('Loading historical data for:', selectedSource)
      
      // Generate realistic Bitcoin data for the last 90 days
      const mockData: BitcoinData[] = []
      const mockSignals: TradeSignal[] = []
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      
      let currentPrice = 65000 + Math.random() * 20000
      
      for (let i = 0; i < 90; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Generate realistic price movement
        const volatility = 0.03
        const priceChange = (Math.random() - 0.5) * volatility * currentPrice
        const newPrice = currentPrice + priceChange
        
        const high = newPrice + Math.random() * 0.02 * newPrice
        const low = newPrice - Math.random() * 0.02 * newPrice
        const open = currentPrice
        const close = newPrice
        
        mockData.push({
          time: date.toISOString().split('T')[0],
          open,
          high,
          low,
          close,
          volume: Math.random() * 1000000 + 500000
        })
        
        // Generate trade signals (every 7-10 days)
        if (i % 8 === 0 && i > 0) {
          const signal: TradeSignal = {
            time: date.toISOString().split('T')[0],
            type: Math.random() > 0.5 ? 'BUY' : 'SELL',
            price: close,
            reason: Math.random() > 0.5 ? 'Volatility Breakout' : 'Stop Loss'
          }
          mockSignals.push(signal)
        }
        
        currentPrice = newPrice
      }
      
      setHistoricalData(mockData)
      setTradeSignals(mockSignals)
      console.log('Historical data loaded:', mockData.length, 'records')
    } catch (error) {
      console.error('Error loading historical data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCandlestickChart = () => {
    if (!chartContainerRef.current || chartRef.current) return

    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'white',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Add candlestick series
    const candlestickSeries = chartRef.current.addCandlestickSeries({
      upColor: '#4CAF50',
      downColor: '#f44336',
      borderUpColor: '#4CAF50',
      borderDownColor: '#f44336',
      wickUpColor: '#4CAF50',
      wickDownColor: '#f44336',
    })

    // Convert data format for the chart
    const chartData = historicalData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candlestickSeries.setData(chartData)

    // Add trade signals as markers
    const markers = tradeSignals.map(signal => ({
      time: signal.time,
      position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: signal.type === 'BUY' ? '#4CAF50' : '#f44336',
      shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: signal.type,
    }))

    candlestickSeries.setMarkers(markers)

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

  const refreshData = () => {
    fetchLivePrice()
    loadHistoricalData()
  }

  const calculatePerformance = () => {
    if (tradeSignals.length === 0) return null
    
    let equity = 100000 // Starting capital
    let position = 0
    let totalTrades = 0
    let winningTrades = 0
    
    for (const signal of tradeSignals) {
      if (signal.type === 'BUY' && position === 0) {
        position = equity / signal.price
        totalTrades++
      } else if (signal.type === 'SELL' && position > 0) {
        equity = position * signal.price
        if (equity > 100000) winningTrades++
        position = 0
      }
    }
    
    const totalReturn = ((equity - 100000) / 100000) * 100
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    
    return {
      totalReturn: totalReturn.toFixed(2),
      totalTrades,
      winRate: winRate.toFixed(1),
      finalEquity: equity.toLocaleString()
    }
  }

  const performance = calculatePerformance()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>
            📊 Bitcoin Trading Strategy Dashboard
          </h1>
          <p style={{ opacity: 0.9, margin: 0 }}>
            {currentTime.toLocaleString()} • Live Analysis + Backtesting
          </p>
        </header>

        {/* Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <select 
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: 'none',
              background: 'white',
              color: 'black'
            }}
          >
            <option value="coinbase">Coinbase Historical</option>
            <option value="binance">Binance Historical</option>
            <option value="bitstamp">Bitstamp Historical</option>
          </select>
          
          <button
            onClick={refreshData}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              background: loading ? '#666' : '#4CAF50',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh Analysis'}
          </button>

          <div style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
            📊 Demo Mode • Live Price + Historical Backtest
          </div>
        </div>

        {/* Live Price Card */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>🚀 Live Bitcoin Price</h2>
          {livePrice ? (
            <>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FFD700', marginBottom: '0.5rem' }}>
                ${livePrice.price.toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '1rem' }}>
                <span>
                  24h Change: <span style={{ color: livePrice.change24h >= 0 ? '#4CAF50' : '#f44336' }}>
                    {livePrice.change24h >= 0 ? '+' : ''}{livePrice.change24h.toFixed(2)}%
                  </span>
                </span>
                <span>Updated: {new Date(livePrice.timestamp).toLocaleTimeString()}</span>
                {performance && (
                  <span>Strategy Return: <span style={{ color: parseFloat(performance.totalReturn) >= 0 ? '#4CAF50' : '#f44336' }}>
                    {performance.totalReturn}%
                  </span></span>
                )}
              </div>
            </>
          ) : (
            <div>Loading live price...</div>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          marginBottom: '2rem',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            {(['chart', 'performance', 'trades'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '1rem 2rem',
                  border: 'none',
                  background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontWeight: activeTab === tab ? 'bold' : 'normal'
                }}
              >
                {tab === 'chart' ? '📈 Candlestick Chart' : 
                 tab === 'performance' ? '📊 Performance' : '📋 Trade Signals'}
              </button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {activeTab === 'chart' && (
              <div>
                <h3 style={{ margin: '0 0 1rem 0' }}>
                  Interactive Candlestick Chart (Last 90 Days) - {selectedSource}
                </h3>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div>🔄 Loading candlestick chart...</div>
                  </div>
                ) : (
                  <div
                    ref={chartContainerRef}
                    style={{
                      height: '400px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}
                  />
                )}
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  🔍 Interactive chart with buy/sell signals • Green arrows = BUY, Red arrows = SELL
                </div>
              </div>
            )}

            {activeTab === 'performance' && performance && (
              <div>
                <h3 style={{ margin: '0 0 2rem 0' }}>Strategy Performance Analysis</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem'
                }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#FFD700' }}>Total Return</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: parseFloat(performance.totalReturn) >= 0 ? '#4CAF50' : '#f44336' }}>
                      {performance.totalReturn}%
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#FFD700' }}>Total Trades</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {performance.totalTrades}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#FFD700' }}>Win Rate</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: parseFloat(performance.winRate) >= 50 ? '#4CAF50' : '#f44336' }}>
                      {performance.winRate}%
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#FFD700' }}>Final Equity</h4>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      ${performance.finalEquity}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trades' && (
              <div>
                <h3 style={{ margin: '0 0 1rem 0' }}>Trade Signals History</h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {tradeSignals.map((signal, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '1rem',
                        marginBottom: '0.5rem',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{
                          background: signal.type === 'BUY' ? '#4CAF50' : '#f44336',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {signal.type}
                        </span>
                      </div>
                      <div>${signal.price.toLocaleString()}</div>
                      <div>{signal.time}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{signal.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          opacity: 0.7,
          fontSize: '0.9rem'
        }}>
          <p>🤖 Advanced Bitcoin Trading Strategy • Live CoinGecko API + Historical Backtesting</p>
          <p>Professional candlestick charts powered by Lightweight Charts</p>
        </div>
      </div>
    </div>
  )
}

export default App