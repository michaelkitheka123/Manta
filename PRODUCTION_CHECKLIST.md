# Production Setup Checklist - What You Still Need to Configure

## ❌ Not Yet Configured (Required for Full Functionality)

### 1. **GitHub OAuth Credentials** (CRITICAL - Required for Login)

**Status**: ⚠️ **NOT CONFIGURED**

**What's needed**:
- GitHub OAuth App Client ID
- GitHub OAuth App Client Secret

**Where to configure**:
- Railway → Server service → Environment Variables

**How to get them**:

1. **Create GitHub OAuth App**:
   - Go to: https://github.com/settings/developers
   - Click **"New OAuth App"**
   - Fill in:
     - **Application name**: `Manta`
     - **Homepage URL**: `https://web-production-9466f.up.railway.app`
     - **Authorization callback URL**: `https://web-production-9466f.up.railway.app/auth/callback`
   - Click **"Register application"**
   - Copy **Client ID**
   - Click **"Generate a new client secret"**
   - Copy **Client Secret**

2. **Add to Railway**:
   - Go to Railway → Your Server service → Variables
   - Add:
     ```
     GITHUB_CLIENT_ID=your_actual_client_id_here
     GITHUB_CLIENT_SECRET=your_actual_client_secret_here
     ```
   - Redeploy the server

**Impact if not configured**:
- ❌ Users cannot login with GitHub
- ❌ No authentication
- ❌ Extension won't work properly

---

### 2. **Google Gemini API Key** (Optional - For AI Features)

**Status**: ⚠️ **NOT CONFIGURED**

**What's needed**:
- Google Gemini API Key

**Where to configure**:
- Railway → AI service → Environment Variables

**How to get it**:

1. **Get Gemini API Key**:
   - Go to: https://ai.google.dev/
   - Click **"Get API key"**
   - Create a new API key
   - Copy the key

2. **Add to Railway**:
   - Go to Railway → Your AI service → Variables
   - Add:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```
   - Redeploy the AI service

**Impact if not configured**:
- ⚠️ AI features won't work (task assignment, code review)
- ✅ Basic collaboration still works
- ✅ Users can still login and join sessions

---

### 3. **Database Connection** (Should Already Be Set)

**Status**: ✅ **LIKELY CONFIGURED** (if you deployed PostgreSQL on Railway)

**What's needed**:
- PostgreSQL DATABASE_URL

**Where to check**:
- Railway → Server service → Variables
- Should see: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

**If not configured**:
1. Railway → Add PostgreSQL database
2. Link it to your server service
3. Add environment variable: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

---

## ✅ Already Configured

### Extension Settings
- ✅ Server URL: `wss://web-production-9466f.up.railway.app`
- ✅ AI Service URL: `https://manta-ai-production.up.railway.app`
- ✅ Hardcoded in extension - no user configuration needed

### Server Deployment
- ✅ Code pushed to GitHub
- ✅ Railway project created (presumably)
- ✅ Server and AI services deployed (presumably)

---

## 🚀 Quick Setup Commands

### Step 1: Create GitHub OAuth App
```bash
# Open in browser:
https://github.com/settings/developers

# Create new OAuth App with:
# - Homepage: https://web-production-9466f.up.railway.app
# - Callback: https://web-production-9466f.up.railway.app/auth/callback
```

### Step 2: Configure Railway Environment Variables

**For Server Service**:
```bash
# In Railway → Server → Variables, add:
GITHUB_CLIENT_ID=<your_client_id>
GITHUB_CLIENT_SECRET=<your_client_secret>
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3000
```

**For AI Service**:
```bash
# In Railway → AI Service → Variables, add:
GEMINI_API_KEY=<your_api_key>
PORT=8000
```

### Step 3: Redeploy Services
```bash
# In Railway dashboard:
# 1. Go to each service
# 2. Click "Deploy" or wait for auto-deploy
# 3. Check logs for successful startup
```

---

## 🔍 How to Verify Configuration

### Check if GitHub OAuth is Working:
1. Install the extension
2. Click "Login with GitHub"
3. Should redirect to GitHub authorization page
4. After authorization, should return to VS Code logged in

**If it fails**:
- Check Railway server logs for errors
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
- Verify callback URL matches exactly

### Check if AI is Working:
1. Create a project as team lead
2. Try to delegate a task
3. AI should suggest the best team member

**If it fails**:
- Check Railway AI service logs
- Verify `GEMINI_API_KEY` is set
- Check Gemini API quota at https://ai.dev/usage

---

## 📋 Complete Production Checklist

- [ ] GitHub OAuth App created
- [ ] `GITHUB_CLIENT_ID` added to Railway
- [ ] `GITHUB_CLIENT_SECRET` added to Railway
- [ ] `GEMINI_API_KEY` added to Railway (optional)
- [ ] `DATABASE_URL` configured (should be automatic)
- [ ] Server service redeployed
- [ ] AI service redeployed
- [ ] Test GitHub login
- [ ] Test AI features
- [ ] Create GitHub Release
- [ ] Share with team

---

## ⚠️ Critical Path to Production

**Minimum required for basic functionality**:
1. ✅ Extension packaged (DONE)
2. ❌ GitHub OAuth configured (REQUIRED)
3. ✅ Database connected (LIKELY DONE)
4. ⚠️ Gemini API key (OPTIONAL - for AI features)

**Without GitHub OAuth, the extension won't work at all!**

---

## 💡 Pro Tips

### Test Locally First:
```bash
# Create .env file in server/:
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
DATABASE_URL=postgresql://localhost/manta

# Run server:
cd server
npm run dev

# Test login flow before deploying
```

### Check Railway Logs:
```bash
# In Railway dashboard:
# Server → Deployments → View logs
# Look for:
# - "Server running on port 3000"
# - No errors about missing env variables
```

---

## 🎯 Next Steps

1. **Create GitHub OAuth App** (5 minutes)
2. **Add credentials to Railway** (2 minutes)
3. **Redeploy services** (automatic)
4. **Test login** (1 minute)
5. **Create GitHub Release** (5 minutes)
6. **Share with team** (1 minute)

**Total time to production: ~15 minutes**

---

**Questions?** Check [PRODUCTION_SETUP.md](file:///c:/Users/victor/Desktop/kraken/manta/PRODUCTION_SETUP.md) for detailed instructions.
