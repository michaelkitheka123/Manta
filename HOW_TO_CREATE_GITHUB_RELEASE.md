# How to Create GitHub Release for Manta v1.0.0

Follow these exact steps to create your first GitHub Release.

---

## Step 1: Go to GitHub Releases Page

1. Open your browser
2. Go to: **https://github.com/michaelkitheka123/Manta/releases/new**
3. Sign in to GitHub if prompted

---

## Step 2: Fill in the Release Form

### **Choose a tag**
- Click the dropdown that says "Choose a tag"
- Select: **`v1.0.0`** (it should already exist since we pushed it)
- If it doesn't appear, type: `v1.0.0` and click "Create new tag: v1.0.0 on publish"

### **Release title**
```
Manta v1.0.0 - Initial Production Release
```

### **Description**
Copy and paste this entire text:

```markdown
# Manta v1.0.0 - Initial Production Release 🚀

**Real-time collaborative coding with AI-powered task assignment and code review**

Built by **Kraken Labs** 🦑

---

## 🎉 What's New

This is the first production-ready release of Manta, a VS Code extension that brings AI-powered collaboration to your development workflow.

### ✨ Features

- **🤝 Real-Time Collaboration** - Work together with your team via WebSocket connections
- **🤖 AI-Powered Task Assignment** - Let AI intelligently assign tasks based on member skills and workload
- **🔍 AI Code Review** - Automated code quality and performance analysis using Google Gemini
- **📊 Team Analytics** - Track member productivity, commits, and task completion
- **🔐 GitHub Authentication** - Secure login with your GitHub account
- **💾 Persistent Sessions** - All data saved to PostgreSQL database
- **⚡ Live Updates** - See team activity and changes in real-time
- **🎨 Professional UI** - Modern design with Kraken Labs branding

---

## 📦 Installation

### Download & Install

1. **Download** the `manta-1.0.0.vsix` file below
2. **Open VS Code**
3. Go to **Extensions** (`Ctrl+Shift+X`)
4. Click the **`...`** menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file
6. **Reload VS Code**

### Configure Server

1. Open **Settings** (`Ctrl+,`)
2. Search for **"Manta: Server URL"**
3. Set to your production server: `wss://your-server.railway.app`
4. Search for **"Manta: AI Server URL"**
5. Set to your AI service: `https://your-ai.railway.app`

---

## 🚀 Quick Start

### Team Lead (Start Project)

1. Open Manta sidebar (click Manta icon in Activity Bar)
2. Click **"Login with GitHub"**
3. Click **"Start New Project"**
4. Enter project name
5. **Share the invite token** with your team

### Team Members (Join Project)

1. Open Manta sidebar
2. Click **"Login with GitHub"**
3. Click **"Join Existing Session"**
4. **Paste the invite token**
5. Start collaborating!

---

## 📚 Documentation

- **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** - Complete deployment guide
- **[QUICK_COMMANDS.md](QUICK_COMMANDS.md)** - Fast command reference
- **[INSTALL.md](extension/INSTALL.md)** - Detailed installation instructions
- **[DEPLOY.md](DEPLOY.md)** - Server deployment guide

---

## 🔧 Requirements

- **VS Code** 1.80.0 or higher
- **GitHub Account** (for authentication)
- **Server** deployed on Railway (or similar)
- **PostgreSQL** database (provided by Railway)

---

## 💰 Pricing

**100% Free** for small teams:
- Railway: $5 free credit/month
- Google Gemini API: 60 requests/min free
- GitHub: Free for public repos

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/michaelkitheka123/Manta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/michaelkitheka123/Manta/discussions)

---

## 📝 License

MIT License - see [LICENSE](extension/LICENSE) for details

---

**Made with ❤️ by Kraken Labs**

**Happy Collaborating!** 🦑
```

---

## Step 3: Attach the .vsix File

1. Scroll down to the **"Attach binaries"** section
2. Click **"Attach binaries by dropping them here or selecting them"**
3. Navigate to: `c:\Users\victor\Desktop\kraken\manta\extension\`
4. Select: **`manta-1.0.0.vsix`**
5. Wait for upload to complete (file is ~410 KB)

---

## Step 4: Publish the Release

1. **Check the box** "Set as the latest release" (should be checked by default)
2. Leave "Set as a pre-release" **unchecked**
3. Click the green **"Publish release"** button

---

## Step 5: Verify the Release

After publishing:

1. You'll be redirected to the release page
2. Verify you see:
   - ✅ Release title: "Manta v1.0.0 - Initial Production Release"
   - ✅ Tag: v1.0.0
   - ✅ Description with all the features
   - ✅ Attached file: `manta-1.0.0.vsix`

---

## Step 6: Share with Your Team

Your release is now live! Share this link:

```
https://github.com/michaelkitheka123/Manta/releases/tag/v1.0.0
```

Team members can:
1. Click the link
2. Download `manta-1.0.0.vsix`
3. Install in VS Code
4. Start collaborating!

---

## 🎉 You're Done!

Your extension is now publicly available for download. Anyone can:
- View the release page
- Download the .vsix file
- Install the extension
- Use Manta for collaboration

---

## 📸 What It Should Look Like

The release page should show:
- **Tag**: v1.0.0
- **Title**: Manta v1.0.0 - Initial Production Release
- **Description**: Full feature list and installation instructions
- **Assets**: manta-1.0.0.vsix (downloadable)
- **Latest release** badge

---

## 🔄 For Future Updates

When you release v1.0.1, v1.1.0, etc.:

1. Update version in `extension/package.json`
2. Package: `npx vsce package --allow-star-activation --allow-missing-repository --no-dependencies`
3. Commit and tag: `git tag v1.0.1`
4. Push: `git push origin main --tags`
5. Create new release on GitHub
6. Upload new .vsix file

---

**Need help?** Check the screenshots in this guide or ask for assistance!
