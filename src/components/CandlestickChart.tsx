/**
 * Candlestick Chart Component
 * Interactive Bitcoin price chart with trade signals, similar to TradingView
 */

import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react'
import Plot from 'react-plotly.js'
import styled from 'styled-components'
import { format } from 'date-fns'
import type { ChartData, TradeSignal, PlotlyLayout } from '../types/api'
import LivePriceDisplay from './LivePriceDisplay'

interface Props {
  chartData: ChartData
  tradeSignals: TradeSignal[]
  source: string
  height?: number
}

const ChartContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`

const ChartHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  background-color: var(--bg-tertiary);
`

const PriceInfo = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;
`

const PriceValue = styled.span<{ change?: number }>`
  color: ${props => 
    props.change === undefined ? 'var(--text-primary)' :
    props.change > 0 ? 'var(--accent-green)' : 
    props.change < 0 ? 'var(--accent-red)' : 'var(--text-primary)'
  };
  font-weight: 600;
`

const TimeframeSelector = styled.div`
  display: flex;
  gap: 4px;
`

const TimeframeButton = styled.button<{ active?: boolean }>`
  padding: 4px 8px;
  font-size: 0.8rem;
  border: 1px solid var(--border-primary);
  background-color: ${props => props.active ? 'var(--accent-blue)' : 'var(--bg-secondary)'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--accent-blue)' : 'var(--bg-tertiary)'};
  }
