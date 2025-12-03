# Quick Start: Deploy Manta to Railway

## Prerequisites
- GitHub account
- Railway account ([signup here](https://railway.app))

## Steps

### 1. Push to GitHub
```bash
cd c:\Users\victor\Desktop\kraken\manta
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/manta.git
git push -u origin main
```

### 2. Deploy on Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `manta` repository
4. Railway will auto-detect and deploy
5. Click "Generate Domain" to get your public URL

### 3. Update Extension
Edit `extension/src/serverClient.ts` line 14:
```typescript
this.serverUrl = vscode.workspace.getConfiguration('manta').get('serverUrl', 'wss://YOUR-APP.railway.app');
```

Or set in VS Code:
- Settings → Search "Manta: Server URL"
- Enter: `wss://YOUR-APP.railway.app`

### 4. Configure AI (Optional but Recommended)
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. In Railway, go to your project → **Variables**
3. Add a new variable:
   - Key: `GEMINI_API_KEY`
   - Value: `your_api_key_here`
4. Railway will redeploy automatically

### 5. Test
- Reload extension (F5)
- Create/join a session
- Test from another device!

## Troubleshooting
- **Build fails**: Check Railway logs
- **WebSocket fails**: Use `wss://` not `ws://`
- **Can't connect**: Verify domain is accessible

## Next Steps
- Share your server URL with team members
- They install the extension and configure the same URL
- Start collaborating!

---

**Full guide:** See `deployment_guide.md` for detailed instructions
