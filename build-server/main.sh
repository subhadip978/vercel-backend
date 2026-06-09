#!/bin/bash
set -e

# The API server injects GIT_URL dynamically as an environment variable when spinning up the task.
# Validate that the environment variable exists
if [ -z "$GIT_URL" ]; then
  echo "Error: GIT_URL environment variable is not set."
  exit 1
fi

echo "Cloning repository: $GIT_URL"
git clone "$GIT_URL" /home/app/output

echo "Clone complete."

# Execute the built TypeScript script
exec node dist/script.js
