"""
Pydantic models for the BTC Trading Strategy API
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class DataSourceType(str, Enum):
    """Available data sources"""
    COINBASE = "coinbase"
    BINANCE = "binance"
    KRAKEN = "kraken"
    BITSTAMP = "bitstamp"
    CRYPTOCOMPARE = "cryptocompare"
    COINMETRICS = "coinmetrics"

class DataSource(BaseModel):
    """Data source information"""
    name: str
    display_name: str
    status: str
    last_updated: Optional[datetime] = None
    total_candles: Optional[int] = None
    date_range: Optional[Dict[str, str]] = None
    
class StrategyParameters(BaseModel):
    """Trading strategy parameters"""
    lookback_period: int = Field(default=25, ge=5, le=100, description="Lookback period for breakout calculation")
    range_mult: float = Field(default=0.4, ge=0.1, le=2.0, description="Range multiplier for boundaries")
    stop_loss_mult: float = Field(default=2.0, ge=0.5, le=10.0, description="Stop loss multiplier")
    atr_period: int = Field(default=14, ge=5, le=50, description="ATR period for stop loss calculation")

class OHLCV(BaseModel):
    """OHLCV candlestick data point"""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

class ChartData(BaseModel):
    """Chart data with OHLCV and strategy lines"""
    candles: List[OHLCV]
    upper_boundary: List[Dict[str, Any]]
    lower_boundary: List[Dict[str, Any]]
    source: str
    timeframe: str = "1D"
    total_candles: int

class TradeSignal(BaseModel):
    """Trade signal for chart annotation"""
    timestamp: datetime
    action: str  # ENTRY_LONG, ENTRY_SHORT, CLOSE_LONG, CLOSE_SHORT
    price: float
    size: float
    comment: str
    pnl: Optional[float] = None
    equity: float

class PerformanceMetrics(BaseModel):
    """Detailed performance metrics"""
    # Core metrics
    total_return_percent: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_percent: float
    profit_factor: float
    
    # Risk metrics
    max_drawdown_percent: float
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    
    # P&L metrics
    gross_profit: float
    gross_loss: float
    net_profit: float
    average_trade: float
    average_winner: float
    average_loser: float
    
    # Equity metrics
    initial_equity: float
    final_equity: float
    peak_equity: float
    
    # Time metrics
    start_date: datetime
    end_date: datetime
    total_days: int
    
    # Trade analysis
    long_trades: int
    short_trades: int
    long_profit: float
    short_profit: float

class EquityPoint(BaseModel):
    """Single point in equity curve"""
    date: datetime
    equity: float
    drawdown_percent: float
    trade_number: Optional[int] = None

class EquityCurve(BaseModel):
    """Equity curve data"""
    equity_points: List[EquityPoint]
    source: str
    initial_equity: float
    final_equity: float
    peak_equity: float
    max_drawdown_percent: float

class BacktestResult(BaseModel):
    """Complete backtest result"""
    source: str
    parameters: StrategyParameters
    performance_metrics: PerformanceMetrics
    trade_signals: List[TradeSignal]
    equity_curve: EquityCurve
    chart_data: ChartData
    run_timestamp: datetime

class SourceComparison(BaseModel):
    """Comparison across all data sources"""
    sources: List[str]
    metrics: Dict[str, PerformanceMetrics]
    rankings: Dict[str, int]  # rank by total return
    best_source: str
    worst_source: str
    average_return: float
    return_spread: float

class UpdateStatus(BaseModel):
    """Data update status"""
    source: str
    status: str  # "success", "failed", "in_progress"
    last_attempt: datetime
    last_success: Optional[datetime] = None
    error_message: Optional[str] = None
    records_updated: Optional[int] = None

class SystemHealth(BaseModel):
    """System health check"""
    api_status: str
    database_status: str
    data_sources: List[UpdateStatus]
    last_full_update: Optional[datetime] = None
    uptime_seconds: int