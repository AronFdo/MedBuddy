# Setting Environment Variables for Cloud Run

This guide shows how to set environment variables for the MedBuddy Backend on Google Cloud Run via CLI.

## Quick Reference

**Project ID:** `arctic-joy-455408-v6`  
**Service Name:** `medbuddy-backend`  
**Region:** `asia-south1`

## Method 1: Set All Variables at Once (Recommended)

```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --set-env-vars="NODE_ENV=production,SUPABASE_URL=https://qepwahqrjcfbxuiurgjc.supabase.co,SUPABASE_SERVICE_ROLE_KEY=yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHdhaHFyamNmYnh1aXVyZ2pjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc0ODcxNywiZXhwIjoyMDY2MzI0NzE3fQ.XVPlPc1eeDjPEYvf3sbEcMPUzzAEUAnYCNuTCLqBghk"
```

## Method 2: Set Variables Individually

Set each variable one at a time:

```bash
# Set NODE_ENV
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --update-env-vars="NODE_ENV=production"

# Set SUPABASE_URL
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --update-env-vars="SUPABASE_URL=https://your-project.supabase.co"

# Set SUPABASE_SERVICE_ROLE_KEY
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --update-env-vars="SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here"
```

## Method 3: Set Variables with File

Create a file `env-vars.yaml`:
```yaml
NODE_ENV: production
SUPABASE_URL: https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY: your-service-role-key-here
```

Then apply it:
```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --update-env-vars-file=env-vars.yaml
```

## Method 4: Add to Existing Variables

If you want to add variables without replacing existing ones:

```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --update-env-vars="NEW_VAR=value"
```

## Required Environment Variables

### Essential:
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (or `SUPABASE_ANON_KEY` as fallback)

### Recommended:
- `NODE_ENV` - Set to `production`

### Optional:
- `BODY_SIZE_LIMIT` - Request body size limit (default: `10mb`)
- `PORT` - Server port (Cloud Run sets this automatically, default: `8080`)

## Verify Environment Variables

Check current environment variables:

```bash
gcloud run services describe medbuddy-backend \
  --region asia-south1 \
  --format="value(spec.template.spec.containers[0].env)"
```

Or view in a more readable format:

```bash
gcloud run services describe medbuddy-backend \
  --region asia-south1 \
  --format="table(spec.template.spec.containers[0].env)"
```

## Remove Environment Variables

To remove a specific variable:

```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --remove-env-vars="VARIABLE_NAME"
```

To remove multiple variables:

```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --remove-env-vars="VAR1,VAR2,VAR3"
```

## Using Google Secret Manager (Recommended for Production)

For sensitive values like API keys, use Secret Manager instead:

### 1. Create Secrets

```bash
# Create SUPABASE_URL secret
echo -n "https://your-project.supabase.co" | \
  gcloud secrets create supabase-url \
  --data-file=- \
  --replication-policy="automatic"

# Create SUPABASE_SERVICE_ROLE_KEY secret
echo -n "your-service-role-key-here" | \
  gcloud secrets create supabase-service-role-key \
  --data-file=- \
  --replication-policy="automatic"
```

### 2. Grant Cloud Run Access

Get your project number:
```bash
PROJECT_NUMBER=$(gcloud projects describe arctic-joy-455408-v6 --format="value(projectNumber)")
```

Grant access:
```bash
# Grant access to SUPABASE_URL
gcloud secrets add-iam-policy-binding supabase-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to SUPABASE_SERVICE_ROLE_KEY
gcloud secrets add-iam-policy-binding supabase-service-role-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy with Secrets

```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --update-secrets="SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest"
```

## Complete Example

Here's a complete example setting all required variables:

```bash
# Replace these with your actual values
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-service-role-key-here"

gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --set-env-vars="NODE_ENV=production,SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_KEY}"
```

## Troubleshooting

### Check if variables are set correctly:
```bash
gcloud run services describe medbuddy-backend \
  --region asia-south1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

### View service logs to see if env vars are being used:
```bash
gcloud run services logs read medbuddy-backend \
  --region asia-south1 \
  --tail 50
```

### If you get permission errors:
Make sure you're authenticated and have the correct project set:
```bash
gcloud auth login
gcloud config set project arctic-joy-455408-v6
```

## Notes

- Environment variable changes trigger a new revision deployment
- New revisions are created automatically when you update env vars
- Changes take effect immediately after the update completes
- Variable names are case-sensitive
- Values containing spaces should be quoted

