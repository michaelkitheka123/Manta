# Manta Production Setup Guide

Complete guide to set up and run Manta in production mode across different devices.

---

## 🏗️ Architecture Overview

Manta consists of 3 components:
1. **Server** (Node.js + WebSocket + PostgreSQL) - Deployed on Railway
2. **AI Service** (Python + FastAPI) - Deployed on Railway
3. **VS Code Extension** - Installed on each developer's machine

---

## 📋 Prerequisites

### All Team Members Need:
- VS Code 1.80.0 or higher
- GitHub account

### Team Lead (for deployment) Needs:
- Node.js 20.x
- Python 3.9+
- Railway account (free tier)
- GitHub account
- PostgreSQL (provided by Railway)

---

## 🚀 Part 1: Deploy Server & AI Service (One-Time Setup by Team Lead)

### Step 1: Push Code to GitHub

```bash
# Navigate to project
cd c:\Users\victor\Desktop\kraken\manta

# Add all files
git add .

# Commit
git commit -m "Production release v1.0.0"

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Railway

#### A. Create Railway Project

1. Go to https://railway.app
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **michaelkitheka123/Manta**

#### B. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for deployment (1-2 minutes)

#### C. Deploy Server Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your Manta repository
3. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add environment variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   PORT=3000
   ```
5. Click **"Deploy"**

#### D. Deploy AI Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your Manta repository again
3. Configure:
   - **Root Directory**: `ai`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   ```
   GEMINI_API_KEY=your_google_gemini_api_key
   PORT=8000
   ```
5. Click **"Deploy"**

#### E. Get Your Production URLs

After deployment, Railway will provide URLs like:
- **Server**: `https://manta-server-production.up.railway.app`
- **AI Service**: `https://manta-ai-production.up.railway.app`

**Save these URLs!** You'll need them for the extension configuration.

---

## 🔐 Part 2: Set Up GitHub OAuth (Team Lead)

### Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Manta`
   - **Homepage URL**: `https://manta-server-production.up.railway.app`
   - **Authorization callback URL**: `https://manta-server-production.up.railway.app/auth/callback`
4. Click **"Register application"**
5. Copy **Client ID** and generate **Client Secret**

### Step 2: Update Railway Environment Variables

1. Go to Railway → Server service → Variables
2. Update:
   - `GITHUB_CLIENT_ID`: Paste your Client ID
   - `GITHUB_CLIENT_SECRET`: Paste your Client Secret
3. Redeploy the server

---

## 💻 Part 3: Install Extension on Team Devices

### For Each Team Member:

#### Option A: Install from GitHub Release (Recommended)

1. **Download Extension**
   - Go to https://github.com/michaelkitheka123/Manta/releases
   - Download `manta-1.0.0.vsix`

2. **Install in VS Code**
   ```
   1. Open VS Code
   2. Press Ctrl+Shift+X (Extensions)
   3. Click ⋯ menu → "Install from VSIX..."
   4. Select downloaded manta-1.0.0.vsix
   5. Reload VS Code
   ```

#### Option B: Install from Source (Development)

```bash
# Clone repository
git clone https://github.com/michaelkitheka123/Manta.git
cd Manta/extension

# Install dependencies
npm install

# Compile
npm run compile

# Package
npx vsce package

# Install the generated .vsix file in VS Code
```

---

## ⚙️ Part 4: Configure Extension for Production

### On Each Team Member's Machine:

1. **Open VS Code Settings**
   - Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
   - Or: File → Preferences → Settings

2. **Configure Server URL**
   - Search for: `Manta: Server URL`
   - Set to: `wss://manta-server-production.up.railway.app`
   - ⚠️ **Important**: Use `wss://` (not `ws://`) for production HTTPS

3. **Configure AI Service URL**
   - Search for: `Manta: AI Server URL`
   - Set to: `https://manta-ai-production.up.railway.app`

4. **Save Settings**

---

## 🎯 Part 5: First-Time Usage

### Team Lead (Project Creator):

1. **Open Manta Sidebar**
   - Click Manta icon in Activity Bar (left sidebar)

2. **Login with GitHub**
   - Click "Login with GitHub"
   - Authorize in browser
   - Return to VS Code

3. **Start New Project**
   - Click "Start New Project"
   - Enter project name
   - Copy the generated **invite token**
   - Share token with team members

### Team Members (Joining Project):

1. **Open Manta Sidebar**
   - Click Manta icon in Activity Bar

2. **Login with GitHub**
   - Click "Login with GitHub"
   - Authorize in browser

3. **Join Session**
   - Click "Join Existing Session"
   - Paste the invite token from team lead
   - Click "Join"

---

## 🔧 Quick Commands Reference

### For Team Lead (Deployment):

