# Strategy Description Tab Visual Structure

## Tab Navigation Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│  [Overview]  [Strategy Description]  [Performance]  [List of trades] │
│      ✓              ✓ NEW               ✓               ✓           │
└─────────────────────────────────────────────────────────────────────┘
```

## Strategy Description Tab Content

### For "Breakout for long and short" Strategy:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Breakout for long and short - Strategy Description                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📊 Strategy Overview                                                │
│ The Adaptive Volatility Breakout strategy is designed to capture    │
│ significant price movements in both directions...                   │
│                                                                     │
│ 📈 Entry Rules                                                      │
│ • Long Entry: Price breaks above upper boundary                    │
│ • Short Entry: Price breaks below lower boundary                   │
│ • Reversal Capability: Switch between long/short                   │
│                                                                     │
│ 📉 Exit Rules                                                       │
│ • Stop Loss: ATR-based stop loss                                   │
│ • Reversal Exit: Exit on opposite breakout                         │
│ • Dynamic Adjustment: Adapts to volatility                         │
│                                                                     │
│ ⚙️ Key Parameters                                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │Lookback      │ │Range         │ │Stop Loss     │ │ATR Period    ││
│ │Period (20)   │ │Multiplier    │ │Multiplier    │ │(14)          ││
│ │Time window   │ │(0.5)         │ │(2.5)         │ │Volatility    ││
│ │for breakout  │ │Sensitivity   │ │Risk mgmt     │ │measure       ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│
│                                                                     │
│ 🎯 Market Conditions                                                │
│ ✅ Best Performance: Strong trending markets                        │
│ ❌ Challenging: Sideways/choppy markets                             │
│ 🛡️ Risk Management: Dynamic ATR-based stops                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### For "Trend Following" Strategy:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Trend Following - Strategy Description                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📊 Strategy Overview                                                │
│ A sophisticated long-only trend following strategy that combines    │
│ multiple technical indicators to identify and ride strong uptrends. │
│                                                                     │
│ 📈 Entry Rules                                                      │
│ • Trend Filter: Fast SMA (50) above Slow SMA (250)                │
│ • Strength Filter: ADX > threshold (15)                           │
│ • Noise Filter: Choppiness Index < threshold (55)                 │
│ • Breakout Signal: Price above Donchian Channel                    │
│                                                                     │
│ 📉 Exit Rules                                                       │
│ • ATR Trailing Stop: 5.0 × ATR below price                        │
│ • Trend Reversal: Fast SMA crosses below Slow SMA                 │
│ • Adaptive Stops: Adjusts with volatility                         │
│                                                                     │
│ ⚙️ Key Parameters                                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │SMA Fast/Slow │ │Donchian      │ │ATR           │ │ADX/Chop      ││
│ │(50/250)      │ │Length (20)   │ │Multiplier    │ │Thresholds    ││
│ │Trend regime  │ │Breakout      │ │(5.0)         │ │Market        ││
│ │identification│ │channel       │ │Trail distance│ │filters       ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│
│                                                                     │
│ 🎯 Market Conditions                                                │
│ ✅ Best Performance: Strong, sustained uptrends                     │
│ ❌ Challenging: Choppy, sideways markets                            │
│ 🛡️ Risk Management: Multi-layer filtering system                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### For Unimplemented Strategies (Mean Reversion & Momentum):

```
┌─────────────────────────────────────────────────────────────────────┐
│ Mean Reversion - Strategy Description                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                           🚧 Strategy Under Development             │
│                                                                     │
│  Mean reversion strategy that identifies overbought and oversold    │
│  conditions for potential reversal opportunities.                   │
│                                                                     │
│  This strategy is currently being developed and will be available   │
│  in a future update. Please select "Breakout for long and short"    │
│  or "Trend Following" to test implemented strategies.               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Color Scheme (Dark Theme)

- **Background**: `#161b22` (cards), `#0d1117` (main), `#21262d` (accents)
- **Text**: `#f0f6fc` (primary), `#c9d1d9` (content), `#7d8590` (secondary)
- **Borders**: `#30363d` (main), `#21262d` (subtle)
- **Headers**: `#58a6ff` (blue accent)
- **Success**: `#56d364` (green)
- **Warning**: `#f85149` (red)
- **Development**: `#f85149` (red for "Under Development")

## Interactive Elements

1. **Tab Switching**: Click any tab to navigate
2. **Strategy Selection**: Dropdown updates all content dynamically
3. **Parameter Cards**: Display current values and descriptions
4. **Status Indicators**: Clear visual feedback for strategy availability

## Responsive Design

- Grid layout adapts to screen size
- Parameter cards reflow on smaller screens
- Typography scales appropriately
- Maintains readability across devices