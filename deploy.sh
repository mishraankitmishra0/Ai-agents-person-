#!/bin/bash

# InsightPilot AI - Deployment Script
# This script automates the deployment process

set -e

echo "🚀 InsightPilot AI Deployment Script"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ NPM version: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "🔑 Please edit .env and add your REACT_APP_CLAUDE_API_KEY"
    echo "   Then run this script again."
    exit 1
fi

# Build for production
echo ""
echo "🏗️  Building for production..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed. Check errors above."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo "📁 Build directory: ./build"
echo ""

# Ask for deployment platform
echo "🌐 Choose deployment platform:"
echo "1) Vercel (Recommended)"
echo "2) Netlify"
echo "3) GitHub Pages"
echo "4) Local testing only"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Vercel..."
        npm install -g vercel
        vercel --prod
        ;;
    2)
        echo ""
        echo "🚀 Deploying to Netlify..."
        npm install -g netlify-cli
        netlify deploy --prod --dir=build
        ;;
    3)
        echo ""
        echo "🚀 Preparing for GitHub Pages..."
        echo "Run: npm run build && gh-pages -d build"
        ;;
    4)
        echo ""
        echo "✅ Build ready for local testing!"
        echo "Run: npm start"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment script completed!"
echo ""
echo "📚 Documentation:"
echo "  - README: https://github.com/mishraankitmishra0/Ai-agents-person-/blob/main/README.md"
echo "  - Deployment Guide: https://github.com/mishraankitmishra0/Ai-agents-person-/blob/main/DEPLOYMENT.md"
echo "  - Performance Guide: https://github.com/mishraankitmishra0/Ai-agents-person-/blob/main/PERFORMANCE.md"
echo ""
