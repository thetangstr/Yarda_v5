#!/bin/bash

# Yarda API - Deployment Configuration Validator
# Validates all deployment configurations before pushing to GitHub

set -e

echo "====================================="
echo "Yarda API - Deployment Validator"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found: $description"
        echo "  Location: $file"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $description"
        echo "  Expected: $file"
        ((ERRORS++))
        return 1
    fi
}

check_content() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $description"
        echo "  File: $file"
        echo "  Pattern: $pattern"
        ((ERRORS++))
        return 1
    fi
}

# 1. Check critical configuration files
echo "1. Checking Configuration Files..."
echo "   ─────────────────────────────────"
check_file "nixpacks.toml" "Python build configuration"
check_file "railway.toml" "Railway deployment settings"
check_file "Procfile" "Process definition"
check_file "backend/railway.json" "Backend service config"
check_file "backend/requirements.txt" "Python dependencies"
echo ""

# 2. Check nixpacks.toml content
echo "2. Validating nixpacks.toml..."
echo "   ──────────────────────────"
if [ -f "nixpacks.toml" ]; then
    check_content "nixpacks.toml" "python311" "Python 3.11 runtime specified"
    check_content "nixpacks.toml" "postgresql" "PostgreSQL available"
    check_content "nixpacks.toml" "requirements.txt" "Requirements file referenced"
    check_content "nixpacks.toml" "uvicorn" "Uvicorn start command"
fi
echo ""

# 3. Check railway.toml content
echo "3. Validating railway.toml..."
echo "   ────────────────────────"
if [ -f "railway.toml" ]; then
    check_content "railway.toml" "NIXPACKS" "NIXPACKS builder configured"
    check_content "railway.toml" "production" "Production environment defined"
    check_content "railway.toml" "staging" "Staging environment defined"
    check_content "railway.toml" "healthcheckPath" "Health check configured"
fi
echo ""

# 4. Check GitHub Actions workflows
echo "4. Checking GitHub Actions Workflows..."
echo "   ──────────────────────────────────"
check_file ".github/workflows/deploy-staging.yml" "Staging deployment workflow"
check_file ".github/workflows/deploy-production.yml" "Production deployment workflow"

if [ -f ".github/workflows/deploy-staging.yml" ]; then
    check_content ".github/workflows/deploy-staging.yml" "001-data-model" "Staging branch trigger configured"
fi

if [ -f ".github/workflows/deploy-production.yml" ]; then
    check_content ".github/workflows/deploy-production.yml" "master" "Production branch trigger configured"
fi
echo ""

# 5. Check backend structure
echo "5. Validating Backend Structure..."
echo "   ───────────────────────────────"
if [ -d "backend/src" ]; then
    echo -e "${GREEN}✓${NC} Backend source directory exists"
else
    echo -e "${RED}✗${NC} Backend source directory missing"
    ((ERRORS++))
fi

if [ -f "backend/src/main.py" ]; then
    echo -e "${GREEN}✓${NC} Main FastAPI application file exists"
else
    echo -e "${RED}✗${NC} Main FastAPI application file missing"
    ((ERRORS++))
fi

if [ -d "backend/src/api/endpoints" ]; then
    echo -e "${GREEN}✓${NC} API endpoints directory exists"
    # Count endpoints
    count=$(find backend/src/api/endpoints -name "*.py" | wc -l)
    echo "  Found $count endpoint modules"
else
    echo -e "${YELLOW}⚠${NC} API endpoints directory not found (might be OK)"
fi
echo ""

# 6. Check requirements.txt
echo "6. Validating requirements.txt..."
echo "   ──────────────────────────────"
if [ -f "backend/requirements.txt" ]; then
    check_content "backend/requirements.txt" "fastapi" "FastAPI dependency"
    check_content "backend/requirements.txt" "uvicorn" "Uvicorn server"
    check_content "backend/requirements.txt" "asyncpg" "AsyncPG for PostgreSQL"
    check_content "backend/requirements.txt" "pydantic" "Pydantic for validation"

    # Count dependencies
    dep_count=$(grep -v "^#" backend/requirements.txt | grep -v "^$" | wc -l)
    echo "  Total dependencies: $dep_count"
fi
echo ""

# 7. Check documentation
echo "7. Checking Documentation..."
echo "   ─────────────────────────"
check_file "docs/RAILWAY_DEPLOYMENT.md" "Detailed deployment guide"
check_file "DEPLOYMENT_QUICK_START.md" "Quick start guide"
echo ""

# 8. Check environment setup
echo "8. Checking Environment Configuration..."
echo "   ────────────────────────────────────"
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} Environment template exists (.env.example)"
    # Check for critical variables
    check_content ".env.example" "DATABASE_URL" "Database URL template"
    check_content ".env.example" "SUPABASE" "Supabase variables"
    check_content ".env.example" "GOOGLE" "Google API keys"
else
    echo -e "${YELLOW}⚠${NC} Environment template not found"
fi
echo ""

# 9. Check git status
echo "9. Checking Git Status..."
echo "   ──────────────────────"
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Valid git repository"

    # Check for uncommitted changes in critical files
    critical_files=("nixpacks.toml" "railway.toml" "Procfile" "backend/requirements.txt")
    for file in "${critical_files[@]}"; do
        if git status --porcelain | grep -q "$file"; then
            echo -e "${YELLOW}⚠${NC} Uncommitted changes in: $file"
            ((WARNINGS++))
        fi
    done

    # Check current branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    echo "  Current branch: $current_branch"
else
    echo -e "${RED}✗${NC} Not a git repository"
    ((ERRORS++))
fi
echo ""

# 10. Check for common issues
echo "10. Checking for Common Issues..."
echo "    ────────────────────────────"

# Check for Node.js detection triggers
if [ -f "package.json" ] && [ ! -f "nixpacks.toml" ]; then
    echo -e "${RED}✗${NC} package.json found without nixpacks.toml"
    echo "  This will cause Node.js to be detected instead of Python"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No Node.js detection conflicts"
fi

# Check for node_modules in wrong place
if [ -d "node_modules" ] && [ ! -d "frontend" ]; then
    echo -e "${YELLOW}⚠${NC} node_modules in root (not in frontend)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} Node modules properly organized"
fi

# Check for secrets in files
if grep -r "RAILWAY_TOKEN\|STRIPE_KEY\|DATABASE_PASSWORD" . \
    --include="*.py" --include="*.js" --include="*.ts" 2>/dev/null | grep -v "\.example"; then
    echo -e "${RED}✗${NC} Potential secrets found in tracked files"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} No hardcoded secrets detected"
fi

echo ""
echo "====================================="
echo "Validation Summary"
echo "====================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to deploy. Next steps:"
    echo "  1. Commit changes: git add . && git commit -m '...'"
    echo "  2. Push to staging: git push origin 001-data-model"
    echo "  3. Monitor: GitHub Actions → Deploy to Staging"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo "Fix errors before deploying. Review messages above."
    echo ""
    exit 1
fi
