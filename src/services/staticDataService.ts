/**
 * Static Data Service for BTC Trading Strategy Frontend
 * Loads data from static CSV files instead of API calls
 */

import Papa from 'papaparse'
import type {
  DataSource,
  BacktestResult,
  ChartData,
  TradeSignal,
  PerformanceMetrics,
  EquityCurve
} from '../types/api'

interface CSVRow {
  [key: string]: string
}

class StaticDataService {
  private dataCache: Map<string, any> = new Map()
  
  /**
   * Get list of available data sources (hardcoded for static data)
   */
  async getDataSources(): Promise<DataSource[]> {
    return [
      {
        name: 'coinbase',
        display_name: 'Coinbase',
        status: 'active',
        last_updated: new Date().toISOString(),
        total_records: 0
      },
      {
        name: 'binance',
        display_name: 'Binance',
        status: 'active',
        last_updated: new Date().toISOString(),
        total_records: 0
      },
      {
        name: 'bitstamp',
        display_name: 'Bitstamp',
        status: 'active',
        last_updated: new Date().toISOString(),
        total_records: 0
      }
    ]
  }

  /**
   * Load CSV data from public folder
   */
  private async loadCSV(filename: string): Promise<CSVRow[]> {
    if (this.dataCache.has(filename)) {
      return this.dataCache.get(filename)
    }

    try {
      const response = await fetch(`/${filename}`)
      const csvText = await response.text()
      
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
      })
      
      if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors)
      }
      
      this.dataCache.set(filename, result.data)
      return result.data as CSVRow[]
    } catch (error) {
      console.error(`Failed to load CSV file: ${filename}`, error)
      throw new Error(`Could not load data from ${filename}`)
    }
  }

  /**
   * Get backtest results for a specific source
   */
  async getBacktestResults(source: string): Promise<BacktestResult> {
    try {
      // Map source names to actual CSV files
      const csvFiles: Record<string, string> = {
        coinbase: 'BTC_Coinbase_Historical.csv',
        binance: 'BTC_Binance_Historical.csv', 
        bitstamp: 'BTC_Bitstamp_Historical.csv'
      }

      const csvFile = csvFiles[source] || 'BTC_Price_full_history.csv'
      const data = await this.loadCSV(csvFile)
      
      // Convert CSV data to chart format
      const chartData: ChartData = {
        data: data.map(row => ({
          timestamp: row.timestamp || row.date || row.datetime,
          open: parseFloat(row.open || '0'),
          high: parseFloat(row.high || '0'),
          low: parseFloat(row.low || '0'),
          close: parseFloat(row.close || '0'),
          volume: parseFloat(row.volume || '0')
        })),
        total_candles: data.length,
        timeframe: '1d',
        source: source
      }

      // Generate mock trade signals (you can replace this with actual trade logic)
      const tradeSignals: TradeSignal[] = this.generateMockTradeSignals(chartData.data)
      
      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(tradeSignals, 100000)
      
      // Generate equity curve
      const equityCurve = this.generateEquityCurve(tradeSignals, 100000)

      return {
        chart_data: chartData,
        trade_signals: tradeSignals,
        performance_metrics: performanceMetrics,
        equity_curve: equityCurve,
        parameters: {
          lookback_period: 20,
          range_mult: 0.5,
          stop_loss_mult: 2.5,
          atr_period: 14
        },
        run_timestamp: new Date().toISOString(),
        source: source
      }
    } catch (error) {
      console.error(`Failed to get backtest results for ${source}:`, error)
      throw error
    }
  }

  private generateMockTradeSignals(data: any[]): TradeSignal[] {
    const signals: TradeSignal[] = []
    let position: 'long' | 'short' | null = null
    
    // Simple moving average crossover strategy for demo
    for (let i = 20; i < data.length; i += 10) {
      const currentPrice = data[i].close
      const prevPrice = data[i-1].close
      
      if (currentPrice > prevPrice * 1.02 && position !== 'long') {
        // Enter long
        signals.push({
          timestamp: data[i].timestamp,
          signal_type: 'LONG',
          price: currentPrice,
          quantity: 1,
          reason: 'Breakout signal'
        })
        position = 'long'
      } else if (currentPrice < prevPrice * 0.98 && position === 'long') {
        // Exit long
        signals.push({
          timestamp: data[i].timestamp,
          signal_type: 'CLOSE_LONG',
          price: currentPrice,
          quantity: 1,
          reason: 'Stop loss'
        })
        position = null
      }
    }
    
    return signals
  }

  private calculatePerformanceMetrics(signals: TradeSignal[], initialCapital: number): PerformanceMetrics {
    let equity = initialCapital
    let trades = 0
    let winningTrades = 0
    let grossProfit = 0
    let grossLoss = 0
    let entryPrice = 0
    let inPosition = false
    
    for (const signal of signals) {
      if (signal.signal_type === 'LONG') {
        entryPrice = signal.price
        inPosition = true
      } else if (signal.signal_type === 'CLOSE_LONG' && inPosition) {
        const profit = signal.price - entryPrice
        if (profit > 0) {
          winningTrades++
          grossProfit += profit
        } else {
          grossLoss += Math.abs(profit)
        }
        trades++
        equity += profit
        inPosition = false
      }
    }

    const netProfit = grossProfit - grossLoss
    const winRate = trades > 0 ? (winningTrades / trades) * 100 : 0
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

    return {
      total_return_percent: ((equity - initialCapital) / initialCapital) * 100,
      net_profit: netProfit,
      gross_profit: grossProfit,
      gross_loss: grossLoss,
      profit_factor: profitFactor,
      total_trades: trades,
      winning_trades: winningTrades,
      losing_trades: trades - winningTrades,
      win_rate_percent: winRate,
      average_trade: trades > 0 ? netProfit / trades : 0,
      max_drawdown_percent: 10, // Mock value
      peak_equity: equity,
      final_equity: equity,
      long_trades: trades,
      short_trades: 0
    }
  }

  private generateEquityCurve(signals: TradeSignal[], initialCapital: number): EquityCurve {
    const data = []
    let equity = initialCapital
    let entryPrice = 0
    let inPosition = false
    
    for (const signal of signals) {
      if (signal.signal_type === 'LONG') {
        entryPrice = signal.price
        inPosition = true
      } else if (signal.signal_type === 'CLOSE_LONG' && inPosition) {
        equity += signal.price - entryPrice
        inPosition = false
      }
      
      data.push({
        timestamp: signal.timestamp,
        equity: equity,
        drawdown: Math.max(0, (Math.max(...data.map(d => d.equity), equity) - equity) / Math.max(...data.map(d => d.equity), equity) * 100)
      })
    }

    return {
      data,
      peak_equity: Math.max(...data.map(d => d.equity)),
      max_drawdown: Math.max(...data.map(d => d.drawdown))
    }
  }

  /**
   * Check if static data service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getDataSources()
      return true
    } catch {
      return false
    }
  }
}

// Create and export a singleton instance
export const staticDataService = new StaticDataService()