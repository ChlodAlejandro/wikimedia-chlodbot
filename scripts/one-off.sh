#!/usr/bin/env sh
set -e

# Setup environment
source "~/.profile"
cd "~/project/"

# Run task
npm run "run:$1"

set +e
