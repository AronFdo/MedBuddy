#!/bin/bash
# Script to set environment variables for MedBuddy Backend on Google Cloud Run
# Usage: ./set-env-vars.sh

PROJECT_ID="arctic-joy-455408-v6"
SERVICE_NAME="medbuddy-backend"
REGION="asia-south1"

echo "Setting environment variables for ${SERVICE_NAME}..."

# Set environment variables
gcloud run services update ${SERVICE_NAME} \
  --project=${PROJECT_ID} \
  --region=${REGION} \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="SUPABASE_URL=your-supabase-url-here" \
  --set-env-vars="SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here"

echo "Environment variables set successfully!"
echo ""
echo "To verify, run:"
echo "gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(spec.template.spec.containers[0].env)'"

