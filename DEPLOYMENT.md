# Deployment Guide

This project is set up to keep local development unchanged while allowing cloud deployment through environment variables.

## Backend on Render

Create a Render Web Service with:

- Root Directory: `New-Project/backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set these environment variables in Render:

```env
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
CORS_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
```

If you also use a custom frontend domain, add both origins:

```env
CORS_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io,https://app.yourdomain.com
```

The backend still defaults to local SQLite when `DATABASE_URL` is not set.

## Database in Cloud Deployment

Do not rely on `sqlite:///./habits.db` in Render production. Render web services use an ephemeral filesystem, so local files can be lost on restart or redeploy.

Use a managed PostgreSQL database instead:

1. Create a Render PostgreSQL database.
2. Copy its internal or external connection string.
3. Set that value as `DATABASE_URL` in the backend service.
4. Redeploy the backend.

This codebase now accepts both:

- `sqlite:///./habits.db` for local development
- `postgresql://...` for production

If Render gives a `postgres://...` URL, the backend normalizes it automatically.

## Frontend on GitHub Pages

In `New-Project/frontend`, create `.env.production` from `.env.production.example` and set your values:

```env
VITE_API_URL=https://your-backend-name.onrender.com/api
VITE_ROUTER_MODE=hash
VITE_BASE_PATH=/your-repository-name/
```

Notes:

- `VITE_ROUTER_MODE=hash` avoids refresh errors on GitHub Pages.
- `VITE_BASE_PATH` makes Vite build asset URLs correctly for a repository site.
- Local development is unchanged because these values only apply to production builds.

Then build the frontend:

```powershell
cd New-Project/frontend
npm install
npm run build
```

Deploy the generated `dist` folder to GitHub Pages.

## Recommended GitHub Pages Workflow

If you want to use the `gh-pages` package, add it in the frontend:

```powershell
npm install --save-dev gh-pages
```

Then add a deploy script to `package.json` and publish `dist`.

## Local Development

Backend:

```env
DATABASE_URL=sqlite:///./habits.db
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
```

Frontend:

- no changes required for local development
- Vite proxy still forwards `/api` to `http://localhost:8000`
