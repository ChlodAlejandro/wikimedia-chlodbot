#!/usr/bin/env sh
# Setup environment
source "$HOME/.profile"
cd "$HOME/project/"

# Run task
npm run "$1"
