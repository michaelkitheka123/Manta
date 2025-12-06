import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { ExtensionState } from './state';
import { ServerClient } from './serverClient';
import { AIClient } from './aiClient';
import { ViewsManager } from './views';
import { log } from './utils';
import { SidebarProvider } from './sidebarPanel';

let state: ExtensionState;
let serverClient: ServerClient;
let aiClient: AIClient;
let viewsManager: ViewsManager;

export async function activate(context: vscode.ExtensionContext) {
    const activationStart = Date.now();
    log('🚀 Manta Extension activation started.');

    try {
        // 1. Initialize State immediately
        const stateStart = Date.now();
        log('⏱️  [1/7] Initializing state...');
        state = new ExtensionState(context);
        log(`✅ State initialized in ${Date.now() - stateStart}ms`);

        // Check for pending project (from reload)
        const pending = state.getPendingProject();
        if (pending) {
            log(`🔄 Restoring pending project: ${pending.project.name}`);
            state.setProject(pending.project);
            state.setRole(pending.role);

            // Clear it so we don't restore it again next time
            await state.clearPendingProject();

            vscode.window.showInformationMessage(`Welcome back to ${pending.project.name}! Manta is ready.`);
        }

        // Load all saved projects
        state.loadAllProjects();

        // Try to restore last active project
        const restored = await state.restoreLastProject();
        if (restored) {
            log('Restored last active project');
        }

        // 2. Initialize Clients (but don't connect yet)
        const clientsStart = Date.now();
        log('⏱️  [2/7] Initializing Clients...');
        serverClient = new ServerClient(state);
        aiClient = new AIClient(state);
        log(`✅ Clients initialized in ${Date.now() - clientsStart}ms`);

        // 3. Register Sidebar Panel FIRST (instant load)
        const sidebarStart = Date.now();
        log('⏱️  [3/7] Registering sidebar...');
        const sidebarProvider = new SidebarProvider(context.extensionUri, state, serverClient, aiClient);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('manta.sidebarPanel', sidebarProvider)
        );

        // Register URI Handler for OAuth
        context.subscriptions.push(
            vscode.window.registerUriHandler({
                handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
                    if (uri.path === '/auth') {
                        const query = new URLSearchParams(uri.query);
                        const token = query.get('token');
                        const name = query.get('name');
                        const avatar = query.get('avatar');
                        const id = query.get('id');

                        if (token && name && id) {
                            state.setUser({
                                id,
                                name: decodeURIComponent(name),
                                avatarUrl: avatar ? decodeURIComponent(avatar) : undefined
                            });
                            vscode.window.showInformationMessage(`Welcome back, ${decodeURIComponent(name)}!`);
                            sidebarProvider.refresh();
                        }
                    }
                }
            })
        );

        log(`✅ Sidebar registered in ${Date.now() - sidebarStart}ms`);

        // 4. Initialize Views Manager
        const viewsStart = Date.now();
        log('⏱️  [4/7] Initializing ViewsManager...');
        viewsManager = new ViewsManager(context, state, serverClient, aiClient);
        viewsManager.initializeViews();
        log(`✅ ViewsManager initialized in ${Date.now() - viewsStart}ms`);

        // 5. Register Commands IMMEDIATELY
        const commandsStart = Date.now();
        log('⏱️  [5/7] Registering commands...');
        registerCommands(context, state, serverClient, aiClient, viewsManager);
        log(`✅ Commands registered in ${Date.now() - commandsStart}ms`);

        // 6. Setup Event Listeners
        const listenersStart = Date.now();
        log('⏱️  [6/7] Setting up event listeners...');
        setupEventListeners(sidebarProvider);
        log(`✅ Event listeners setup in ${Date.now() - listenersStart}ms`);

        // 7. Connect to services in the background (don't block)
        log('⏱️  [7/7] Connecting to services in background...');
        connectServicesBackground();

        // 8. Scan workspace for existing files
        scanWorkspaceForTasks(sidebarProvider);

        const totalTime = Date.now() - activationStart;
        log(`🎉 Manta Extension activated in ${totalTime}ms (connections pending).`);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to activate Manta: ${err}`);
        log(`❌ Error during activation: ${err}`);
    }
}

function setupEventListeners(sidebarProvider: SidebarProvider) {
    vscode.workspace.onDidSaveTextDocument(async (document) => {
        log(`File saved: ${document.fileName}`);
        const relativePath = vscode.workspace.asRelativePath(document.uri);
        await serverClient.sendFileSaveEvent(relativePath);
        await aiClient.notifyFileSave(relativePath, document.getText());

        // Granular Task Generation
        await parseAndGenerateTasks(document, sidebarProvider);
    });

    vscode.workspace.onDidCloseTextDocument(async (document) => {
        log(`File closed: ${document.fileName}`);
        serverClient.notifyFileClose(document.fileName);
    });

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
            state.setCurrentEditor(editor.document.uri.fsPath);
            serverClient.notifyFileFocus(relativePath);
        }
    });

    // Activate background listeners
    serverClient.onTaskUpdate((tasks) => {
        state.setTasks(tasks);
        sidebarProvider.refresh();
    });

    serverClient.onDependencyUpdate((graph) => {
        state.setDependencyGraph(graph);
        sidebarProvider.refresh();
    });

    serverClient.onMembersUpdate((members) => {
        // Map any incompatible types if necessary, though shared/ts-types should align
        // The server sends Member objects which match our interface (mostly)
        state.updateMembers(members);
        sidebarProvider.refresh();
    });

    aiClient.onSuggestions((suggestions) => state.applyAISuggestions(suggestions));

    // Watch for new files to auto-generate tasks
    vscode.workspace.onDidCreateFiles(async (event) => {
        for (const file of event.files) {
            // Skip node_modules and hidden files
            if (file.path.includes('node_modules') || file.path.includes('/.')) {
                continue;
            }

            const fileName = vscode.workspace.asRelativePath(file);
            const taskName = generateTaskNameFromFile(fileName);

            if (taskName) {
                const newTask: import('../../shared/ts-types').Task = {
                    id: Math.random().toString(36).substring(2, 15),
                    name: taskName,
                    description: `Auto-generated task for ${fileName}`,
                    status: 'pending',
                    assignee: undefined,
                    // dependencies: [] // Task interface doesn't have dependencies in the definition I saw?
                };

                state.addAvailableTask(newTask);
                await serverClient.createTask(newTask);

                // Refresh views
                viewsManager.refreshDutyQueue();
                sidebarProvider.refresh();

                vscode.window.showInformationMessage(`✨ Auto-created task: "${taskName}"`);
            }
        }
    });
}

function generateTaskNameFromFile(fileName: string): string | null {
    const baseName = fileName.split('/').pop() || fileName;

    // React/JSX Components
    if (baseName.endsWith('.tsx') || baseName.endsWith('.jsx')) {
        return `Implement ${baseName.replace(/\.[^/.]+$/, "")} component`;
    }

    // TypeScript/JavaScript
    if (baseName.endsWith('.ts') || baseName.endsWith('.js') || baseName.endsWith('.mjs')) {
        return `Implement ${baseName.replace(/\.[^/.]+$/, "")} module`;
    }

    // Python
    if (baseName.endsWith('.py')) {
        return `Implement ${baseName.replace(/\.py$/, "")} module`;
    }

    // Java
    if (baseName.endsWith('.java')) {
        return `Implement ${baseName.replace(/\.java$/, "")} class`;
    }

    // C/C++
    if (baseName.endsWith('.c') || baseName.endsWith('.cpp') || baseName.endsWith('.cc') || baseName.endsWith('.cxx')) {
        return `Implement ${baseName.replace(/\.[^/.]+$/, "")}`;
    }
    if (baseName.endsWith('.h') || baseName.endsWith('.hpp')) {
        return `Define ${baseName.replace(/\.[^/.]+$/, "")} header`;
    }

    // C#
    if (baseName.endsWith('.cs')) {
        return `Implement ${baseName.replace(/\.cs$/, "")} class`;
    }

    // Go
    if (baseName.endsWith('.go')) {
        return `Implement ${baseName.replace(/\.go$/, "")} package`;
    }

    // Rust
    if (baseName.endsWith('.rs')) {
        return `Implement ${baseName.replace(/\.rs$/, "")} module`;
    }

    // PHP
    if (baseName.endsWith('.php')) {
        return `Implement ${baseName.replace(/\.php$/, "")}`;
    }

    // Ruby
    if (baseName.endsWith('.rb')) {
        return `Implement ${baseName.replace(/\.rb$/, "")} module`;
    }

    // Swift
    if (baseName.endsWith('.swift')) {
        return `Implement ${baseName.replace(/\.swift$/, "")}`;
    }

    // Kotlin
    if (baseName.endsWith('.kt') || baseName.endsWith('.kts')) {
        return `Implement ${baseName.replace(/\.[^/.]+$/, "")}`;
    }

    // Dart
    if (baseName.endsWith('.dart')) {
        return `Implement ${baseName.replace(/\.dart$/, "")}`;
    }

    // Scala
    if (baseName.endsWith('.scala')) {
        return `Implement ${baseName.replace(/\.scala$/, "")}`;
    }

    // Styles
    if (baseName.endsWith('.css') || baseName.endsWith('.scss') || baseName.endsWith('.sass') || baseName.endsWith('.less')) {
        return `Style ${baseName.replace(/\.[^/.]+$/, "")}`;
    }

    // HTML/Templates
    if (baseName.endsWith('.html') || baseName.endsWith('.htm')) {
        return `Implement ${baseName.replace(/\.[^/.]+$/, "")} page`;
    }
    if (baseName.endsWith('.vue')) {
        return `Implement ${baseName.replace(/\.vue$/, "")} component`;
    }
    if (baseName.endsWith('.svelte')) {
        return `Implement ${baseName.replace(/\.svelte$/, "")} component`;
    }

    // Tests
    if (baseName.endsWith('.test.ts') || baseName.endsWith('.spec.ts') ||
        baseName.endsWith('.test.js') || baseName.endsWith('.spec.js') ||
        baseName.endsWith('.test.py') || baseName.endsWith('.spec.py')) {
        return `Write tests for ${baseName.replace(/\.(test|spec)\.(ts|js|py)$/, "")}`;
    }

    // Documentation
    if (baseName.endsWith('.md') || baseName.endsWith('.mdx')) {
        return `Document ${baseName.replace(/\.(md|mdx)$/, "")}`;
    }

    // Config files
    if (baseName.endsWith('.json') || baseName.endsWith('.yaml') || baseName.endsWith('.yml') || baseName.endsWith('.toml')) {
        return `Configure ${baseName.replace(/\.[^/.]+$/, "")}`;
    }

    return null; // Skip unknown file types
}

function connectServicesBackground() {
    setTimeout(() => {
        log('Connecting to server in background...');
        serverClient.connect()
            .then(() => log('Server connected'))
            .catch(err => log(`Server connection failed: ${err}`));

        log('Connecting to AI in background...');
        aiClient.connect()
            .then(() => log('AI connected'))
            .catch(err => log(`AI connection failed: ${err}`));
    }, 100);
}

export function deactivate() {
    log('Manta Extension deactivating...');
    serverClient?.disconnect();
    aiClient?.disconnect();
}

async function parseAndGenerateTasks(document: vscode.TextDocument, sidebarProvider: SidebarProvider) {
    const text = document.getText();
    const relativePath = vscode.workspace.asRelativePath(document.uri);
    const fileName = relativePath.split('/').pop() || relativePath;
    const ext = fileName.split('.').pop()?.toLowerCase();

    let patterns: { regex: RegExp; type: string }[] = [];

    // TypeScript/JavaScript
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'mjs') {
        patterns = [
            { regex: /export\s+class\s+(\w+)/g, type: 'class' },
            { regex: /export\s+function\s+(\w+)/g, type: 'function' },
            { regex: /export\s+const\s+(\w+)\s*=\s*(\([^)]*\)|[^=]*)\s*=>/g, type: 'function' }
        ];
    }
    // Python
    else if (ext === 'py') {
        patterns = [
            { regex: /class\s+(\w+)/g, type: 'class' },
            { regex: /def\s+(\w+)/g, type: 'function' }
        ];
    }
    // Java/C#/Kotlin/Scala
    else if (ext === 'java' || ext === 'cs' || ext === 'kt' || ext === 'scala') {
        patterns = [
            { regex: /class\s+(\w+)/g, type: 'class' },
            { regex: /interface\s+(\w+)/g, type: 'interface' },
            { regex: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g, type: 'method' }
        ];
    }
    // Go
    else if (ext === 'go') {
        patterns = [
            { regex: /type\s+(\w+)\s+struct/g, type: 'struct' },
            { regex: /func\s+(\w+)/g, type: 'function' }
        ];
    }
    // Rust
    else if (ext === 'rs') {
        patterns = [
            { regex: /struct\s+(\w+)/g, type: 'struct' },
            { regex: /fn\s+(\w+)/g, type: 'function' },
            { regex: /trait\s+(\w+)/g, type: 'trait' }
        ];
    }
    // PHP
    else if (ext === 'php') {
        patterns = [
            { regex: /class\s+(\w+)/g, type: 'class' },
            { regex: /function\s+(\w+)/g, type: 'function' }
        ];
    }
    // Ruby
    else if (ext === 'rb') {
        patterns = [
            { regex: /class\s+(\w+)/g, type: 'class' },
            { regex: /def\s+(\w+)/g, type: 'method' }
        ];
    }
    // Swift
    else if (ext === 'swift') {
        patterns = [
            { regex: /class\s+(\w+)/g, type: 'class' },
            { regex: /struct\s+(\w+)/g, type: 'struct' },
            { regex: /func\s+(\w+)/g, type: 'function' }
        ];
    }
    // C/C++
    else if (ext === 'c' || ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'h' || ext === 'hpp') {
        patterns = [
            { regex: /class\s+(\w+)/g, type: 'class' },
            { regex: /struct\s+(\w+)/g, type: 'struct' },
            { regex: /\w+\s+(\w+)\s*\([^)]*\)\s*{/g, type: 'function' }
        ];
    }
    else {
        return; // Unsupported file type for granular parsing
    }

    const newTasks: import('../../shared/ts-types').Task[] = [];

    for (const { regex, type } of patterns) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            const objectName = match[1];
            const taskName = `Implement ${type} ${objectName} in ${fileName}`;

            // Check for duplicates
            const allTasks = [...state.getTasks(), ...state.getAvailableTasks()];
            const exists = allTasks.some(t => t.name === taskName);

            if (!exists) {
                newTasks.push({
                    id: Math.random().toString(36).substring(2, 15),
                    name: taskName,
                    description: `Auto-generated task for ${type} ${objectName} in ${relativePath}`,
                    status: 'pending',
                    assignee: undefined
                });
            }
        }
    }

    // Add and persist new tasks
    for (const task of newTasks) {
        state.addAvailableTask(task);
        await serverClient.createTask(task);
        vscode.window.showInformationMessage(`✨ Auto-created task: "${task.name}"`);
    }

    if (newTasks.length > 0) {
        viewsManager.refreshDutyQueue();
        sidebarProvider.refresh();
    }
}

async function scanWorkspaceForTasks(sidebarProvider: SidebarProvider) {
    log('Scanning workspace for existing files...');

    // Find all relevant files
    const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx,mjs,py,java,c,cpp,cc,cxx,h,hpp,cs,go,rs,php,rb,swift,kt,kts,dart,scala,css,scss,sass,less,html,htm,vue,svelte,md,mdx,json,yaml,yml,toml}',
        '{**/node_modules/**,**/dist/**,**/build/**,**/.*}'
    );

    let tasksCreated = 0;

    for (const file of files) {
        const fileName = vscode.workspace.asRelativePath(file);
        const taskName = generateTaskNameFromFile(fileName);

        if (taskName) {
            // Check if task already exists
            const allTasks = [...state.getTasks(), ...state.getAvailableTasks()];
            const exists = allTasks.some(t => t.name === taskName);

            if (!exists) {
                const newTask: import('../../shared/ts-types').Task = {
                    id: Math.random().toString(36).substring(2, 15),
                    name: taskName,
                    description: `Auto-generated task for ${fileName}`,
                    status: 'pending',
                    assignee: undefined
                };

                state.addAvailableTask(newTask);
                await serverClient.createTask(newTask);
                tasksCreated++;
            }
        }

        // Also parse for granular tasks if it's a code file
        if (fileName.match(/\.(ts|tsx|js|jsx|mjs|py|java|cs|go|rs|php|rb|swift|kt|scala|c|cpp|cc|cxx|h|hpp)$/)) {
            const document = await vscode.workspace.openTextDocument(file);
            await parseAndGenerateTasks(document, sidebarProvider);
        }
    }

    if (tasksCreated > 0) {
        viewsManager.refreshDutyQueue();
        sidebarProvider.refresh();
        log(`Scanned workspace and created ${tasksCreated} new tasks.`);
    } else {
        log('Workspace scan complete. No new tasks created.');
    }
}
