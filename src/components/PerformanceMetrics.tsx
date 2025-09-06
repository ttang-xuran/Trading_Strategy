/**
 * Performance Metrics Component
 * Displays key trading strategy performance indicators
 * Fixed FiBarChart3 import issue
 */

import React from 'react'
import styled from 'styled-components'
import { FiTrendingUp, FiTrendingDown, FiTarget, FiDollarSign, FiPercent, FiBarChart } from 'react-icons/fi'
import type { PerformanceMetrics as IPerformanceMetrics } from '../types/api'

interface Props {
  metrics: IPerformanceMetrics
}

const MetricsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  width: 100%;
`

const MetricCard = styled.div<{ variant?: 'positive' | 'negative' | 'neutral' }>`
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  ${props => {
    if (props.variant === 'positive') {
      return `
        border-left: 4px solid var(--accent-green);
        &:hover { border-color: var(--accent-green); }
      `
    } else if (props.variant === 'negative') {
      return `
        border-left: 4px solid var(--accent-red);
        &:hover { border-color: var(--accent-red); }
      `
    } else {
      return `
        border-left: 4px solid var(--accent-blue);
        &:hover { border-color: var(--accent-blue); }
      `
    }
  }}
  
  &:hover {
    background-color: var(--bg-tertiary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`

const MetricIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => props.color || 'var(--text-secondary)'};
`

const MetricTitle = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
`

const MetricValue = styled.div<{ color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.color || 'var(--text-primary)'};
  margin-bottom: 0.25rem;
`

const MetricSubtext = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted);
`

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.5rem;
`

const MetricSubvalue = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  
  .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: block;
  }
  
  .value {
    font-weight: 600;
    color: var(--text-primary);
  }
`

// Utility function to format numbers
const formatNumber = (num: number, decimals: number = 2): string => {
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M'
  } else if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K'
  }
  return num.toFixed(decimals)
}

const formatPercent = (num: number): string => {
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

const formatCurrency = (num: number): string => {
  return `$${formatNumber(num)}`
}

// Custom formatter for Average Trade - always show in K format if >= 1000
const formatTradeValue = (num: number): string => {
  if (Math.abs(num) >= 1e3) {
    return `$${(num / 1e3).toFixed(1)}K`
  }
  return `$${num.toFixed(2)}`
}

const PerformanceMetrics: React.FC<Props> = ({ metrics }) => {
  const isPositiveReturn = metrics.total_return_percent > 0
  const isPositiveProfitFactor = metrics.profit_factor > 1
  const isLowDrawdown = metrics.max_drawdown_percent < 20

  return (
    <MetricsContainer>
      {/* Total Return */}
      <MetricCard variant={isPositiveReturn ? 'positive' : 'negative'}>
        <MetricHeader>
          <MetricIcon color={isPositiveReturn ? 'var(--accent-green)' : 'var(--accent-red)'}>
            {isPositiveReturn ? <FiTrendingUp /> : <FiTrendingDown />}
          </MetricIcon>
          <MetricTitle>Total Return</MetricTitle>
        </MetricHeader>
        <MetricValue color={isPositiveReturn ? 'var(--accent-green)' : 'var(--accent-red)'}>
          {formatPercent(metrics.total_return_percent)}
        </MetricValue>
        <MetricSubtext>
          Net Profit: {formatCurrency(metrics.net_profit)}
        </MetricSubtext>
      </MetricCard>

      {/* Total Trades */}
      <MetricCard variant="neutral">
        <MetricHeader>
          <MetricIcon color="var(--accent-blue)">
            <FiBarChart />
          </MetricIcon>
          <MetricTitle>Total Trades</MetricTitle>
        </MetricHeader>
        <MetricValue>{metrics.total_trades}</MetricValue>
        <MetricGrid>
          <MetricSubvalue>
            <span className="label">Winners</span>
            <span className="value text-green">{metrics.winning_trades}</span>
          </MetricSubvalue>
          <MetricSubvalue>
            <span className="label">Losers</span>
            <span className="value text-red">{metrics.losing_trades}</span>
          </MetricSubvalue>
        </MetricGrid>
      </MetricCard>

      {/* Win Rate */}
      <MetricCard variant={metrics.win_rate_percent > 50 ? 'positive' : 'negative'}>
        <MetricHeader>
          <MetricIcon color="var(--accent-purple)">
            <FiTarget />
          </MetricIcon>
          <MetricTitle>Win Rate</MetricTitle>
        </MetricHeader>
        <MetricValue color="var(--accent-purple)">
          {formatPercent(metrics.win_rate_percent)}
        </MetricValue>
        <MetricSubtext>
          {metrics.winning_trades} / {metrics.total_trades} trades
        </MetricSubtext>
      </MetricCard>

      {/* Max Drawdown */}
      <MetricCard variant={isLowDrawdown ? 'positive' : 'negative'}>
        <MetricHeader>
          <MetricIcon color={isLowDrawdown ? 'var(--accent-green)' : 'var(--accent-red)'}>
            <FiTrendingDown />
          </MetricIcon>
          <MetricTitle>Max Drawdown</MetricTitle>
        </MetricHeader>
        <MetricValue color={isLowDrawdown ? 'var(--accent-green)' : 'var(--accent-red)'}>
          -{formatPercent(Math.abs(metrics.max_drawdown_percent)).slice(1)}
        </MetricValue>
        <MetricSubtext>
          Peak: {formatCurrency(metrics.peak_equity)}
        </MetricSubtext>
      </MetricCard>

      {/* Profit Factor */}
      <MetricCard variant={isPositiveProfitFactor ? 'positive' : 'negative'}>
        <MetricHeader>
          <MetricIcon color={isPositiveProfitFactor ? 'var(--accent-green)' : 'var(--accent-red)'}>
            <FiPercent />
          </MetricIcon>
          <MetricTitle>Profit Factor</MetricTitle>
        </MetricHeader>
        <MetricValue color={isPositiveProfitFactor ? 'var(--accent-green)' : 'var(--accent-red)'}>
          {metrics.profit_factor.toFixed(2)}
        </MetricValue>
        <MetricGrid>
          <MetricSubvalue>
            <span className="label">Gross Profit</span>
            <span className="value text-green">{formatCurrency(metrics.gross_profit)}</span>
          </MetricSubvalue>
          <MetricSubvalue>
            <span className="label">Gross Loss</span>
            <span className="value text-red">{formatCurrency(metrics.gross_loss)}</span>
          </MetricSubvalue>
        </MetricGrid>
      </MetricCard>

      {/* Average Trade */}
      <MetricCard variant={metrics.average_trade > 0 ? 'positive' : 'negative'}>
        <MetricHeader>
          <MetricIcon color="var(--accent-orange)">
            <FiDollarSign />
          </MetricIcon>
          <MetricTitle>Average Trade</MetricTitle>
        </MetricHeader>
        <MetricValue color="var(--accent-orange)">
          {formatTradeValue(metrics.average_trade)}
        </MetricValue>
        <MetricGrid>
          <MetricSubvalue>
            <span className="label">Avg Winner</span>
            <span className="value text-green">{formatTradeValue(metrics.average_winner)}</span>
          </MetricSubvalue>
          <MetricSubvalue>
            <span className="label">Avg Loser</span>
            <span className="value text-red">{formatTradeValue(metrics.average_loser)}</span>
          </MetricSubvalue>
        </MetricGrid>
      </MetricCard>
    </MetricsContainer>
  )
}

export default PerformanceMetrics