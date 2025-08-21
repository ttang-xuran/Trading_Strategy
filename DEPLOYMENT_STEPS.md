# 🚀 Live Deployment Steps - BTC Trading Strategy

## Step 1: Deploy Backend to Railway

### 1.1 Access Railway
1. Open your browser and go to: **https://railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway to access your GitHub account

### 1.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **"ttang-xuran/Trading_Strategy"**
4. Railway will automatically detect the `railway.json` configuration

### 1.3 Configure Build (Auto-detected)
Railway will automatically:
- Detect the Dockerfile in `btc-strategy-web/backend/`
- Build the Python FastAPI application
- Set up the database and data files
- Configure the port and environment

### 1.4 Monitor Deployment
- Watch the build logs in Railway dashboard
- Deployment typically takes 2-3 minutes
- You'll get a URL like: `https://your-app-name.railway.app`

### 1.5 Test Backend
Once deployed, test your API:
- Visit: `https://your-app-name.railway.app`
- Should show: `{"message": "BTC Trading Strategy API", "status": "active"}`
- API Documentation: `https://your-app-name.railway.app/docs`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Access Vercel
1. Open your browser and go to: **https://vercel.com**
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account

### 2.2 Create New Project
1. Click **"New Project"**
2. Find and select **"ttang-xuran/Trading_Strategy"**
3. Click **"Import"**

### 2.3 Configure Build Settings
Set these configuration options:

**Framework Preset**: `Vite`
**Root Directory**: `btc-strategy-web/frontend`
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm install`

### 2.4 Add Environment Variables
Before deploying, add this environment variable:

**Key**: `VITE_API_URL`
**Value**: `https://your-railway-app-url.railway.app`

(Replace with your actual Railway URL from Step 1)

### 2.5 Deploy
1. Click **"Deploy"**
2. Vercel will build and deploy your React app
3. Takes about 1-2 minutes
4. You'll get a URL like: `https://your-app-name.vercel.app`

---

## Step 3: Verify Deployment

### 3.1 Test Your Live Application
Visit your Vercel URL and verify:
- ✅ Website loads with Bitcoin chart
- ✅ Data source selector works
- ✅ Performance metrics display
- ✅ Trade signals appear on chart
- ✅ Equity curve renders
- ✅ Trade history table loads

### 3.2 Test API Connection
- Check browser console (F12) for any errors
- Verify API calls are reaching your Railway backend
- Test different data sources (Coinbase, Binance, etc.)

---

## Step 4: Final Configuration

### 4.1 Update CORS (if needed)
If you see CORS errors, update the backend:
1. Go to Railway dashboard
2. Add environment variable: `ALLOWED_ORIGINS=https://your-vercel-app.vercel.app`
3. Redeploy backend

### 4.2 Custom Domains (Optional)
Both Railway and Vercel support custom domains:
- Railway: Project Settings → Domains
- Vercel: Project Settings → Domains

---

## 🎉 Success Checklist

Your BTC Trading Strategy web app is live when:
- ✅ Backend API responds at Railway URL
- ✅ Frontend loads at Vercel URL  
- ✅ Charts display Bitcoin data
- ✅ Strategy performance shows 75,863% returns
- ✅ Trade signals appear correctly
- ✅ All data sources work
- ✅ Mobile responsive design functions

## 📊 What Users Will See

**Live Features**:
- Interactive TradingView-style charts
- Real-time strategy backtesting
- Performance metrics: 75,863% returns, 49.4% win rate
- Trade signal annotations
- Multi-source data comparison
- Professional analytics dashboard

**Live URLs**:
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-app.railway.app`
- API Docs: `https://your-app.railway.app/docs`

Ready to share with the world! 🌍