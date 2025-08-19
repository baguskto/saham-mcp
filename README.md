# Baguskto Saham - MCP Server untuk Data Saham Indonesia

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

MCP Server untuk mengakses data Bursa Efek Indonesia (IDX). Dibangun dengan Node.js dan TypeScript, server ini memungkinkan AI assistant untuk mengambil informasi saham real-time, ringkasan pasar, data historis, dan performa sektor.

## Features

- 🏢 **Market Overview**: IHSG index, trading volume, top gainers/losers
- 📈 **Stock Information**: Real-time prices, volume, market cap, ratios
- 📊 **Historical Data**: OHLCV data for multiple time periods with technical analysis
- 🏭 **Sector Performance**: Performance analysis across IDX sectors
- 🔍 **Stock Search**: Find stocks by ticker or company name
- 📈 **Stock Analysis**: Complete technical analysis with 15+ indicators
- ⚖️ **Stock Comparison**: Compare multiple stocks performance
- 📚 **Dataset Management**: Access to comprehensive historical dataset
- ⚡ **High Performance**: In-memory caching with configurable TTL
- 🔧 **Multiple Data Sources**: Yahoo Finance with web scraping fallback
- 🛡️ **Type Safety**: Full TypeScript implementation with Zod validation

## Quick Start

### Instalasi dan Penggunaan dengan npx

Cara termudah menggunakan Baguskto Saham adalah dengan `npx`:

```bash
# Jalankan langsung dengan npx (otomatis install dan run)
npx @baguskto/saham

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
npm install @baguskto/saham

# yarn
yarn add @baguskto/saham

# pnpm
pnpm add @baguskto/saham
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/baguskto/saham.git
cd saham

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

**Response:**
```json
{
  "success": true,
  "data": {
    "ticker": "BBCA",
    "name": "Bank Central Asia Tbk PT",
    "currentPrice": 8750,
    "priceChange": 50,
    "priceChangePercent": 0.57,
    "dayHigh": 8825,
    "dayLow": 8700,
    "volume": 24300000,
    "marketCap": 1081500000000000,
    "peRatio": 24.3,
    "week52High": 9075,
    "week52Low": 7425,
    "lastUpdated": "2025-01-15T08:30:00.000Z"
  },
  "source": "cache",
  "responseTime": 12
}
```

### 3. get_historical_data

Get historical price data for a specific stock.

```json
{
  "name": "get_historical_data",
  "arguments": {
    "ticker": "TLKM",
    "period": "1m"
  }
}
```

**Parameters:**
- `ticker`: Stock ticker symbol (required)
- `period`: Time period - "1d", "1w", "1m", "3m", "1y" (default: "1m")

### 4. get_sector_performance

Get performance data for all IDX sectors.

```json
{
  "name": "get_sector_performance",
  "arguments": {}
}
```

### 5. search_stocks

Search for stocks by company name or ticker symbol.

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
    "period": "1y"
  }
}
```

**Parameters:**
- `ticker`: Stock ticker symbol (required)
- `period`: Analysis period - "1m", "3m", "6m", "1y", "2y", "5y" (default: "1y")

### 7. compare_stocks

Compare performance of multiple stocks over a specified period.

```json
{
  "name": "compare_stocks",
  "arguments": {
    "tickers": ["BBCA", "BBRI", "BMRI"],
    "period": "1y"
  }
}
```

**Parameters:**
- `tickers`: Array of 2-5 stock ticker symbols (required)
- `period`: Comparison period - "1m", "3m", "6m", "1y", "2y" (default: "1y")

### 8. get_available_stocks

Get list of all available stock tickers in the historical dataset.

```json
{
  "name": "get_available_stocks",
  "arguments": {}
}
```

### 9. get_dataset_info

Get information about the historical dataset including last update and coverage.

