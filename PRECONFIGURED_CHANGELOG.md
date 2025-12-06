# Manta Extension - What Changed

## ✅ Production URLs Now Pre-Configured!

Your extension is now **zero-config** for team members!

### What's Hardcoded:

**Server URL (WebSocket):**
```
wss://web-production-9466f.up.railway.app
```

**AI Service URL:**
```
https://manta-ai-production.up.railway.app
```

### What This Means:

✅ **Team members**: Just install the .vsix - no configuration needed!
✅ **Works immediately**: Extension connects to production servers automatically
✅ **Optional override**: Users can still change URLs in settings if needed

---

## 📦 New Package

**File**: `extension/manta-1.0.0.vsix`
**Size**: ~400 KB
**Status**: Ready for GitHub Release

---

## 🚀 Next Steps

### 1. Update GitHub Release

Replace the old `.vsix` file with the new one:

1. Go to: https://github.com/michaelkitheka123/Manta/releases/tag/v1.0.0
2. Click **"Edit release"**
3. Delete old `manta-1.0.0.vsix`
4. Upload new `manta-1.0.0.vsix` from `extension/` folder
5. Update description to mention "Zero-config setup"
6. Click **"Update release"**

### 2. Share with Team

Send them:
- **Download link**: https://github.com/michaelkitheka123/Manta/releases/latest
- **Setup guide**: `ZERO_CONFIG_SETUP.md`
- **Invite token**: Your project invite token

They'll be up and running in 1 minute!

---

## 🔄 For Future Releases

If you change server URLs:

1. Update `extension/package.json` defaults
2. Recompile: `npm run compile`
3. Repackage: `npx vsce package --allow-star-activation --allow-missing-repository --no-dependencies`
4. Upload new `.vsix` to GitHub Release

---

## 📝 Files Modified

- `extension/package.json` - Updated default URLs
- `extension/manta-1.0.0.vsix` - Repackaged with new defaults

---

**Your extension is now production-ready with zero configuration!** 🎉
