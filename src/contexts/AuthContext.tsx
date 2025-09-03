import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  user: string | null
  login: () => void
  logout: () => void
  loginTime: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [loginTime, setLoginTime] = useState<string | null>(null)

  // Check for existing authentication on app load
  useEffect(() => {
    const auth = localStorage.getItem('btc_strategy_auth')
    const savedUser = localStorage.getItem('btc_strategy_user')
    const savedLoginTime = localStorage.getItem('btc_strategy_login_time')
    
    if (auth === 'authenticated' && savedUser) {
      setIsAuthenticated(true)
      setUser(savedUser)
      setLoginTime(savedLoginTime)
    }
  }, [])

  const login = () => {
    const savedUser = localStorage.getItem('btc_strategy_user')
    const savedLoginTime = localStorage.getItem('btc_strategy_login_time')
    
    setIsAuthenticated(true)
    setUser(savedUser)
    setLoginTime(savedLoginTime)
  }

  const logout = () => {
    localStorage.removeItem('btc_strategy_auth')
    localStorage.removeItem('btc_strategy_user')
    localStorage.removeItem('btc_strategy_login_time')
    
    setIsAuthenticated(false)
    setUser(null)
    setLoginTime(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loginTime }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}