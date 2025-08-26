import React, { useState, useEffect } from 'react'
import { livePriceService } from '../services/livePriceService'

interface DataQualityMonitorProps {
  className?: string
}

const DataQualityMonitor: React.FC<DataQualityMonitorProps> = ({ className }) => {
  const [healthStatus, setHealthStatus] = useState<any>({})
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const updateHealth = () => {
      const health = livePriceService.getApiHealthStatus()
      setHealthStatus(health)
    }

    updateHealth()
    const interval = setInterval(updateHealth, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getHealthColor = (health: any) => {
    if (!health) return '#6b7280'
    if (health.isHealthy && health.failureCount === 0) return '#10b981'
    if (health.isHealthy && health.failureCount <= 2) return '#f59e0b'
    return '#ef4444'
  }

  const formatLastSuccess = (timestamp: number) => {
    if (timestamp === 0) return 'Never'
    const diff = Date.now() - timestamp
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${className || ''}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-300">API Health Monitor</h3>
        <span className="text-xs text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {Object.entries(healthStatus).map(([source, health]: [string, any]) => (
            <div key={source} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getHealthColor(health) }}
                />
                <span className="text-gray-300 capitalize">{source}</span>
              </div>
              <div className="text-gray-400">
                {health.failureCount > 0 && (
                  <span className="text-red-400">{health.failureCount} fails</span>
                )}
                {health.failureCount > 0 && health.lastSuccess > 0 && <span> • </span>}
                <span>{formatLastSuccess(health.lastSuccess)}</span>
              </div>
            </div>
          ))}
          
          <button
            onClick={() => livePriceService.resetApiHealth()}
            className="w-full mt-2 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
          >
            Reset Health Status
          </button>
        </div>
      )}
    </div>
  )
}

export default DataQualityMonitor