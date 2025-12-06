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

### 🏗️ Architecture

- **Server**: Node.js + WebSocket + PostgreSQL (deployed on Railway)
- **AI Service**: Python + FastAPI + Google Gemini (deployed on Railway)
- **Extension**: TypeScript + VS Code Extension API

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

- **[PRODUCTION_SETUP.md](../PRODUCTION_SETUP.md)** - Complete deployment guide
- **[QUICK_COMMANDS.md](../QUICK_COMMANDS.md)** - Fast command reference
- **[INSTALL.md](extension/INSTALL.md)** - Detailed installation instructions
- **[PACKAGING.md](extension/PACKAGING.md)** - How to package updates
- **[DEPLOY.md](../DEPLOY.md)** - Server deployment guide

---

## 🔧 Requirements

- **VS Code** 1.80.0 or higher
- **GitHub Account** (for authentication)
- **Server** deployed on Railway (or similar)
- **PostgreSQL** database (provided by Railway)

---

## 🌟 What's Included

### Extension Files
- `manta-1.0.0.vsix` - Installable extension package
- Complete documentation
- MIT License

### Server Components
- WebSocket server (Node.js)
- AI service (Python + FastAPI)
- PostgreSQL database schema
- GitHub OAuth integration

---

## 💰 Pricing

**100% Free** for small teams:
- Railway: $5 free credit/month
- Google Gemini API: 60 requests/min free
- GitHub: Free for public repos

---

## 🐛 Known Issues

None reported yet! This is the first release.

---

## 🔄 Updating

To update to a newer version:
1. Download the new `.vsix` file
2. Install from VSIX in VS Code
3. Reload VS Code

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/michaelkitheka123/Manta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/michaelkitheka123/Manta/discussions)
- **Documentation**: See links above

---

## 🙏 Acknowledgments

Built with:
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Google Gemini AI](https://ai.google.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [Railway](https://railway.app/)

---

## 📝 License

MIT License - see [LICENSE](extension/LICENSE) for details

---

**Made with ❤️ by Kraken Labs**

---

## 📥 Download

Download `manta-1.0.0.vsix` below and follow the installation instructions above.

**Happy Collaborating!** 🦑
