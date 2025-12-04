# Manta VS Code Extension - Publishing Guide

## Prerequisites Checklist

Before publishing, ensure you have completed:

### Azure DevOps Setup
- [ ] Azure DevOps organization created
- [ ] Personal Access Token (PAT) generated with **Marketplace > Manage** scope
- [ ] Publisher account created on [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
- [ ] Publisher ID noted (you'll need this)

### GitHub OAuth Setup (Critical for Auth Feature)
- [ ] GitHub OAuth App created at https://github.com/settings/developers
- [ ] Application Name: `Manta`
- [ ] Homepage URL: `https://your-railway-app.railway.app`
- [ ] Authorization callback URL: `https://your-railway-app.railway.app/auth/callback`
- [ ] Client ID and Client Secret copied
- [ ] Environment variables added to Railway:
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`

### Extension Metadata
- [ ] `extension/package.json` updated with:
  - Publisher name
  - Extension icon (128x128 PNG)
  - Repository URL
  - License
  - Proper description and keywords

---

## Step-by-Step Publishing Process

### Step 1: Create Azure DevOps Organization
1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with your Microsoft or GitHub account
3. Create a new organization (any name)

### Step 2: Create Personal Access Token (PAT)
1. In Azure DevOps, click your avatar → **Personal access tokens**
2. Click **New Token**
3. Configure:
   - **Name**: `vsce-publisher-token`
   - **Organization**: All accessible organizations
   - **Expiration**: Set your preferred date
   - **Scopes**: Custom defined → **Marketplace** → **Manage**
4. Click **Create** and **copy the PAT immediately** (you won't see it again!)

### Step 3: Create Publisher in Marketplace
1. Go to [VS Code Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with the same Azure DevOps account
3. Click **Create publisher**
4. Provide:
   - **Identifier (ID)**: Unique publisher ID (e.g., `kraken-labs`)
   - **Name**: Display name (e.g., `Kraken Labs`)
5. Click **Create**

### Step 4: Prepare Extension for Publishing

#### Update `extension/package.json`
```json
{
  "name": "manta",
  "displayName": "Manta - AI Collaborative Coding",
  "description": "Real-time collaborative coding with AI-powered task assignment and code review",
  "version": "1.0.0",
  "publisher": "YOUR_PUBLISHER_ID",
  "icon": "resources/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/michaelkitheka123/Manta.git"
  },
  "license": "MIT",
  "keywords": [
    "collaboration",
    "ai",
    "code-review",
    "team",
    "productivity"
  ],
  "engines": {
    "vscode": "^1.80.0"
  }
}
```

#### Create Extension Icon
- Create a 128x128 PNG icon
- Save as `extension/resources/icon.png`
- Should represent Manta/Kraken branding

### Step 5: Install vsce CLI
```bash
npm install -g @vscode/vsce
```

### Step 6: Login to Publisher Account
```bash
cd c:\Users\victor\Desktop\kraken\manta\extension
vsce login YOUR_PUBLISHER_ID
# Paste your PAT when prompted
```

### Step 7: Package Extension (Test First)
```bash
# This creates a .vsix file you can test locally
vsce package
```

Test the packaged extension:
1. In VS Code: Extensions → `...` → Install from VSIX
2. Select the generated `.vsix` file
3. Test all features

### Step 8: Publish to Marketplace
```bash
# Publish version 1.0.0
vsce publish

# Or publish with version bump
vsce publish patch  # 1.0.0 → 1.0.1
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish major  # 1.0.0 → 2.0.0
```

---

## Post-Publishing

### Update Server URL
After publishing, users will need to configure the server URL. Update the README to include:

```markdown
## Configuration

1. Install the Manta extension
2. Go to Settings → Search "Manta: Server URL"
3. Enter: `wss://your-railway-app.railway.app`
4. Click "Login with GitHub" in the Manta sidebar
```

### Monitor Extension
- Check [Marketplace Analytics](https://marketplace.visualstudio.com/manage)
- Monitor GitHub issues
- Respond to user reviews

---

## Updating Your Extension

To publish updates:

1. Make your changes
2. Update version in `package.json`
3. Commit and push to GitHub
4. Run `vsce publish` again

The marketplace will automatically update within a few hours.

---

## Important Files to Review Before Publishing

1. **extension/package.json** - Metadata, publisher, icon
2. **extension/README.md** - User-facing documentation
3. **extension/CHANGELOG.md** - Version history
4. **sidebarPanel.ts:1200** - Update hardcoded server URL to production

---

## Troubleshooting

### "Publisher not found"
- Ensure you've created the publisher on marketplace.visualstudio.com
- Use the exact Publisher ID (case-sensitive)

### "Invalid PAT"
- Regenerate PAT with correct scopes (Marketplace → Manage)
- Ensure "All accessible organizations" is selected

### "Missing icon"
- Create 128x128 PNG icon at `extension/resources/icon.png`
- Reference it in package.json: `"icon": "resources/icon.png"`

---

## Quick Reference Commands

```bash
# Install vsce
npm install -g @vscode/vsce

# Login
vsce login YOUR_PUBLISHER_ID

# Package (test locally)
vsce package

# Publish
vsce publish

# Publish with version bump
vsce publish patch
```

---

**Ready to publish?** Complete the Azure DevOps setup, then come back to this guide!
