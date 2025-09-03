import React, { useState } from 'react'

interface LoginProps {
  onLogin: (success: boolean) => void
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Get credentials from environment variables
    const validUsername = import.meta.env.VITE_AUTH_USERNAME || 'admin'
    const validPassword = import.meta.env.VITE_AUTH_PASSWORD || 'password123'

    // Simple delay to prevent brute force and improve UX
    await new Promise(resolve => setTimeout(resolve, 500))

    if (username === validUsername && password === validPassword) {
      // Set authentication in localStorage
      localStorage.setItem('btc_strategy_auth', 'authenticated')
      localStorage.setItem('btc_strategy_user', username)
      localStorage.setItem('btc_strategy_login_time', new Date().toISOString())
      onLogin(true)
    } else {
      setError('Invalid username or password')
      onLogin(false)
    }
    
    setIsLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#f0f6fc',
      fontFamily: 'Segoe UI, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#21262d',
        border: '1px solid #30363d',
        borderRadius: '8px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '1.8rem', 
            margin: '0 0 0.5rem 0',
            color: '#f0f6fc'
          }}>
            🚀 BTC Strategy
          </h1>
          <p style={{ 
            margin: 0, 
            color: '#7d8590',
            opacity: 0.9 
          }}>
            Sign in to access trading strategies
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#f0f6fc',
              marginBottom: '0.5rem'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: '#f0f6fc',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#238636'}
              onBlur={(e) => e.target.style.borderColor = '#30363d'}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#f0f6fc',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #30363d',
                backgroundColor: '#0d1117',
                color: '#f0f6fc',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#238636'}
              onBlur={(e) => e.target.style.borderColor = '#30363d'}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#da3633',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isLoading || !username || !password ? '#30363d' : '#238636',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading || !username || !password ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              opacity: isLoading || !username || !password ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading && username && password) {
                e.currentTarget.style.backgroundColor = '#2ea043'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && username && password) {
                e.currentTarget.style.backgroundColor = '#238636'
              }
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          borderTop: '1px solid #30363d',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#7d8590'
        }}>
          Secure access to professional trading strategies
        </div>
      </div>
    </div>
  )
}

export default Login