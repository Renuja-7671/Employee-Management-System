#!/bin/bash
echo "🔄 Updating EMS Application..."

cd /var/www/ems

echo "📥 Pulling latest code from GitHub..."
git fetch origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Git fetch failed"
    exit 1
fi

# Production should match GitHub. Fast-forward when possible; reset if diverged.
if git merge-base --is-ancestor HEAD origin/main 2>/dev/null && [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    git merge --ff-only origin/main
elif [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    echo "⚠️  Local branch diverged from GitHub. Resetting to origin/main..."
    git reset --hard origin/main
fi

if [ $? -ne 0 ]; then
    echo "❌ Error: Git pull failed"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: npm install failed"
    exit 1
fi

echo "🧹 Cleaning Next.js cache..."
rm -rf .next

echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

echo "♻️  Restarting PM2 process..."
pm2 restart ems

if [ $? -ne 0 ]; then
    echo "❌ Error: PM2 restart failed"
    exit 1
fi

echo "✅ Update complete!"
echo ""
echo "📊 Application status:"
pm2 status

echo ""
echo "📝 Recent logs:"
pm2 logs ems --lines 20 --nostream
