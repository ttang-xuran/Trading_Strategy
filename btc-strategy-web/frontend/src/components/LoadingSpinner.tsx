/**
 * Loading Spinner Component
 * Animated loading indicator
 */

import React from 'react'
import styled, { keyframes } from 'styled-components'

interface Props {
  size?: number
  color?: string
  message?: string
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`

const Spinner = styled.div<{ size: number; color: string }>`
  border: 2px solid var(--border-primary);
  border-top: 2px solid ${props => props.color};
  border-radius: 50%;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  animation: ${spin} 1s linear infinite;
`

const LoadingMessage = styled.div`
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-align: center;
`

const LoadingSpinner: React.FC<Props> = ({ 
  size = 32, 
  color = 'var(--accent-blue)', 
  message 
}) => {
  return (
    <SpinnerContainer>
      <Spinner size={size} color={color} />
      {message && <LoadingMessage>{message}</LoadingMessage>}
    </SpinnerContainer>
  )
}

export default LoadingSpinner