#!/bin/sh
set -e

echo "🚀 Building and deploying static site to GitHub Pages..."
npm run build
npm run gh-deploy
echo "✅ Deployed to blog.neurohubcare.com successfully!"
