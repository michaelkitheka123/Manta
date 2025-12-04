# Packaging and Distributing Manta Extension

This guide shows you how to package the Manta extension and distribute it via GitHub Releases (no Azure DevOps required!).

---

## Prerequisites

- Node.js 20.x or higher
- npm installed
- Git configured

---

## Step 1: Install vsce (VS Code Extension CLI)

```bash
npm install -g @vscode/vsce
```

---

## Step 2: Build the Extension

Navigate to the extension directory and compile:

```bash
cd c:\Users\victor\Desktop\kraken\manta\extension
npm install
npm run compile
```

---

## Step 3: Package as .vsix

Create the `.vsix` file:

```bash
vsce package
```

This will create a file like `manta-1.0.0.vsix` in the extension directory.

---

## Step 4: Test Locally

Before distributing, test the packaged extension:

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Click `...` → **Install from VSIX...**
4. Select the `manta-1.0.0.vsix` file
5. Reload VS Code
6. Test all features

---

## Step 5: Create GitHub Release

### A. Commit and Push Changes

```bash
cd c:\Users\victor\Desktop\kraken\manta
git add .
git commit -m "Release v1.0.0"
git push origin main
```

### B. Create Release on GitHub

1. Go to https://github.com/michaelkitheka123/Manta/releases
2. Click **"Draft a new release"**
3. Fill in:
   - **Tag version**: `v1.0.0`
   - **Release title**: `Manta v1.0.0 - Initial Release`
   - **Description**: Copy from CHANGELOG.md
4. **Attach the .vsix file**: Drag and drop `manta-1.0.0.vsix`
5. Click **"Publish release"**

---

## Step 6: Share with Users

Users can now install Manta by:

1. Going to your GitHub Releases page
2. Downloading the latest `.vsix` file
3. Installing it in VS Code (Extensions → Install from VSIX)

---

## Updating the Extension

To release a new version:

### 1. Update Version Number

Edit `extension/package.json`:

```json
{
  "version": "1.0.1"  // Increment version
}
```

### 2. Update CHANGELOG.md

Add new changes under a new version heading.

### 3. Rebuild and Package

```bash
npm run compile
vsce package
```

### 4. Create New GitHub Release

Repeat Step 5 with the new version number.

---

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backward compatible

---

## Troubleshooting

### "vsce: command not found"
```bash
npm install -g @vscode/vsce
```

### "Cannot find module"
```bash
cd extension
npm install
```

### "Compilation errors"
```bash
npm run compile
# Fix any TypeScript errors shown
```

### Package size too large
- Remove unnecessary files via `.vscodeignore`
- Exclude `node_modules` for devDependencies

---

## Quick Reference

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
cd extension
vsce package

# Test locally
# Extensions → Install from VSIX → Select .vsix file

# Create GitHub Release
# 1. Push to GitHub
# 2. Create release on GitHub
# 3. Attach .vsix file
```

---

**Ready to distribute!** 🚀

Users can now download and install Manta from your GitHub Releases page.