```bash
# Deploy updates to Railway
git add .
git commit -m "Update description"
git push origin main
# Railway auto-deploys on push

# Check server logs
# Go to Railway → Server service → Deployments → View logs

# Check AI service logs
# Go to Railway → AI service → Deployments → View logs
```

### For All Team Members (Daily Use):

```bash
# Update extension (when new version released)
# 1. Download new .vsix from GitHub Releases
# 2. Install from VSIX in VS Code
# 3. Reload VS Code

# Check extension logs
# View → Output → Select "Manta" from dropdown
```

---

## 🌐 Environment-Specific Configurations

### Development (Local Testing)

```json
// VS Code Settings
{
  "manta.serverUrl": "ws://localhost:3000",
  "manta.aiServerUrl": "http://localhost:8000"
}
```

**Run locally:**
```bash
# Terminal 1: Server
cd server
npm install
npm run dev

# Terminal 2: AI Service
cd ai
pip install -r requirements.txt
python -m uvicorn main:app --reload

# Terminal 3: Extension (F5 in VS Code)
```

### Staging (Testing Server)

```json
{
  "manta.serverUrl": "wss://manta-staging.railway.app",
  "manta.aiServerUrl": "https://manta-ai-staging.railway.app"
}
```

### Production (Live)

```json
{
  "manta.serverUrl": "wss://manta-server-production.up.railway.app",
  "manta.aiServerUrl": "https://manta-ai-production.up.railway.app"
}
```

---

## 📱 Multi-Device Setup

### Scenario: Developer with Multiple Machines

**Same configuration on all devices:**

1. Install extension on each device
2. Use same settings (production URLs)
3. Login with same GitHub account
4. Join same project session

**Data syncs automatically** - all devices see the same:
- Project state
- Team members
- Tasks
- Code reviews

---

## 🔍 Verification Checklist

### After Server Deployment:

- [ ] Server URL is accessible (visit in browser)
- [ ] Database connected (check Railway logs)
- [ ] GitHub OAuth configured
- [ ] Environment variables set

### After Extension Installation:

- [ ] Extension appears in VS Code
- [ ] Manta icon visible in Activity Bar
- [ ] Settings configured with production URLs
- [ ] Can login with GitHub
- [ ] Can create/join sessions

---

## 🐛 Troubleshooting

### "Cannot connect to server"

**Check:**
1. Server URL is correct (`wss://` for HTTPS)
2. Server is running (check Railway dashboard)
3. No firewall blocking WebSocket connections

**Fix:**
```bash
# Test server connection
curl https://manta-server-production.up.railway.app

# Should return server response
```

### "GitHub login failed"

**Check:**
1. OAuth app configured correctly
2. Callback URL matches server URL
3. Client ID/Secret set in Railway

**Fix:**
1. Go to GitHub OAuth app settings
2. Verify callback URL: `https://your-server.railway.app/auth/callback`
3. Regenerate client secret if needed
4. Update Railway environment variables

### "Extension not loading"

**Check:**
1. VS Code version (must be 1.80.0+)
2. Extension installed correctly

**Fix:**
```bash
# Reload VS Code
Ctrl+R (Windows/Linux) or Cmd+R (Mac)

# Check Output panel
View → Output → Select "Manta"
```

### "AI features not working"

**Check:**
1. Gemini API key is valid
2. AI service is running on Railway

**Fix:**
1. Go to https://ai.google.dev/
2. Generate new API key
3. Update Railway AI service environment variable
4. Redeploy AI service

---

## 📊 Monitoring Production

### Railway Dashboard:

- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: Version history
- **Usage**: Track free tier limits

### Extension Logs:

```
View → Output → Select "Manta"
```

Shows:
- Connection status
- WebSocket messages
- Errors and warnings

---

## 💰 Cost Estimation

### Free Tier (Recommended for Small Teams):

| Service | Free Tier | Cost if Exceeded |
|---------|-----------|------------------|
| Railway | $5 credit/month | ~$5-10/month |
| Gemini API | 60 req/min | Free for most usage |
| GitHub | Unlimited | Free |
| **Total** | **$0/month** | **$5-10/month** |

### Scaling (For Larger Teams):

- Railway Pro: $20/month (more resources)
- Gemini API Pro: Pay per use (rarely needed)

---

## 🔄 Updating Production

### When You Release New Version:

1. **Update Code**
   ```bash
   git add .
   git commit -m "Release v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```

2. **Railway Auto-Deploys** (server & AI)

3. **Package New Extension**
   ```bash
   cd extension
   # Update version in package.json to 1.1.0
   npx vsce package
   ```

4. **Create GitHub Release**
   - Upload new .vsix file
   - Team members download and install

---

## 📞 Support

- **Issues**: https://github.com/michaelkitheka123/Manta/issues
- **Discussions**: https://github.com/michaelkitheka123/Manta/discussions

---

**🎉 You're ready for production!** Share the extension with your team and start collaborating.
