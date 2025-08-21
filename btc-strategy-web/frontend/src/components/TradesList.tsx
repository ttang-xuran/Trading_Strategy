/**
 * Trades List Component
 * Displays detailed list of all trades with sorting and filtering
 */

import React, { useState, useMemo } from 'react'
import styled from 'styled-components'
import { format } from 'date-fns'
import { FiArrowUp, FiArrowDown, FiSearch, FiFilter } from 'react-icons/fi'
import type { TradeSignal } from '../types/api'

interface Props {
  trades: TradeSignal[]
}

const TradesContainer = styled.div`
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
`

const TradesHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 300px;
`

const SearchInput = styled.input`
  flex: 1;
  padding: 6px 12px;
  font-size: 0.875rem;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: var(--text-primary);
  
  &::placeholder {
    color: var(--text-muted);
  }
  
  &:focus {
    outline: none;
    border-color: var(--accent-blue);
  }
`

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  font-size: 0.875rem;
  background-color: ${props => props.active ? 'var(--accent-blue)' : 'var(--bg-tertiary)'};
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--accent-blue)' : 'var(--bg-secondary)'};
  }
`

const TableContainer = styled.div`
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`

const TableHeader = styled.th<{ sortable?: boolean }>`
  padding: 12px;
  text-align: left;
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  color: var(--text-secondary);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
  
  ${props => props.sortable && `
    cursor: pointer;
    user-select: none;
    
    &:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }
  `}
`

const TableRow = styled.tr<{ type?: 'entry' | 'exit' }>`
  border-bottom: 1px solid var(--border-primary);
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
  
  ${props => props.type === 'entry' && `
    border-left: 3px solid var(--accent-blue);
  `}
  
  ${props => props.type === 'exit' && `
    border-left: 3px solid var(--accent-orange);
  `}
`

const TableCell = styled.td`
  padding: 12px;
  color: var(--text-primary);
  vertical-align: middle;
`

const ActionBadge = styled.span<{ action: string }>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  
  ${props => {
    if (props.action.includes('ENTRY_LONG') || props.action.includes('ENTRY_Long')) {
      return 'background-color: rgba(35, 134, 54, 0.2); color: var(--accent-green);'
    } else if (props.action.includes('ENTRY_SHORT') || props.action.includes('ENTRY_Short')) {
      return 'background-color: rgba(218, 54, 51, 0.2); color: var(--accent-red);'
    } else if (props.action.includes('CLOSE')) {
      return 'background-color: rgba(253, 126, 20, 0.2); color: var(--accent-orange);'
    } else {
      return 'background-color: rgba(47, 129, 247, 0.2); color: var(--accent-blue);'
    }
  }}
`

const PnLValue = styled.span<{ pnl?: number }>`
  font-weight: 600;
  color: ${props => {
    if (props.pnl === undefined || props.pnl === null) return 'var(--text-muted)'
    return props.pnl > 0 ? 'var(--accent-green)' : props.pnl < 0 ? 'var(--accent-red)' : 'var(--text-muted)'
  }};
`

const SortIcon = styled.span`
  margin-left: 4px;
  opacity: 0.7;
