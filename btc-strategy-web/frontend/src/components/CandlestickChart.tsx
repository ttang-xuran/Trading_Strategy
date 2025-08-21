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

    // Group signals by type for different styling
    const entryLongSignals = tradeSignals.filter(signal => 
      signal.action.includes('ENTRY_LONG') || signal.action.includes('ENTRY_Long')
    )
    const entryShortSignals = tradeSignals.filter(signal => 
      signal.action.includes('ENTRY_SHORT') || signal.action.includes('ENTRY_Short')
    )
    const exitSignals = tradeSignals.filter(signal => 
      signal.action.includes('CLOSE') || signal.action.includes('Stop Loss')
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
          size: 12,
          color: '#238636',
          line: { width: 2, color: 'white' }
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
          size: 12,
          color: '#da3633',
          line: { width: 2, color: 'white' }
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
        y: exitSignals.map(s => s.price),
        mode: 'markers',
        type: 'scatter',
        name: 'Exit',
        marker: {
          symbol: 'square',
          size: 10,
          color: '#fd7e14',
          line: { width: 2, color: 'white' }
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

  // Chart layout configuration
  const layout: Partial<PlotlyLayout> = {
    title: `Bitcoin (BTC/USD) - ${source.toUpperCase()}`,
    xaxis: {
      title: 'Date',
      type: 'date',
      rangeslider: { visible: false },
      showgrid: true,
      gridcolor: '#30363d',
    },
    yaxis: {
      title: 'Price (USD)',
      side: 'right',
      showgrid: true,
      gridcolor: '#30363d',
    },
    plot_bgcolor: '#0d1117',
    paper_bgcolor: '#161b22',
    font: {
      color: '#f0f6fc',
      family: 'Segoe UI, sans-serif'
    },
    showlegend: true,
    legend: {
      x: 0,
      y: 1,
      bgcolor: 'rgba(22, 27, 34, 0.8)',
      bordercolor: '#30363d'
    },
    margin: { l: 0, r: 60, t: 60, b: 40 },
    height: height,
  }

  // Combine all traces
  const allTraces = candlestickTrace ? [candlestickTrace, ...tradeSignalTraces] : []

  // Chart configuration
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtons: [
      ['zoom2d', 'pan2d', 'select2d', 'lasso2d'],
      ['zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
      ['toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
    ],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `btc-chart-${source}-${format(new Date(), 'yyyy-MM-dd')}`,
      height: 600,
      width: 1200,
      scale: 1
    }
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
        />
      </div>
    </ChartContainer>
  )
}

export default CandlestickChart