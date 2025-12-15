#!/usr/bin/env node

/**
 * Wrapper script for iota-generate-prompt
 * Checks if create-iota-dapp is installed and runs the generate-prompt script
 */

const path = require('path');
const fs = require('fs');

// Try to find the generate-prompt script
let generatePromptScript;

// First, try to find it in node_modules
try {
  const packagePath = require.resolve('create-iota-dapp/package.json');
  generatePromptScript = path.join(path.dirname(packagePath), 'scripts', 'generate-prompt.js');
  if (!fs.existsSync(generatePromptScript)) {
    throw new Error('Script not found');
  }
} catch (e) {
  console.error('⚠️  [ERROR] Package installation incomplete!');
  console.error('   The create-iota-dapp package is not properly installed.');
  console.error('   Please run: npm install --legacy-peer-deps');
  process.exit(1);
}

// Run the generate-prompt script
require(generatePromptScript);

