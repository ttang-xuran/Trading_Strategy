import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import styled from 'styled-components'

// Components
import Header from './components/Header'
import DataSourceSelector from './components/DataSourceSelector'
import CandlestickChart from './components/CandlestickChart'
import PerformanceMetrics from './components/PerformanceMetrics'
import EquityCurve from './components/EquityCurve'
import TradesList from './components/TradesList'
import LoadingSpinner from './components/LoadingSpinner'

// Services
import { apiService } from './services/apiService'
import { staticDataService } from './services/staticDataService'

// Types
import type { DataSource, BacktestResult } from './types/api'

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
`

const MainContent = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  padding: 1rem;
  max-width: 100vw;
  overflow-x: hidden;
`

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  min-height: 600px;
`

const ControlsPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
`

const AnalyticsSection = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`

const TabContainer = styled.div`
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
`

const TabHeader = styled.div`
  display: flex;
  border-bottom: 1px solid var(--border-primary);
`

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background-color: ${props => props.active ? 'var(--bg-tertiary)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? 'var(--accent-blue)' : 'transparent'};
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
`

const TabContent = styled.div`
  padding: 1rem;
`

const ErrorMessage = styled.div`
  background-color: rgba(218, 54, 51, 0.1);
  border: 1px solid var(--accent-red);
  border-radius: 8px;
  padding: 1rem;
  color: var(--accent-red);
  margin: 1rem 0;
`

