/**
 * Live Bitcoin Price Display Component
 * Shows current BTC price and unrealized P&L for open positions
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { livePriceService, LivePriceData } from '../services/livePriceService'
import type { TradeSignal } from '../types/api'

interface Props {
  tradeSignals: TradeSignal[]
}

const PriceContainer = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 280px;
  backdrop-filter: blur(10px);
`

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
`

const PriceLabel = styled.span`
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  min-width: 80px;
`

const PriceValue = styled.span<{ color?: 'green' | 'red' | 'neutral' }>`
  color: ${props => 
    props.color === 'green' ? 'var(--accent-green)' :
    props.color === 'red' ? 'var(--accent-red)' :
    'var(--text-primary)'
  };
  font-size: 0.9rem;
  font-weight: 600;
  font-family: 'Courier New', monospace;
`

const RefreshButton = styled.button`
  background: var(--accent-blue);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: auto;

  &:hover {
    background: var(--accent-blue-hover, #1f6feb);
  }

  &:disabled {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }
`

const LastUpdate = styled.div`
  color: var(--text-secondary);
  font-size: 0.7rem;
  margin-top: 8px;
  text-align: center;
  border-top: 1px solid var(--border-primary);
  padding-top: 6px;
`

const LivePriceDisplay: React.FC<Props> = ({ tradeSignals }) => {
  const [livePrice, setLivePrice] = useState<LivePriceData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [openPosition, setOpenPosition] = useState<{
    direction: 'long' | 'short'
    entryPrice: number
    size: number
    entryDate: string
  } | null>(null)

  // Calculate current open position from trade signals
  const calculateOpenPosition = () => {
    if (!tradeSignals || tradeSignals.length === 0) return null

    // Find the last entry signal that hasn't been closed
    let position: typeof openPosition = null

    for (let i = tradeSignals.length - 1; i >= 0; i--) {
      const signal = tradeSignals[i]
      
      if (signal.action.toUpperCase().includes('ENTRY')) {
        const direction = signal.action.toUpperCase().includes('LONG') ? 'long' : 'short'
        position = {
          direction,
          entryPrice: signal.price,
          size: signal.size,
          entryDate: signal.timestamp
        }
        break
      } else if (signal.action.toUpperCase().includes('CLOSE')) {
        // Found a close before an entry, so no open position
        break
      }
    }

    return position
  }

  const fetchLivePrice = async () => {
    setIsRefreshing(true)
    try {
      const priceData = await livePriceService.getLiveBitcoinPrice()
      setLivePrice(priceData)
      
      // Calculate open position
      const position = calculateOpenPosition()
      setOpenPosition(position)
    } catch (error) {
      console.error('Failed to fetch live price:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch price on mount and set up auto-refresh
  useEffect(() => {
    fetchLivePrice()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLivePrice, 30000)
    return () => clearInterval(interval)
  }, [tradeSignals])

  const formatPrice = (price: number) => `$${price.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`

  const formatPercent = (percent: number) => 
    `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`

  const formatTime = (timestamp: string) => 
    new Date(timestamp).toLocaleTimeString()

  // Calculate unrealized P&L if we have an open position
  const unrealizedPnL = openPosition && livePrice 
    ? livePriceService.calculateUnrealizedPnL(
        openPosition.entryPrice,
        livePrice.price,
        openPosition.size,
        openPosition.direction
      )
    : null

  if (!livePrice) {
    return (
      <PriceContainer>
        <PriceRow>
          <PriceLabel>BTC Price:</PriceLabel>
          <PriceValue>Loading...</PriceValue>
        </PriceRow>
      </PriceContainer>
    )
  }

  return (
    <PriceContainer>
      <PriceRow>
        <PriceLabel>BTC Live:</PriceLabel>
        <PriceValue>{formatPrice(livePrice.price)}</PriceValue>
        <RefreshButton onClick={fetchLivePrice} disabled={isRefreshing}>
          {isRefreshing ? '...' : '↻'}
        </RefreshButton>
      </PriceRow>
      
      <PriceRow>
        <PriceLabel>24h Change:</PriceLabel>
        <PriceValue color={livePrice.changePercent24h >= 0 ? 'green' : 'red'}>
          {formatPercent(livePrice.changePercent24h)}
        </PriceValue>
      </PriceRow>

      {openPosition && unrealizedPnL && (
        <>
          <PriceRow>
            <PriceLabel>Position:</PriceLabel>
            <PriceValue color={openPosition.direction === 'long' ? 'green' : 'red'}>
              {openPosition.direction.toUpperCase()} @ {formatPrice(openPosition.entryPrice)}
            </PriceValue>
          </PriceRow>
          
          <PriceRow>
            <PriceLabel>Unrealized:</PriceLabel>
            <PriceValue color={unrealizedPnL.pnl >= 0 ? 'green' : 'red'}>
              {formatPrice(unrealizedPnL.pnl)} ({formatPercent(unrealizedPnL.pnlPercent)})
            </PriceValue>
          </PriceRow>
        </>
      )}

      <LastUpdate>
        Last updated: {formatTime(livePrice.timestamp)} ({livePrice.source})
      </LastUpdate>
    </PriceContainer>
  )
}

export default LivePriceDisplay