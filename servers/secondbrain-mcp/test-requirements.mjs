#!/usr/bin/env node

/**
 * Test the new SECONDBRAIN_MODEL requirement
 */

import { loadConfig } from './dist/utils/config.js';

console.log('🧪 Testing SECONDBRAIN_MODEL requirement...');

// Test case 1: Missing both environment variables
console.log('\nTest 1: Missing both environment variables');
try {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.SECONDBRAIN_MODEL;

  // This should cause the process to exit
  const config = loadConfig();
  console.log('❌ FAIL: Should have exited due to missing environment variables');
} catch (error) {
  console.log('✅ PASS: Caught error due to missing variables');
}

console.log('\nTesting complete!');
