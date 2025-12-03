# Manta - Intelligent Collaborative IDE Flow

An intelligent, collaborative VS Code extension for real-time project flow and AI-assisted development.

## 🏗️ Architecture

Manta consists of three main components:

1. **VS Code Extension** (`/extension`) - The client-side extension
2. **Backend Server** (`/server`) - WebSocket server for real-time collaboration
3. **AI Service** (`/ai`) - Python-based AI service for code review and task assignment

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- VS Code 1.80+

### Setup Instructions

#### 1. Install Server Dependencies

```bash
cd manta/server
npm install
```

#### 2. Install AI Service Dependencies

```bash
cd manta/ai
pip install -r requirements.txt
```

#### 3. Install Extension Dependencies

```bash
cd manta/extension
npm install
```

### Running the Project

You need to run all three components simultaneously:

#### Terminal 1: Start the Backend Server

```bash
cd manta/server
npm run dev
```

The server will start on `http://localhost:3000`

#### Terminal 2: Start the AI Service

```bash
cd manta/ai
uvicorn main:app --reload --port 8000
```

The AI service will start on `http://localhost:8000`

#### Terminal 3: Run the VS Code Extension

1. Open the `manta/extension` folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new VS Code window, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Run `Manta: Start Project` to create a new project

## 🧪 Testing the Extension

### Basic Flow Test

1. **Start a Project**
   - Open Command Palette → `Manta: Start Project`
   - Enter a project name
   - You'll receive an invite token

2. **Join a Session** (in another VS Code window)
   - Open Command Palette → `Manta: Join Session`
   - Enter the invite token from step 1

3. **Delegate a Task**
   - Open Command Palette → `Manta: Delegate Task`
   - Enter a task name
   - AI will auto-assign to a team member

4. **Commit Code**
   - Open a file and make changes
   - Open Command Palette → `Manta: Commit Logic` or `Manta: Commit Styles`
   - AI will review your code and provide suggestions

5. **View Duty Queue**
   - Check the Explorer sidebar for "Duty Queue"
   - Your assigned tasks will appear there

## 📁 Project Structure

```
manta/
├── extension/          # VS Code extension
│   ├── src/
│   │   ├── extension.ts    # Main entry point
│   │   ├── commands.ts     # Command handlers
│   │   ├── state.ts        # State management
│   │   ├── serverClient.ts # WebSocket client
│   │   ├── aiClient.ts     # AI service client
│   │   ├── views.ts        # UI views
│   │   └── ui/             # React UI components
│   └── package.json
├── server/            # Backend server
│   ├── index.ts       # Server entry point
│   ├── routes.ts      # REST API routes
│   ├── wsHandlers.ts  # WebSocket handlers
│   ├── db.ts          # In-memory database
│   └── config.ts      # Configuration
├── ai/                # AI service
│   ├── main.py        # FastAPI entry point
│   ├── api.py         # API endpoints
│   ├── agents.py      # AI agents
│   ├── services.py    # Business logic
│   └── models.py      # Data models
└── shared/            # Shared types
    ├── ts-types.ts    # TypeScript types
    └── py-types.py    # Python types
```

## 🔧 Configuration

### Extension Settings

- `manta.serverUrl`: WebSocket URL of the backend server (default: `ws://localhost:3000`)
- `manta.aiServerUrl`: HTTP URL of the AI service (default: `http://localhost:8000`)

## 🐛 Troubleshooting

### Extension won't activate
- Check that both server and AI service are running
- Check the Output panel → "Manta" for logs

### WebSocket connection fails
- Ensure the server is running on port 3000
- Check firewall settings

### AI service not responding
- Ensure Python dependencies are installed
- Check that uvicorn is running on port 8000

## 📝 Development Notes

- The current implementation uses in-memory storage (no persistence)
- AI agents use simple heuristics (can be enhanced with ML models)
- UI components need bundling for production use

## 🎯 Next Steps

- [ ] Add database persistence (PostgreSQL/MongoDB)
- [ ] Implement real ML models for task assignment
- [ ] Add authentication and authorization
- [ ] Bundle React UI components
- [ ] Add comprehensive tests
- [ ] Deploy to production
