# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

This is **Baguskto Saham** - a production-ready MCP (Model Context Protocol) server providing Indonesian stock market data to AI assistants. Built with TypeScript and published as `@baguskto/saham` on npm.

## Architecture

**Language**: TypeScript/Node.js 18+  
**Framework**: @modelcontextprotocol/sdk  
**Protocol**: MCP JSON-RPC 2.0 over stdio  
**Package**: `@baguskto/saham`

### Components
- **MCP Server**: 9 tools using @modelcontextprotocol/sdk
- **Data Sources**: GitHub Dataset (historical), Yahoo Finance (live), Web scraping (fallback)
- **Cache**: In-memory with TTL
- **Parser**: Robust CSV parsing for Indonesian stock data

### Data Sources
| Source | Data Type | Priority |
|--------|-----------|----------|
| GitHub Dataset-Saham-IDX | Historical OHLCV (2019-2025) | HIGH |
| Yahoo Finance | Live quotes, IHSG | HIGH |
| Web Scraping | Fallback | MEDIUM |

## MCP Tools

**9 comprehensive tools**:

1. `get_market_overview()` - IHSG index, volume, top movers
2. `get_stock_info(ticker)` - Stock details, price, ratios
3. `get_historical_data(ticker, period)` - OHLCV data (2019-2025)
4. `get_sector_performance()` - All IDX sectors
5. `search_stocks(query)` - Find stocks by name/ticker
6. `get_stock_analysis(ticker, period)` - Technical analysis
7. `compare_stocks(tickers[], period)` - Multi-stock comparison
8. `get_available_stocks()` - List 958 available stocks
9. `get_dataset_info()` - Dataset metadata

## Development

### Requirements
- Node.js 18+
- TypeScript 5.3+

### Key Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol
- `yahoo-finance2` - Live data
- `axios` - HTTP client
- `cheerio` - Web scraping
- `winston` - Logging
- `zod` - Validation

## Performance

- Response time: <2 seconds
- Cache: Market (1 min), Stock (5 min), Historical (24 hours)
- 958 stocks supported
- Error handling with fallback sources

## Status

✅ **v1.0.5 Production Ready**  
✅ 9 MCP tools implemented  
✅ 958 stocks, 2019-2025 data  
✅ Published to npm  
✅ JSON-RPC compliant

## Usage Examples

```text
"How's IDX doing today?"
"Analyze BBCA with 2-year technical analysis"
"Show BBRI 5-year price history"
"Compare BBCA, BBRI, BMRI over 2 years"
"Search for mining companies"
"How many stocks are available?"
```

## Installation

```bash
# Run with npx
npx @baguskto/saham@latest

# Development
git clone https://github.com/baguskto/saham-mcp.git
cd saham-mcp && npm install && npm run build
```

## Claude Desktop Setup

```json
{
  "mcpServers": {
    "baguskto-saham": {
      "command": "npx",
      "args": ["@baguskto/saham@latest"],
      "env": { "IDX_MCP_LOG_LEVEL": "error" }
    }
  }
}
```

## Notes

- Public market data only
- Historical: 2019-2025 (958 stocks)
- Live: 15-min delay
- Multi-source fallback
- English/Indonesian support