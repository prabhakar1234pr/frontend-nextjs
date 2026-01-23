# Vercel Deployment Guide

Complete guide to deploy your Next.js frontend to Vercel and connect it to your GCP backend.

## Prerequisites

✅ Backend deployed on GCP Cloud Run:

- API URL: `https://gitguide-api-qonfz7xtjq-uc.a.run.app`
- Roadmap URL: `https://gitguide-roadmap-qonfz7xtjq-uc.a.run.app`
- Workspace VM: `http://35.222.130.245:8080`

✅ Clerk account set up with:

- Publishable Key
- Secret Key

---

## Step 1: Prepare Your Frontend Repository

### 1.1 Ensure your code is ready

```bash
cd frontend-nextjs
npm install
npm run build  # Test that build works locally
```

### 1.2 Push to GitHub (if not already)

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

## Step 2: Deploy -> Vercel

### 2.1 Sign up / Login to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in (use GitHub for easy integration)

### 2.2 Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Select the `frontend-nextjs` directory (or root if it's a monorepo)
4. Vercel will auto-detect Next.js

### 2.3 Configure Build Settings

**Framework Preset:** Next.js (auto-detected)
**Root Directory:** `frontend-nextjs` (if monorepo) or leave blank
**Build Command:** `npm run build` (default)
**Output Directory:** `.next` (default)
**Install Command:** `npm install` (default)

---

## Step 3: Configure Environment Variables

### 3.1 Add Environment Variables in Vercel

In your Vercel project settings → **Environment Variables**, add:

#### Required Variables:

```bash
# Backend API URL (Cloud Run)
NEXT_PUBLIC_API_URL=https://gitguide-api-qonfz7xtjq-uc.a.run.app

# Clerk Authentication (Production)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Optional: Clerk Sign-in/Sign-up URLs (if custom domains)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

#### Environment-Specific Settings:

**For Production:**

- Set all variables with **Production** environment selected

**For Preview/Development:**

- You can use different values (e.g., localhost backend for testing)

### 3.2 Get Your Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys**
4. Copy:
   - **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret Key** → `CLERK_SECRET_KEY`

---

## Step 4: Configure CORS on Backend

Your Cloud Run backend needs to allow requests from your Vercel domain.

### 4.1 Update Backend CORS Settings

The backend should already have CORS configured, but verify it allows your Vercel domain:

**In your backend code** (`app/main.py` or similar), ensure CORS includes:

```python
cors_origins = [
    "https://your-app.vercel.app",  # Your Vercel domain
    "https://*.vercel.app",          # All Vercel preview deployments
    # ... other origins
]
```

Or set `CORS_ORIGINS` environment variable in Cloud Run to include your Vercel domain.

---

## Step 5: Deploy

### 5.1 Trigger Deployment

1. Click **"Deploy"** in Vercel
2. Wait for build to complete (~2-5 minutes)
3. Vercel will provide you with a deployment URL: `https://your-app.vercel.app`

### 5.2 Verify Deployment

1. Visit your Vercel URL
2. Test authentication (sign in/up)
3. Test API connectivity (create a project, view dashboard)

---

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Follow DNS configuration instructions

### 6.2 Update CORS

After adding custom domain, update backend CORS to include:

- `https://yourdomain.com`
- `https://app.yourdomain.com`

---

## Step 7: Update Clerk Configuration

### 7.1 Add Vercel URL to Clerk

1. Go to Clerk Dashboard → **Configure** → **Domains**
2. Add your Vercel domain: `https://your-app.vercel.app`
3. Add any custom domains you configured

### 7.2 Update Redirect URLs

In Clerk Dashboard → **Paths**:

- **After sign-in:** `/dashboard`
- **After sign-up:** `/dashboard`

---

## Troubleshooting

### Issue: CORS Errors

**Symptom:** Browser console shows CORS errors when calling API

**Solution:**

1. Check backend CORS configuration includes Vercel domain
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Check Cloud Run logs for CORS-related errors

### Issue: Authentication Not Working

**Symptom:** Clerk sign-in redirects fail or tokens not working

**Solution:**

1. Verify Clerk keys are correct in Vercel environment variables
2. Check Clerk dashboard has Vercel domain whitelisted
3. Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_live_` (not `pk_test_`)

### Issue: API Calls Failing

**Symptom:** Frontend can't reach backend API

**Solution:**

1. Verify `NEXT_PUBLIC_API_URL` points to correct Cloud Run URL
2. Check Cloud Run service is running: `gcloud run services list`
3. Test API directly: `curl https://gitguide-api-qonfz7xtjq-uc.a.run.app/api/health`
4. Check browser network tab for actual request URLs

### Issue: Build Fails

**Symptom:** Vercel build fails

**Solution:**

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility (Vercel uses Node 20.x by default)
4. Test build locally: `npm run build`

---

## Environment Variables Summary

| Variable                            | Value                                          | Environment |
| ----------------------------------- | ---------------------------------------------- | ----------- |
| `NEXT_PUBLIC_API_URL`               | `https://gitguide-api-qonfz7xtjq-uc.a.run.app` | Production  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...`                                  | Production  |
| `CLERK_SECRET_KEY`                  | `sk_live_...`                                  | Production  |

---

## Quick Checklist

- [ ] Frontend code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Environment variables configured
- [ ] Clerk keys added (production keys)
- [ ] Backend CORS updated for Vercel domain
- [ ] Deployment successful
- [ ] Authentication tested
- [ ] API connectivity verified
- [ ] Custom domain configured (optional)

---

## Next Steps After Deployment

1. **Monitor Performance:** Check Vercel Analytics
2. **Set up Monitoring:** Configure error tracking (Sentry, etc.)
3. **Enable Preview Deployments:** Vercel auto-deploys PRs
4. **Configure CI/CD:** Ensure backend deploys trigger frontend rebuilds if needed

---

## Useful Commands

```bash
# Test build locally
cd frontend-nextjs
npm run build

# Check environment variables
vercel env ls

# Pull Vercel environment variables locally (if using Vercel CLI)
vercel env pull .env.local
```

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify backend Cloud Run logs
4. Test API endpoints directly with curl/Postman
