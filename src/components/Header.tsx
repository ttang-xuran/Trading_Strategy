/**
 * Header Component
 * Application header with branding and navigation
 */

import React from 'react'
import styled from 'styled-components'
import { FiBitcoin, FiTrendingUp, FiGithub, FiInfo } from 'react-icons/fi'

const HeaderContainer = styled.header`
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  padding: 0 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
`

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
`

const LogoIcon = styled.div`
  color: var(--accent-orange);
  font-size: 1.5rem;
`

const Subtitle = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 400;
`

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const StatusBadge = styled.div`
  background-color: var(--accent-green);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
`

const Header: React.FC = () => {
  return (
    <HeaderContainer>
      <LeftSection>
        <Logo>
          <LogoIcon>
            <FiBitcoin />
          </LogoIcon>
          <div>
            <div>BTC Strategy</div>
            <Subtitle>Adaptive Volatility Breakout</Subtitle>
          </div>
        </Logo>
      </LeftSection>

      <RightSection>
        <StatusBadge>
          <FiTrendingUp size={12} />
          Live
        </StatusBadge>
        
        <IconButton
          onClick={() => window.open('https://github.com/anthropics/claude-code', '_blank')}
          title="View on GitHub"
        >
          <FiGithub size={16} />
        </IconButton>
        
        <IconButton
          onClick={() => window.open('https://docs.anthropic.com/en/docs/claude-code', '_blank')}
          title="Documentation"
        >
          <FiInfo size={16} />
        </IconButton>
      </RightSection>
    </HeaderContainer>
  )
}

export default Header