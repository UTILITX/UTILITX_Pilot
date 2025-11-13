#!/usr/bin/env node

/**
 * Versioned Firebase Deployment Script
 * 
 * This script:
 * 1. Cleans old build folders
 * 2. Generates a version tag based on timestamp
 * 3. Builds the app with static export
 * 4. Writes version info to out/version.json
 * 5. Deploys to Firebase
 * 6. Prints deployment URL with version parameter
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`❌ Error executing: ${command}`, 'yellow');
    process.exit(1);
  }
}

// Generate version tag (YYYYMMDDHHMM format)
const now = new Date();
const version = now.toISOString().replace(/[-:T]/g, '').slice(0, 12); // YYYYMMDDHHMM

log('\n🧹 Cleaning old build folders...', 'blue');
exec('npm run clean');

log(`\n🔨 Building UTILITX version ${version}...`, 'blue');
exec('npm run build:firebase');

// Write version info to out/version.json
const versionInfo = {
  version,
  buildTime: now.toISOString(),
  buildDate: now.toLocaleDateString(),
  buildTimeLocal: now.toLocaleString(),
};

const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) {
  log('❌ Build failed: out directory not found', 'yellow');
  process.exit(1);
}

const versionPath = path.join(outDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
log(`✅ Version info written to ${versionPath}`, 'green');

log('\n🚀 Deploying to Firebase...', 'blue');
exec('firebase deploy');

log('\n✅ Deployment complete!', 'green');
log(`\n📦 Version: ${version}`, 'bright');
log(`📅 Build time: ${versionInfo.buildTimeLocal}`, 'bright');
log(`\n🌐 Visit: https://utilitx-pilot-a01bb.web.app/?v=${version}`, 'green');
log(`   (or your Firebase app URL with ?v=${version} parameter)\n`, 'green');







