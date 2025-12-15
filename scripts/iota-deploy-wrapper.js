#!/usr/bin/env node

/**
 * Wrapper script for iota-deploy
 * Checks if create-iota-dapp is installed and runs the deploy script
 */

const path = require('path');
const fs = require('fs');

// Try to find the deploy script
let deployScript;

// First, try to find it in node_modules
try {
  const packagePath = require.resolve('create-iota-dapp/package.json');
  deployScript = path.join(path.dirname(packagePath), 'scripts', 'deploy.js');
  if (!fs.existsSync(deployScript)) {
    throw new Error('Script not found');
  }
} catch (e) {
  console.error('⚠️  [ERROR] Package installation incomplete!');
  console.error('   The create-iota-dapp package is not properly installed.');
  console.error('   Please run: npm install --legacy-peer-deps');
  process.exit(1);
}

// Run the deploy script
require(deployScript);

