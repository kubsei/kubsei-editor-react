#!/bin/bash

# ================================================
# Setup GitHub Secrets for CI/CD
# ================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   GitHub Secrets Setup Guide${NC}"
echo -e "${BLUE}================================================${NC}"

echo ""
echo -e "${YELLOW}This script will help you set up the required secrets for CI/CD.${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed.${NC}"
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Or manually add secrets at:"
    echo "https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Please login to GitHub CLI..."
    gh auth login
fi

echo ""
echo -e "${BLUE}Select your deployment target:${NC}"
echo "1) Vercel"
echo "2) Railway"
echo "3) Fly.io"
echo "4) Render"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Setting up Vercel secrets...${NC}"
        echo ""
        echo "You'll need:"
        echo "1. VERCEL_TOKEN - Get from https://vercel.com/account/tokens"
        echo "2. VERCEL_ORG_ID - Run 'vercel link' then check .vercel/project.json"
        echo "3. VERCEL_PROJECT_ID - Same as above"
        echo ""

        read -p "Enter VERCEL_TOKEN: " vercel_token
        read -p "Enter VERCEL_ORG_ID: " vercel_org_id
        read -p "Enter VERCEL_PROJECT_ID: " vercel_project_id

        gh secret set VERCEL_TOKEN --body "$vercel_token"
        gh secret set VERCEL_ORG_ID --body "$vercel_org_id"
        gh secret set VERCEL_PROJECT_ID --body "$vercel_project_id"

        # Set repository variable
        gh variable set DEPLOY_TARGET --body "vercel"

        echo -e "${GREEN}✅ Vercel secrets configured!${NC}"
        ;;

    2)
        echo ""
        echo -e "${YELLOW}Setting up Railway secrets...${NC}"
        echo ""
        echo "Get your token from: https://railway.app/account/tokens"
        echo ""

        read -p "Enter RAILWAY_TOKEN: " railway_token

        gh secret set RAILWAY_TOKEN --body "$railway_token"
        gh variable set DEPLOY_TARGET --body "railway"

        echo -e "${GREEN}✅ Railway secrets configured!${NC}"
        ;;

    3)
        echo ""
        echo -e "${YELLOW}Setting up Fly.io secrets...${NC}"
        echo ""
        echo "Get your token from: https://fly.io/user/personal_access_tokens"
        echo ""

        read -p "Enter FLY_API_TOKEN: " fly_token

        gh secret set FLY_API_TOKEN --body "$fly_token"
        gh variable set DEPLOY_TARGET --body "fly"

        echo -e "${GREEN}✅ Fly.io secrets configured!${NC}"
        ;;

    4)
        echo ""
        echo -e "${YELLOW}Setting up Render secrets...${NC}"
        echo ""
        echo "Get your deploy hook URL from your Render service settings"
        echo ""

        read -p "Enter RENDER_DEPLOY_HOOK_URL: " render_hook

        gh secret set RENDER_DEPLOY_HOOK_URL --body "$render_hook"
        gh variable set DEPLOY_TARGET --body "render"

        echo -e "${GREEN}✅ Render secrets configured!${NC}"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Your CI/CD pipeline is now configured."
echo "Push to the 'main' branch to trigger a deployment."