function App() {
  // State management
  const [selectedSource, setSelectedSource] = useState<string>('coinbase')
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trades'>('overview')
  const [useStaticData, setUseStaticData] = useState(false)

  // Load available data sources on component mount
  useEffect(() => {
    loadDataSources()
  }, [])

  // Load backtest data when source changes
  useEffect(() => {
    if (selectedSource) {
      loadBacktestData(selectedSource)
    }
  }, [selectedSource])

  const loadDataSources = async () => {
    try {
      // Try API first, fallback to static data
      let sources: DataSource[]
      try {
        const isApiAvailable = await apiService.isAvailable()
        if (isApiAvailable) {
          sources = await apiService.getDataSources()
          setUseStaticData(false)
        } else {
          throw new Error('API not available')
        }
      } catch (apiError) {
        console.log('API not available, using static data')
        sources = await staticDataService.getDataSources()
        setUseStaticData(true)
      }
      
      setDataSources(sources)
      
      // Set first active source as default
      const activeSource = sources.find(s => s.status === 'active')
      if (activeSource && !selectedSource) {
        setSelectedSource(activeSource.name)
      }
    } catch (err) {
      setError('Failed to load data sources')
      console.error('Error loading data sources:', err)
    }
  }

  const loadBacktestData = async (source: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = useStaticData 
        ? await staticDataService.getBacktestResults(source)
        : await apiService.getBacktestResults(source)
      setBacktestResult(result)
    } catch (err) {
      setError(`Failed to load backtest data for ${source}`)
      console.error('Error loading backtest data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSourceChange = (source: string) => {
    setSelectedSource(source)
  }

  const refreshData = async () => {
    if (selectedSource) {
      await loadBacktestData(selectedSource)
    }
  }

  return (
    <AppContainer>
      <Routes>
        <Route path="/" element={
          <>
            <Header />
            
            <MainContent>
              {/* Controls Section */}
              <ControlsPanel>
                <DataSourceSelector
                  sources={dataSources}
                  selectedSource={selectedSource}
                  onSourceChange={handleSourceChange}
                />
                
                <button onClick={refreshData} disabled={loading}>
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
                
                {backtestResult && (
                  <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {useStaticData && <span style={{ color: 'orange', marginRight: '1rem' }}>📊 Demo Mode</span>}
                    Last updated: {new Date(backtestResult.run_timestamp).toLocaleString()}
                  </div>
                )}
              </ControlsPanel>

              {/* Error Display */}
              {error && <ErrorMessage>{error}</ErrorMessage>}

              {/* Loading Spinner */}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <LoadingSpinner />
                </div>
              )}

              {/* Main Chart Section */}
              {backtestResult && !loading && (
                <ChartSection>
                  <MetricsGrid>
                    <PerformanceMetrics metrics={backtestResult.performance_metrics} />
                  </MetricsGrid>
                  
                  <CandlestickChart
                    chartData={backtestResult.chart_data}
                    tradeSignals={backtestResult.trade_signals}
                    source={selectedSource}
                  />
                </ChartSection>
              )}

              {/* Analytics Section */}
              {backtestResult && !loading && (
                <AnalyticsSection>
                  <TabContainer>
                    <TabHeader>
                      <Tab 
                        active={activeTab === 'overview'} 
                        onClick={() => setActiveTab('overview')}
                      >
                        Overview
                      </Tab>
                      <Tab 
                        active={activeTab === 'performance'} 
                        onClick={() => setActiveTab('performance')}
                      >
                        Performance
                      </Tab>
                      <Tab 
                        active={activeTab === 'trades'} 
                        onClick={() => setActiveTab('trades')}
                      >
                        List of trades
                      </Tab>
                    </TabHeader>
                    
                    <TabContent>
                      {activeTab === 'overview' && (
                        <div>
                          <h3>Strategy Overview</h3>
                          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            Adaptive Volatility Breakout strategy with reversal capability, 
                            optimized for Bitcoin trading across multiple data sources.
                          </p>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                              <h4>Strategy Parameters</h4>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div>Lookback Period: {backtestResult.parameters.lookback_period}</div>
                                <div>Range Multiplier: {backtestResult.parameters.range_mult}</div>
                                <div>Stop Loss Multiplier: {backtestResult.parameters.stop_loss_mult}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4>Data Source</h4>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div>{dataSources.find(s => s.name === selectedSource)?.display_name}</div>
                                <div>Total Candles: {backtestResult.chart_data.total_candles}</div>
                                <div>Timeframe: {backtestResult.chart_data.timeframe}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeTab === 'performance' && backtestResult.performance_metrics && (
                        <div>
                          <h3>Detailed Performance Analysis</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                              <h4>Returns & Profitability</h4>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div>Total Return: <span className="text-green">{backtestResult.performance_metrics.total_return_percent.toFixed(1)}%</span></div>
                                <div>Net Profit: ${backtestResult.performance_metrics.net_profit.toLocaleString()}</div>
                                <div>Gross Profit: ${backtestResult.performance_metrics.gross_profit.toLocaleString()}</div>
                                <div>Gross Loss: ${backtestResult.performance_metrics.gross_loss.toLocaleString()}</div>
                                <div>Profit Factor: {backtestResult.performance_metrics.profit_factor.toFixed(2)}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4>Trade Statistics</h4>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div>Total Trades: {backtestResult.performance_metrics.total_trades}</div>
                                <div>Winning Trades: {backtestResult.performance_metrics.winning_trades}</div>
                                <div>Losing Trades: {backtestResult.performance_metrics.losing_trades}</div>
                                <div>Win Rate: {backtestResult.performance_metrics.win_rate_percent.toFixed(1)}%</div>
                                <div>Average Trade: ${backtestResult.performance_metrics.average_trade.toLocaleString()}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4>Risk Metrics</h4>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <div>Max Drawdown: <span className="text-red">{backtestResult.performance_metrics.max_drawdown_percent.toFixed(1)}%</span></div>
                                <div>Peak Equity: ${backtestResult.performance_metrics.peak_equity.toLocaleString()}</div>
                                <div>Final Equity: ${backtestResult.performance_metrics.final_equity.toLocaleString()}</div>
                                <div>Long Trades: {backtestResult.performance_metrics.long_trades}</div>
                                <div>Short Trades: {backtestResult.performance_metrics.short_trades}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activeTab === 'trades' && (
                        <TradesList trades={backtestResult.trade_signals} />
                      )}
                    </TabContent>
                  </TabContainer>
                  
                  <EquityCurve equityCurve={backtestResult.equity_curve} />
                </AnalyticsSection>
              )}
            </MainContent>
          </>
        } />
      </Routes>
    </AppContainer>
  )
}

export default App