```json
{
  "name": "get_dataset_info",
  "arguments": {}
}
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Server settings
IDX_MCP_SERVER_NAME="IDX MCP Server"
IDX_MCP_DEBUG=false

# Cache settings
IDX_MCP_CACHE_TYPE=memory  # memory or redis
IDX_MCP_CACHE_TTL_MARKET_OVERVIEW=60
IDX_MCP_CACHE_TTL_STOCK_INFO=300
IDX_MCP_CACHE_TTL_HISTORICAL=86400

# Data source timeouts
IDX_MCP_YAHOO_TIMEOUT=10000
IDX_MCP_WEB_TIMEOUT=15000

# Logging
IDX_MCP_LOG_LEVEL=info  # error, warn, info, debug
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
      "args": ["@baguskto/saham"]
    }
  }
}
```

## CLI Commands

```bash
# Start the MCP server (default)
baguskto-saham
baguskto-saham start

# Start with debug mode
baguskto-saham start --debug

# Test connectivity and data sources
baguskto-saham test

# Show server statistics
baguskto-saham stats

# Clear cache
baguskto-saham clear-cache
```

## API Usage Examples

### Node.js Integration

```typescript
import { createServer, getDataSourceManager } from '@baguskto/saham';

// Create and start MCP server
const server = await createServer();
await server.run();

// Or use data sources directly
const dataManager = getDataSourceManager();
const marketData = await dataManager.getMarketOverview();
console.log('IHSG:', marketData?.ihsgValue);
```

### Sample Queries for AI Assistants

```text
"What's the current IHSG value and how is the market performing today?"

"Show me information about Bank Central Asia (BBCA) stock"

"Analyze BBCA stock with technical indicators for the last year"

"Compare performance of BBCA, BBRI, and BMRI over the last 6 months"

"Get the historical price data for Telkom Indonesia (TLKM) for the last month"

"Which sectors are performing best today?"

"Search for banking stocks in IDX"

"What stocks are available in the historical dataset?"

"Show me information about the historical dataset coverage"
```

## Data Sources

1. **Yahoo Finance** (Primary)
   - Real-time stock quotes
   - Historical OHLCV data
   - IHSG index data
   - Priority: HIGH

2. **Web Scraping** (Fallback)
   - Market overview from financial websites
   - Fallback when Yahoo Finance fails
   - Priority: MEDIUM

## Performance

- **Response Time**: < 2 seconds for all queries
- **Caching**: Intelligent caching with configurable TTL
  - Market overview: 1 minute
  - Stock info: 5 minutes
  - Historical data: 24 hours
- **Rate Limiting**: 60 requests per minute default
- **Error Handling**: Graceful degradation with fallback sources

## Development

### Project Structure

```
src/
├── types/          # TypeScript type definitions
├── config/         # Configuration management
├── utils/          # Utilities (logging, etc.)
├── cache/          # Caching layer
├── data-sources/   # Data source implementations
├── server/         # MCP server implementation
├── cli.ts          # CLI entry point
└── index.ts        # Main exports
```

### Building

```bash
# Clean build
npm run clean && npm run build

# Development build with watch
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Test with coverage
npm test -- --coverage

# Test server functionality
npm run build && node dist/cli.js test
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   ```bash
   npm run clean && npm install && npm run build
   ```

2. **Yahoo Finance timeouts**
   - Increase timeout in configuration
   - Check internet connectivity
   - Use debug mode: `IDX_MCP_DEBUG=true`

3. **Cache issues**
   ```bash
   npx @baguskto/saham clear-cache
   ```

### Debug Mode

```bash
# Enable debug logging
IDX_MCP_DEBUG=true IDX_MCP_LOG_LEVEL=debug npx @baguskto/saham
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Support

- GitHub Issues: [Report bugs](https://github.com/baguskto/saham/issues)
- Discussions: [Community discussions](https://github.com/baguskto/saham/discussions)

---

**Note**: This server provides market data for informational purposes only. Not intended for trading or investment decisions. Always verify data from official sources.