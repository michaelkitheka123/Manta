# 🚀 How to Run Manta - Quick Guide

## Step 1: Install Dependencies (One Time Only)

Open 3 terminals and run these commands:

### Terminal 1 - Install Server Dependencies
```powershell
cd c:\Users\victor\Desktop\kraken\manta\server
npm install
```

### Terminal 2 - Install Extension Dependencies
```powershell
cd c:\Users\victor\Desktop\kraken\manta\extension
npm install
```

### Terminal 3 - Install AI Dependencies
```powershell
cd c:\Users\victor\Desktop\kraken\manta\ai
pip install -r requirements.txt
```

**Wait for all 3 to complete before proceeding.**

---

## Step 2: Start All Services

Keep the same 3 terminals open and run:

### Terminal 1 - Start Backend Server
```powershell
cd c:\Users\victor\Desktop\kraken\manta\server
npm run dev
```
✅ **Wait for:** `Manta backend server running at http://localhost:3000`

### Terminal 2 - Start AI Service
```powershell
cd c:\Users\victor\Desktop\kraken\manta\ai
python -m uvicorn main:app --reload --port 8000
```
✅ **Wait for:** `Uvicorn running on http://127.0.0.1:8000`

### Terminal 3 - Run VS Code Extension
1. Open VS Code
2. **File → Open Folder** → Select `c:\Users\victor\Desktop\kraken\manta\extension`
3. Press **F5** (or Run → Start Debugging)
4. A new VS Code window will open (Extension Development Host)

---

## Step 3: Test the Extension

In the **Extension Development Host** window:

### Create a Project
1. Press `Ctrl+Shift+P` (Command Palette)
2. Type: `Manta: Start Project`
3. Enter project name: `MyFirstProject`
4. You'll get an invite token - save it!

### Delegate a Task
1. Press `Ctrl+Shift+P`
2. Type: `Manta: Delegate Task`
3. Enter task name: `Build login page`
4. AI will assign it to a team member

### Test AI Code Review
1. Create a new file with this code:
```javascript
const result = eval("2 + 2");
```
2. Press `Ctrl+Shift+P`
3. Type: `Manta: Commit Logic`
4. AI will flag the `eval()` security issue

### View Your Tasks
- Check the **Explorer sidebar** → Look for **"Duty Queue"**
- Your assigned tasks will appear there

---

## 🔍 Verify Everything is Running

### Check Server
Open browser: http://localhost:3000/api/health
Should show: `{"status":"ok"}`

### Check AI Service
Open browser: http://localhost:8000/health
Should show: `{"status":"ok"}`

### Check Extension
In VS Code Extension Development Host:
- View → Output → Select "Manta" from dropdown
- Should see: `Manta Extension successfully activated!`

---

## 🐛 Troubleshooting

### "Cannot connect to server"
- Make sure Terminal 1 shows: `Manta backend server running`
- Check port 3000 isn't used by another app

### "AI service not responding"
- Make sure Terminal 2 shows: `Uvicorn running on http://127.0.0.1:8000`
- Check port 8000 isn't used by another app

### Extension won't activate
- Check both server and AI service are running first
- Look at Output panel → "Manta" for error messages

---

## 📝 Summary

**3 Terminals Needed:**
1. `manta/server` → `npm run dev`
2. `manta/ai` → `uvicorn main:app --reload --port 8000`
3. VS Code → Open `manta/extension` → Press F5

**All 3 must be running** for the extension to work properly!
