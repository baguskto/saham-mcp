#!/usr/bin/env node

/**
 * Dedicated MCP entry point - minimal startup for Claude Desktop
 */

// Set log level early to avoid stdout pollution
process.env['IDX_MCP_LOG_LEVEL'] = 'error';

// Suppress Yahoo Finance stdout noise that interferes with MCP protocol
console.log = (...args: any[]) => {
  const message = args.join(' ');
  // Suppress Yahoo Finance notifications that interfere with MCP JSON protocol
  if (message.includes('Please consider completing the survey') ||
      message.includes('Fetching crumb and cookies') ||
      message.includes('Success. Cookie expires') ||
      message.includes('fetch https://query') ||
      message.includes('New crumb:') ||
      message.includes('We expected a redirect')) {
    return; // Suppress these messages
  }
  // Allow other messages to go to stderr instead of stdout
  console.error(...args);
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