# Claude Desktop MCP Configuration

## NPM Package Installation (Recommended)

Cara termudah menggunakan Baguskto Saham dengan Claude Desktop adalah via npm package:

```json
{
  "mcpServers": {
    "baguskto-saham": {
      "command": "npx",
      "args": ["@baguskto/saham"]
    }
  }
}
```

## Global Installation

Jika Anda prefer install secara global:

```bash
npm install -g @baguskto/saham
```

Kemudian gunakan di Claude Desktop config:

```json
{
  "mcpServers": {
    "baguskto-saham": {
      "command": "baguskto-saham"
    }
  }
}
```

## Local Development Setup

Untuk development lokal atau custom builds:

```json
{
  "mcpServers": {
    "baguskto-saham": {
      "command": "node",
      "args": ["dist/mcp-entry.js"],
      "cwd": "/path/to/your/saham"
    }
  }
}
```

## Troubleshooting

Jika Anda mendapat error module not found:
1. Pastikan Node.js 18+ terinstall: `node --version`
2. Coba install package terlebih dahulu: `npm install -g @baguskto/saham`
3. Periksa konektivitas internet untuk npm downloads
4. Restart Claude Desktop setelah mengubah config
5. Gunakan debug mode untuk melihat log detail: Tambahkan `"env": {"IDX_MCP_DEBUG": "true"}` ke config

## Available Tools

### Basic Market Data
- `test_connection` - Test MCP connection and server status
- `get_market_overview` - Get IHSG index, volume, top gainers/losers
- `get_stock_info` - Get individual stock information (requires ticker parameter)
- `get_sector_performance` - Get performance data for all IDX sectors  
- `search_stocks` - Search for stocks by name or ticker (requires query parameter)

### Enhanced Historical Data & Analysis
- `get_historical_data` - Get comprehensive historical OHLCV data from Dataset-Saham-IDX (requires ticker, optional period)
- `get_stock_analysis` - Get complete technical analysis with indicators and recommendations (requires ticker, optional period)
- `compare_stocks` - Compare performance of multiple stocks over time (requires array of tickers, optional period)
- `get_available_stocks` - Get list of all available stock tickers in the historical dataset
- `get_dataset_info` - Get information about the historical dataset including coverage and updates

### Technical Analysis Features
- **Moving Averages**: SMA and EMA (20, 50, 200 periods)
- **Momentum Indicators**: RSI, MACD with signal and histogram
- **Volatility**: Bollinger Bands and historical volatility
- **Support/Resistance**: Automatic level detection
- **Trading Recommendations**: Buy/Sell/Hold with confidence scores

## Example Usage

### Basic Queries
- "Test the connection to IDX MCP server"
- "What's the current IHSG index value?"
- "Get information about BBCA stock"
- "How are different sectors performing?"
- "Search for banking stocks"

### Historical Analysis
- "Show me TLKM historical data for the last year"
- "Analyze BBCA stock with technical indicators"
- "Compare performance between BBRI, BBCA, and BMRI over 6 months"
- "What stocks are available in the historical dataset?"
- "Get information about the dataset coverage"

### Advanced Analysis
- "Give me a comprehensive technical analysis of ASII"
- "Compare the performance of top 3 banking stocks"
- "Show me RSI and MACD indicators for TLKM"
- "Which stocks have the best performance this year?"