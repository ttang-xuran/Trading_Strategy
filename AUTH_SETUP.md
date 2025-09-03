# 🔐 Authentication Setup Guide

This guide shows you how to set up login credentials for your BTC Trading Strategy application.

## 📋 Quick Setup

### 1. Create Environment Variables

**For Local Development:**
1. Copy `.env.example` to `.env` in your project root
2. Edit `.env` and set your desired credentials:
```bash
VITE_AUTH_USERNAME=your_username
VITE_AUTH_PASSWORD=your_secure_password
```

**For Vercel Deployment:**
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these two variables:
   - `VITE_AUTH_USERNAME` = `your_username`
   - `VITE_AUTH_PASSWORD` = `your_secure_password`

### 2. Example Credentials

```bash
# Simple setup
VITE_AUTH_USERNAME=admin
VITE_AUTH_PASSWORD=TradingMaster2024!

# Custom setup
VITE_AUTH_USERNAME=john
VITE_AUTH_PASSWORD=MySecret@123
```

## 🚀 Deployment Instructions

### Vercel Setup:
1. **Login to Vercel**: Go to [vercel.com](https://vercel.com) and login
2. **Find Your Project**: Go to your BTC Strategy project
3. **Settings Tab**: Click on "Settings" 
4. **Environment Variables**: Scroll to "Environment Variables" section
5. **Add Variables**:
   - Name: `VITE_AUTH_USERNAME`, Value: `admin` (or your choice)
   - Name: `VITE_AUTH_PASSWORD`, Value: `YourSecurePassword123!`
6. **Save**: Click "Save" for each variable
7. **Redeploy**: Go to Deployments tab and redeploy your latest commit

### Local Development:
```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env file with your credentials
# VITE_AUTH_USERNAME=admin
# VITE_AUTH_PASSWORD=your_password_here

# 3. Start development server
npm run dev
```

## 🔒 Security Features

- ✅ **Environment Variables**: Credentials stored securely
- ✅ **Session Management**: Login persists until browser close
- ✅ **Brute Force Protection**: 500ms delay between attempts
- ✅ **Clean Logout**: Complete session clearing
- ✅ **User Feedback**: Login time and user display

## 🎯 Default Credentials

If no environment variables are set, the system uses:
- **Username**: `admin`
- **Password**: `password123`

⚠️ **Important**: Always change default credentials in production!

## 🛡️ Password Recommendations

Use strong passwords with:
- At least 12 characters
- Mix of letters, numbers, symbols
- Examples:
  - `TradingBot@2024!`
  - `BTC$ecur3P@ss`
  - `Strategy#Master99`

## 🔧 How It Works

1. **Login Page**: Users enter username/password
2. **Verification**: Credentials checked against environment variables
3. **Session Storage**: Authentication stored in browser localStorage
4. **Auto-Login**: Users stay logged in until they logout or close browser
5. **Logout**: Clears all authentication data

## 📱 User Experience

- **Professional Login**: Clean, branded login form
- **User Info**: Shows logged-in user and login time
- **Easy Logout**: One-click logout with confirmation
- **Session Persistence**: No need to login repeatedly

## 🚨 Troubleshooting

**"Invalid username or password":**
- Check environment variables are set correctly
- Ensure no extra spaces in credentials
- Verify Vercel environment variables are saved

**Can't access after setting up:**
- Clear browser cache/localStorage
- Check browser console for errors
- Verify environment variables in Vercel dashboard

**Need to change credentials:**
- Update environment variables in Vercel
- Redeploy the application
- Users will need to login with new credentials

## 📞 Support

If you need help setting up authentication, check:
1. Environment variables are correctly set
2. Vercel project has been redeployed
3. Browser cache has been cleared
4. No typos in username/password