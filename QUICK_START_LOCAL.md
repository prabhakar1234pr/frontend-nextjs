# Quick Start: Frontend + Local Backend

## ✅ Yes, your frontend will connect to local backend automatically!

The frontend is already configured to use `http://localhost:8000` for the main API and `http://localhost:8002` for workspace endpoints in development mode.

## Setup (2 steps)

### 1. Start Backend Services

```bash
cd ai_tutor_for_github_repositories
docker-compose up -d
```

This starts:

- **API** on port 8000
- **Roadmap** on port 8001
- **Workspaces** on port 8002

### 2. Start Frontend

```bash
cd frontend-nextjs
npm run dev
```

Frontend runs on http://localhost:3000 and automatically connects to:

- `http://localhost:8000` for main API calls
- `http://localhost:8002` for workspace/terminal/git/preview calls

## That's it! 🎉

Your frontend will now use the local Docker Compose backend services.

## Optional: Override URLs

If you want to use different URLs, create `.env.local`:

```env
# Override main API URL (default: http://localhost:8000)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Override workspace API URL (default: http://localhost:8002)
NEXT_PUBLIC_WORKSPACE_API_BASE_URL=http://localhost:8002
WORKSPACE_API_BASE_URL=http://localhost:8002
```

## Verify Connection

1. **Check backend is running:**

   ```bash
   curl http://localhost:8000/api/health
   curl http://localhost:8002/health
   ```

2. **Check frontend:**
   - Open http://localhost:3000
   - Open browser DevTools → Network tab
   - You should see requests to `localhost:8000` and `localhost:8002`

## Troubleshooting

**Frontend can't connect?**

- Ensure backend is running: `docker-compose ps`
- Check backend logs: `docker-compose logs -f api`

**CORS errors?**

- Backend should have `CORS_ORIGINS=*` in `.env`
- Or add `http://localhost:3000` to CORS_ORIGINS

**Still using GCP URLs?**

- Check if you have `.env` or `.env.production` with GCP URLs
- Create `.env.local` to override (see above)

## Switching Back to GCP

To test against GCP backend instead:

1. Create `.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=https://gitguide-api-xxx.run.app
   NEXT_PUBLIC_WORKSPACE_API_BASE_URL=https://workspaces.gitguide.dev
   WORKSPACE_API_BASE_URL=https://workspaces.gitguide.dev
   ```

2. Restart frontend: `npm run dev`

See `LOCAL_BACKEND_CONNECTION.md` for detailed documentation.
