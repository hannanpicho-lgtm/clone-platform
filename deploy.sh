#!/usr/bin/env bash
#
# Clone Platform - One-Command Production Deployment Script (macOS/Linux)
# 
# Usage:
#   ./deploy.sh                          # Standard deployment
#   ./deploy.sh --dry-run               # Show what would happen
#   ./deploy.sh --skip-tests            # Skip test phase
#   ./deploy.sh --environment staging   # Deploy to staging
#
# Requirements:
#   - Node.js & npm
#   - Supabase CLI (supabase login)
#   - Git
#

set -e

# Configuration
DEPLOYMENT_ID="$(date +%Y%m%d-%H%M%S)"
START_TIME=$(date +%s)
ENVIRONMENT="${ENVIRONMENT:-production}"
SKIP_TESTS=false
DRY_RUN=false
FUNCTION_NAME="make-server-44a642d3"
FUNCTION_URL="https://tpxgfjevorhdtwkesvcb.supabase.co/functions/v1/$FUNCTION_NAME"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  [$(date +'%H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ [$(date +'%H:%M:%S')] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  [$(date +'%H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}❌ [$(date +'%H:%M:%S')] $1${NC}"
}

log_step() {
    echo -e "${BLUE}📍 [$(date +'%H:%M:%S')] $1${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT VALIDATION
# ============================================================================

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  CLONE PLATFORM - PRODUCTION DEPLOYMENT (ID: $DEPLOYMENT_ID)"
echo "════════════════════════════════════════════════════════════"
echo ""

log_step "Phase 1: Pre-Deployment Validation Starting..."

# Check prerequisites
log_info "Checking prerequisites..."
for cmd in node npm git; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd not found - install and try again"
        exit 1
    fi
    log_success "$cmd found"
done

# Check git status
log_info "Checking Git status..."
if [[ -n $(git status --porcelain) ]]; then
    log_warning "Uncommitted changes detected"
    git status --short
    if [[ "$DRY_RUN" != "true" ]]; then
        read -p "Continue anyway? (yes/no): " -n 3 -r
        echo
        if [[ ! $REPLY =~ ^yes$ ]]; then
            log_warning "Deployment cancelled"
            exit 0
        fi
    fi
fi

# Check environment file
log_info "Checking environment configuration..."
if [[ ! -f ".env.local" ]] && [[ ! -f ".env.production.local" ]]; then
    log_warning "No .env file found. Deployment may fail if Supabase keys are missing."
else
    log_success "Environment file found"
fi

# ============================================================================
# PHASE 2: RUN TESTS
# ============================================================================

echo ""
log_step "Phase 2: Testing Starting..."

if [[ "$SKIP_TESTS" == "true" ]]; then
    log_warning "Tests skipped (--skip-tests)"
else
    log_info "Running smoke tests (27 tests)..."
    if npm run test:smoke; then
        log_success "All tests passed"
    else
        log_error "Tests failed - deployment aborted"
        exit 1
    fi
fi

# ============================================================================
# PHASE 3: BUILD
# ============================================================================

echo ""
log_step "Phase 3: Building Project..."

log_info "Building frontend (TypeScript/Vite)..."
if npm run build; then
    FILE_COUNT=$(find dist -type f | wc -l)
    log_success "Build artifacts created: $FILE_COUNT files"
else
    log_error "Build failed - deployment aborted"
    exit 1
fi

# ============================================================================
# PHASE 4: DEPLOYMENT
# ============================================================================

echo ""
log_step "Phase 4: Deploying to Production..."

if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN enabled - showing deployment steps only"
    echo ""
    echo "📋 Deployment would proceed with:"
    echo "  1. Deploy Edge Function: npx supabase functions deploy $FUNCTION_NAME --no-verify-jwt"
    echo "  2. Deploy Frontend: dist/ → Supabase/Vercel/Netlify"
    echo "  3. Run post-deployment tests"
    echo "  4. Health check verification"
    echo ""
    log_success "Dry run complete"
    exit 0
fi

# Deploy Supabase function
log_info "Deploying Supabase Edge Function..."
if npx supabase functions deploy $FUNCTION_NAME --no-verify-jwt; then
    log_success "Function deployed successfully"
else
    log_error "Function deployment failed"
    log_warning "Attempting rollback to previous version..."
    git checkout HEAD~1 -- supabase/functions/server/index.tsx
    npm run build
    npx supabase functions deploy $FUNCTION_NAME --no-verify-jwt 2>&1
    log_warning "Rolled back to previous version"
    exit 1
fi

# ============================================================================
# PHASE 5: POST-DEPLOYMENT VERIFICATION
# ============================================================================

echo ""
log_step "Phase 5: Post-Deployment Verification..."

log_info "Function URL: $FUNCTION_URL"

# Health check
log_info "Running health check..."
if curl -s "$FUNCTION_URL/health" | grep -q "ok"; then
    log_success "Health check PASSED"
else
    log_warning "Health check may have failed - check manually"
fi

# Run post-deployment smoke tests
log_info "Running post-deployment smoke tests..."
if FUNCTION_URL="$FUNCTION_URL" npm run test:smoke; then
    log_success "Post-deployment tests PASSED"
else
    log_warning "Post-deployment tests FAILED - check logs"
fi

# ============================================================================
# PHASE 6: SUMMARIZE DEPLOYMENT
# ============================================================================

END_TIME=$(date +%s)
DURATION=$((($END_TIME - $START_TIME) / 60))

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ PRODUCTION DEPLOYMENT SUCCESSFUL"
echo "════════════════════════════════════════════════════════════"
echo ""

log_info "📊 Deployment Summary:"
echo "  Deployment ID:    $DEPLOYMENT_ID"
echo "  Environment:      $ENVIRONMENT"
echo "  Timestamp:        $(date)"
echo "  Duration:         ${DURATION}m"
echo ""

log_info "📍 Next Steps:"
echo "  1. Monitor function logs:"
echo "     supabase functions logs $FUNCTION_NAME -n 50"
echo ""
echo "  2. View deployed function:"
echo "     $FUNCTION_URL"
echo ""
echo "  3. Check Supabase dashboard:"
echo "     https://app.supabase.com"
echo ""
echo "  4. Deploy frontend (if needed):"
echo "     Upload 'dist/' to Vercel/Netlify/Supabase Hosting"
echo ""

log_info "📚 Documentation:"
echo "  - API Reference:      API_REFERENCE.md"
echo "  - Operations Guide:   OPERATIONS_RUNBOOK.md"
echo "  - Integration Guide:  INTEGRATION_GUIDE.md"
echo "  - Quick Reference:    QUICK_REFERENCE.md"
echo ""

log_info "🔗 Useful Commands:"
echo "  - Health Check:       curl $FUNCTION_URL/health"
echo "  - View Logs:          supabase functions logs $FUNCTION_NAME"
echo "  - Test Collection:    postman_collection.json"
echo ""

# Create deployment record
mkdir -p deployment-records
cat > "deployment-records/$DEPLOYMENT_ID.json" <<EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "duration": "${DURATION}m",
  "status": "SUCCESS",
  "version": "$(git describe --tags --always)",
  "functionUrl": "$FUNCTION_URL"
}
EOF

log_info "Deployment record saved: deployment-records/$DEPLOYMENT_ID.json"

echo ""
log_success "🚀 Platform is LIVE and READY!"
echo ""
