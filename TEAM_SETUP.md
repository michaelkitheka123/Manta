# Manta - One-Click Setup for Team Members

Quick setup guide to get Manta running in your VS Code workspace.

---

## 📦 Step 1: Install Extension (Manual - 30 seconds)

**Why manual?** VS Code doesn't support command-line extension installation from .vsix files, so this one step must be done through the UI.

1. **Download Extension**
   - Go to: https://github.com/michaelkitheka123/Manta/releases/latest
   - Download: `manta-1.0.0.vsix`

2. **Install in VS Code**
   - Open VS Code
   - Press `Ctrl+Shift+X` (Extensions panel)
   - Click `⋯` menu → **Install from VSIX...**
   - Select the downloaded `.vsix` file
   - Click **Reload** when prompted

---

## ⚙️ Step 2: Auto-Configure (Copy-Paste Commands)

After installing the extension, run these commands to auto-configure Manta:

### Windows (PowerShell)

```powershell
# Open VS Code settings.json
code $env:APPDATA\Code\User\settings.json

# Then add these lines to your settings.json:
# (Replace YOUR_SERVER_URL with your actual Railway server URL)
```

**Add to settings.json:**
```json
{
  "manta.serverUrl": "wss://your-server.railway.app",
  "manta.aiServerUrl": "https://your-ai.railway.app"
}
```

### macOS/Linux (Bash)

```bash
# Open VS Code settings.json
code ~/Library/Application\ Support/Code/User/settings.json

# Then add these lines to your settings.json:
# (Replace YOUR_SERVER_URL with your actual Railway server URL)
```

**Add to settings.json:**
```json
{
  "manta.serverUrl": "wss://your-server.railway.app",
  "manta.aiServerUrl": "https://your-ai.railway.app"
}
```

---

## 🎯 Step 3: Quick Start (In VS Code)

### Open Command Palette
Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)

### Login
1. Click the **Manta icon** in the Activity Bar (left sidebar)
2. Click **"Login with GitHub"**
3. Authorize in browser
4. Return to VS Code

### Join Your Team
1. In Manta sidebar, click **"Join Existing Session"**
2. Paste the **invite token** from your team lead
3. Click **"Join"**

---

## 🚀 Alternative: Settings via Command Palette

Instead of editing settings.json manually, you can use VS Code UI:

1. Press `Ctrl+,` (Settings)
2. Search: **"Manta: Server URL"**
3. Enter: `wss://your-server.railway.app`
4. Search: **"Manta: AI Server URL"**
5. Enter: `https://your-ai.railway.app`

---

## 📋 Complete Setup Checklist

- [ ] Download `manta-1.0.0.vsix` from GitHub Releases
- [ ] Install extension via VS Code Extensions panel
- [ ] Configure server URLs in settings
- [ ] Click Manta icon in Activity Bar
- [ ] Login with GitHub
- [ ] Join session with invite token

**Total time: ~2 minutes**

---

## 🔧 Workspace-Specific Settings (Optional)

If you want Manta settings only for a specific project:

1. Open your project in VS Code
2. Create `.vscode/settings.json` in project root
3. Add:

```json
{
  "manta.serverUrl": "wss://your-server.railway.app",
  "manta.aiServerUrl": "https://your-ai.railway.app"
}
```

This way, settings are project-specific and committed to Git!

---

## 🎁 Team Lead: Share This Package

Create a setup package for your team:

1. **Create a folder** with:
   - `manta-1.0.0.vsix` (the extension)
   - `TEAM_SETUP.md` (this file with YOUR server URLs filled in)
   - `invite-token.txt` (your project invite token)

2. **Share via**:
   - Slack/Teams
   - Email
   - Shared drive
   - Git repository

3. **Team members**:
   - Download the folder
   - Follow TEAM_SETUP.md
   - Use the invite token

---

## 🌐 Pre-Configured Settings Template

**For Team Leads:** Create this file and share with your team:

**File: `manta-settings.json`**
```json
{
  "manta.serverUrl": "wss://manta-production-abc123.railway.app",
  "manta.aiServerUrl": "https://manta-ai-production-abc123.railway.app"
}
```

**Team members:**
1. Copy the contents
2. Open VS Code settings (`Ctrl+,`)
3. Click `{}` icon (top-right) to open settings.json
4. Paste the Manta settings

---

## 💡 Pro Tip: VS Code Settings Sync

If your team uses **VS Code Settings Sync**:

1. Team lead configures Manta once
2. Enables Settings Sync
3. Team members sign in with same GitHub account
4. Settings auto-sync across machines!

**Enable Settings Sync:**
- `Ctrl+Shift+P` → "Settings Sync: Turn On"
- Sign in with GitHub
- Select "Settings" to sync

---

## 🐛 Troubleshooting

### Extension not appearing?
```
Ctrl+R (Reload VS Code)
```

### Can't connect to server?
```
1. Check server URL has wss:// (not ws://)
2. Verify server is running on Railway
3. Check VS Code Output panel: View → Output → Manta
```

### Settings not saving?
```
1. Close and reopen VS Code
2. Check settings.json syntax (must be valid JSON)
3. Try workspace settings instead (.vscode/settings.json)
```

---

## 📞 Need Help?

- **Issues**: https://github.com/michaelkitheka123/Manta/issues
- **Team Lead**: Ask your project lead for the invite token
- **Documentation**: Check the GitHub repository

---

**🎉 You're all set! Happy collaborating with Manta!**
