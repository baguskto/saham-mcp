# Changelog

All notable changes to Baguskto Saham will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2025-08-19

### Added
- **Complete GitHub Dataset Integration**: Full access to Dataset-Saham-IDX repository
- **Extended Period Support**: Added 2y and 5y analysis periods for all tools
- **GitHubDatasetSource**: New data source class for historical data (src/data-sources/github-dataset.ts)
- **958 Stock Coverage**: Complete IDX stock universe from 2019-2025
- **Enhanced Error Handling**: Comprehensive error handling in DataSourceManager
- **JSON-RPC Protocol Compliance**: Clean MCP communication via mcp-entry.ts

### Fixed
- **Critical CSV Parser Bug**: Fixed column mapping where 'delisting_date' overrode 'date' column
- **GitHub Branch Reference**: Updated from 'main' to 'master' for Dataset-Saham-IDX repository
- **JSON Parsing Errors**: Implemented stdout interception to prevent console.log contamination
- **Limited Period Support**: Extended schema to support 2y and 5y periods
- **TypeScript Compilation**: Fixed syntax errors from malformed string replacements

### Changed
- **Historical Data Range**: Now provides 2019-2025 data (6+ years) instead of 1 year
- **Data Parsing Success Rate**: Improved to 91%+ for 958 stocks
- **MCP Entry Point**: Dedicated mcp-entry.ts for clean protocol communication
- **Cache Strategy**: Historical data cached for 24 hours (86400ms TTL)
- **Data Source Priority**: GitHub dataset now HIGH priority for historical data

### Technical Improvements
- **Enhanced CSV Parser**: Exact match priority system for column mapping
- **Robust GitHub API**: GitHubApiService with proper error handling
- **Performance Optimization**: 1,200+ data points per stock processing
- **Memory Management**: Efficient in-memory caching for large datasets
- **Type Safety**: Complete TypeScript coverage with Zod validation

## [1.0.4] - 2025-08-18

### Added
- Basic MCP server implementation with Yahoo Finance integration
- Initial 9 MCP tools framework
- Basic caching layer with memory storage
- Web scraping fallback for market data

### Fixed
- Initial Yahoo Finance API integration issues
- Basic error handling implementation

## [1.0.3] - 2025-08-17

### Fixed
- Package publishing issues
- CLI command registration
- npm distribution configuration

## [1.0.2] - 2025-08-17

### Fixed
- Module import/export issues
- TypeScript compilation errors
- Package.json bin configuration

## [1.0.1] - 2025-08-17

### Fixed
- Initial packaging and distribution issues
- Basic configuration setup

## [1.0.0] - 2025-08-16

### Added
- Initial release of Baguskto Saham MCP Server
- MCP (Model Context Protocol) server implementation using @modelcontextprotocol/sdk
- Nine comprehensive tools:
  - `get_market_overview()` - IHSG index and market data
  - `get_stock_info(ticker)` - Individual stock information
  - `get_historical_data(ticker, period)` - Historical OHLCV data (limited to 1y)
  - `get_sector_performance()` - IDX sector analysis
  - `search_stocks(query)` - Stock search functionality
  - `get_stock_analysis(ticker, period)` - Technical analysis
  - `compare_stocks(tickers[], period)` - Multi-stock performance comparison
  - `get_available_stocks()` - List available tickers
  - `get_dataset_info()` - Dataset information
- Data sources with fallback logic:
  - Yahoo Finance API (primary)
  - Web scraper fallback (secondary)
- Basic caching layer with configurable TTL
- Error handling with graceful degradation
- CLI tool with basic commands
- npm package distribution with npx support

### Technical Features
- Node.js 18+ compatibility with TypeScript 5.3+
- Zod schema validation for type safety
- Winston structured logging
- Complete TypeScript type definitions
- Basic technical analysis indicators

### Data Coverage
- Major Indonesian stocks via Yahoo Finance
- IDX sectors performance
- Real-time market data
- Limited historical data (1 year maximum)

### Performance
- Response time: <2 seconds target
- Basic caching implementation
- Error fallback mechanisms

### Documentation
- Initial README with usage examples
- Basic installation and setup guide
- Claude Desktop integration examples

---

## Development Notes

### v1.0.5 Breakthrough
The v1.0.5 release represents a major breakthrough in historical data access:
- **Before**: Limited to 1 year of data from Yahoo Finance
- **After**: Complete 2019-2025 dataset (6+ years) from GitHub repository
- **Impact**: 958 stocks with 1,200+ data points each, 91%+ success rate

### Architecture Evolution
- **v1.0.0-1.0.4**: Yahoo Finance + Web scraping
- **v1.0.5**: Multi-tier system (GitHub Dataset → Yahoo Finance → Web scraping)

### Key Technical Achievements
1. **CSV Parsing Robustness**: Handles various Indonesian stock data formats
2. **GitHub Integration**: Direct access to community-maintained dataset
3. **Protocol Compliance**: Clean JSON-RPC without stdout contamination
4. **Scalability**: Efficient processing of 958 stocks simultaneously
5. **Error Recovery**: Comprehensive fallback mechanisms across data sources

### Future Roadmap
- [ ] Real-time WebSocket data feeds
- [ ] Enhanced technical indicators
- [ ] Portfolio tracking capabilities
- [ ] Multi-language support (Bahasa Indonesia)
- [ ] Mobile app integration