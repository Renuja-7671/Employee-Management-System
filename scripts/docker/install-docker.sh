#!/bin/bash
# Install Docker Engine + Compose plugin on Ubuntu VPS.
# Run as root: bash scripts/docker/install-docker.sh

set -euo pipefail

if command -v docker &>/dev/null; then
  echo "Docker already installed: $(docker --version)"
else
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker

# Compose plugin (docker compose)
if docker compose version &>/dev/null; then
  echo "Docker Compose: $(docker compose version)"
else
  echo "==> Installing docker-compose-plugin..."
  apt-get update -qq
  apt-get install -y docker-compose-plugin
fi

echo ""
echo "Docker is ready."
docker --version
docker compose version
echo ""
echo "Test: docker run --rm hello-world"
