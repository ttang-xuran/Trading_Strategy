# 🚀 GitHub Integration & Deployment Guide

This guide walks you through pushing your BTC Trading Strategy web app to GitHub and deploying it to free hosting platforms.

## 📋 Prerequisites

- GitHub account
- Git installed locally
- Your repository: https://github.com/ttang-xuran/Trading_Strategy.git

## 🔄 Push to GitHub

### 1. Commit All Files
```bash
cd "/home/ttang/Super BTC trading Strategy"

# Stage all files
git add .

# Commit with descriptive message
git commit -m "🚀 Add BTC Trading Strategy Web Application

✨ Features:
- Interactive TradingView-like interface
- Multi-source data support (Coinbase, Binance, Kraken, etc.)
- Real-time backtesting with 75,863% returns
- FastAPI backend with React frontend
- Ready for Railway/Vercel deployment

📊 Strategy Performance:
- Optimized parameters: (25, 0.4, 2.0)
- 154 trades, 49.4% win rate
- Professional charts with trade signals
- Comprehensive performance analytics

🛠️ Tech Stack:
- Backend: Python FastAPI + SQLite
- Frontend: React + TypeScript + Plotly.js
- Deployment: Railway + Vercel (free tier)
- Automation: GitHub Actions for daily data updates

Ready for production deployment! 🎯"
```

### 2. Push to GitHub
```bash
# Set default branch to main (modern convention)
git branch -M main

# Push to your repository
git push -u origin main
```

## 🌐 Deploy Backend (Railway)

### 1. Sign Up & Connect Repository

1. Go to **[Railway.app](https://railway.app)**
2. Click **"Login with GitHub"**
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **"ttang-xuran/Trading_Strategy"**

### 2. Configure Build Settings

Railway will auto-detect the `railway.json` file, but you can also configure manually:

- **Root Directory**: `btc-strategy-web`
- **Build Command**: Auto-detected from Dockerfile
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 3. Environment Variables

Railway automatically provides:
- `PORT` - The port to run on
- `RAILWAY_STATIC_URL` - Your app's URL

Add custom variables if needed:
```
PYTHONPATH=/app
ENVIRONMENT=production
```

### 4. Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Your API will be live at: `https://your-app-name.railway.app`

Test it: Visit `https://your-app-name.railway.app/docs` for API documentation

## 🎨 Deploy Frontend (Vercel)

### 1. Sign Up & Connect Repository

1. Go to **[Vercel.com](https://vercel.com)**
2. Click **"Continue with GitHub"**
3. Click **"New Project"**
4. Select **"ttang-xuran/Trading_Strategy"**

### 2. Configure Build Settings

- **Framework Preset**: `Vite`
- **Root Directory**: `btc-strategy-web/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Environment Variables

Add these in Vercel dashboard:

```
VITE_API_URL=https://your-railway-app.railway.app
VITE_APP_NAME=BTC Trading Strategy
VITE_APP_VERSION=1.0.0
```

**Important**: Replace `your-railway-app.railway.app` with your actual Railway URL!

### 4. Deploy

1. Click **"Deploy"**
2. Wait 1-2 minutes for build
3. Your app will be live at: `https://your-app-name.vercel.app`

## 🔗 Connect Frontend to Backend

### 1. Update Frontend Environment

After Railway deployment, update your frontend:

```bash
# Update the .env file
cd btc-strategy-web/frontend
echo "VITE_API_URL=https://your-actual-railway-url.railway.app" > .env
```

### 2. Redeploy Frontend

1. Commit the environment change:
```bash
git add btc-strategy-web/frontend/.env
git commit -m "🔗 Update API URL for production deployment"
git push
```

2. Vercel will auto-redeploy with the new environment variable

## 🤖 Set Up Daily Data Updates

### 1. GitHub Actions Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `RAILWAY_WEBHOOK_URL`: Your Railway deployment webhook (optional)

### 2. Enable Actions

The GitHub Actions workflow is already configured in `.github/workflows/update-data.yml`:

- Runs daily at 02:00 UTC
- Downloads latest Bitcoin data
- Commits changes automatically
- Triggers redeployment

## 🎯 Final Steps

### 1. Test Your Deployment

Visit your live applications:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-app.railway.app/docs`

### 2. Verify Features

✅ **Chart loads with Bitcoin data**  
✅ **Data source selector works**  
✅ **Performance metrics display**  
✅ **Trade signals show on chart**  
✅ **Equity curve renders**  
✅ **Trade history table loads**

### 3. Custom Domains (Optional)

Both platforms support custom domains on free tiers:

**Railway**:
1. Go to your project settings
2. Add custom domain
3. Update DNS records

**Vercel**:
1. Go to project settings → Domains
2. Add custom domain
3. Update DNS records

## 📊 Monitor Your Deployment

### Railway Monitoring
- **Logs**: View real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: Track build and deployment history

### Vercel Monitoring  
- **Functions**: Monitor serverless function performance
- **Analytics**: Track page views and performance
- **Deployments**: View build logs and deployment status

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Railway URL is correctly set in Vercel environment
   - Check backend CORS configuration in `app/main.py`

2. **Build Failures**
   - Check Railway/Vercel build logs
   - Verify all dependencies are in requirements.txt/package.json

3. **API Connection Failed**
   - Verify Railway backend is running
   - Check environment variables in Vercel
   - Test API endpoint directly

4. **Data Not Loading**
   - Ensure CSV files are committed to GitHub
   - Check file paths in Dockerfile
   - Verify data service configuration

### Getting Help

- **Railway**: Check [Railway Docs](https://docs.railway.app)
- **Vercel**: Check [Vercel Docs](https://vercel.com/docs)
- **Issues**: Create GitHub issue in your repository

## 🎉 Success!

Your BTC Trading Strategy is now live on the internet! 

- **Professional Interface**: TradingView-like charts and analytics
- **High Performance**: 75,863% returns with optimized strategy
- **Real-time Data**: Daily updates via GitHub Actions
- **Scalable**: Ready to handle multiple users
- **Free Hosting**: No monthly costs on free tiers

**Share your live application with the world!** 🌍

## 📈 Next Steps

1. **Custom Branding**: Add your logo and customize colors
2. **More Strategies**: Add different trading algorithms
3. **User Authentication**: Add login/signup for saved settings
4. **Premium Features**: Add subscription model for advanced analytics
5. **Mobile App**: Convert to React Native for mobile

Your trading strategy is now a professional SaaS application! 🚀