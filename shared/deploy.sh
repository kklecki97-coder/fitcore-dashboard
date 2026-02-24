#!/bin/bash
# Deploy to Vercel via deploy hooks
# Usage: ./shared/deploy.sh [dashboard|landing|both]

DASHBOARD_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_jZJeht6JKlqGLVDJADp2NzZ4zOM4/QZtTnlqMWJ"
LANDING_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_Dlf42hGmT1GjUyETDiW2wzpVi5pM/IxIr1xhCsN"

deploy_dashboard() {
  echo "Deploying dashboard to app.fitcore.tech..."
  curl -s -X POST "$DASHBOARD_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

deploy_landing() {
  echo "Deploying landing page to fitcore.tech..."
  curl -s -X POST "$LANDING_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

case "${1:-both}" in
  dashboard) deploy_dashboard ;;
  landing)   deploy_landing ;;
  both)      deploy_dashboard; deploy_landing ;;
  *)         echo "Usage: ./shared/deploy.sh [dashboard|landing|both]" ;;
esac
