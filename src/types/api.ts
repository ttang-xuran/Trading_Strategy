/**
 * TypeScript definitions for BTC Trading Strategy API
 * These types match the Pydantic models in the backend
 */

export interface DataSource {
  name: string
  display_name: string
  status: string
  last_updated?: string
  total_candles?: number
  date_range?: {
    start: string
    end: string
  }
}

export interface StrategyParameters {
  lookback_period: number
  range_mult: number
  stop_loss_mult: number
  atr_period: number
}

export interface OHLCV {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ChartData {
  candles: OHLCV[]
  upper_boundary: Array<{x: string, y: number}>
  lower_boundary: Array<{x: string, y: number}>
  source: string
  timeframe: string
  total_candles: number
}

export interface TradeSignal {
  timestamp: string
  action: string
  price: number
  size: number
  comment: string
  pnl?: number
  equity: number
}

export interface PerformanceMetrics {
  // Core metrics
  total_return_percent: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate_percent: number
  profit_factor: number
  
  // Risk metrics
  max_drawdown_percent: number
  sharpe_ratio?: number
  sortino_ratio?: number
  
  // P&L metrics
  gross_profit: number
  gross_loss: number
  net_profit: number
  average_trade: number
  average_winner: number
  average_loser: number
  
  // Equity metrics
  initial_equity: number
  final_equity: number
  peak_equity: number
  
  // Time metrics
  start_date: string
  end_date: string
  total_days: number
  
  // Trade analysis
  long_trades: number
  short_trades: number
  long_profit: number
  short_profit: number
}

export interface EquityPoint {
  date: string
  equity: number
  drawdown_percent: number
  trade_number?: number
}

export interface EquityCurve {
  equity_points: EquityPoint[]
  source: string
  initial_equity: number
  final_equity: number
  peak_equity: number
  max_drawdown_percent: number
}

export interface BacktestResult {
  source: string
  parameters: StrategyParameters
  performance_metrics: PerformanceMetrics
  trade_signals: TradeSignal[]
  equity_curve: EquityCurve
  chart_data: ChartData
  run_timestamp: string
}

export interface SourceComparison {
  sources: string[]
  metrics: Record<string, PerformanceMetrics>
  rankings: Record<string, number>
  best_source: string
  worst_source: string
  average_return: number
  return_spread: number
}

export interface UpdateStatus {
  source: string
  status: string
  last_attempt: string
  last_success?: string
  error_message?: string
  records_updated?: number
}

export interface SystemHealth {
  api_status: string
  database_status: string
  data_sources: UpdateStatus[]
  last_full_update?: string
  uptime_seconds: number
}

// Chart-specific types for Plotly
export interface PlotlyTrace {
  x: string[]
  y: number[]
  type: string
  mode?: string
  name?: string
  line?: {
    color: string
    width?: number
  }
  marker?: {
    color: string
    size?: number
    symbol?: string
  }
  text?: string[]
  hovertemplate?: string
}

export interface PlotlyLayout {
  title?: string
  xaxis: {
    title: string
    type: string
    rangeslider?: {
      visible: boolean
    }
    showgrid?: boolean
    gridcolor?: string
  }
  yaxis: {
    title: string
    side?: string
    showgrid?: boolean
    gridcolor?: string
  }
  yaxis2?: {
    title: string
    side: string
    overlaying: string
    showgrid?: boolean
  }
  plot_bgcolor: string
  paper_bgcolor: string
  font: {
    color: string
    family: string
  }
  showlegend?: boolean
  legend?: {
    x: number
    y: number
    bgcolor: string
    bordercolor: string
  }
  margin?: {
    l: number
    r: number
    t: number
    b: number
  }
  height?: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
}

export interface ApiError {
  message: string
  detail?: string
  status_code: number
}