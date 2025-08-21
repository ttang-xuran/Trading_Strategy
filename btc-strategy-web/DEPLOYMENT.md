# Deployment Guide - BTC Trading Strategy Web App

This guide covers deploying the BTC Trading Strategy web application to free hosting platforms.

## Architecture

- **Frontend**: React + TypeScript + Plotly.js (deployed on Vercel)
- **Backend**: Python + FastAPI (deployed on Railway)
- **Database**: SQLite (file-based, included in backend)

## Prerequisites

1. GitHub account
2. Vercel account (free tier)
3. Railway account (free tier)

## Backend Deployment (Railway)

Railway provides free hosting for backend services with automatic deployments from GitHub.

### 1. Prepare Repository

```bash
# Navigate to the project root
cd "/home/ttang/Super BTC trading Strategy"

# Initialize git repository
git init
git add btc-strategy-web/
git commit -m "Initial BTC Trading Strategy web app"

# Create GitHub repository and push
# (Follow GitHub's instructions to create and connect repository)
```

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will automatically detect the `railway.json` config
7. Set environment variables:
   - `PYTHONPATH=/app`
   - `PORT=$PORT` (Railway provides this automatically)

### 3. Copy Strategy Files

The deployment needs access to your strategy files. Update the Dockerfile to copy them:

```dockerfile
# In backend/Dockerfile, these lines copy the needed files:
COPY ../../../exact_pine_script_implementation.py /app/exact_pine_script_implementation.py
COPY ../../../BTC_*.csv /app/data/
```

### 4. Railway Deployment URL

After deployment, Railway provides a URL like: `https://your-app-name.railway.app`

## Frontend Deployment (Vercel)

### 1. Update API URL

Update the frontend environment to point to your Railway backend:

```bash
# In frontend/.env
VITE_API_URL=https://your-railway-app.railway.app
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select your GitHub repository
5. Configure build settings:
   - Framework Preset: Vite
   - Root Directory: `btc-strategy-web/frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 3. Environment Variables

In Vercel dashboard, add environment variable:
- Key: `VITE_API_URL`
- Value: `https://your-railway-app.railway.app`

## Alternative Deployment Options

### Backend Alternatives

1. **Render.com** (Free tier)
   - Similar to Railway
   - Use the same Dockerfile
   - Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Fly.io** (Free tier)
   ```bash
   # Install flyctl and run:
   flyctl deploy
   ```

3. **Heroku** (Limited free tier)
   - Create `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Use `requirements.txt` for dependencies

### Frontend Alternatives

1. **Netlify** (Free tier)
   - Similar to Vercel
   - Drag and drop `dist` folder after running `npm run build`

2. **GitHub Pages** (Free)
   - Build locally: `npm run build`
   - Push `dist` folder to `gh-pages` branch

## Custom Domain Setup

### Backend (Railway/Render)
1. In Railway/Render dashboard, go to Settings
2. Add custom domain
3. Update DNS records as instructed

### Frontend (Vercel/Netlify)
1. In dashboard, go to Domains
2. Add custom domain
3. Update DNS records as instructed

## Environment Variables Reference

### Backend
```env
PYTHONPATH=/app
PORT=$PORT  # Set automatically by hosting platform
```

### Frontend
```env
VITE_API_URL=https://your-backend-domain.com
VITE_APP_NAME=BTC Trading Strategy
VITE_APP_VERSION=1.0.0
```

## Post-Deployment Setup

1. **Test the API**: Visit your Railway URL to see the API docs
2. **Test the Frontend**: Visit your Vercel URL to see the web app
3. **Monitor Performance**: Check Railway and Vercel dashboards for usage
4. **Set up Monitoring**: Consider adding error tracking (Sentry, LogRocket)

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend allows frontend domain in CORS settings
   - Update `app/main.py` allow_origins if needed

2. **API Connection Failed**
   - Check if Railway backend is running
   - Verify VITE_API_URL is correct
   - Check browser console for errors

3. **Build Failures**
   - Check logs in Railway/Vercel dashboard
   - Ensure all dependencies are listed correctly
   - Verify file paths are correct

### Free Tier Limitations

- **Railway**: 512MB RAM, 1GB storage, 500 hours/month
- **Vercel**: 100GB bandwidth, 1000 serverless function invocations/month
- **Backend sleep**: Free tiers may sleep after inactivity (30 min - 1 hour)

## Monitoring and Maintenance

1. **Check Logs**: Both platforms provide log viewing
2. **Monitor Usage**: Stay within free tier limits
3. **Update Dependencies**: Keep packages updated for security
4. **Backup Data**: Export strategy results periodically

## Cost Scaling

If you exceed free limits:
- **Railway Pro**: $5/month for more resources
- **Vercel Pro**: $20/month for team features
- Consider **DigitalOcean** ($5/month) for VPS hosting

Your BTC Trading Strategy web app is now ready for public access! 🚀