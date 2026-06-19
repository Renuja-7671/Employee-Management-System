#!/bin/sh
set -e
cd /app

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting EMS..."
exec su-exec nextjs node server.js
