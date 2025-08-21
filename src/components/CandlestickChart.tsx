/**
 * Candlestick Chart Component
 * Interactive Bitcoin price chart with trade signals, similar to TradingView
 */

import React, { useMemo, useEffect, useRef } from 'react'
import Plot from 'react-plotly.js'
import styled from 'styled-components'
import { format } from 'date-fns'
import type { ChartData, TradeSignal, PlotlyTrace, PlotlyLayout } from '../types/api'

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

  // Process candlestick data
  const candlestickTrace = useMemo(() => {
    if (!chartData.candles || chartData.candles.length === 0) {
      return null
    }

    const dates = chartData.candles.map(candle => candle.timestamp)
    const opens = chartData.candles.map(candle => candle.open)
    const highs = chartData.candles.map(candle => candle.high)
    const lows = chartData.candles.map(candle => candle.low)
    const closes = chartData.candles.map(candle => candle.close)

    return {
      x: dates,
      open: opens,
      high: highs,
      low: lows,
      close: closes,
      type: 'candlestick' as const,
      name: 'BTC/USD',
      increasing: { line: { color: '#238636' } },
      decreasing: { line: { color: '#da3633' } },
      xaxis: 'x',
      yaxis: 'y',
    }
  }, [chartData])

  // Process trade signals as scatter points
  const tradeSignalTraces = useMemo(() => {
    if (!tradeSignals || tradeSignals.length === 0) {
      return []
    }

    // Debug: Log the last 3 signals to understand what's being processed
    console.log('Last 3 trade signals:', tradeSignals.slice(-3))

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

    // Debug: Log filtered signals
    console.log('Entry Long signals:', entryLongSignals.length, entryLongSignals.slice(-2))
    console.log('Entry Short signals:', entryShortSignals.length, entryShortSignals.slice(-2))  
    console.log('Exit signals:', exitSignals.length, exitSignals.slice(-2))

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
        // Offset exit signals slightly to avoid overlap with entry signals on same date
        x: exitSignals.map(s => {
          const date = new Date(s.timestamp)
          date.setHours(date.getHours() + 6) // Offset by 6 hours to avoid overlap
          return date.toISOString()
        }),
        y: exitSignals.map(s => s.price),
        mode: 'markers',
        type: 'scatter',
        name: 'Exit',
        marker: {
          symbol: 'x',
          size: 18,
          color: '#ffff00',
          line: { width: 3, color: '#000000' }
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

    const latest = chartData.candles[chartData.candles.length - 1]
    const previous = chartData.candles.length > 1 ? chartData.candles[chartData.candles.length - 2] : null
    
    const change = previous ? latest.close - previous.close : 0
    const changePercent = previous ? (change / previous.close) * 100 : 0

    return {
      price: latest.close,
      change,
      changePercent,
      volume: latest.volume,
      high: latest.high,
      low: latest.low,
      open: latest.open
    }
  }, [chartData])

  // Calculate data date range for proper range selector
  const dataDateRange = useMemo(() => {
    if (!chartData.candles || chartData.candles.length === 0) {
      return { start: new Date(), end: new Date() }
    }
    
    const dates = chartData.candles.map(candle => new Date(candle.timestamp))
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    }
  }, [chartData.candles])

  // Chart layout configuration - TradingView style
  const layout: Partial<PlotlyLayout> = {
    title: `Bitcoin (BTC/USD) - ${source.toUpperCase()}`,
    xaxis: {
      title: 'Date',
      type: 'date',
      rangeslider: { visible: false }, // Keep rangeslider hidden for cleaner look
      showgrid: true,
      gridcolor: '#30363d',
      gridwidth: 1,
      zeroline: false,
      showspikes: true,
      spikecolor: '#f0f6fc',
      spikesnap: 'cursor',
      spikemode: 'across',
      spikethickness: 1,
      // Set default range to 6 months from latest data
      range: [
        new Date(dataDateRange.end.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dataDateRange.end.toISOString().split('T')[0]
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
      gridwidth: 1,
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
      borderwidth: 1,
      font: { size: 11 }
    },
    margin: { l: 0, r: 60, t: 80, b: 40 },
    height: height,
    // Enable crossfilter-style interactions  
    dragmode: 'pan', // Default to pan mode for click-and-drag behavior like TradingView
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'rgba(22, 27, 34, 0.95)',
      bordercolor: '#30363d',
      font: { color: '#f0f6fc' }
    },
    // Additional zoom settings
    selectdirection: 'diagonal'
  }

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

  // Chart configuration - TradingView-like toolbar
  const config = {
    responsive: true,
    displayModeBar: true,
    // Enable scroll zoom explicitly
    scrollZoom: true,
    editable: false,
    staticPlot: false,
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
        </TimeframeSelector>
      </ChartHeader>

      <div style={{ height: `${height - 60}px` }}>
        <Plot
          ref={plotRef}
          data={allTraces}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          onInitialized={(figure) => {
            // Enable scroll zoom after initialization
            if (plotRef.current && plotRef.current.el) {
              plotRef.current.el.on('plotly_relayout', (eventdata: any) => {
                // Handle zoom/pan events if needed
              })
            }
          }}
        />
      </div>
    </ChartContainer>
  )
}

export default CandlestickChart