#!/bin/bash
# Safety
set -euxo pipefail

ZOOMIEBOT_PATH=/data/project/zoomiebot

cd $ZOOMIEBOT_PATH/project

echo Updating project...

# Fetch latest
git fetch
# Clean all local changes
git reset --hard HEAD
# Pull the latest master commit
git pull

GIT_HASH=`git rev-parse --short HEAD`

echo Rebuilding...

# Build both web and bot
npm run build

echo Done! Deployed commit `git rev-parse --short HEAD`.

# Send email to maintainers
bash scripts/update-mail.sh | mail \
    -r tools.zoomiebot@toolforge.org \
    -s "New Zoomiebot version deployed [`$GIT_HASH`]" \
    "zoomiebot.maintainers@toolforge.org"
