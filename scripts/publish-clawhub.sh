#!/bin/bash
set -euo pipefail

# Extract version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "Publishing ClawKitchen v$VERSION to ClawHub..."

# Check if logged in
if ! clawhub whoami >/dev/null 2>&1; then
    echo "Error: Not logged in to ClawHub. Run 'clawhub login' first."
    exit 1
fi

# Publish to ClawHub
echo "Publishing to ClawHub..."
clawhub publish . --version "$VERSION"

echo "✅ ClawKitchen v$VERSION published to ClawHub!"
echo ""
echo "Users can install with:"
echo "  openclaw plugins install clawhub:clawkitchen"
echo "  # or"
echo "  openclaw plugins install @jiggai/kitchen"