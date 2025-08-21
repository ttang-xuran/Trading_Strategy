"""
Backtest Service for BTC Trading Strategy API
Handles running backtests and generating trade signals using our existing strategy
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional, Any

# Import our existing strategy implementation
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
web_project_dir = os.path.dirname(backend_dir)
project_root = os.path.dirname(web_project_dir)
# Add both backend dir and project root to path for flexibility
sys.path.append(backend_dir)
sys.path.append(project_root)
from exact_pine_script_implementation import ExactPineScriptStrategy

from app.models.strategy_models import (
    BacktestResult, PerformanceMetrics, TradeSignal, EquityCurve, EquityPoint,
    StrategyParameters, SourceComparison
)
from app.services.data_service import DataService

class BacktestService:
    """Service for running backtests and generating trading signals"""
    
    def __init__(self):
        self.data_service = DataService()
        self.results_cache = {}  # Cache results for better performance
        
        # Pre-calculated optimized parameters
        self.optimized_params = {
            "lookback_period": 25,
            "range_mult": 0.4,
            "stop_loss_mult": 2.0,
            "atr_period": 14
        }
    
    async def run_backtest(self, source: str, parameters: Dict[str, Any]) -> BacktestResult:
        """Run backtest for specified source with given parameters"""
        try:
            # Initialize strategy with parameters first
            strategy = ExactPineScriptStrategy()
            strategy.lookback_period = parameters.get("lookback_period", 25)
            strategy.range_mult = parameters.get("range_mult", 0.4)
            strategy.stop_loss_mult = parameters.get("stop_loss_mult", 2.0)
            
            # Get the source file path for the strategy's load method
            file_path = self.data_service.sources[source]["file_path"]
            
            # Use strategy's built-in data loading method
            strategy_df = strategy.load_and_prepare_data(file_path)
            
            # Run backtest
            strategy.run_exact_backtest(strategy_df)
            
            # Store the dataframe with boundaries for chart generation
            strategy.prepared_df = strategy_df
            
            # Generate results
            performance_metrics = self._calculate_performance_metrics(strategy)
            trade_signals = self._extract_trade_signals(strategy)
            equity_curve = self._generate_equity_curve(strategy)
            
            # Create chart data with strategy lines
            chart_data = await self._generate_chart_data(source, strategy)
            
            result = BacktestResult(
                source=source,
                parameters=StrategyParameters(**parameters),
                performance_metrics=performance_metrics,
                trade_signals=trade_signals,
                equity_curve=equity_curve,
                chart_data=chart_data,
                run_timestamp=datetime.now()
            )
            
            # Cache result
            cache_key = f"{source}_{hash(json.dumps(parameters, sort_keys=True))}"
            self.results_cache[cache_key] = result
            
            return result
            
        except Exception as e:
            raise Exception(f"Backtest failed for {source}: {str(e)}")
    
    def _prepare_strategy_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare data in format expected by strategy"""
        strategy_df = df.copy()
        
        # Ensure we have required columns
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in required_cols:
            if col not in strategy_df.columns:
                strategy_df[col] = strategy_df['close'] if col != 'volume' else 0
        
        return strategy_df
    
    def _calculate_performance_metrics(self, strategy: ExactPineScriptStrategy) -> PerformanceMetrics:
        """Calculate comprehensive performance metrics"""
        trades_df = pd.DataFrame(strategy.trades)
        
        # Basic calculations
        initial_equity = strategy.initial_capital
        final_equity = strategy.equity
        total_return = (final_equity / initial_equity - 1) * 100
        
        # Trade analysis
        if len(trades_df) > 0:
            pnl_trades = trades_df[trades_df.get('pnl', 0) != 0].copy()
            
            if len(pnl_trades) > 0:
                winning_trades = len(pnl_trades[pnl_trades['pnl'] > 0])
                losing_trades = len(pnl_trades[pnl_trades['pnl'] < 0])
                win_rate = winning_trades / len(pnl_trades) * 100
                
                gross_profit = pnl_trades[pnl_trades['pnl'] > 0]['pnl'].sum()
                gross_loss = abs(pnl_trades[pnl_trades['pnl'] < 0]['pnl'].sum())
                profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
                
                average_winner = gross_profit / winning_trades if winning_trades > 0 else 0
                average_loser = gross_loss / losing_trades if losing_trades > 0 else 0
                average_trade = pnl_trades['pnl'].mean()
            else:
                winning_trades = losing_trades = 0
                win_rate = profit_factor = average_winner = average_loser = average_trade = 0
                gross_profit = gross_loss = 0
        else:
            winning_trades = losing_trades = 0
            win_rate = profit_factor = average_winner = average_loser = average_trade = 0
            gross_profit = gross_loss = 0
        
        # Calculate drawdown
        max_drawdown = 0
        peak_equity = final_equity
        if strategy.daily_data:
            daily_df = pd.DataFrame(strategy.daily_data)
            if 'total_equity' in daily_df.columns:
                daily_df['peak'] = daily_df['total_equity'].fillna(daily_df.get('equity', final_equity)).cummax()
                daily_df['drawdown'] = (daily_df['total_equity'].fillna(daily_df.get('equity', final_equity)) - daily_df['peak']) / daily_df['peak'] * 100
                max_drawdown = abs(daily_df['drawdown'].min())
                peak_equity = daily_df['peak'].max()
        
        # Separate long/short analysis
        long_trades = len(trades_df[trades_df.get('action', '').str.contains('LONG', na=False)])
        short_trades = len(trades_df[trades_df.get('action', '').str.contains('SHORT', na=False)])
        
        long_profit = trades_df[
            trades_df.get('action', '').str.contains('CLOSE_Long|CLOSE_LONG', na=False, regex=True)
        ].get('pnl', pd.Series(dtype=float)).sum()
        
        short_profit = trades_df[
            trades_df.get('action', '').str.contains('CLOSE_Short|CLOSE_SHORT', na=False, regex=True)
        ].get('pnl', pd.Series(dtype=float)).sum()
        
        # Date range
        start_date = datetime.now()
        end_date = datetime.now()
        if len(trades_df) > 0:
            start_date = pd.to_datetime(trades_df['date'].min())
            end_date = pd.to_datetime(trades_df['date'].max())
        
        total_days = (end_date - start_date).days
        
        return PerformanceMetrics(
            total_return_percent=total_return,
            total_trades=len(trades_df),
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate_percent=win_rate,
            profit_factor=profit_factor,
            max_drawdown_percent=max_drawdown,
            sharpe_ratio=None,  # Would need daily returns to calculate
            sortino_ratio=None,
            gross_profit=gross_profit,
            gross_loss=gross_loss,
            net_profit=final_equity - initial_equity,
            average_trade=average_trade,
            average_winner=average_winner,
            average_loser=average_loser,
            initial_equity=initial_equity,
            final_equity=final_equity,
            peak_equity=peak_equity,
            start_date=start_date,
            end_date=end_date,
            total_days=total_days,
            long_trades=long_trades,
            short_trades=short_trades,
            long_profit=long_profit,
            short_profit=short_profit
        )
    
    def _extract_trade_signals(self, strategy: ExactPineScriptStrategy) -> List[TradeSignal]:
        """Extract trade signals for chart annotations"""
        signals = []
        
        for trade in strategy.trades:
            signals.append(TradeSignal(
                timestamp=pd.to_datetime(trade['date']),
                action=trade['action'],
                price=float(trade['price']),
                size=float(trade['size']),
                comment=trade.get('comment', ''),
                pnl=trade.get('pnl'),
                equity=float(trade['equity'])
            ))
        
        return signals
    
    def _generate_equity_curve(self, strategy: ExactPineScriptStrategy) -> EquityCurve:
        """Generate equity curve data"""
        equity_points = []
        
        if strategy.daily_data:
            daily_df = pd.DataFrame(strategy.daily_data)
            daily_df['equity'] = daily_df.get('total_equity', daily_df.get('equity', strategy.initial_capital))
            daily_df['peak'] = daily_df['equity'].cummax()
            daily_df['drawdown'] = (daily_df['equity'] - daily_df['peak']) / daily_df['peak'] * 100
            
            for i, row in daily_df.iterrows():
                equity_points.append(EquityPoint(
                    date=pd.to_datetime(row['date']) if 'date' in row else datetime.now(),
                    equity=float(row['equity']),
                    drawdown_percent=float(row['drawdown']),
                    trade_number=row.get('trade_number')
                ))
        
        return EquityCurve(
            equity_points=equity_points,
            source="",  # Will be set by calling function
            initial_equity=strategy.initial_capital,
            final_equity=strategy.equity,
            peak_equity=max([p.equity for p in equity_points], default=strategy.equity),
            max_drawdown_percent=abs(min([p.drawdown_percent for p in equity_points], default=0))
        )
    
    async def _generate_chart_data(self, source: str, strategy: ExactPineScriptStrategy):
        """Generate chart data with strategy boundaries"""
        # Get basic chart data
        chart_data = await self.data_service.get_chart_data(source, days=0)  # All data
        
        # Add strategy boundaries from the prepared dataframe
        upper_boundary = []
        lower_boundary = []
        
        # Use the prepared dataframe stored in strategy
        if hasattr(strategy, 'prepared_df') and strategy.prepared_df is not None:
            df = strategy.prepared_df
            if 'upper_boundary' in df.columns and 'lower_boundary' in df.columns:
                for idx, row in df.iterrows():
                    if not pd.isna(row['upper_boundary']) and not pd.isna(row['lower_boundary']):
                        upper_boundary.append({
                            'timestamp': idx.isoformat(),
                            'value': float(row['upper_boundary'])
                        })
                        lower_boundary.append({
                            'timestamp': idx.isoformat(),
                            'value': float(row['lower_boundary'])
                        })
        
        # Update chart data with boundaries
        chart_data.upper_boundary = upper_boundary
        chart_data.lower_boundary = lower_boundary
        
        return chart_data
    
    async def get_trade_signals(self, source: str) -> List[TradeSignal]:
        """Get trade signals for specified source using optimized parameters"""
        result = await self.run_backtest(source, self.optimized_params)
        return result.trade_signals
    
    async def get_performance_metrics(self, source: str) -> PerformanceMetrics:
        """Get performance metrics for specified source"""
        result = await self.run_backtest(source, self.optimized_params)
        return result.performance_metrics
    
    async def get_equity_curve(self, source: str) -> EquityCurve:
        """Get equity curve for specified source"""
        result = await self.run_backtest(source, self.optimized_params)
        result.equity_curve.source = source
        return result.equity_curve
    
    async def get_source_comparison(self) -> SourceComparison:
        """Get comparison of all data sources"""
        sources = await self.data_service.get_available_sources()
        active_sources = [s.name for s in sources if s.status == "active"]
        
        metrics = {}
        for source in active_sources:
            try:
                metrics[source] = await self.get_performance_metrics(source)
            except Exception as e:
                print(f"Failed to get metrics for {source}: {e}")
                continue
        
        if not metrics:
            raise Exception("No successful backtests to compare")
        
        # Calculate rankings by total return
        returns = {source: metrics[source].total_return_percent for source in metrics}
        sorted_sources = sorted(returns.items(), key=lambda x: x[1], reverse=True)
        rankings = {source: rank + 1 for rank, (source, _) in enumerate(sorted_sources)}
        
        return SourceComparison(
            sources=list(metrics.keys()),
            metrics=metrics,
            rankings=rankings,
            best_source=sorted_sources[0][0] if sorted_sources else "",
            worst_source=sorted_sources[-1][0] if sorted_sources else "",
            average_return=np.mean(list(returns.values())),
            return_spread=max(returns.values()) - min(returns.values()) if returns else 0
        )