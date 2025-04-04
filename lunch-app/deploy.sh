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
echo "Current commit: $CURRENT_COMMIT"

if [ -f "$LAST_COMMIT_FILE" ]; then
  LAST_COMMIT=$(cat "$LAST_COMMIT_FILE")
  echo "Last deployed commit: $LAST_COMMIT"
else
  echo "No previous deployment found."
  LAST_COMMIT=""
fi

# Always write current commit for next time
echo "Saving current commit for future reference"
echo $CURRENT_COMMIT > "$LAST_COMMIT_FILE"

# Ensure proper permissions on the database directory
echo "Setting proper permissions on database directory..."
mkdir -p database
chmod -R 777 database

if [ "$CURRENT_COMMIT" = "$LAST_COMMIT" ] && [ -n "$LAST_COMMIT" ]; then
  echo "No new changes since last deployment. Skipping rebuild."
else
  echo "Changes detected since last deployment."
  
  # Check if package.json files changed (requires full rebuild)
  if [ -n "$LAST_COMMIT" ]; then
    echo "Checking for dependency changes..."
    PKG_CHANGED=$(git diff --name-only $LAST_COMMIT $CURRENT_COMMIT | grep -E 'package.json|package-lock.json' || true)
    
    if [ -n "$PKG_CHANGED" ]; then
      echo "Dependencies changed, performing full rebuild..."
      echo "Running: docker-compose build --no-cache"
      docker-compose build --no-cache || { echo "Build failed, please check Docker logs"; exit 1; }
    else
      echo "Only code changes detected, performing incremental build..."
      echo "Running: docker-compose build"
      docker-compose build || { echo "Build failed, please check Docker logs"; exit 1; }
    fi
  else
    # First deployment or missing last commit
    echo "First deployment or missing last commit, performing full build..."
    echo "Running: docker-compose build"
    docker-compose build || { echo "Build failed, please check Docker logs"; exit 1; }
  fi
fi

# Ensure we have volumes with proper permissions
echo "Making sure Docker volumes have correct permissions..."
if ! docker-compose config --services | grep -q lunch-app; then
  echo "Error: lunch-app service not found in docker-compose.yml"
  exit 1
fi

# Restart containers
echo "Restarting containers..."
echo "Running: docker-compose up -d"
docker-compose up -d || { echo "Container startup failed, checking logs..."; docker-compose logs; exit 1; }

echo "Deployment completed successfully!"
echo "If you still encounter permission issues, you may need to run:"
echo "docker-compose exec lunch-app bash -c 'chmod -R 777 /app/public'" 