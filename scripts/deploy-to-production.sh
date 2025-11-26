#!/bin/bash
# Deployment script for UTILITX - Merge to main and deploy to Firebase

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Set git to not use pager
export GIT_PAGER=cat

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $CURRENT_BRANCH"

# Commit .gitignore changes if any
if [ -n "$(git status --porcelain .gitignore)" ]; then
    echo "📝 Committing .gitignore changes..."
    git add .gitignore
    git commit -m "chore: add certificate files to .gitignore"
fi

# Switch to main
echo "🔄 Switching to main branch..."
git checkout main

# Merge feature branch
echo "🔀 Merging $CURRENT_BRANCH into main..."
git merge "$CURRENT_BRANCH" --no-edit

# Build Next.js
echo "🏗️  Building Next.js application..."
npm run build

# Check if build succeeded
if [ ! -d ".next" ]; then
    echo "❌ Build failed - .next directory not found"
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"





