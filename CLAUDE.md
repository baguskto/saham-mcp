# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **IDX MCP Server** - an MCP (Model Context Protocol) server providing Indonesian stock market data to AI assistants like Claude, Cursor, and ChatGPT. The project is currently in the planning/setup phase with only a Product Requirements Document available.

## Project Architecture

Based on the PRD specifications, this will be:

**Language**: Python 3.10+  
**Framework**: FastMCP  
**Protocol**: MCP (Model Context Protocol) using JSON-RPC 2.0  
**Transport**: stdio (local) / HTTP+SSE (future)

### Core Components (Planned)
- **MCP Server**: Main server implementing MCP protocol
- **Data Aggregator**: Collects data from multiple sources
- **Cache Layer**: Redis/SQLite for performance
- **Data Sources**: Yahoo Finance API, Google Finance, web scrapers

### Data Sources Strategy
| Source | Data Type | Update Frequency | Priority |
|--------|-----------|------------------|----------|
| Yahoo Finance | Dual-listed stocks | Real-time | HIGH |
| Google Finance | Basic prices | 15 min delay | HIGH |
| IDX Website | Market overview | Daily | MEDIUM |
| Investing.com | Historical data | Daily | MEDIUM |
| Manual CSV | Stock list, sectors | Weekly | LOW |

## Core Features

### Basic Market Data (Live API)
1. **Market Overview** (`get_market_overview()`)
   - IHSG current value & change
   - Trading volume & value
   - Top 5 gainers/losers
   - Foreign flow summary

2. **Stock Information** (`get_stock_info(ticker)`)
   - Current price & change
   - Day's range, volume, market cap
   - 52-week high/low, P/E ratio

3. **Sector Performance** (`get_sector_performance()`)
   - All IDX sectors performance
   - Best/worst performing sectors

4. **Search Stocks** (`search_stocks(query)`)
   - Find stocks by company name or partial ticker

### Enhanced Historical Data & Analysis (Dataset-Saham-IDX Integration)
5. **Historical Data** (`get_historical_data(ticker, period)`)
   - Comprehensive OHLCV data from GitHub repository
   - Periods: 1m, 3m, 6m, 1y, 2y, 5y
   - Automatic fallback to live API if historical data unavailable

6. **Stock Analysis** (`get_stock_analysis(ticker, period)`)
   - Complete technical analysis with 15+ indicators
   - SMA/EMA (20, 50, 200), RSI, MACD, Bollinger Bands
   - Support/resistance levels, volatility analysis
   - Trading recommendations with confidence scores

7. **Stock Comparison** (`compare_stocks(tickers[], period)`)
   - Multi-stock performance comparison
   - Returns, volatility, volume analysis
   - Best/worst performer identification

8. **Dataset Management** 
   - `get_available_stocks()` - List all available tickers
   - `get_dataset_info()` - Repository info and cache statistics

## Development Setup

Since this is a new project, you'll need to:

1. Set up Python 3.10+ environment
2. Install dependencies as listed in PRD:
   - `yfinance`: Dual-listed stocks
   - `beautifulsoup4`: Web scraping
   - `pandas`: Data processing
   - `redis`: Caching
   - `httpx`: Async HTTP client
   - `pydantic`: Data validation
   - `fastmcp`: MCP framework

## Performance Requirements

- Response time: <2 seconds for all queries
- Cache TTL: Prices (5 min), Market overview (1 min), Historical (24 hours)
- Support 10+ concurrent requests
- Error rate: <1%

## Data Compliance

- Respect robots.txt for web scraping
- Rate limiting to prevent API abuse
- Data source attribution required
- No storage of user credentials
- Clear disclaimers about data accuracy

## Target Users

- **Retail Investors**: Quick stock checks in AI assistants
- **Developers**: Integration of IDX data into AI workflows
- **Financial Analysts**: Quick market insights during research

## Development Phases

**Phase 1 (Week 1-2)**: Core MCP server, market overview, stock lookup, basic caching  
**Phase 2 (Week 3-4)**: Historical data, foreign flow analysis, stock search  
**Phase 3 (Week 5-6)**: Documentation, examples, performance optimization

## Example Usage Patterns

```python
# Market overview
"How's IDX doing today?"

# Single stock analysis  
"Analyze BBCA"
"What's TLKM price?"

# Sector comparison
"Compare banking vs mining sector this week"

# Historical data
"Show BBRI price trend last month"
```

## Important Notes

- This is a defensive security project - only public market data access
- No trading functionality or personal portfolio tracking
- Data has 15-minute delay (acceptable for MVP)
- Must handle graceful degradation when data sources fail
- Support for both English and Indonesian responses