`

type SortField = 'timestamp' | 'price' | 'pnl' | 'equity'
type SortDirection = 'asc' | 'desc'
type FilterType = 'all' | 'entries' | 'exits' | 'long' | 'short'

const TradesList: React.FC<Props> = ({ trades }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = trades.filter(trade => {
      // Search filter
      const searchMatch = searchTerm === '' || 
        trade.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.comment.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!searchMatch) return false

      // Type filter
      switch (filterType) {
        case 'entries':
          return trade.action.includes('ENTRY')
        case 'exits':
          return trade.action.includes('CLOSE') || trade.action.includes('Stop Loss')
        case 'long':
          return trade.action.includes('LONG') || trade.action.includes('Long')
        case 'short':
          return trade.action.includes('SHORT') || trade.action.includes('Short')
        default:
          return true
      }
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime()
          bValue = new Date(b.timestamp).getTime()
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'pnl':
          aValue = a.pnl || 0
          bValue = b.pnl || 0
          break
        case 'equity':
          aValue = a.equity
          bValue = b.equity
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [trades, searchTerm, sortField, sortDirection, filterType])

  const getRowType = (action: string): 'entry' | 'exit' => {
    return action.includes('ENTRY') ? 'entry' : 'exit'
  }

  const formatActionText = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
  }

  return (
    <TradesContainer>
      <TradesHeader>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          Trade History ({trades.length} trades)
        </h3>
        
        <SearchContainer>
          <FiSearch size={16} color="var(--text-muted)" />
          <SearchInput
            type="text"
            placeholder="Search trades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <FiFilter size={16} color="var(--text-muted)" />
          
          <FilterButton
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          >
            All
          </FilterButton>
          
          <FilterButton
            active={filterType === 'entries'}
            onClick={() => setFilterType('entries')}
          >
            Entries
          </FilterButton>
          
          <FilterButton
            active={filterType === 'exits'}
            onClick={() => setFilterType('exits')}
          >
            Exits
          </FilterButton>
          
          <FilterButton
            active={filterType === 'long'}
            onClick={() => setFilterType('long')}
          >
            Long
          </FilterButton>
          
          <FilterButton
            active={filterType === 'short'}
            onClick={() => setFilterType('short')}
          >
            Short
          </FilterButton>
        </div>
      </TradesHeader>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <TableHeader 
                sortable 
                onClick={() => handleSort('timestamp')}
              >
                Date
                {sortField === 'timestamp' && (
                  <SortIcon>
                    {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                  </SortIcon>
                )}
              </TableHeader>
              
              <TableHeader>Action</TableHeader>
              
              <TableHeader 
                sortable 
                onClick={() => handleSort('price')}
              >
                Price
                {sortField === 'price' && (
                  <SortIcon>
                    {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                  </SortIcon>
                )}
              </TableHeader>
              
              <TableHeader>Size</TableHeader>
              
              <TableHeader 
                sortable 
                onClick={() => handleSort('pnl')}
              >
                P&L
                {sortField === 'pnl' && (
                  <SortIcon>
                    {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                  </SortIcon>
                )}
              </TableHeader>
              
              <TableHeader 
                sortable 
                onClick={() => handleSort('equity')}
              >
                Equity
                {sortField === 'equity' && (
                  <SortIcon>
                    {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
                  </SortIcon>
                )}
              </TableHeader>
              
              <TableHeader>Comment</TableHeader>
            </tr>
          </thead>
          
          <tbody>
            {filteredAndSortedTrades.map((trade, index) => (
              <TableRow key={index} type={getRowType(trade.action)}>
                <TableCell>
                  {format(new Date(trade.timestamp), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                
                <TableCell>
                  <ActionBadge action={trade.action}>
                    {formatActionText(trade.action)}
                  </ActionBadge>
                </TableCell>
                
                <TableCell>
                  ${trade.price.toLocaleString()}
                </TableCell>
                
                <TableCell>
                  {trade.size.toFixed(4)}
                </TableCell>
                
                <TableCell>
                  <PnLValue pnl={trade.pnl}>
                    {trade.pnl !== undefined && trade.pnl !== null
                      ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toLocaleString()}`
                      : '-'
                    }
                  </PnLValue>
                </TableCell>
                
                <TableCell>
                  ${trade.equity.toLocaleString()}
                </TableCell>
                
                <TableCell style={{ color: 'var(--text-secondary)' }}>
                  {trade.comment}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </TableContainer>
      
      {filteredAndSortedTrades.length === 0 && (
        <div 
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          No trades found matching the current filters.
        </div>
      )}
    </TradesContainer>
  )
}

export default TradesList