`

const CandlestickChart: React.FC<Props> = ({ 
  chartData, 
  tradeSignals, 
  source, 
  height = 500 
}) => {
  const plotRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  // Calculate optimal rendering settings based on data density (memoized)
  const getRenderingSettings = useCallback((candleCount: number) => {
    if (candleCount > 2000) {
      // ALL timeframe - maximum thickness, minimal gaps
      return {
        candleWidth: 0.95,
        whiskerWidth: 1.0,  // Maximum whisker width for thick OHLC lines
        optimization: true,
        tickDensity: 8
      }
    } else if (candleCount > 1000) {
      // 1Y timeframe - thick candles
      return {
        candleWidth: 0.9,
        whiskerWidth: 0.9,
        optimization: true,
        tickDensity: 10
      }
    } else if (candleCount > 500) {
      // 6M timeframe - wider candles
      return {
        candleWidth: 0.85,
        whiskerWidth: 0.8,
        optimization: false,
        tickDensity: 15
      }
    } else {
      // Shorter timeframes - standard width
      return {
        candleWidth: 0.8,
        whiskerWidth: 0.6,
        optimization: false,
        tickDensity: 20
      }
    }
  }, [])

  // Data virtualization for large datasets
  const getOptimizedCandles = useCallback((candles: typeof chartData.candles) => {
    if (!candles || candles.length <= 1000) {
      return candles
    }

    // For very large datasets, use data sampling to maintain performance
    if (candles.length > 5000) {
      // Sample every nth candle to reduce data points while preserving shape
      const sampleRate = Math.ceil(candles.length / 3000)
      return candles.filter((_, index) => index % sampleRate === 0)
    }

    // For moderately large datasets, use time-based aggregation
    if (candles.length > 2000) {
      // Group by week for very long timeframes
      const weeklyCandles: typeof candles = []
      for (let i = 0; i < candles.length; i += 7) {
        const week = candles.slice(i, i + 7)
        if (week.length > 0) {
          weeklyCandles.push({
            timestamp: week[week.length - 1].timestamp,
            open: week[0].open,
            high: Math.max(...week.map(c => c.high)),
            low: Math.min(...week.map(c => c.low)),
            close: week[week.length - 1].close,
            volume: week.reduce((sum, c) => sum + c.volume, 0)
          })
        }
      }
      return weeklyCandles
    }

    return candles
  }, [])

  // Get rendering settings (cached)
  const renderingSettings = useMemo(() => {
    const candleCount = chartData.candles?.length || 0
    return getRenderingSettings(candleCount)
  }, [chartData.candles?.length, getRenderingSettings])

  // Optimized candles for rendering
  const optimizedCandles = useMemo(() => {
    return getOptimizedCandles(chartData.candles)
  }, [chartData.candles, getOptimizedCandles])

  // Process candlestick data
  const candlestickTrace = useMemo(() => {
    if (!optimizedCandles || optimizedCandles.length === 0) {
      return null
    }

    const dates = optimizedCandles.map(candle => candle.timestamp)
    const opens = optimizedCandles.map(candle => candle.open)
    const highs = optimizedCandles.map(candle => candle.high)
    const lows = optimizedCandles.map(candle => candle.low)
    const closes = optimizedCandles.map(candle => candle.close)

    // Use cached rendering settings
    const settings = renderingSettings

    // Removed unused hoverText - using hovertemplate instead

    return {
      x: dates,
      open: opens,
      high: highs,
      low: lows,
      close: closes,
      type: 'candlestick' as const,
      name: 'BTC/USD',
      // Proper candlestick styling for thick bars
      increasing: { 
        line: { 
          color: '#238636', 
          width: 0  // Set to 0 for filled candlesticks
        },
        fillcolor: '#238636'
      },
      decreasing: { 
        line: { 
          color: '#da3633', 
          width: 0  // Set to 0 for filled candlesticks  
        },
        fillcolor: '#da3633'
      },
      // Critical: whiskerwidth controls the OHLC line thickness
      whiskerwidth: settings.whiskerWidth,
      // Remove conflicting line width setting
      // line: { width: ... } // This was causing issues
      // Fixed hover template for OHLC data
      hovertemplate: 
        '<b>%{x|%Y-%m-%d %H:%M}</b><br>' +
        '<br>' +
        'Open: <b>$%{open:,.2f}</b><br>' +
        'High: <b>$%{high:,.2f}</b><br>' +
        'Low: <b>$%{low:,.2f}</b><br>' +
        'Close: <b>$%{close:,.2f}</b><br>' +
        '<br>' +
        'Change: <b>$%{customdata[0]:+,.2f}</b><br>' +
        'Change %: <b>%{customdata[1]:+.2f}%</b><br>' +
        '<extra></extra>',
      customdata: optimizedCandles.map(candle => [
        candle.close - candle.open,  // change
        candle.open !== 0 ? ((candle.close - candle.open) / candle.open) * 100 : 0  // changePercent
      ]),
      // Enhanced hover styling
      hoverlabel: {
        bgcolor: 'rgba(0, 0, 0, 0.9)',
        bordercolor: '#ffffff',
        borderwidth: 1,
        font: { 
          color: '#ffffff', 
          size: 13, 
          family: 'Monaco, Consolas, monospace' 
        }
      },
      // Ensure proper hover detection
      hoverinfo: 'skip', // Use hovertemplate instead
      xaxis: 'x',
      yaxis: 'y',
    }
  }, [optimizedCandles, renderingSettings])

  // Process trade signals as scatter points
  const tradeSignalTraces = useMemo(() => {
    if (!tradeSignals || tradeSignals.length === 0) {
      return []
    }

    // Group signals by type for different styling
    const entryLongSignals = tradeSignals.filter(signal => 
      signal.action.toUpperCase().includes('ENTRY') && 
      signal.action.toUpperCase().includes('LONG')
    )
    const entryShortSignals = tradeSignals.filter(signal => 
      signal.action.toUpperCase().includes('ENTRY') && 
      signal.action.toUpperCase().includes('SHORT')
    )
    const exitSignals = tradeSignals.filter(signal => 
      (signal.action.toUpperCase().includes('CLOSE') || 
       signal.action.toUpperCase().includes('STOP LOSS')) &&
      !signal.action.toUpperCase().includes('FINAL') &&
      !signal.comment?.includes('End of Date Range')
    )

    const traces: any[] = []

    // Entry Long signals (Green up arrows)
    if (entryLongSignals.length > 0) {
      traces.push({
        x: entryLongSignals.map(s => s.timestamp),
        y: entryLongSignals.map(s => s.price),
        mode: 'markers',
        type: 'scatter',
        name: 'Long Entry',
        marker: {
          symbol: 'triangle-up',
          size: 14,
          color: '#00ff00',
          line: { width: 2, color: '#ffffff' }
        },
        text: entryLongSignals.map(s => 
          `${s.action}<br>Price: $${s.price.toLocaleString()}<br>Size: ${s.size.toFixed(4)}<br>${s.comment}`
        ),
        hovertemplate: '%{text}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    // Entry Short signals (Red down arrows)
    if (entryShortSignals.length > 0) {
      traces.push({
        x: entryShortSignals.map(s => s.timestamp),
        y: entryShortSignals.map(s => s.price),
        mode: 'markers',
        type: 'scatter',
        name: 'Short Entry',
        marker: {
          symbol: 'triangle-down',
          size: 14,
          color: '#ff0000',
          line: { width: 2, color: '#ffffff' }
        },
        text: entryShortSignals.map(s => 
          `${s.action}<br>Price: $${s.price.toLocaleString()}<br>Size: ${s.size.toFixed(4)}<br>${s.comment}`
        ),
        hovertemplate: '%{text}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    // Exit signals (Orange squares)
    if (exitSignals.length > 0) {
      traces.push({
        x: exitSignals.map(s => s.timestamp),
        // Position exit signals below entry signals when on same bar
        y: exitSignals.map(s => {
          // Check if there's an entry signal on the same date
          const sameDate = [...entryLongSignals, ...entryShortSignals].some(entry => 
            entry.timestamp === s.timestamp
          )
          if (sameDate) {
            // Position exit mark further below the price by 4% to avoid overlap
            return s.price * 0.96
          }
          return s.price
        }),
        mode: 'markers',
        type: 'scatter',
        name: 'Exit',
        marker: {
          symbol: 'x',
          size: 12,
          color: '#ffff00',
          line: { width: 2, color: '#000000' }
        },
        text: exitSignals.map(s => {
          const pnlText = s.pnl ? `<br>P&L: $${s.pnl.toLocaleString()}` : ''
          return `${s.action}<br>Price: $${s.price.toLocaleString()}<br>Size: ${s.size.toFixed(4)}${pnlText}<br>${s.comment}`
        }),
        hovertemplate: '%{text}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    return traces
  }, [tradeSignals])

  // Calculate current price info
  const currentPriceInfo = useMemo(() => {
    if (!chartData.candles || chartData.candles.length === 0) {
      return null
    }

    try {
      // Safety check: ensure we have valid array bounds
      const candleCount = chartData.candles.length
      if (candleCount < 1) return null
      
      // Always use original data for current price info (not optimized data) 
      const latest = chartData.candles[candleCount - 1]
      const previous = candleCount > 1 ? chartData.candles[candleCount - 2] : null
      
      // Safety check: ensure latest candle data is valid
      if (!latest || typeof latest.close !== 'number') {
        return null
      }
      
      const change = previous && typeof previous.close === 'number' ? latest.close - previous.close : 0
      // Safety check: prevent division by zero
      const changePercent = previous && previous.close !== 0 ? (change / previous.close) * 100 : 0

      return {
        price: latest.close,
        change,
        changePercent,
        volume: latest.volume || 0,
        high: latest.high || latest.close,
        low: latest.low || latest.close, 
        open: latest.open || latest.close
      }
    } catch (error) {
      console.warn('Error calculating current price info:', error)
      return null
    }
  }, [chartData])

  // Calculate data date range for proper range selector
  const dataDateRange = useMemo(() => {
    if (!chartData.candles || chartData.candles.length === 0) {
      return { start: new Date(), end: new Date() }
    }
    
    try {
      // Safety check: ensure we have valid array bounds
      const candleCount = chartData.candles.length
      if (candleCount < 1) {
        return { start: new Date(), end: new Date() }
      }
      
      // Always use original data for date range (not optimized data)
      // Safe array access with bounds checking
      const firstCandle = chartData.candles[0]
      const lastCandle = chartData.candles[candleCount - 1]
      
      if (!firstCandle || !lastCandle) {
        return { start: new Date(), end: new Date() }
      }
      
      return {
        start: new Date(firstCandle.timestamp),
        end: new Date(lastCandle.timestamp)
      }
    } catch (error) {
      console.warn('Error calculating date range:', error)
      return { start: new Date(), end: new Date() }
    }
  }, [chartData.candles])

  // Chart layout configuration - TradingView style
  const layout: Partial<PlotlyLayout> = useMemo(() => {
    const settings = renderingSettings
    
    return {
      title: `Bitcoin (BTC/USD) - ${source.toUpperCase()}`,
      xaxis: {
        title: 'Date',
        type: 'date',
        rangeslider: { visible: false }, // Keep rangeslider hidden for cleaner look
        showgrid: true,
        gridcolor: '#30363d',
        zeroline: false,
        showspikes: true,
        spikecolor: '#f0f6fc',
        spikesnap: 'cursor',
        spikemode: 'across',
        spikethickness: 1,
        // Optimize tick density based on data density
        nticks: settings.tickDensity,
        // Enable horizontal dragging and navigation
        fixedrange: false,
        autorange: false,  // Disable autorange to allow manual navigation
        // Set default range to 6 months from latest data (but allow dragging beyond)
        range: [
          new Date(dataDateRange.end.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          dataDateRange.end.toISOString()
        ],
        // Enable better date range controls - use actual data dates
        rangeselector: {
        visible: true,
        bgcolor: 'rgba(22, 27, 34, 0.8)',
        bordercolor: '#30363d',
        x: 0,
        y: 1.02,
        buttons: [
          { 
            count: 30, 
            label: '1M', 
            step: 'day', 
            stepmode: 'backward'
          },
          { 
            count: 90, 
            label: '3M', 
            step: 'day', 
            stepmode: 'backward'
          },
          { 
            count: 180, 
            label: '6M', 
            step: 'day', 
            stepmode: 'backward'
          },
          {
            label: 'YTD',
            // Year to date - from Jan 1, 2025 to latest data
            step: 'year',
            stepmode: 'todate'
          },
          { 
            count: 365, 
            label: '1Y', 
            step: 'day', 
            stepmode: 'backward'
          },
          { step: 'all', label: 'All' }
        ],
        // Set 6M as default active button
        active: 2  // 6M is index 2 (0=1M, 1=3M, 2=6M)
      }
    },
    yaxis: {
      title: 'Price (USD)',
      side: 'right',
      showgrid: true,
      gridcolor: '#30363d',
      zeroline: false,
      showspikes: true,
      spikecolor: '#f0f6fc',
      spikesnap: 'cursor',
      spikemode: 'across',
      spikethickness: 1,
      tickformat: '$,.0f'
    },
    plot_bgcolor: '#0d1117',
    paper_bgcolor: '#161b22',
    font: {
      color: '#f0f6fc',
      family: 'Segoe UI, sans-serif'
    },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(22, 27, 34, 0.8)',
      bordercolor: '#30363d',
      font: { size: 11 }
    },
    margin: { l: 0, r: 60, t: 80, b: 40 },
    height: height,
    // Enable crossfilter-style interactions  
    dragmode: 'pan', // Default to pan mode for click-and-drag behavior like TradingView
    hovermode: 'x unified', // Better hover mode for candlesticks
    // Enable smooth panning and navigation
    scrollZoom: true,
    doubleClick: 'reset+autosize',
    // Optimized settings for candlestick rendering
    showlegend: true,
    hoverlabel: {
      bgcolor: 'rgba(0, 0, 0, 0.85)',
      bordercolor: '#30363d',
      font: { color: '#f0f6fc', size: 12, family: 'monospace' },
      align: 'left'
    },
    // Additional zoom settings
    selectdirection: 'diagonal'
    }
  }, [source, height, dataDateRange, chartData.candles, renderingSettings])

  // Process boundary lines (upper and lower breakout levels)
  const boundaryTraces = useMemo(() => {
    const traces: any[] = []
    
    
    // Upper boundary line (red/green based on TradingView style)
    if (chartData.upper_boundary && chartData.upper_boundary.length > 0) {
      traces.push({
        x: chartData.upper_boundary.map(point => (point as any).timestamp || (point as any).x),
        y: chartData.upper_boundary.map(point => (point as any).value || (point as any).y),
        mode: 'lines',
        type: 'scatter',
        name: 'Upper Boundary',
        line: {
          color: '#ff6b6b',  // Red like TradingView
          width: 1.5,
          dash: 'dot'
        },
        hovertemplate: 'Upper Boundary: $%{y:,.2f}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }
    
    // Lower boundary line
    if (chartData.lower_boundary && chartData.lower_boundary.length > 0) {
      traces.push({
        x: chartData.lower_boundary.map(point => (point as any).timestamp || (point as any).x),
        y: chartData.lower_boundary.map(point => (point as any).value || (point as any).y),
        mode: 'lines',
        type: 'scatter',
        name: 'Lower Boundary',
        line: {
          color: '#51cf66',  // Green like TradingView
          width: 1.5,
          dash: 'dot'
        },
        hovertemplate: 'Lower Boundary: $%{y:,.2f}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }
    
    return traces
  }, [chartData.upper_boundary, chartData.lower_boundary])

  // Combine all traces
  const allTraces = candlestickTrace ? [candlestickTrace, ...boundaryTraces, ...tradeSignalTraces] : []

  // Handle plot initialization and cleanup
  useEffect(() => {
    let plotElement: any = null
    
    const handleRelayout = () => {
      // Handle zoom/pan events if needed
    }
    
    if (plotRef.current && plotRef.current.el) {
      plotElement = plotRef.current.el
      plotElement.on('plotly_relayout', handleRelayout)
    }
    
    return () => {
      // Cleanup event listeners to prevent memory leaks
      if (plotElement && plotElement.removeListener) {
        plotElement.removeListener('plotly_relayout', handleRelayout)
      }
    }
  }, [])

  // Progressive loading for large datasets
  useEffect(() => {
    const candleCount = chartData.candles?.length || 0
    
    if (candleCount > 2000) {
      setIsLoading(true)
      // Longer processing time for very large datasets (ALL timeframe)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setRenderError(null)
      }, 300)
      return () => clearTimeout(timer)
    } else if (candleCount > 1000) {
      setIsLoading(true)
      // Medium processing time for large datasets (1Y timeframe)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setRenderError(null)
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setIsLoading(false)
      setRenderError(null)
    }
  }, [chartData.candles?.length])

  // Error handling for chart rendering
  const handlePlotError = useCallback((error: any) => {
    console.error('Chart rendering error:', error)
    setRenderError('Failed to render chart. Please try refreshing or selecting a different timeframe.')
    setIsLoading(false)
  }, [])

  // Chart configuration - TradingView-like toolbar
  const config = {
    responsive: true,
    displayModeBar: true,
    // Enable scroll zoom explicitly
    scrollZoom: true,
    editable: false,
    staticPlot: false,
    // Improve rendering performance for large datasets
    plotGlPixelRatio: 2,
    modeBarButtonsToAdd: [
      {
        name: 'Reset View',
        icon: {
          width: 857.1,
          height: 1000,
          path: 'm214 511h285v285h571v-571h-285v-285h-571v571z',
          transform: 'matrix(1 0 0 -1 0 850)'
        },
        click: (gd: any) => {
          const update = {
            'xaxis.autorange': true,
            'yaxis.autorange': true
          }
          // @ts-ignore
          Plotly.relayout(gd, update)
        }
      }
    ],
    modeBarButtons: [
      // Core zoom and pan tools
      ['zoom2d', 'pan2d'],
      // Zoom controls
      ['zoomIn2d', 'zoomOut2d', 'autoScale2d'],
      // Selection and reset
      ['select2d', 'resetScale2d'],
      // Download
      ['toImage']
    ],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `btc-strategy-chart-${source}-${format(new Date(), 'yyyy-MM-dd')}`,
      height: 800,
      width: 1400,
      scale: 2
    },
    // Enable double-click reset
    doubleClick: 'reset+autosize'
  }

  return (
    <ChartContainer>
      <ChartHeader>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            Bitcoin - {chartData.source?.toUpperCase() || source.toUpperCase()}
          </h3>
          {currentPriceInfo && (
            <PriceInfo>
              <PriceValue>${currentPriceInfo.price.toLocaleString()}</PriceValue>
              <PriceValue change={currentPriceInfo.change}>
                {currentPriceInfo.change > 0 ? '+' : ''}
                ${currentPriceInfo.change.toFixed(2)} ({currentPriceInfo.changePercent > 0 ? '+' : ''}
                {currentPriceInfo.changePercent.toFixed(2)}%)
              </PriceValue>
            </PriceInfo>
          )}
        </div>
        
        <TimeframeSelector>
          <TimeframeButton active>{chartData.timeframe}</TimeframeButton>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-secondary)', 
            marginLeft: '12px',
            opacity: 0.8 
          }}>
            💡 Click & drag to navigate history
          </div>
        </TimeframeSelector>
      </ChartHeader>

      <div style={{ height: `${height - 60}px`, position: 'relative' }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            color: 'var(--text-primary)',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '8px' }}>
              Loading {chartData.candles?.length || 0} candles...
            </div>
            {(chartData.candles?.length || 0) > 2000 && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Optimizing for better performance
              </div>
            )}
          </div>
        )}
        {renderError && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            color: 'var(--accent-red)',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px'
          }}>
            {renderError}
          </div>
        )}
        <Plot
          ref={plotRef}
          data={allTraces as any}
          layout={layout as any}
          config={config as any}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          onError={handlePlotError}
          onInitialized={(figure) => {
            setIsLoading(false)
            // Ensure pan mode is properly set
            if (figure && figure.on) {
              figure.on('plotly_relayout', (eventdata: any) => {
                // Handle pan/zoom events
                console.log('Chart navigation:', eventdata)
              })
            }
          }}
        />
        <LivePriceDisplay tradeSignals={tradeSignals} />
      </div>
    </ChartContainer>
  )
}

export default CandlestickChart