import { useState, useEffect } from 'react'
import LiveHistoricalChart from './components/LiveHistoricalChart'
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

const mockPrice = {
  price: 112831.18,
  change24h: -2.94,
  timestamp: new Date().toISOString()
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedSource, setSelectedSource] = useState('coinbase')
  const [livePrice, setLivePrice] = useState(mockPrice)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trades'>('overview')

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Mock live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice(prev => ({
        ...prev,
        price: prev.price + (Math.random() - 0.5) * 1000,
        change24h: prev.change24h + (Math.random() - 0.5) * 0.5,
        timestamp: new Date().toISOString()
      }))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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
            Last updated: {currentTime.toLocaleString()}
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
              Bitcoin - COINBASE
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f0f6fc' }}>
              ${livePrice.price.toLocaleString()}
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
              Bitcoin (BTC/USD) - COINBASE
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
                ${livePrice.price.toLocaleString()}
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
              </div>
            )}

            {activeTab === 'trades' && (
              <div>
                <h3 style={{ marginBottom: '1rem', color: '#f0f6fc' }}>Trade History (154 trades)</h3>
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
                  
                  {[
                    { date: 'Aug 19, 2025', action: 'CLOSE Final', price: 112831.18, size: 608.4206, pnl: 3363591.633, equity: 75962736.971, comment: 'End of Date Range' },
                    { date: 'Aug 14, 2025', action: 'ENTRY SHORT', price: 118359.578, size: 608.4206, pnl: null, equity: 72667794.155, comment: 'Short' },
                    { date: 'Aug 14, 2025', action: 'CLOSE Long', price: 118359.578, size: 611.2963, pnl: 21875618.378, equity: 72739806.563, comment: 'Reverse to Short' }
                  ].map((trade, index) => (
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
                        color: trade.pnl && trade.pnl > 0 ? '#238636' : '#da3633' 
                      }}>
                        {trade.pnl ? `+$${trade.pnl.toLocaleString()}` : '-'}
                      </div>
                      <div>${trade.equity.toLocaleString()}</div>
                      <div>{trade.comment}</div>
                    </div>
                  ))}
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