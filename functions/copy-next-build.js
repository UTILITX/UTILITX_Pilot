/**
 * Copy Next.js build files to functions directory
 * This script runs during Firebase deployment to ensure the .next directory
 * is available to the Firebase Function.
 * 
 * Cross-platform script that works on Windows, macOS, and Linux.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const functionsDir = __dirname;
const nextDir = path.join(rootDir, '.next');
const nextConfigFile = path.join(rootDir, 'next.config.mjs');
const packageJsonFile = path.join(rootDir, 'package.json');

// Check if .next directory exists
if (!fs.existsSync(nextDir)) {
  console.error('❌ Error: .next directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Create functions/.next directory
const functionsNextDir = path.join(functionsDir, '.next');
if (fs.existsSync(functionsNextDir)) {
  console.log('🗑️  Removing existing functions/.next directory...');
  fs.rmSync(functionsNextDir, { recursive: true, force: true });
}

console.log('📦 Copying .next directory to functions/.next...');

// Custom copy function that excludes cache and source maps
function copyNextDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip cache directory
    if (entry.name === 'cache') {
      console.log('⏭️  Skipping .next/cache (not needed for SSR)');
      continue;
    }
    
    // Skip trace files
    if (entry.name === 'trace') {
      console.log('⏭️  Skipping .next/trace (not needed for SSR)');
      continue;
    }
    
    if (entry.isDirectory()) {
      copyNextDir(srcPath, destPath);
    } else {
      // Skip source map files
      if (entry.name.endsWith('.map')) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyNextDir(nextDir, functionsNextDir);
console.log('✅ Copied .next directory (excluding cache, trace, and source maps)');

// Copy next.config.mjs if it exists
if (fs.existsSync(nextConfigFile)) {
  const destConfig = path.join(functionsDir, 'next.config.mjs');
  fs.copyFileSync(nextConfigFile, destConfig);
  console.log('✅ Copied next.config.mjs');
}

// Copy package.json (needed for Next.js to resolve dependencies)
if (fs.existsSync(packageJsonFile)) {
  const destPackageJson = path.join(functionsDir, 'package.json.next');
  fs.copyFileSync(packageJsonFile, destPackageJson);
  console.log('✅ Copied package.json (as package.json.next)');
}

console.log('✅ Next.js build files copied successfully');

