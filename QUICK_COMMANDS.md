# Manta Quick Commands Reference

Fast reference for common Manta operations.

---

## 🚀 Initial Setup (One-Time)

### Deploy to Railway
```bash
# 1. Push to GitHub
git add .
git commit -m "Production release"
git push origin main

# 2. Go to Railway.app
# 3. Create project from GitHub repo
# 4. Add PostgreSQL database
# 5. Deploy server and AI services
```

### Configure VS Code Extension
```
1. Ctrl+, (Settings)
2. Search "Manta: Server URL"
3. Set: wss://your-server.railway.app
4. Search "Manta: AI Server URL"
5. Set: https://your-ai.railway.app
```

---

## 📦 Extension Commands

### Install Extension
```bash
# Download from GitHub Releases, then:
# Ctrl+Shift+X → ⋯ → Install from VSIX
```

### Package Extension (for distribution)
```bash
cd extension
npm install
npm run compile
npx vsce package --allow-star-activation --allow-missing-repository --no-dependencies
```

---

## 🔧 Development Commands

### Run Locally (All Services)

**Terminal 1 - Server:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - AI Service:**
```bash
cd ai
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Terminal 3 - Extension:**
```
Press F5 in VS Code (opens Extension Development Host)
```

---

## 🌐 Production URLs

### Set in VS Code Settings:
```json
{
  "manta.serverUrl": "wss://manta-server-production.up.railway.app",
  "manta.aiServerUrl": "https://manta-ai-production.up.railway.app"
}
```

---

## 🔐 GitHub OAuth Setup

```
1. https://github.com/settings/developers
2. New OAuth App
3. Homepage: https://your-server.railway.app
4. Callback: https://your-server.railway.app/auth/callback
5. Copy Client ID & Secret
6. Add to Railway environment variables
```

---

## 📊 Check Status

### Server Logs (Railway)
```
Railway Dashboard → Server → Deployments → Logs
```

### Extension Logs (VS Code)
```
View → Output → Select "Manta"
```

### Test Server Connection
```bash
curl https://your-server.railway.app
```

---

## 🔄 Update Production

### Update Code
```bash
git add .
git commit -m "Update v1.1.0"
git tag v1.1.0
git push origin main --tags
```

### Update Extension Version
```bash
cd extension
# Edit package.json: "version": "1.1.0"
npx vsce package --allow-star-activation --allow-missing-repository --no-dependencies
# Upload to GitHub Releases
```

---

## 🐛 Quick Fixes

### Restart Services (Railway)
```
Dashboard → Service → Settings → Restart
```

### Reload Extension (VS Code)
```
Ctrl+R (Windows/Linux) or Cmd+R (Mac)
```

### Clear Extension Cache
```
Ctrl+Shift+P → "Developer: Reload Window"
```

---

## 👥 Team Workflow

### Team Lead
```
1. Open Manta sidebar
2. Login with GitHub
3. Start New Project
4. Share invite token with team
```

### Team Members
```
1. Open Manta sidebar
2. Login with GitHub
3. Join Existing Session
4. Paste invite token
```

---

## 🔑 Environment Variables

### Server (.env or Railway)
```bash
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
PORT=3000
```

### AI Service (.env or Railway)
```bash
GEMINI_API_KEY=your_api_key
PORT=8000
```

---

## 📱 Multi-Device Setup

**Same on all devices:**
```
1. Install extension
2. Configure production URLs
3. Login with GitHub
4. Join same project
```

---

## ⚡ Keyboard Shortcuts (VS Code)

```
Ctrl+Shift+X    - Extensions panel
Ctrl+,          - Settings
Ctrl+Shift+P    - Command Palette
F5              - Run extension (dev mode)
Ctrl+R          - Reload window
```

---

## 🎯 Common Tasks

### Create GitHub Release
```
1. Go to: https://github.com/michaelkitheka123/Manta/releases
2. "Draft a new release"
3. Tag: v1.0.0
4. Upload: manta-1.0.0.vsix
5. Publish
```

### Share Extension with Team
```
Send link: https://github.com/michaelkitheka123/Manta/releases
Instructions: Download .vsix → Install from VSIX in VS Code
```

---

**💡 Tip**: Bookmark this page for quick reference!
