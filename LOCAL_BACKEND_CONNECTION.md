# Connecting Frontend to Local Backend

This guide shows how to connect your Next.js frontend to the local Docker Compose backend services.

## Quick Setup

### 1. Create `.env.local` file

Copy the example file:

```bash
cd frontend-nextjs
cp .env.local.example .env.local
```

### 2. Update `.env.local` with local backend URLs

```env
# Main API (port 8000)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Workspace API (port 8002)
NEXT_PUBLIC_WORKSPACE_API_BASE_URL=http://localhost:8002
WORKSPACE_API_BASE_URL=http://localhost:8002

# Your Clerk keys (keep existing)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_key
```

### 3. Start backend services

In the `ai_tutor_for_github_repositories` directory:

```bash
docker-compose up -d
```

### 4. Start frontend

In the `frontend-nextjs` directory:

```bash
npm run dev
```

Your frontend will now connect to local backend services! 🎉

## How It Works

### Service Mapping

| Frontend Config                      | Points To          | Backend Service      | Port |
| ------------------------------------ | ------------------ | -------------------- | ---- |
| `NEXT_PUBLIC_API_URL`                | Main API           | `api` service        | 8000 |
| `NEXT_PUBLIC_WORKSPACE_API_BASE_URL` | Workspaces         | `workspaces` service | 8002 |
| `WORKSPACE_API_BASE_URL`             | Workspaces (proxy) | `workspaces` service | 8002 |

### API Endpoints

**Main API (port 8000):**

- `/api/projects/*` - Project management
- `/api/users/*` - User management
- `/api/roadmap/*` - Roadmap operations
- `/api/chatbot/*` - Chatbot
- `/api/progress/*` - Progress tracking
- `/api/tasks/*` - Task verification

**Workspaces API (port 8002):**

- `/api/workspaces/*` - Workspace management
- `/api/terminal/*` - Terminal WebSocket
- `/api/files/*` - File operations
- `/api/preview/*` - Preview proxy
- `/api/git/*` - Git operations

### Proxy Routes

The frontend has Next.js API proxy routes that forward requests:

- `app/api/workspaces/[...path]/route.ts` → forwards to workspaces service
- `app/api/terminal/[...path]/route.ts` → forwards to workspaces service
- `app/api/preview/[...path]/route.ts` → forwards to workspaces service
- `app/api/git/[...path]/route.ts` → forwards to workspaces service

These proxies use `WORKSPACE_API_BASE_URL` environment variable.

## Switching Between Local and GCP

### Use Local Backend (Development)

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WORKSPACE_API_BASE_URL=http://localhost:8002
WORKSPACE_API_BASE_URL=http://localhost:8002
```

### Use GCP Backend (Production Testing)

`.env.local`:

```env
NEXT_PUBLIC_API_URL=https://gitguide-api-xxx.run.app
NEXT_PUBLIC_WORKSPACE_API_BASE_URL=https://workspaces.gitguide.dev
WORKSPACE_API_BASE_URL=https://workspaces.gitguide.dev
```

Or use production `.env` (if deployed to Vercel, etc.)

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:

1. Backend services have `CORS_ORIGINS=*` or includes `http://localhost:3000`
2. Frontend is running on `http://localhost:3000` (Next.js default)

### Connection Refused

**Error**: `ECONNREFUSED` or `Failed to fetch`

**Solution**:

1. Check backend services are running: `docker-compose ps`
2. Verify ports are correct: `curl http://localhost:8000/api/health`
3. Check `.env.local` has correct URLs

### WebSocket Connection Failed

**Error**: Terminal WebSocket can't connect

**Solution**:

1. Ensure `NEXT_PUBLIC_WORKSPACE_API_BASE_URL=http://localhost:8002` is set
2. Check workspaces service is running: `docker-compose logs workspaces`
3. Verify WebSocket endpoint: `ws://localhost:8002/api/terminal/...`

### Proxy Routes Not Working

**Error**: 500 errors from `/api/workspaces/*` proxy routes

**Solution**:

1. Check `WORKSPACE_API_BASE_URL` is set in `.env.local`
2. Verify workspaces service is accessible: `curl http://localhost:8002/health`
3. Check Next.js server logs for proxy errors

## Development Workflow

### 1. Start Backend

```bash
cd ai_tutor_for_github_repositories
docker-compose up -d
docker-compose logs -f  # Watch logs
```

### 2. Start Frontend

```bash
cd frontend-nextjs
npm run dev
```

### 3. Test Connection

- Open http://localhost:3000
- Check browser console for API calls
- Verify network tab shows requests to `localhost:8000` and `localhost:8002`

### 4. Debug

- Backend logs: `docker-compose logs -f api` (or `roadmap`, `workspaces`)
- Frontend logs: Browser console + Next.js terminal output
- API health: `curl http://localhost:8000/api/health`

## Benefits

✅ **Fast iteration** - No 15-minute deployment wait  
✅ **Instant debugging** - See errors immediately  
✅ **Full stack testing** - Test frontend + backend together  
✅ **Cost-free** - No GCP charges for local development  
✅ **Easy switching** - Toggle between local and GCP with `.env.local`

## Next Steps

1. ✅ Set up `.env.local` with local URLs
2. ✅ Start backend: `docker-compose up -d`
3. ✅ Start frontend: `npm run dev`
4. ✅ Test your app locally
5. ✅ Fix bugs instantly
6. ✅ Deploy to GCP only when ready!
