# Baguskto Saham - MCP Server untuk Data Saham Indonesia

![Version](https://img.shields.io/badge/version-1.0.5-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

MCP Server untuk mengakses data Bursa Efek Indonesia (IDX) dengan dukungan **data historis lengkap dari tahun 2019**. Dibangun dengan Node.js dan TypeScript, server ini memungkinkan AI assistant untuk mengambil informasi saham real-time, data historis komprehensif, analisis teknikal, dan performa sektor.

## 🚀 New in v1.0.5

- ✅ **Data Historis Lengkap**: Akses data saham dari **2019 hingga sekarang** (6+ tahun)
- ✅ **Dataset GitHub Terintegrasi**: Data dari [Dataset-Saham-IDX](https://github.com/wildangunawan/Dataset-Saham-IDX)
- ✅ **Periode Extended**: Dukungan periode 2y dan 5y untuk analisis jangka panjang
- ✅ **958 Saham IDX**: Mencakup seluruh saham yang terdaftar di IDX
- ✅ **JSON-RPC Compliant**: Protokol MCP yang bersih tanpa error parsing
- ✅ **Robust Error Handling**: Penanganan error yang lebih baik untuk stabilitas

## Features

- 🏢 **Market Overview**: IHSG index, trading volume, top gainers/losers
- 📈 **Stock Information**: Real-time prices, volume, market cap, ratios
- 📊 **Historical Data**: Data OHLCV dari **2019-2025** dengan analisis teknikal
- 🏭 **Sector Performance**: Analisis performa sektor IDX
- 🔍 **Stock Search**: Cari saham berdasarkan ticker atau nama perusahaan
- 📈 **Stock Analysis**: Analisis teknikal lengkap dengan 15+ indikator
- ⚖️ **Stock Comparison**: Perbandingan performa multi-saham
- 📚 **Dataset Management**: Akses ke dataset historis komprehensif (958 saham)
- ⚡ **High Performance**: In-memory caching dengan TTL yang dapat dikonfigurasi
- 🔧 **Multiple Data Sources**: GitHub Dataset (historis) + Yahoo Finance (real-time) + Web scraping (fallback)
- 🛡️ **Type Safety**: Implementasi TypeScript penuh dengan validasi Zod

## Quick Start

### Instalasi dan Penggunaan dengan npx

Cara termudah menggunakan Baguskto Saham adalah dengan `npx`:

```bash
# Jalankan langsung dengan npx (otomatis install dan run)
npx @baguskto/saham@latest

# Test server
npx @baguskto/saham test

# Lihat statistik
npx @baguskto/saham stats

# Bersihkan cache
npx @baguskto/saham clear-cache
```

### Instalasi sebagai Dependency

```bash
# npm
npm install @baguskto/saham@latest

# yarn
yarn add @baguskto/saham

# pnpm
pnpm add @baguskto/saham
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/baguskto/saham-mcp.git
cd saham-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## MCP Tools

The server provides 9 comprehensive MCP tools:

### 1. get_market_overview

Get Indonesian stock market overview including IHSG index.

```json
{
  "name": "get_market_overview",
  "arguments": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ihsgValue": 7234.56,
    "ihsgChange": 45.23,
    "ihsgChangePercent": 0.63,
    "tradingVolume": 12300000000,
    "tradingValue": 8700000000000,
    "marketStatus": "open",
    "topGainers": [
      {"ticker": "ADRO", "name": "Adaro Energy", "price": 2840, "changePercent": 6.8}
    ],
    "topLosers": [
      {"ticker": "EMTK", "name": "Elang Mahkota", "price": 156, "changePercent": -3.2}
    ],
    "lastUpdated": "2025-01-15T08:30:00.000Z"
  },
  "source": "live",
  "responseTime": 1250
}
```

### 2. get_stock_info

Get detailed information for a specific Indonesian stock.

```json
{
  "name": "get_stock_info",
  "arguments": {
    "ticker": "BBCA"
  }
}
```

### 3. get_historical_data

Get historical price data for a specific stock **from 2019 to present**.

```json
{
  "name": "get_historical_data",
  "arguments": {
    "ticker": "TLKM",
    "period": "5y"
  }
}
```

**Parameters:**
- `ticker`: Stock ticker symbol (required)
- `period`: Time period - **"1d", "1w", "1m", "3m", "6m", "1y", "2y", "5y"** (default: "1y")

**Historical Data Coverage:**
- **Time Range**: July 2019 - Present (6+ years)
- **Data Points**: ~1,200+ entries per stock
- **Stocks Covered**: 958 IDX-listed stocks
- **Data Quality**: 91%+ success rate

### 4. get_sector_performance

Get performance data for all IDX sectors.

```json
{
  "name": "get_sector_performance",
  "arguments": {}
}
```

### 5. search_stocks

Search for stocks by company name or ticker symbol from 958 available stocks.

```json
{
  "name": "search_stocks",
  "arguments": {
    "query": "bank"
  }
}
```

### 6. get_stock_analysis

Get comprehensive technical analysis for a stock with indicators and recommendations.

```json
{
  "name": "get_stock_analysis",
  "arguments": {
    "ticker": "BBCA",
    "period": "2y"
  }
}
```

**Parameters:**
- `ticker`: Stock ticker symbol (required)
- `period`: Analysis period - **"1m", "3m", "6m", "1y", "2y", "5y"** (default: "1y")

### 7. compare_stocks

Compare performance of multiple stocks over a specified period.

```json
{
  "name": "compare_stocks",
  "arguments": {
    "tickers": ["BBCA", "BBRI", "BMRI"],
    "period": "2y"
  }
}
```

**Parameters:**
- `tickers`: Array of 2-5 stock ticker symbols (required)
- `period`: Comparison period - **"1m", "3m", "6m", "1y", "2y"** (default: "1y")

### 8. get_available_stocks

Get list of all 958 available stock tickers in the historical dataset.

```json
{
  "name": "get_available_stocks",
  "arguments": {}
}
```

**Response includes:**
- Complete list of 958 IDX stocks
- LQ45 categorization
- Banking sector identification

### 9. get_dataset_info

Get information about the historical dataset including last update and coverage.

```json
{
  "name": "get_dataset_info",
  "arguments": {}
}
```

**Response includes:**
- Repository information and last update
- Total available stocks (958)
- Cache statistics
- Data coverage range (2019-2025)

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Server settings
IDX_MCP_SERVER_NAME="IDX MCP Server"
IDX_MCP_DEBUG=false

# MCP Mode (for clean JSON-RPC communication)
IDX_MCP_LOG_LEVEL=error  # Enables MCP mode

# Cache settings
IDX_MCP_CACHE_TYPE=memory  # memory or redis
IDX_MCP_CACHE_TTL_MARKET_OVERVIEW=60
IDX_MCP_CACHE_TTL_STOCK_INFO=300
IDX_MCP_CACHE_TTL_HISTORICAL=86400  # 24 hours for historical data

# Data source timeouts
IDX_MCP_YAHOO_TIMEOUT=10000
IDX_MCP_WEB_TIMEOUT=15000
```

### Integrasi Claude Desktop

Tambahkan ke file konfigurasi Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "baguskto-saham": {
      "command": "npx",
      "args": ["@baguskto/saham@latest"],
      "env": {
        "IDX_MCP_LOG_LEVEL": "error"
      }
    }
  }
}
```

### Integrasi dengan Cursor IDE

```json
{
  "mcpServers": {
    "saham": {
      "command": "npx",
      "args": ["@baguskto/saham@latest"]
    }
  }
}
```

## Data Sources

### Primary Sources (Priority Order)

1. **GitHub Dataset-Saham-IDX** (Historical Data)
   - Source: [wildangunawan/Dataset-Saham-IDX](https://github.com/wildangunawan/Dataset-Saham-IDX)
   - Coverage: 2019-2025 (6+ years)
   - Stocks: 958 IDX stocks
   - Priority: HIGH
   - Cache TTL: 24 hours

2. **Yahoo Finance** (Real-time Data)
   - Real-time stock quotes
   - Live IHSG index data
   - Current market status
   - Priority: HIGH
   - Cache TTL: 5 minutes

3. **Web Scraping** (Fallback)
   - Market overview from financial websites
   - Fallback when primary sources fail
   - Priority: MEDIUM

## Performance & Reliability

- **Response Time**: < 2 seconds for all queries
- **Historical Data**: 1,200+ data points per stock (2019-2025)
- **Success Rate**: 91%+ for historical data parsing
- **Caching Strategy**:
  - Market overview: 1 minute
  - Stock info: 5 minutes
  - Historical data: 24 hours
  - Dataset info: Live fetch with caching
- **Error Handling**: Graceful degradation with multi-source fallback
- **MCP Compliance**: Clean JSON-RPC communication without parsing errors

## Sample Queries for AI Assistants

```text
"Show me BBCA stock performance over the last 5 years"

