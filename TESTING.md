# Manta Testing Guide

## 🚀 Quick Start

### Automated Setup (Windows)

Run the setup script from the `manta` directory:

```bash
setup.bat
```

This will install all dependencies for the server, extension, and AI service.

### Manual Setup

If you prefer manual setup or are on Mac/Linux:

```bash
# Install server dependencies
cd manta/server
npm install

# Install extension dependencies
cd ../extension
npm install

# Install AI dependencies
cd ../ai
pip install -r requirements.txt
```

## 🧪 Running the Project

You need **3 terminals** running simultaneously:

### Terminal 1: Backend Server

```bash
cd manta/server
npm run dev
```

Expected output:
```
[Server][timestamp] Manta backend server running at http://localhost:3000
WebSocket server running.
```

### Terminal 2: AI Service

```bash
cd manta/ai
uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 3: VS Code Extension

1. Open VS Code
2. Open the `manta/extension` folder
3. Press `F5` (or Run → Start Debugging)
4. A new VS Code window will open (Extension Development Host)

## ✅ Testing Scenarios

### Scenario 1: Create and Join a Project

**In Extension Development Host Window:**

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type `Manta: Start Project`
3. Enter project name: `TestProject`
4. You'll see a notification with an invite token (e.g., `abc123def456`)

**Expected Results:**
- ✅ Success message: "Project 'TestProject' created. Invite token generated."
- ✅ Check server terminal: Should show project creation
- ✅ Check "Manta" output panel in VS Code for logs

**To Join from Another Window:**

1. Open another VS Code window
2. Command Palette → `Manta: Join Session`
3. Enter the invite token from above
4. You should see: "Joined project 'TestProject' as Implementer"

### Scenario 2: Delegate a Task

1. Command Palette → `Manta: Delegate Task`
2. Enter task name: `Implement login feature`
3. AI will auto-assign to a team member

**Expected Results:**
- ✅ Notification: "Task 'Implement login feature' assigned to [member]"
- ✅ Task appears in Duty Queue sidebar

### Scenario 3: Code Review with AI

1. Create a new file or open an existing one
2. Add some code (try adding `eval()` for testing)
3. Command Palette → `Manta: Commit Logic`

**Expected Results:**
- ✅ AI reviews the code
- ✅ If `eval()` is found: "AI suggestions received"
- ✅ Suggestions appear in the Manta output panel

### Scenario 4: Style Review

1. Open a file with a very long line (>80 characters)
2. Command Palette → `Manta: Commit Styles`

**Expected Results:**
- ✅ AI flags lines exceeding 80 characters
- ✅ Suggestions appear in output

### Scenario 5: View Duty Queue

1. Look at the Explorer sidebar
2. Find "Duty Queue" section
3. Your assigned tasks should appear there

## 🐛 Troubleshooting

### Extension Won't Activate

**Check:**
- ✅ Server is running on port 3000
- ✅ AI service is running on port 8000
- ✅ Check "Manta" output panel for error messages

**Fix:**
```bash
# Restart both services
# Terminal 1
cd manta/server
npm run dev

# Terminal 2
cd manta/ai
uvicorn main:app --reload --port 8000
```

### "Cannot connect to server" Error

**Check:**
- ✅ Port 3000 is not in use by another application
- ✅ Firewall isn't blocking the connection

**Test server manually:**
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### AI Service Not Responding

**Check:**
- ✅ Python dependencies are installed
- ✅ Port 8000 is available

**Test AI service:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### WebSocket Connection Fails

**Check server logs for:**
```
WebSocket server running.
```

**In VS Code, check Manta output:**
```
Connected to Manta server at ws://localhost:3000
```

### Tasks Not Appearing in Duty Queue

**Possible causes:**
- Role not set correctly
- WebSocket connection issue
- Tasks not assigned to you

**Debug:**
1. Check Manta output panel
2. Look for "Tasks updated: X tasks"
3. Verify you joined the session correctly

## 📊 Health Checks

### Quick Health Check Script

Create a file `health-check.bat`:

```batch
@echo off
echo Checking Server...
curl http://localhost:3000/api/health
echo.
echo Checking AI Service...
curl http://localhost:8000/health
echo.
pause
```

Run this to verify both services are running.

## 🎯 Test Checklist

- [ ] Server starts without errors
- [ ] AI service starts without errors
- [ ] Extension activates in Development Host
- [ ] Can create a new project
- [ ] Can join a session with invite token
- [ ] Can delegate a task
- [ ] AI reviews code for logic issues
- [ ] AI reviews code for style issues
- [ ] Duty Queue shows assigned tasks
- [ ] File save events are logged
- [ ] WebSocket connection is stable

## 📝 Known Limitations

1. **No Persistence**: Data is stored in memory only (restarting server clears all data)
2. **Simple AI**: Uses basic heuristics, not real ML models
3. **UI Not Bundled**: React UI needs proper bundling for production
4. **No Authentication**: Anyone with the token can join
5. **Local Only**: Not configured for remote deployment yet

## 🔧 Development Tips

### Watch Mode

For active development, use watch mode:

```bash
# Server (in one terminal)
cd manta/server
npm run dev  # Already includes watch mode with ts-node

# Extension (VS Code handles this when you press F5)
```

### Viewing Logs

**Extension Logs:**
- View → Output → Select "Manta" from dropdown

**Server Logs:**
- Check the terminal where server is running

**AI Service Logs:**
- Check the terminal where uvicorn is running

### Debugging

**Extension:**
- Set breakpoints in VS Code
- Press F5 to start debugging
- Breakpoints will hit in the Extension Development Host

**Server:**
- Add `console.log()` statements
- Or use VS Code's Node.js debugger

**AI Service:**
- Add `print()` statements
- Or use Python debugger (pdb)

## 🎓 Next Steps After Testing

Once basic testing works:

1. **Add Real Database**: Replace in-memory storage with PostgreSQL/MongoDB
2. **Implement Auth**: Add user authentication and authorization
3. **Bundle UI**: Set up webpack/vite for React components
4. **Add Tests**: Write unit and integration tests
5. **Deploy**: Set up production deployment (Docker, cloud hosting)
