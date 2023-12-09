#!/bin/bash
# Safety
set -euxo pipefail

echo Resetting job list...
toolforge jobs flush
toolforge jobs load etc/jobs.yaml

echo Building new image...
toolforge build start https://github.com/ChlodAlejandro/zoomiebot/

echo Restarting deployment...
kubectl apply -f etc/k8s/zoomiebot.yaml
kubectl rollout restart deployment zoomiebot
