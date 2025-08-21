/**
 * Equity Curve Component
 * Shows portfolio value over time with drawdown visualization
 */

import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'
import styled from 'styled-components'
import { format } from 'date-fns'
import type { EquityCurve as IEquityCurve } from '../types/api'

interface Props {
  equityCurve: IEquityCurve
  height?: number
}

const EquityContainer = styled.div`
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
`

const EquityHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  background-color: var(--bg-tertiary);
`

const HeaderStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
`

const StatItem = styled.div`
  text-align: center;
  
  .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: block;
    margin-bottom: 2px;
  }
  
  .value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  &.positive .value {
    color: var(--accent-green);
  }
  
  &.negative .value {
    color: var(--accent-red);
  }
`

const EquityCurve: React.FC<Props> = ({ equityCurve, height = 300 }) => {
  // Prepare equity curve data
  const equityData = useMemo(() => {
    if (!equityCurve.equity_points || equityCurve.equity_points.length === 0) {
      return { equityTrace: null, drawdownTrace: null }
    }

    const dates = equityCurve.equity_points.map(point => point.date)
    const equityValues = equityCurve.equity_points.map(point => point.equity)
    const drawdownValues = equityCurve.equity_points.map(point => point.drawdown_percent)

    // Equity curve trace
    const equityTrace = {
      x: dates,
      y: equityValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Portfolio Value',
      line: {
        color: '#2f81f7',
        width: 2
      },
      fill: 'tonexty',
      fillcolor: 'rgba(47, 129, 247, 0.1)',
      hovertemplate: 'Date: %{x}<br>Equity: $%{y:,.0f}<extra></extra>',
      yaxis: 'y'
    }

    // Drawdown trace (on secondary y-axis)
    const drawdownTrace = {
      x: dates,
      y: drawdownValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Drawdown',
      line: {
        color: '#da3633',
        width: 1
      },
      fill: 'tonexty',
      fillcolor: 'rgba(218, 54, 51, 0.2)',
      hovertemplate: 'Date: %{x}<br>Drawdown: %{y:.2f}%<extra></extra>',
      yaxis: 'y2'
    }

    return { equityTrace, drawdownTrace }
  }, [equityCurve])

  // Chart layout
  const layout = {
    title: {
      text: `Equity Curve - ${equityCurve.source?.toUpperCase() || 'Portfolio'}`,
      font: { color: '#f0f6fc', size: 16 }
    },
    xaxis: {
      title: 'Date',
      type: 'date' as const,
      showgrid: true,
      gridcolor: '#30363d',
      color: '#f0f6fc'
    },
    yaxis: {
      title: 'Portfolio Value ($)',
      side: 'left' as const,
      showgrid: true,
      gridcolor: '#30363d',
      color: '#f0f6fc'
    },
    yaxis2: {
      title: 'Drawdown (%)',
      side: 'right' as const,
      overlaying: 'y' as const,
      showgrid: false,
      color: '#f0f6fc',
      range: [Math.min(-equityCurve.max_drawdown_percent * 1.2, -5), 5]
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
    margin: { l: 60, r: 60, t: 60, b: 40 },
    height: height,
  }

  // Chart configuration
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtons: [
      ['zoom2d', 'pan2d', 'select2d'],
      ['zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
      ['toggleSpikelines', 'hoverClosestCartesian'],
    ],
    displaylogo: false,
  }

  // Calculate performance statistics
  const totalReturn = ((equityCurve.final_equity / equityCurve.initial_equity) - 1) * 100
  const absoluteReturn = equityCurve.final_equity - equityCurve.initial_equity

  // Prepare traces array
  const traces = []
  if (equityData.equityTrace) traces.push(equityData.equityTrace)
  if (equityData.drawdownTrace) traces.push(equityData.drawdownTrace)

  return (
    <EquityContainer>
      <EquityHeader>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          Portfolio Performance
        </h3>
        
        <HeaderStats>
          <StatItem className={totalReturn > 0 ? 'positive' : 'negative'}>
            <span className="label">Total Return</span>
            <span className="value">
              {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(1)}%
            </span>
          </StatItem>
          
          <StatItem className={absoluteReturn > 0 ? 'positive' : 'negative'}>
            <span className="label">Absolute Return</span>
            <span className="value">
              ${absoluteReturn.toLocaleString()}
            </span>
          </StatItem>
          
          <StatItem>
            <span className="label">Initial Capital</span>
            <span className="value">
              ${equityCurve.initial_equity.toLocaleString()}
            </span>
          </StatItem>
          
          <StatItem>
            <span className="label">Final Value</span>
            <span className="value">
              ${equityCurve.final_equity.toLocaleString()}
            </span>
          </StatItem>
          
          <StatItem>
            <span className="label">Peak Value</span>
            <span className="value">
              ${equityCurve.peak_equity.toLocaleString()}
            </span>
          </StatItem>
          
          <StatItem className="negative">
            <span className="label">Max Drawdown</span>
            <span className="value">
              -{equityCurve.max_drawdown_percent.toFixed(1)}%
            </span>
          </StatItem>
        </HeaderStats>
      </EquityHeader>

      <div style={{ height: `${height}px` }}>
        {traces.length > 0 ? (
          <Plot
            data={traces}
            layout={layout}
            config={config}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        ) : (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'var(--text-muted)'
            }}
          >
            No equity curve data available
          </div>
        )}
      </div>
    </EquityContainer>
  )
}

export default EquityCurve