"Compare the 2-year performance of major banking stocks: BBCA, BBRI, BMRI"

"Get historical analysis of Telkom Indonesia (TLKM) from 2019 to now"

"What's the current market overview and how has IHSG performed this year?"

"Analyze the technical indicators for ADRO over the last 2 years"

"Search for mining stocks and show their 5-year performance"

"What's the dataset coverage and how many stocks are available?"

"Show me the best performing stocks in the last 6 months"
```

## Development

### Project Structure

```
src/
├── types/              # TypeScript type definitions
├── config/             # Configuration management
├── utils/              # Utilities (logging, GitHub API)
├── cache/              # Caching layer
├── data-sources/       # Data source implementations
│   ├── github-dataset.ts   # GitHub historical data
│   ├── yahoo-finance.ts    # Yahoo Finance integration
│   └── web-scraper.ts      # Web scraping fallback
├── services/           # Business logic services
│   ├── historical-data-service.ts  # Historical data management
│   ├── csv-parser.ts              # CSV parsing with column mapping
│   └── technical-analysis.ts      # Technical analysis
├── server/             # MCP server implementation
├── cli.ts              # CLI entry point
└── index.ts            # Main exports
```

## Troubleshooting

### Common Issues

1. **JSON parsing errors in MCP mode**
   ```bash
   # Ensure MCP mode is enabled
   IDX_MCP_LOG_LEVEL=error npx @baguskto/saham
   ```

2. **Historical data not loading**
   ```bash
   # Clear cache and retry
   npx @baguskto/saham clear-cache
   # Test GitHub connectivity
   npx @baguskto/saham test
   ```

3. **Yahoo Finance timeouts**
   - Increase timeout in configuration
   - Check internet connectivity
   - Use debug mode for diagnosis

### Debug Mode

```bash
# Enable debug logging (not for MCP mode)
IDX_MCP_DEBUG=true IDX_MCP_LOG_LEVEL=debug npx @baguskto/saham
```

## Version History

### v1.0.5 (Latest)
- ✅ **Complete GitHub Dataset Integration**: Full access to 2019-2025 historical data
- ✅ **Fixed Column Mapping Bug**: Resolved CSV parsing issues for historical data
- ✅ **Extended Period Support**: Added 2y and 5y analysis periods
- ✅ **JSON-RPC Compliance**: Clean MCP protocol communication
- ✅ **Enhanced Error Handling**: Robust error handling and fallback mechanisms
- ✅ **958 Stock Coverage**: Complete IDX stock universe support

### Previous Versions
- v1.0.4: Basic MCP implementation with Yahoo Finance
- v1.0.0-1.0.3: Initial releases and bug fixes

## Contributing

1. Fork the repository at [GitHub](https://github.com/baguskto/saham-mcp)
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- GitHub Issues: [Report bugs](https://github.com/baguskto/saham-mcp/issues)
- Discussions: [Community discussions](https://github.com/baguskto/saham-mcp/discussions)
- Documentation: [GitHub Repository](https://github.com/baguskto/saham-mcp)

---

**Dataset Credit**: Historical data provided by [Dataset-Saham-IDX](https://github.com/wildangunawan/Dataset-Saham-IDX) repository.

**Disclaimer**: This server provides market data for informational purposes only. Not intended for trading or investment decisions. Always verify data from official sources.