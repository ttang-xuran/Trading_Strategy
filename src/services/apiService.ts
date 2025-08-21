/**
 * API Service for BTC Trading Strategy Frontend
 * Handles all communication with the FastAPI backend
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type {
  DataSource,
  BacktestResult,
  ChartData,
  TradeSignal,
  PerformanceMetrics,
  EquityCurve,
  SourceComparison,
  StrategyParameters,
  SystemHealth,
  ApiError
} from '../types/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    // Create axios instance with default configuration
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      timeout: 5000, // 5 seconds - fast timeout for sleeping APIs
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error('API Response Error:', error)
        
        // Transform error into our standard format
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          detail: error.response?.data?.detail || error.response?.data?.message,
          status_code: error.response?.status || 500
        }
        
        return Promise.reject(apiError)
      }
    )
  }

  /**
   * Health check - verify API is running
   */
  async healthCheck(): Promise<SystemHealth> {
    try {
      const response = await this.api.get('/')
      return response.data
    } catch (error) {
      throw new Error('API health check failed')
    }
  }

  /**
   * Get list of available data sources
   */
  async getDataSources(): Promise<DataSource[]> {
    try {
      const response = await this.api.get('/api/data-sources')
      return response.data
    } catch (error) {
      console.error('Failed to fetch data sources:', error)
      throw error
    }
  }

  /**
   * Get chart data for a specific source
   */
  async getChartData(source: string, days: number = 365): Promise<ChartData> {
    try {
      const response = await this.api.get(`/api/chart-data/${source}`, {
        params: { days }
      })
      return response.data
    } catch (error) {
      console.error(`Failed to fetch chart data for ${source}:`, error)
      throw error
    }
  }

  /**
   * Get backtest results for a specific source
   */
  async getBacktestResults(source: string, parameters?: Partial<StrategyParameters>): Promise<BacktestResult> {
    try {
      const response = await this.api.get(`/api/backtest/${source}`, {
        params: parameters
      })
      return response.data
    } catch (error) {
      console.error(`Failed to fetch backtest results for ${source}:`, error)
      throw error
    }
  }

  /**
   * Get trade signals for a specific source
   */
  async getTradeSignals(source: string): Promise<TradeSignal[]> {
    try {
      const response = await this.api.get(`/api/trade-signals/${source}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch trade signals for ${source}:`, error)
      throw error
    }
  }

  /**
   * Get performance metrics for a specific source
   */
  async getPerformanceMetrics(source: string): Promise<PerformanceMetrics> {
    try {
      const response = await this.api.get(`/api/performance-metrics/${source}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch performance metrics for ${source}:`, error)
      throw error
    }
  }

  /**
   * Get equity curve data for a specific source
   */
  async getEquityCurve(source: string): Promise<EquityCurve> {
    try {
      const response = await this.api.get(`/api/equity-curve/${source}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch equity curve for ${source}:`, error)
      throw error
    }
  }

  /**
   * Trigger data update for all sources
   */
  async updateData(): Promise<{ message: string; status: string }> {
    try {
      const response = await this.api.post('/api/update-data')
      return response.data
    } catch (error) {
      console.error('Failed to trigger data update:', error)
      throw error
    }
  }

  /**
   * Get comparison of all data sources
   */
  async getSourceComparison(): Promise<SourceComparison> {
    try {
      const response = await this.api.get('/api/comparison')
      return response.data
    } catch (error) {
      console.error('Failed to fetch source comparison:', error)
      throw error
    }
  }

  /**
   * Run custom backtest with custom parameters
   */
  async runCustomBacktest(source: string, parameters: StrategyParameters): Promise<BacktestResult> {
    try {
      const response = await this.api.post('/api/custom-backtest', parameters, {
        params: { source }
      })
      return response.data
    } catch (error) {
      console.error(`Failed to run custom backtest for ${source}:`, error)
      throw error
    }
  }

  /**
   * Utility method to format error messages for display
   */
  static formatError(error: any): string {
    if (error.detail) {
      return error.detail
    }
    if (error.message) {
      return error.message
    }
    return 'An unexpected error occurred'
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.healthCheck()
      return true
    } catch {
      return false
    }
  }
}

// Create and export a singleton instance
export const apiService = new ApiService()

// Export the class for testing purposes
export { ApiService }