/**
 * Data Source Selector Component
 * Dropdown for selecting different cryptocurrency data sources
 */

import React from 'react'
import styled from 'styled-components'
import { FiDatabase, FiCheck, FiAlertCircle, FiX } from 'react-icons/fi'
import type { DataSource } from '../types/api'

interface Props {
  sources: DataSource[]
  selectedSource: string
  onSourceChange: (source: string) => void
}

const SelectorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const SelectorLabel = styled.label`
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
`

const SelectWrapper = styled.div`
  position: relative;
  min-width: 200px;
`

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  font-size: 0.875rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--border-secondary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(47, 129, 247, 0.1);
  }
  
  option {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    padding: 8px;
  }
`

const SourceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
`

const StatusIcon = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  color: ${props => {
    switch (props.status) {
      case 'active': return 'var(--accent-green)'
      case 'limited': return 'var(--accent-orange)'
      case 'error': return 'var(--accent-red)'
      default: return 'var(--text-muted)'
    }
  }};
`

const SourceDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <FiCheck size={12} />
    case 'limited':
      return <FiAlertCircle size={12} />
    case 'error':
      return <FiX size={12} />
    default:
      return <FiDatabase size={12} />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'limited':
      return 'Limited Data'
    case 'error':
      return 'Error'
    case 'inactive':
      return 'Inactive'
    default:
      return 'Unknown'
  }
}

const formatLastUpdated = (lastUpdated?: string) => {
  if (!lastUpdated) return 'Never'
  
  const date = new Date(lastUpdated)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    return 'Recently'
  }
}

const DataSourceSelector: React.FC<Props> = ({ 
  sources, 
  selectedSource, 
  onSourceChange 
}) => {
  const selectedSourceData = sources.find(s => s.name === selectedSource)

  return (
    <SelectorContainer>
      <SelectorLabel htmlFor="data-source-select">
        <FiDatabase style={{ marginRight: '4px' }} />
        Data Source:
      </SelectorLabel>
      
      <SourceDetails>
        <SelectWrapper>
          <Select
            id="data-source-select"
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
          >
            {sources.map((source) => (
              <option 
                key={source.name} 
                value={source.name}
                disabled={source.status === 'inactive' || source.status === 'error'}
              >
                {source.display_name} ({getStatusText(source.status)})
              </option>
            ))}
          </Select>
        </SelectWrapper>
        
        {selectedSourceData && (
          <SourceInfo>
            <StatusIcon status={selectedSourceData.status}>
              {getStatusIcon(selectedSourceData.status)}
            </StatusIcon>
            
            <span>
              {selectedSourceData.total_candles?.toLocaleString()} candles
            </span>
            
            <span>•</span>
            
            <span>
              Updated {formatLastUpdated(selectedSourceData.last_updated)}
            </span>
            
            {selectedSourceData.date_range && (
              <>
                <span>•</span>
                <span>
                  {new Date(selectedSourceData.date_range.start).getFullYear()} - 
                  {new Date(selectedSourceData.date_range.end).getFullYear()}
                </span>
              </>
            )}
          </SourceInfo>
        )}
      </SourceDetails>
    </SelectorContainer>
  )
}

export default DataSourceSelector