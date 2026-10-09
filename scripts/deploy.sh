#!/bin/bash

# ================================================
# Visual Editor - Deployment Script
# ================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Visual Editor 2D - Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if a deployment target is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./deploy.sh [vercel|railway|fly|render|docker]${NC}"
    echo ""
    echo "Available targets:"
    echo "  vercel  - Deploy to Vercel (recommended for frontend)"
    echo "  railway - Deploy to Railway"
    echo "  fly     - Deploy to Fly.io"
    echo "  render  - Deploy to Render"
    echo "  docker  - Build and run Docker locally"
    exit 1
fi

TARGET=$1

case $TARGET in
    vercel)
        echo -e "${GREEN}Deploying to Vercel...${NC}"

        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi

        echo "Building and deploying..."
        vercel --prod

        echo -e "${GREEN}✅ Deployed to Vercel!${NC}"
        ;;

    railway)
        echo -e "${GREEN}Deploying to Railway...${NC}"

        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi

        # Check if logged in
        if ! railway whoami &> /dev/null; then
            echo "Please login to Railway..."
            railway login
        fi

        echo "Deploying..."
        railway up

        echo -e "${GREEN}✅ Deployed to Railway!${NC}"
        ;;

    fly)
        echo -e "${GREEN}Deploying to Fly.io...${NC}"

        if ! command -v flyctl &> /dev/null; then
            echo "Installing Fly CLI..."
            curl -L https://fly.io/install.sh | sh
        fi

        # Check if logged in
        if ! flyctl auth whoami &> /dev/null; then
            echo "Please login to Fly.io..."
            flyctl auth login
        fi

        # Check if app exists
        if ! flyctl apps list | grep -q "visual-editor-app"; then
            echo "Creating Fly.io app..."
            flyctl launch --no-deploy
        fi

        echo "Deploying..."
        flyctl deploy

        echo -e "${GREEN}✅ Deployed to Fly.io!${NC}"
        ;;

    render)
        echo -e "${GREEN}Deploying to Render...${NC}"
        echo ""
        echo -e "${YELLOW}Render deploys automatically from GitHub.${NC}"
        echo ""
        echo "Steps to deploy:"
        echo "1. Go to https://dashboard.render.com"
        echo "2. Click 'New +' -> 'Blueprint'"
        echo "3. Connect your GitHub repository"
        echo "4. Render will use render.yaml to configure the service"
        echo ""
        echo -e "${BLUE}Or trigger a manual deploy with the deploy hook URL.${NC}"
        ;;

    docker)
        echo -e "${GREEN}Building and running Docker locally...${NC}"

        # Build the image
        echo "Building Docker image..."
        docker build -t visual-editor-app:local .

        # Stop existing container if running
        docker stop visual-editor-app 2>/dev/null || true
        docker rm visual-editor-app 2>/dev/null || true

        # Run the container
        echo "Starting container..."
        docker run -d \
            --name visual-editor-app \
            -p 3000:3000 \
            --restart unless-stopped \
            visual-editor-app:local

        echo -e "${GREEN}✅ Running at http://localhost:3000${NC}"
        ;;

    *)
        echo -e "${RED}Unknown target: $TARGET${NC}"
        echo "Valid targets: vercel, railway, fly, render, docker"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
