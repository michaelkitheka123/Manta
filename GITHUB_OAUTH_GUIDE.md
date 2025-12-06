# GitHub OAuth Setup - What to Copy

## 📋 Step-by-Step: What You Need to Copy

### Step 1: Create GitHub OAuth App

1. **Go to**: https://github.com/settings/developers
2. Click **"New OAuth App"** (or "OAuth Apps" → "New OAuth App")

### Step 2: Fill in the Form

**Copy these values EXACTLY**:

```
Application name: Manta

Homepage URL: https://web-production-9466f.up.railway.app

Authorization callback URL: https://web-production-9466f.up.railway.app/auth/callback

Application description: (optional) Real-time collaborative coding with AI
```

3. Click **"Register application"**

---

## 🔑 Step 3: Copy Your Credentials

After creating the app, you'll see a page with your credentials:

### **Client ID** (Always Visible)
```
Example: Iv1.a1b2c3d4e5f6g7h8
```
**Action**: 
- Click the **copy icon** next to Client ID
- Or select and copy the text
- **Save this** - you'll need it for Railway

### **Client Secret** (Need to Generate)
```
Example: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0
```
**Action**:
1. Click **"Generate a new client secret"**
2. **IMMEDIATELY COPY IT** - you won't see it again!
3. Click the **copy icon** or select and copy
4. **Save this** - you'll need it for Railway

⚠️ **IMPORTANT**: The client secret is only shown ONCE! If you lose it, you'll need to generate a new one.

---

## 📝 Where to Paste These Values

### In Railway Dashboard:

1. **Go to**: https://railway.app
2. **Open your project** → **Server service**
3. Click **"Variables"** tab
4. Click **"+ New Variable"**

**Add these two variables**:

**Variable 1:**
```
Name: GITHUB_CLIENT_ID
Value: [paste your Client ID here]
```

**Variable 2:**
```
Name: GITHUB_CLIENT_SECRET
Value: [paste your Client Secret here]
```

5. Click **"Save"** or the variables auto-save
6. Railway will automatically redeploy your server

---

## ✅ Quick Copy Template

**For easy reference, copy this and fill in your values**:

```bash
# GitHub OAuth Credentials (keep these secret!)

GITHUB_CLIENT_ID=Iv1.________________
GITHUB_CLIENT_SECRET=________________________________

# Paste these into Railway → Server → Variables
```

---

## 🔍 How to Verify It's Working

After adding to Railway:

1. **Check Railway Logs**:
   - Railway → Server → Deployments → View logs
   - Should see: "Server running on port 3000"
   - No errors about missing GITHUB_CLIENT_ID

2. **Test Login**:
   - Install your extension
   - Click "Login with GitHub"
   - Should redirect to GitHub
   - After authorizing, should return to VS Code logged in

---

## 🚨 Common Mistakes

❌ **Wrong callback URL**
- Must be EXACTLY: `https://web-production-9466f.up.railway.app/auth/callback`
- Include `/auth/callback` at the end
- Use `https://` not `http://`

❌ **Lost the client secret**
- If you didn't copy it immediately, generate a new one
- Go to GitHub OAuth app → "Generate a new client secret"

❌ **Forgot to add to Railway**
- Credentials must be in Railway environment variables
- Not in your code or `.env` file

---

## 📸 Visual Reference

**What the GitHub OAuth page looks like**:

```
┌─────────────────────────────────────────┐
│ Manta                                   │
│                                         │
│ Client ID                               │
│ Iv1.a1b2c3d4e5f6g7h8        [📋 Copy]  │
│                                         │
│ Client secrets                          │
│ ● ● ● ● ● ● ● ● ● ● ● ● ●   [Generate] │
│                                         │
│ Homepage URL                            │
│ https://web-production-9466f...         │
│                                         │
│ Authorization callback URL              │
│ https://web-production-9466f.../auth... │
└─────────────────────────────────────────┘
```

**What Railway Variables should look like**:

```
┌─────────────────────────────────────────┐
│ Environment Variables                   │
│                                         │
│ GITHUB_CLIENT_ID                        │
│ Iv1.a1b2c3d4e5f6g7h8                   │
│                                         │
│ GITHUB_CLIENT_SECRET                    │
│ 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0│
│                                         │
│ DATABASE_URL                            │
│ ${{Postgres.DATABASE_URL}}              │
└─────────────────────────────────────────┘
```

---

## 🎯 Summary: The 2 Things You Need

1. **Client ID** - Copy from GitHub OAuth app page
2. **Client Secret** - Generate and copy immediately

**Paste both into Railway → Server → Variables**

That's it! 🚀

---

**Need help?** Check [PRODUCTION_CHECKLIST.md](file:///c:/Users/victor/Desktop/kraken/manta/PRODUCTION_CHECKLIST.md) for more details.
