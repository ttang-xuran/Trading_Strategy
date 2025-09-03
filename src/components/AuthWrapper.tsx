import React, { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Login from './Login'

interface AuthWrapperProps {
  children: ReactNode
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, login } = useAuth()

  const handleLogin = (success: boolean) => {
    if (success) {
      login()
    }
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return <>{children}</>
}

export default AuthWrapper