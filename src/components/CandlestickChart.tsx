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
  background: linear-gradient(145deg, #0d1117 0%, #161b22 100%);
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  
  /* Professional trading platform styling */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #58a6ff, transparent);
    opacity: 0.3;
  }
`

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #21262d;
  background: linear-gradient(135deg, #161b22 0%, #1c2128 100%);
  backdrop-filter: blur(12px);
  
  /* Professional header styling */
  h3 {
    margin: 0;
    color: #f0f6fc;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  /* Subtle gradient border */
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #30363d, transparent);
  }
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
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid ${props => props.active ? '#1f6feb' : '#30363d'};
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #1f6feb 0%, #0969da 100%)' 
    : 'linear-gradient(135deg, #21262d 0%, #30363d 100%)'
  };
  color: ${props => props.active ? '#ffffff' : '#8b949e'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.01em;
  
  /* Professional button styling */
  box-shadow: ${props => props.active 
    ? '0 4px 12px rgba(31, 111, 235, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)' 
    : '0 2px 4px rgba(0, 0, 0, 0.1)'
  };
  
  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #0969da 0%, #0550ae 100%)' 
      : 'linear-gradient(135deg, #30363d 0%, #424a53 100%)'
    };
    transform: translateY(-1px);
    box-shadow: ${props => props.active 
      ? '0 6px 16px rgba(31, 111, 235, 0.4), 0 4px 8px rgba(0, 0, 0, 0.15)' 
      : '0 4px 8px rgba(0, 0, 0, 0.15)'
    };
  }
  
  &:active {
    transform: translateY(0);
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
      // ALL timeframe - FORCE maximum thickness
      return {
        candleWidth: 0.98,
        whiskerWidth: 0.9,  // Thick but not maximum to prevent overlap
        bodyWidth: 0.95,    // NEW: Direct control of candlestick body width
        optimization: true,
        tickDensity: 6
      }
    } else if (candleCount > 1000) {
      // 1Y timeframe - very thick candles
      return {
        candleWidth: 0.95,
        whiskerWidth: 0.85,
        bodyWidth: 0.9,
        optimization: true,
        tickDensity: 8
      }
    } else if (candleCount > 500) {
      // 6M timeframe - thick candles
      return {
        candleWidth: 0.9,
        whiskerWidth: 0.8,
        bodyWidth: 0.85,
        optimization: false,
        tickDensity: 12
      }
    } else {
      // Shorter timeframes - standard thick width
      return {
        candleWidth: 0.85,
        whiskerWidth: 0.75,
        bodyWidth: 0.8,
        optimization: false,
        tickDensity: 18
      }
    }
  }, [])

  // PROFESSIONAL data optimization for institutional-grade performance
  const getOptimizedCandles = useCallback((candles: typeof chartData.candles) => {
    if (!candles || candles.length <= 500) {
      // Small datasets: no optimization needed
      return candles
    }

    // PERFORMANCE-CRITICAL: Adaptive data reduction for compressed timeframes
    if (candles.length > 5000) {
      // EXTREME datasets (10Y+ daily data): Smart sampling preserving key points
      const targetPoints = 2500
      const sampleRate = Math.ceil(candles.length / targetPoints)
      
      const optimizedCandles: typeof candles = []
      let lastIncluded = -Infinity
      
      candles.forEach((candle, index) => {
        // Always include first and last candles
        if (index === 0 || index === candles.length - 1) {
          optimizedCandles.push(candle)
          lastIncluded = index
          return
        }
        
        // Include candles at regular intervals OR significant price movements
        const shouldIncludeInterval = index % sampleRate === 0
        const significantMove = index > 0 && Math.abs(candle.close - candles[index - 1].close) / candles[index - 1].close > 0.05 // 5% move
        const timeSinceLastIncluded = index - lastIncluded
        
        if (shouldIncludeInterval || significantMove || timeSinceLastIncluded > sampleRate * 2) {
          optimizedCandles.push(candle)
          lastIncluded = index
        }
      })
      
      console.log(`Optimized ${candles.length} candles to ${optimizedCandles.length} for maximum performance`)
      return optimizedCandles
    }

    // LARGE datasets (2-5K candles): Weekly aggregation for ALL/YTD timeframes
    if (candles.length > 2000) {
      const weeklyCandles: typeof candles = []
      const aggregationSize = Math.ceil(candles.length / 1500) // Target ~1500 candles
      
      for (let i = 0; i < candles.length; i += aggregationSize) {
        const group = candles.slice(i, i + aggregationSize)
        if (group.length > 0) {
          // Professional OHLC aggregation
          const aggregatedCandle = {
            timestamp: group[group.length - 1].timestamp, // Use last timestamp
            open: group[0].open,
            high: Math.max(...group.map(c => c.high)),
            low: Math.min(...group.map(c => c.low)),
            close: group[group.length - 1].close,
            volume: group.reduce((sum, c) => sum + (c.volume || 0), 0)
          }
          weeklyCandles.push(aggregatedCandle)
        }
      }
      
      console.log(`Aggregated ${candles.length} daily candles to ${weeklyCandles.length} weekly candles`)
      return weeklyCandles
    }

    // MEDIUM datasets (500-2K candles): Smart decimation
    if (candles.length > 1000) {
      const decimationRate = Math.ceil(candles.length / 800) // Target ~800 candles
      const decimatedCandles: typeof candles = []
      
      candles.forEach((candle, index) => {
        if (index % decimationRate === 0 || index === candles.length - 1) {
          decimatedCandles.push(candle)
        }
      })
      
      return decimatedCandles
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
      // FORCE MAXIMUM THICKNESS FOR ALL TIMEFRAMES
      increasing: { 
        line: { color: '#26a69a', width: 8 },
        fillcolor: '#26a69a'
      },
      decreasing: { 
        line: { color: '#ef5350', width: 8 },
        fillcolor: '#ef5350'
      },
      line: { width: 8 },
      whiskerwidth: 1.0,
      // WORKING HOVER TOOLTIPS
      hovertemplate: '<b>Date: %{x}</b><br>Open: $%{open:,.2f}<br>High: $%{high:,.2f}<br>Low: $%{low:,.2f}<br>Close: $%{close:,.2f}<extra></extra>',
      hoverinfo: 'all'
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

    // PROFESSIONAL Entry Long signals (Bright green up arrows)
    if (entryLongSignals.length > 0) {
      traces.push({
        x: entryLongSignals.map(s => s.timestamp),
        y: entryLongSignals.map(s => s.price),
        mode: 'markers',
        type: 'scatter',
        name: 'Long Entry',
        marker: {
          symbol: 'triangle-up',
          size: 16,
          color: '#00C851',  // Professional trading green
          line: { width: 2, color: '#ffffff' },
          opacity: 0.9
        },
        text: entryLongSignals.map(s => 
          `<b>LONG ENTRY</b><br>` +
          `<span style="color:#00C851">▲ Price: $${s.price.toLocaleString()}</span><br>` +
          `Size: ${s.size.toFixed(4)} BTC<br>` +
          `${s.comment}`
        ),
        hovertemplate: '%{text}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    // PROFESSIONAL Entry Short signals (Bright red down arrows)
    if (entryShortSignals.length > 0) {
      traces.push({
        x: entryShortSignals.map(s => s.timestamp),
        y: entryShortSignals.map(s => s.price),
        mode: 'markers',
        type: 'scatter',
        name: 'Short Entry',
        marker: {
          symbol: 'triangle-down',
          size: 16,
          color: '#FF4444',  // Professional trading red
          line: { width: 2, color: '#ffffff' },
          opacity: 0.9
        },
        text: entryShortSignals.map(s => 
          `<b>SHORT ENTRY</b><br>` +
          `<span style="color:#FF4444">▼ Price: $${s.price.toLocaleString()}</span><br>` +
          `Size: ${s.size.toFixed(4)} BTC<br>` +
          `${s.comment}`
        ),
        hovertemplate: '%{text}<extra></extra>',
        xaxis: 'x',
        yaxis: 'y',
      })
    }

    // PROFESSIONAL Exit signals (Yellow close markers)
    if (exitSignals.length > 0) {
      traces.push({
        x: exitSignals.map(s => s.timestamp),
        // Smart positioning to avoid overlap with entry signals
        y: exitSignals.map(s => {
          const sameDate = [...entryLongSignals, ...entryShortSignals].some(entry => 
            entry.timestamp === s.timestamp
          )
          if (sameDate) {
            return s.price * 0.95  // Position 5% below to avoid overlap
          }
          return s.price
        }),
        mode: 'markers',
        type: 'scatter',
        name: 'Exit',
        marker: {
          symbol: 'x-thin',
          size: 14,
          color: '#FFD700',  // Professional gold color
          line: { width: 3, color: '#333333' },
          opacity: 0.9
        },
        text: exitSignals.map(s => {
          const pnl = s.pnl || 0
          const pnlColor = pnl >= 0 ? '#00C851' : '#FF4444'
          const pnlSymbol = pnl >= 0 ? '↑' : '↓'
          
          return `<b>EXIT</b><br>` +
            `<span style="color:#FFD700">× Price: $${s.price.toLocaleString()}</span><br>` +
            `Size: ${Math.abs(s.size).toFixed(4)} BTC<br>` +
            (s.pnl ? `<span style="color:${pnlColor}">${pnlSymbol} P&L: $${pnl.toLocaleString()}</span><br>` : '') +
            `${s.comment}`
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

  // Chart layout configuration - Professional TradingView style with optimized performance
  const layout: Partial<PlotlyLayout> = useMemo(() => {
    const settings = renderingSettings
    const candleCount = chartData.candles?.length || 0
    
    return {
      title: {
        text: `Bitcoin (BTC/USD) - ${source.toUpperCase()} [${(optimizedCandles?.length || candleCount).toLocaleString()}${optimizedCandles && optimizedCandles.length !== candleCount ? '/' + candleCount.toLocaleString() : ''} candles]`,
        font: { size: 16, color: '#f0f6fc' },
        x: 0.05
      },
      xaxis: {
        title: { text: 'Date', font: { size: 12 } },
        type: 'date',
        rangeslider: { visible: false }, // Clean professional look
        showgrid: true,
        gridcolor: '#21262d',
        gridwidth: 1,
        zeroline: false,
        showspikes: true,
        spikecolor: '#58a6ff',
        spikesnap: 'cursor',
        spikemode: 'across+toaxis',
        spikethickness: 1,
        spikedash: 'solid',
        // DEFINITIVE FIX: Optimized tick density for compressed data
        nticks: Math.max(6, Math.min(20, settings.tickDensity)),
        // PROFESSIONAL NAVIGATION: Full pan/zoom control
        fixedrange: false,
        autorange: true,
        // Smart initial range for better performance
        range: candleCount > 1000 ? [
          new Date(dataDateRange.end.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          dataDateRange.end.toISOString()
        ] : undefined,
        // ENHANCED range selector for professional navigation
        rangeselector: {
          visible: true,
          bgcolor: 'rgba(13, 17, 23, 0.9)',
          bordercolor: '#30363d',
          borderwidth: 1,
          x: 0.01,
          y: 1.02,
          font: { size: 11, color: '#f0f6fc' },
          buttons: [
            { count: 30, label: '1M', step: 'day', stepmode: 'backward' },
            { count: 90, label: '3M', step: 'day', stepmode: 'backward' },
            { count: 180, label: '6M', step: 'day', stepmode: 'backward' },
            { label: 'YTD', step: 'year', stepmode: 'todate' },
            { count: 365, label: '1Y', step: 'day', stepmode: 'backward' },
            { step: 'all', label: 'All' }
          ],
          active: candleCount > 1000 ? 2 : -1  // Auto-select 6M for large datasets
        },
        // Professional tick formatting
        tickformat: '%b %d\n%Y',
        tickangle: 0,
        tickfont: { size: 10, color: '#8b949e' }
      },
      yaxis: {
        title: { text: 'Price (USD)', font: { size: 12 } },
        side: 'right',
        showgrid: true,
        gridcolor: '#21262d',
        gridwidth: 1,
        zeroline: false,
        showspikes: true,
        spikecolor: '#58a6ff',
        spikesnap: 'cursor',
        spikemode: 'across+toaxis',
        spikethickness: 1,
        spikedash: 'solid',
        tickformat: '$,.0f',
        // PROFESSIONAL Y-AXIS: Full zoom control with smart margins
        fixedrange: false,
        autorange: true,
        automargin: true,
        tickfont: { size: 10, color: '#8b949e' }
      },
      // PROFESSIONAL dark theme matching TradingView
      plot_bgcolor: '#0d1117',
      paper_bgcolor: '#161b22',
      font: {
        color: '#f0f6fc',
        family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        size: 12
      },
      // Clean legend positioning
      showlegend: true,
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(13, 17, 23, 0.8)',
        bordercolor: '#30363d',
        borderwidth: 1,
        font: { size: 10, color: '#8b949e' }
      },
      // Optimized margins for professional appearance
      margin: { l: 10, r: 70, t: 90, b: 50 },
      height: height,
      // SIMPLE WORKING DRAG AND ZOOM
      dragmode: 'pan',
      hovermode: 'closest',
      scrollZoom: true,
      staticPlot: false,
      // Global hover styling for consistency
      hoverlabel: {
        bgcolor: 'rgba(13, 17, 23, 0.95)',
        bordercolor: '#30363d',
        font: { color: '#f0f6fc', size: 12, family: 'monospace' },
        align: 'left'
      },
      selectdirection: 'diagonal',
      // PERFORMANCE OPTIMIZATION for large datasets
      ...(candleCount > 2000 && {
        // Additional optimizations for very large datasets
        transition: { duration: 100, easing: 'linear' },
        autosize: true
      })
    }
  }, [source, height, dataDateRange, chartData.candles, renderingSettings])

  // Process boundary lines (upper and lower breakout levels)
  const boundaryTraces = useMemo(() => {
    const traces: any[] = []
    
    
    // PROFESSIONAL Upper boundary line (resistance level)
    if (chartData.upper_boundary && chartData.upper_boundary.length > 0) {
      traces.push({
        x: chartData.upper_boundary.map(point => (point as any).timestamp || (point as any).x),
        y: chartData.upper_boundary.map(point => (point as any).value || (point as any).y),
        mode: 'lines',
        type: 'scatter',
        name: 'Resistance',
        line: {
          color: '#FF6B6B',
          width: 2,
          dash: '4px,4px',  // Professional dashed line
          shape: 'spline'   // Smooth curves
        },
        hovertemplate: '<b>Resistance Level</b><br>Price: $%{y:,.2f}<extra></extra>',
        opacity: 0.8,
        xaxis: 'x',
        yaxis: 'y',
      })
    }
    
    // PROFESSIONAL Lower boundary line (support level)
    if (chartData.lower_boundary && chartData.lower_boundary.length > 0) {
      traces.push({
        x: chartData.lower_boundary.map(point => (point as any).timestamp || (point as any).x),
        y: chartData.lower_boundary.map(point => (point as any).value || (point as any).y),
        mode: 'lines',
        type: 'scatter',
        name: 'Support',
        line: {
          color: '#51CF66',
          width: 2,
          dash: '4px,4px',  // Professional dashed line
          shape: 'spline'   // Smooth curves
        },
        hovertemplate: '<b>Support Level</b><br>Price: $%{y:,.2f}<extra></extra>',
        opacity: 0.8,
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

  // PROFESSIONAL progressive rendering with performance monitoring
  useEffect(() => {
    const candleCount = chartData.candles?.length || 0
    const optimizedCount = optimizedCandles?.length || 0
    
    if (candleCount > 5000) {
      setIsLoading(true)
      // Extended processing time for extreme datasets (10Y+ daily)
      const processingTime = Math.min(500, candleCount / 10) // Adaptive timing
      const timer = setTimeout(() => {
        setIsLoading(false)
        setRenderError(null)
        console.log(`Rendered ${optimizedCount} optimized candles from ${candleCount} raw candles`)
      }, processingTime)
      return () => clearTimeout(timer)
    } else if (candleCount > 2000) {
      setIsLoading(true)
      // Processing time for large datasets (ALL/YTD timeframes)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setRenderError(null)
        console.log(`Rendered ${optimizedCount} weekly candles from ${candleCount} daily candles`)
      }, 200)
      return () => clearTimeout(timer)
    } else if (candleCount > 1000) {
      setIsLoading(true)
      // Quick processing for 1Y timeframe
      const timer = setTimeout(() => {
        setIsLoading(false)
        setRenderError(null)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      // Instant rendering for smaller datasets
      setIsLoading(false)
      setRenderError(null)
    }
  }, [chartData.candles?.length, optimizedCandles?.length])

  // Error handling for chart rendering
  const handlePlotError = useCallback((error: any) => {
    console.error('Chart rendering error:', error)
    setRenderError('Failed to render chart. Please try refreshing or selecting a different timeframe.')
    setIsLoading(false)
  }, [])

  // PROFESSIONAL CONFIG: Maximum performance + full interaction capability
  const config = useMemo(() => ({
    responsive: true,
    displayModeBar: true,
    // ENHANCED NAVIGATION: Full professional control
    scrollZoom: true,
    editable: false,
    staticPlot: false,
    doubleClick: 'reset+autosize',
    // PROFESSIONAL TOOLBAR: Essential trading tools only
    modeBarButtonsToRemove: [
      'select2d', 'lasso2d',  // Remove selection tools
      'toggleSpikelines'      // Remove spike toggle (always on)
    ],
    modeBarButtonsToAdd: [
      'drawline',    // Technical analysis tools
      'drawopenpath'
    ],
    displaylogo: false,
    // ENHANCED export options for professional use
    toImageButtonOptions: {
      format: 'png',
      filename: `btc-strategy-chart-${source}-${format(new Date(), 'yyyy-MM-dd-HHmm')}`,
      height: 900,
      width: 1600,
      scale: 2
    },
    // PERFORMANCE OPTIMIZATION
    plotGlPixelRatio: 2,
    // Additional professional features
    showTips: true,
    locale: 'en-US'
  }), [source])

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
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚡ Drag to pan • Scroll to zoom • Double-click to reset</span>
            {optimizedCandles && chartData.candles && optimizedCandles.length !== chartData.candles.length && (
              <span style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                backgroundColor: '#1f6feb', 
                borderRadius: '3px', 
                color: 'white' 
              }}>
                Optimized: {optimizedCandles.length}/{chartData.candles.length}
              </span>
            )}
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
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'rgba(13, 17, 23, 0.9)',
            border: '1px solid #30363d',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 600 }}>
              ⚡ Processing {chartData.candles?.length?.toLocaleString() || 0} candles...
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {(chartData.candles?.length || 0) > 5000 && 'Applying extreme optimization for maximum performance'}
              {(chartData.candles?.length || 0) > 2000 && (chartData.candles?.length || 0) <= 5000 && 'Aggregating to weekly candles for smooth navigation'}
              {(chartData.candles?.length || 0) > 1000 && (chartData.candles?.length || 0) <= 2000 && 'Optimizing for 1Y+ timeframe rendering'}
            </div>
            {optimizedCandles && chartData.candles && optimizedCandles.length !== chartData.candles.length && (
              <div style={{ fontSize: '11px', color: '#58a6ff' }}>
                Optimized to {optimizedCandles.length.toLocaleString()} data points
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
            // PROFESSIONAL initialization with enhanced event handling
            if (figure && figure.on) {
              // Enhanced pan/zoom event handling for performance monitoring
              figure.on('plotly_relayout', (eventdata: any) => {
                if (eventdata['xaxis.range[0]'] || eventdata['yaxis.range[0]']) {
                  console.log('Chart navigation - Range updated:', {
                    xRange: [eventdata['xaxis.range[0]'], eventdata['xaxis.range[1]']],
                    yRange: [eventdata['yaxis.range[0]'], eventdata['yaxis.range[1]']],
                    candleCount: chartData.candles?.length
                  })
                }
              })
              
              // Handle hover events for performance
              figure.on('plotly_hover', () => {
                // Optimized hover handling
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