#!/usr/bin/env node

import { SecondBrainServer } from './core/server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    const server = new SecondBrainServer();
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Failed to start SecondBrain MCP Server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

main().catch((error) => {
  logger.error('Unhandled error in main', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});
