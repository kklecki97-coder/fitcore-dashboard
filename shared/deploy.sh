#!/bin/bash
# Deploy to Vercel via deploy hooks
# Usage: ./shared/deploy.sh [dashboard|landing|igpipeline|both]

DASHBOARD_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_jZJeht6JKlqGLVDJADp2NzZ4zOM4/QZtTnlqMWJ"
LANDING_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_Dlf42hGmT1GjUyETDiW2wzpVi5pM/IxIr1xhCsN"
IGPIPELINE_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_M0QqWu1vdgNDe5vHY0uZIb0TeIMy/wlCD1PCkzm"
CLIENT_PORTAL_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_nU7ugqfBBQda2JTvFVwgAlJvZHNO/C5NS7u98Gl"
DEMO_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_n30nqjaLKqsFFhAoLFbBzsPwfN8u/2NgOERs86D"

deploy_dashboard() {
  echo "Deploying dashboard to app.fitcore.tech..."
  curl -s -X POST "$DASHBOARD_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

deploy_landing() {
  echo "Deploying landing page to fitcore.tech..."
  curl -s -X POST "$LANDING_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

deploy_igpipeline() {
  echo "Deploying IG pipeline to igpipeline.fitcore.tech..."
  curl -s -X POST "$IGPIPELINE_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

deploy_client_portal() {
  echo "Deploying client portal to client.fitcore.tech..."
  curl -s -X POST "$CLIENT_PORTAL_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

deploy_demo() {
  echo "Deploying demo to demofitcore.tech..."
  curl -s -X POST "$DEMO_HOOK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deploy triggered: {d.get(\"job\",{}).get(\"state\",\"unknown\")}')" 2>/dev/null || echo "Deploy triggered"
}

case "${1:-both}" in
  dashboard)      deploy_dashboard ;;
  landing)        deploy_landing ;;
  igpipeline)     deploy_igpipeline ;;
  client-portal)  deploy_client_portal ;;
  demo)           deploy_demo ;;
  both)           deploy_dashboard; deploy_landing ;;
  all)            deploy_dashboard; deploy_landing; deploy_igpipeline; deploy_client_portal; deploy_demo ;;
  *)              echo "Usage: ./shared/deploy.sh [dashboard|landing|client-portal|demo|igpipeline|both|all]" ;;
esac
