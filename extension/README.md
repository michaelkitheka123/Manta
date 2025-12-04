# Manta - AI Collaborative Coding

**Real-time collaborative coding with AI-powered task assignment, code review, and team analytics.**

Built by **Kraken Labs** 🦑

---

## ✨ Features

- **🤝 Real-Time Collaboration** - Work together with your team via WebSocket connections
- **🤖 AI-Powered Task Assignment** - Let AI intelligently assign tasks to the best team member
- **🔍 AI Code Review** - Automated code quality and performance analysis
- **📊 Team Analytics** - Track member productivity, commits, and task completion
- **🔐 GitHub Authentication** - Secure login with your GitHub account
- **💾 Persistent Sessions** - All data saved to PostgreSQL database
- **⚡ Live Updates** - See team activity and changes in real-time

---

## 📦 Installation

### Option 1: Manual Installation (Recommended)

1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/michaelkitheka123/Manta/releases)
2. Open VS Code
3. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the `...` menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file
6. Reload VS Code

### Option 2: From Source

```bash
git clone https://github.com/michaelkitheka123/Manta.git
cd Manta/extension
npm install
npm run package
# Install the generated .vsix file
```

---

## 🚀 Quick Start

### 1. Configure Server URL

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for **"Manta: Server URL"**
3. Enter your server URL: `wss://your-server.railway.app`

### 2. Login with GitHub

1. Open the Manta sidebar (click the Manta icon in the Activity Bar)
2. Click **"Login with GitHub"**
3. Authorize the application
4. You're ready to collaborate!

### 3. Start or Join a Session

**Start a New Project:**
- Click "Start New Project"
- Enter a project name
- Share the generated token with your team

**Join an Existing Session:**
- Click "Join Existing Session"
- Enter the invite token from your team lead
- Start collaborating!

---

## 🎯 Usage

### For Team Leads

- **Delegate Tasks** - AI suggests the best team member for each task
- **Review Code** - Approve or decline code submissions with AI insights
- **Monitor Team** - View real-time analytics and productivity metrics
- **Manage Sessions** - Control project flow and approvals

### For Team Members

- **View Assigned Tasks** - See your current workload
- **Submit Code** - Commit logic or styles for review
- **Track Progress** - Monitor your contributions and metrics

---

## 🛠️ Server Setup

Manta requires a backend server for collaboration features. You can:

1. **Use the provided server** (included in the repository)
2. **Deploy to Railway** (recommended for teams)
3. **Run locally** for development

### Deploy to Railway

1. Push the Manta repository to GitHub
2. Go to [Railway.app](https://railway.app)
3. Create a new project from your GitHub repo
4. Add PostgreSQL database
5. Configure environment variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GEMINI_API_KEY` (optional, for AI features)
6. Deploy and copy your server URL

See [DEPLOY.md](../DEPLOY.md) for detailed instructions.

---

## 📋 Requirements

- **VS Code** 1.80.0 or higher
- **Node.js** 20.x or higher (for server)
- **PostgreSQL** (for data persistence)
- **GitHub Account** (for authentication)

---

## 🔧 Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `manta.serverUrl` | WebSocket URL of backend server | `ws://localhost:3000` |
| `manta.aiServerUrl` | HTTP URL of AI service | `http://localhost:8000` |

---

## 🐛 Troubleshooting

### Can't connect to server
- Verify server URL is correct (`wss://` for production, `ws://` for local)
- Check that server is running and accessible
- Ensure firewall allows WebSocket connections

### GitHub login not working
- Verify GitHub OAuth app is configured correctly
- Check that callback URL matches your server URL
- Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set

### Extension not loading
- Check VS Code version (must be 1.80.0+)
- Reload VS Code window (`Ctrl+R` or `Cmd+R`)
- Check Output panel for errors

---

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/michaelkitheka123/Manta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/michaelkitheka123/Manta/discussions)

---

## 🌟 Acknowledgments

Built with:
- [Google Gemini AI](https://ai.google.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [Railway](https://railway.app/)

---

**Made with ❤️ by Kraken Labs**

![Kraken Labs](https://img.shields.io/badge/Kraken-Labs-ff4500?style=for-the-badge)
