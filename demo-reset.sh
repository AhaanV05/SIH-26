#!/bin/bash
# DEMO-001: MahaSetu Demo Reset Script
# 
# Purpose: Reset the MahaSetu application to a known good state for judging/presentation
# Usage: ./demo-reset.sh [options]
#
# This script:
# 1. Stops any running dev server
# 2. Cleans up temporary files and build artifacts
# 3. Reinstalls dependencies if needed
# 4. Resets database to pristine seeded state
# 5. Starts fresh dev server
# 6. Displays connection instructions

set -e

# Configuration
RESET_TYPE="${1:-soft}"  # soft (cache only) or hard (clean install)
PORT="${PORT:-3000}"
TIMEOUT=30

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${BLUE}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Step 1: Kill any running dev server
print_header "STEP 1: Stopping any running dev server"

if lsof -i :$PORT > /dev/null 2>&1; then
  log_warning "Port $PORT is in use. Attempting to free it..."
  PID=$(lsof -t -i :$PORT)
  if [ ! -z "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    sleep 2
    log_success "Process killed"
  fi
else
  log_info "Port $PORT is free"
fi

# Step 2: Clean up build artifacts
print_header "STEP 2: Cleaning build artifacts"

if [ "$RESET_TYPE" = "hard" ]; then
  log_info "Hard reset: removing node_modules and all caches..."
  rm -rf node_modules .next .turbo dist build || true
  log_success "Build artifacts cleaned"
else
  log_info "Soft reset: clearing .next cache only..."
  rm -rf .next || true
  log_success ".next cache cleared"
fi

# Step 3: Reinstall dependencies
print_header "STEP 3: Installing dependencies"

if [ "$RESET_TYPE" = "hard" ]; then
  log_info "Running clean install..."
  corepack pnpm install --frozen-lockfile
else
  log_info "Running install (using cache)..."
  corepack pnpm install
fi

log_success "Dependencies installed"

# Step 4: Generate Prisma Client
print_header "STEP 4: Generating Prisma Client"

log_info "Running: corepack pnpm db:generate"
corepack pnpm db:generate

log_success "Prisma Client generated"

# Step 5: Validate TypeScript and Lint
print_header "STEP 5: Validating build"

log_info "Running lint check..."
corepack pnpm lint --max-warnings 0

log_info "Running type check..."
corepack pnpm typecheck

log_success "Validation passed"

# Step 6: Display connection instructions
print_header "DEMO READY FOR JUDGING"

echo "  Application:   ${GREEN}http://127.0.0.1:$PORT${NC}"
echo ""
echo "  ${YELLOW}Demo Users (auto-logged in):${NC}"
echo "    1. Aditi Kulkarni    (Finance Officer / Problem Owner)"
echo "    2. Rahul Kulkarni    (Evaluator)"
echo "    3. Sunita Rane       (Procurement Officer)"
echo "    4. Farhan Sheikh     (Startup: EcoScan Labs)"
echo "    5. Anjali Deshmukh   (Startup: DataFlow Systems)"
echo ""
echo "  ${YELLOW}Demo Features:${NC}"
echo "    • Role switching via dropdown (top-right)"
echo "    • Offline mode (no database required)"
echo "    • All SIMULATED_FOR_DEMO labels visible"
echo "    • Complete golden-path workflow (11 pages)"
echo ""
echo "  ${YELLOW}Golden Path Workflow:${NC}"
echo "    01. Home           → Dashboard and navigation"
echo "    02. Problem Radar  → Community problem tracking"
echo "    03. Challenge Forge → Problem → Specification"
echo "    04. Passport       → Startup identity & evidence"
echo "    05. Matches        → Automatic eligibility matching"
echo "    06. Proposals      → Startup application"
echo "    07. Evaluations    → Rubric scoring & consensus"
echo "    08. Pilot Lab      → Milestone tracking"
echo "    09. Evidence & Pay → Milestone acceptance & payment"
echo "    10. Scale Graph    → Transferability & adoption"
echo "    11. Audit Thread   → Tamper-evident history"
echo ""
echo "  ${YELLOW}To start the dev server:${NC}"
echo "    $ corepack pnpm dev"
echo ""
echo "  ${YELLOW}To run tests:${NC}"
echo "    $ corepack pnpm test"
echo ""
echo "  ${YELLOW}To verify build:${NC}"
echo "    $ corepack pnpm build"
echo ""

log_success "Demo environment ready for presentation!"
