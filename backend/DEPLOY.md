# Deploying MedBuddy Backend to Google Cloud Run

This guide will help you deploy the MedBuddy backend from Railway to Google Cloud Run.

## Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   gcloud config set project arctic-joy-455408-v6
   ```
3. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

## Deployment Options

### Option 1: Deploy using gcloud CLI (Recommended for first deployment)

1. Navigate to the backend directory:
   ```bash
   cd MedBuddy/backend
   ```

2. Build and deploy in one command:
   ```bash
   gcloud run deploy medbuddy-backend \
     --source . \
     --region asia-south1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars "NODE_ENV=production" \
     --set-secrets "SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-key:latest"
   ```

3. Set environment variables (if not using secrets):
   ```bash
   gcloud run services update medbuddy-backend \
     --region asia-south1 \
     --set-env-vars "NODE_ENV=production,SUPABASE_URL=your-url,SUPABASE_SERVICE_ROLE_KEY=your-key"
   ```

### Option 2: Deploy using Cloud Build (Recommended for CI/CD)

1. Submit the build:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

### Option 3: Manual Docker build and push

1. Build the Docker image:
   ```bash
   docker build -t gcr.io/arctic-joy-455408-v6/medbuddy-backend:latest .
   ```

2. Push to Container Registry:
   ```bash
   docker push gcr.io/arctic-joy-455408-v6/medbuddy-backend:latest
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy medbuddy-backend \
     --image gcr.io/arctic-joy-455408-v6/medbuddy-backend:latest \
     --region asia-south1 \
     --platform managed \
     --allow-unauthenticated
   ```

## Environment Variables

Set these environment variables in Cloud Run (via Console or CLI):

### Required Variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` - Your Supabase API key

### Optional Variables:
- `PORT` - Server port (Cloud Run sets this automatically, default: 8080)
- `NODE_ENV` - Set to `production`
- `BODY_SIZE_LIMIT` - Request body size limit (default: 10mb)

### Using Google Secret Manager (Recommended)

1. Create secrets:
   ```bash
   echo -n "your-supabase-url" | gcloud secrets create supabase-url --data-file=-
   echo -n "your-supabase-key" | gcloud secrets create supabase-key --data-file=-
   ```

2. Grant Cloud Run access:
   ```bash
   gcloud secrets add-iam-policy-binding supabase-url \
     --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   gcloud secrets add-iam-policy-binding supabase-key \
     --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Deploy with secrets:
   ```bash
   gcloud run deploy medbuddy-backend \
     --image gcr.io/arctic-joy-455408-v6/medbuddy-backend:latest \
     --region asia-south1 \
     --update-secrets "SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-key:latest"
   ```

## Configuration

### Update Memory and CPU (if needed):
```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --memory 512Mi \
  --cpu 1
```

### Set Concurrency (requests per instance):
```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --concurrency 80
```

### Set Min/Max Instances:
```bash
gcloud run services update medbuddy-backend \
  --region asia-south1 \
  --min-instances 0 \
  --max-instances 10
```

## Verify Deployment

1. Get the service URL:
   ```bash
   gcloud run services describe medbuddy-backend --region asia-south1 --format 'value(status.url)'
   ```

2. Test the health endpoint:
   ```bash
   curl https://YOUR_SERVICE_URL/health
   ```

## Update Frontend Configuration

Update your frontend to use the new Cloud Run URL instead of the Railway URL.

## Migration Checklist

- [ ] Create Google Cloud Project
- [ ] Enable required APIs
- [ ] Build and push Docker image
- [ ] Deploy to Cloud Run
- [ ] Set environment variables/secrets
- [ ] Test endpoints
- [ ] Update frontend configuration
- [ ] Update CORS if needed (currently allows all origins)
- [ ] Monitor logs: `gcloud run services logs read medbuddy-backend --region asia-south1`

## Troubleshooting

- View logs: `gcloud run services logs read medbuddy-backend --region asia-south1 --tail 50`
- Check service details: `gcloud run services describe medbuddy-backend --region asia-south1`
- Test locally with Docker: `docker run -p 8080:8080 -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... medbuddy-backend`

