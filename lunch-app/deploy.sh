#!/bin/bash
set -e

# Store current directory
DEPLOY_DIR=$(pwd)
LAST_COMMIT_FILE=".last_deployed_commit"

echo "Starting deployment process..."

# Pull latest changes
echo "Pulling latest changes from git..."
git pull

# Check if we need to rebuild
CURRENT_COMMIT=$(git rev-parse HEAD)
if [ -f "$LAST_COMMIT_FILE" ]; then
  LAST_COMMIT=$(cat "$LAST_COMMIT_FILE")
else
  LAST_COMMIT=""
fi

if [ "$CURRENT_COMMIT" = "$LAST_COMMIT" ]; then
  echo "No new changes since last deployment. Skipping rebuild."
else
  echo "Changes detected since last deployment."
  
  # Check if package.json files changed (requires full rebuild)
  PKG_CHANGED=$(git diff --name-only $LAST_COMMIT $CURRENT_COMMIT | grep -E 'package.json|package-lock.json')
  
  if [ -n "$PKG_CHANGED" ]; then
    echo "Dependencies changed, performing full rebuild..."
    docker-compose build --no-cache
  else
    echo "Only code changes detected, performing incremental build..."
    docker-compose build
  fi
  
  # Save current commit
  echo $CURRENT_COMMIT > "$LAST_COMMIT_FILE"
fi

# Restart containers
echo "Restarting containers..."
docker-compose up -d

echo "Deployment completed successfully!" 