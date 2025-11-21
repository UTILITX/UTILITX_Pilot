# Deployment script for UTILITX - Merge to main and deploy to Firebase
# PowerShell version for Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment process..." -ForegroundColor Cyan

# Get current branch
$CURRENT_BRANCH = git rev-parse --abbrev-ref HEAD
Write-Host "📍 Current branch: $CURRENT_BRANCH" -ForegroundColor Yellow

# Set git to not use pager (PowerShell)
$env:GIT_PAGER = "cat"

# Commit .gitignore changes if any
$gitignoreStatus = git status --porcelain .gitignore
if ($gitignoreStatus) {
    Write-Host "📝 Committing .gitignore changes..." -ForegroundColor Yellow
    git add .gitignore
    git commit -m "chore: add certificate files to .gitignore"
}

# Switch to main
Write-Host "🔄 Switching to main branch..." -ForegroundColor Yellow
git checkout main 2>&1 | Out-Null

# Merge feature branch
Write-Host "🔀 Merging $CURRENT_BRANCH into main..." -ForegroundColor Yellow
git merge $CURRENT_BRANCH --no-edit 2>&1 | Out-Null

# Build Next.js
Write-Host "🏗️  Building Next.js application..." -ForegroundColor Yellow
npm run build

# Check if build succeeded
if (-not (Test-Path ".next")) {
    Write-Host "❌ Build failed - .next directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Deploy to Firebase
Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Cyan
firebase deploy

Write-Host "✅ Deployment complete!" -ForegroundColor Green

