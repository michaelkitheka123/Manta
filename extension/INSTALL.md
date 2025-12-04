# Installing Manta Extension

Quick guide for users to install Manta from GitHub Releases.

---

## Installation Steps

### 1. Download the Extension

1. Go to [Manta Releases](https://github.com/michaelkitheka123/Manta/releases)
2. Find the latest release
3. Download the `.vsix` file (e.g., `manta-1.0.0.vsix`)

### 2. Install in VS Code

**Method A: Via Extensions Panel**
1. Open VS Code
2. Click Extensions icon (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Click the `...` menu (top-right of Extensions panel)
4. Select **"Install from VSIX..."**
5. Navigate to and select the downloaded `.vsix` file
6. Click **"Install"**
7. Reload VS Code when prompted

**Method B: Via Command Palette**
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type: **"Extensions: Install from VSIX..."**
3. Select the downloaded `.vsix` file
4. Reload VS Code when prompted

### 3. Configure Server

1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for **"Manta"**
3. Set **"Manta: Server URL"** to your server address:
   - Production: `wss://your-server.railway.app`
   - Local dev: `ws://localhost:3000`

### 4. Login with GitHub

1. Click the Manta icon in the Activity Bar (left sidebar)
2. Click **"Login with GitHub"**
3. Authorize the application in your browser
4. Return to VS Code - you're logged in!

---

## Verification

After installation, verify Manta is working:

1. ✅ Manta icon appears in Activity Bar
2. ✅ Sidebar opens when clicking the icon
3. ✅ "Login with GitHub" button is visible
4. ✅ No errors in Output panel (View → Output → Manta)

---

## Troubleshooting

### Extension not appearing
- Reload VS Code (`Ctrl+R` or `Cmd+R`)
- Check Extensions panel - Manta should be listed
- Verify VS Code version is 1.80.0 or higher

### Can't connect to server
- Check server URL in settings
- Verify server is running
- Use `wss://` for HTTPS servers, `ws://` for HTTP

### GitHub login fails
- Check your internet connection
- Verify server OAuth is configured
- Try logging out and back in

---

## Uninstalling

1. Go to Extensions panel
2. Find "Manta"
3. Click gear icon → **Uninstall**
4. Reload VS Code

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/michaelkitheka123/Manta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/michaelkitheka123/Manta/discussions)

---

**Happy Collaborating!** 🦑
