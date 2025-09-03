import React from 'react'
import { useAuth } from '../contexts/AuthContext'

const LogoutButton: React.FC = () => {
  const { logout, user, loginTime } = useAuth()

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout()
    }
  }

  const formatLoginTime = (timeString: string | null) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.5rem 1rem',
      backgroundColor: '#21262d',
      border: '1px solid #30363d',
      borderRadius: '6px',
      fontSize: '0.9rem'
    }}>
      {/* User Info */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.2rem'
      }}>
        <div style={{
          color: '#f0f6fc',
          fontWeight: '500',
          fontSize: '0.9rem'
        }}>
          👤 {user}
        </div>
        {loginTime && (
          <div style={{
            color: '#7d8590',
            fontSize: '0.75rem'
          }}>
            Signed in {formatLoginTime(loginTime)}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '4px',
          border: '1px solid #da3633',
          backgroundColor: 'transparent',
          color: '#da3633',
          fontSize: '0.8rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontWeight: '500'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#da3633'
          e.currentTarget.style.color = '#ffffff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#da3633'
        }}
      >
        Sign Out
      </button>
    </div>
  )
}

export default LogoutButton