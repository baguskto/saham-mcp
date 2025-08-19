#!/usr/bin/env node

/**
 * Dedicated MCP entry point - minimal startup for Claude Desktop
 */

// Set log level early to avoid stdout pollution
process.env['IDX_MCP_LOG_LEVEL'] = 'error';

// Completely suppress all stdout output to ensure clean JSON-RPC communication

// Override all console methods that write to stdout
console.log = (...args: any[]) => {
  // In MCP mode, redirect all log output to stderr to avoid corrupting JSON-RPC
  if (process.env['IDX_MCP_LOG_LEVEL'] === 'error') {
    // Don't output anything to avoid JSON pollution
    return;
  }
  // In non-MCP mode, allow logging to stderr
  console.error('[LOG]', ...args);
};

console.info = (...args: any[]) => {
  // In MCP mode, redirect all info output to stderr to avoid corrupting JSON-RPC
  if (process.env['IDX_MCP_LOG_LEVEL'] === 'error') {
    // Don't output anything to avoid JSON pollution
    return;
  }
  console.error('[INFO]', ...args);
};

console.warn = (...args: any[]) => {
  // Always redirect warnings to stderr
  console.error('[WARN]', ...args);
};

// Also suppress any potential stdout writes from dependencies
const originalStdoutWrite = process.stdout.write;
process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
  // In MCP mode, suppress all stdout writes except for JSON-RPC responses
  if (process.env['IDX_MCP_LOG_LEVEL'] === 'error') {
    // Check if this looks like a JSON-RPC message (starts with { and contains "jsonrpc")
    const chunkStr = chunk.toString();
    if (chunkStr.trim().startsWith('{') && chunkStr.includes('"jsonrpc"')) {
      // Allow JSON-RPC messages through
      return originalStdoutWrite.call(this, chunk, encoding, callback);
    } else {
      // Suppress non-JSON-RPC output
      if (callback) callback();
      return true;
    }
  }
  // In non-MCP mode, allow normal stdout writes
  return originalStdoutWrite.call(this, chunk, encoding, callback);
};

import { createServer } from './server';

(async () => {
  try {
    const server = await createServer();
    await server.run();
  } catch (error) {
    // Only log to stderr in MCP mode
    console.error('Baguskto Saham MCP Server failed to start:', error);
    process.exit(1);
  }
})();