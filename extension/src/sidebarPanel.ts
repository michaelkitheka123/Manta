import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { ExtensionState } from './state';
import { ServerClient } from './serverClient';
import { AIClient } from './aiClient';
import { Project } from '../../shared/ts-types';

export class SidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private state: ExtensionState,
        private serverClient: ServerClient,
        private aiClient: AIClient
    ) { }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        const resolveStart = Date.now();
        console.log('📱 [SIDEBAR] resolveWebviewView called');

        this._view = webviewView;
        this.configureWebview(webviewView);
        console.log(`📱 [SIDEBAR] Webview configured in ${Date.now() - resolveStart}ms`);

        this.showLoadingScreen(webviewView);
        this.setupMessageHandlers(webviewView);

        // Auto-scan on load
        this.scanForFileTasks();
    }

    private configureWebview(webviewView: vscode.WebviewView): void {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
    }

    private showLoadingScreen(webviewView: vscode.WebviewView): void {
        webviewView.webview.html = this.getLoadingHtml();

        setTimeout(async () => {
            await webviewView.webview.postMessage({ type: 'ready' });

            setTimeout(() => {
                const contentStart = Date.now();
                console.log('🔄 [SIDEBAR] Loading main content...');
                webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
                console.log(`✅ [SIDEBAR] Main content loaded in ${Date.now() - contentStart}ms`);
            }, 300);
        }, 1000);
    }

    private setupMessageHandlers(webviewView: vscode.WebviewView): void {
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'startProject':
                    await this.handleStartProject(data.projectName);
                    break;
                case 'joinSession':
                    await this.handleJoinSession(data.token);
                    break;
                case 'delegateTask':
                    await this.handleDelegateTask(data.taskName);
                    break;
                case 'createTask':
                    await this.handleCreateTask(data.taskName);
                    break;
                case 'assignTask':
                    await this.handleAssignTask(data.taskId, data.member);
                    break;
                case 'updateTaskStatus':
                    await this.handleUpdateTaskStatus(data.taskId, data.status);
                    break;
                case 'pickUpTask':
                    await this.handlePickUpTask(data.taskId);
                    break;
                case 'approveMerge':
                    await this.handleApproveMerge(data.taskName);
                    break;
                case 'commitLogic':
                    await vscode.commands.executeCommand('manta.commitLogic');
                    break;
                case 'commitStyles':
                    await vscode.commands.executeCommand('manta.commitStyles');
                    break;
                case 'approveReview':
                    await this.handleApproveReview(data.reviewId);
                    break;
                case 'declineReview':
                    await this.handleDeclineReview(data.reviewId);
                    break;
                case 'logout':
                    await this.handleLogout();
                    break;
                case 'switchProject':
                    await this.handleSwitchProject(data.projectId);
                    break;
                case 'leaveProject':
                    await this.handleLeaveProject(data.projectId);
                    break;
                case 'requestTaskAssignment':
                    await this.handleRequestTaskAssignment(data.taskId);
                    break;
                case 'login':
                    await this.handleLogin();
                    break;
                case 'copyToClipboard':
                    await vscode.env.clipboard.writeText(data.value);
                    vscode.window.showInformationMessage('Token copied to clipboard!');
                    break;
                case 'reviewAndCommit':
                    await this.handleReviewAndCommit(data.taskId);
                    break;
                case 'submitReview':
                    await this.handleSubmitReview();
                    break;
            }
        });
    }

    // Message Handlers
    private async handleStartProject(projectName: string): Promise<void> {
        try {
            if (!projectName?.trim()) {
                vscode.window.showErrorMessage('Please enter a project name');
                return;
            }

            const user = this.state.getUser();
            if (!user?.name) {
                vscode.window.showErrorMessage('Please login with GitHub first');
                return;
            }

            vscode.window.showInformationMessage('Creating project...');
            const newProject = await this.serverClient.createProject(projectName, user.name);
            this.state.setProject(newProject);
            this.state.setRole('lead');
            await this.state.saveCurrentProject();
            await this.createProjectFolder(projectName);
            await this.scanForFileTasks();
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to start project: ${err}`);
        }
    }

    private async handleJoinSession(token: string): Promise<void> {
        try {
            if (!token?.trim()) {
                vscode.window.showErrorMessage('Please enter a session token');
                return;
            }

            const user = this.state.getUser();
            if (!user?.name) {
                vscode.window.showErrorMessage('Please login with GitHub first');
                return;
            }

            vscode.window.showInformationMessage('Joining session...');
            const sessionData = await this.serverClient.joinSession(token, user.name);
            this.state.setProject(sessionData.project);
            this.state.setRole('member');
            await this.state.saveCurrentProject();
            vscode.window.showInformationMessage(`Successfully joined project: ${sessionData.project.name}`);
            await this.scanForFileTasks();
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to join session: ${err}`);
        }
    }

    private async handleDelegateTask(taskName: string): Promise<void> {
        try {
            if (!taskName?.trim()) return;

            const bestMember = await this.aiClient.autoAssignTask(taskName, this.state.getActiveMembers());
            await this.serverClient.assignTask(taskName, bestMember);
            vscode.window.showInformationMessage(`Task "${taskName}" assigned to ${bestMember}`);
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to delegate task: ${err}`);
        }
    }

    private async handleCreateTask(taskName: string): Promise<void> {
        try {
            if (!taskName?.trim()) return;

            const newTask: import('../../shared/ts-types').Task = {
                id: Math.random().toString(36).substring(2, 15),
                name: taskName,
                description: '',
                status: 'pending',
                assignee: undefined
            };

            await this.serverClient.createTask(newTask);
            vscode.window.showInformationMessage(`Task created: ${taskName}`);
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to create task: ${err}`);
        }
    }

    private async handleAssignTask(taskId: string, member: string): Promise<void> {
        // Logic updated to support file paths as IDs
        const task = this.state.findTaskById(taskId);
        if (task) {
            task.assignee = member;
            this.state.updateTask(task);

            await this.serverClient.assignTask(task.name, member);

            vscode.window.showInformationMessage(`Task "${task.name}" assigned to ${member}`);
            this.refresh();
        } else {
            vscode.window.showErrorMessage(`Failed to assign task: Task ID not found.`);
        }
    }

    private async handleUpdateTaskStatus(taskId: string, status: 'start' | 'complete'): Promise<void> {
        // Mock implementation
        vscode.window.showInformationMessage(`Task ${status}ed!`);
        this.refresh();
    }

    private async handlePickUpTask(taskId: string): Promise<void> {
        const user = this.state.getUser();
        if (user && user.name) {
            const task = this.state.findTaskById(taskId);
            if (task) {
                task.assignee = user.name;
                this.state.updateTask(task);

                // Sync with server
                await this.serverClient.assignTask(task.name, user.name);

                vscode.window.showInformationMessage(`You picked up task: ${task.name}`);

                // Open file if taskId resolves to a file in workspace
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const filePath = vscode.Uri.joinPath(workspaceFolders[0].uri, taskId);
                    try {
                        const doc = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(doc);
                    } catch (e) {
                        // Suppress if file not found, as ID might abstract
                    }
                }

                this.refresh();
            } else {
                vscode.window.showErrorMessage(`Task not found: ${taskId}`);
            }
        } else {
            vscode.window.showErrorMessage('You must be logged in to pick up tasks.');
        }
    }

    private async handleReviewAndCommit(taskId: string): Promise<void> {
        vscode.window.showInformationMessage(`Starting AI Review for task: ${taskId}`);
        await vscode.commands.executeCommand('manta.commitLogic', taskId);
    }

    private async handleApproveMerge(taskName: string): Promise<void> {
        try {
            if (!taskName?.trim()) return;

            await this.serverClient.approveTask(taskName);
            vscode.window.showInformationMessage(`Task "${taskName}" approved.`);
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to approve merge: ${err}`);
        }
    }

    private async handleApproveReview(reviewId: string): Promise<void> {
        try {
            this.state.updateReviewStatus(reviewId, 'approved');
            const reviews = this.state.getPendingReviews();
            const review = reviews.find(r => r.id === reviewId);

            if (review) {
                this.state.incrementMemberMetric(review.submittedBy, 'commitsAccepted');
                this.state.incrementMemberMetric(review.submittedBy, 'tasksCompleted');
                await this.serverClient.approveCodeReview(reviewId);

                // Apply changes to workspace
                if (review.files && review.files.length > 0) {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        const rootUri = workspaceFolders[0].uri;
                        for (const file of review.files) {
                            if (file.proposedCode) {
                                const targetUri = vscode.Uri.joinPath(rootUri, file.path);
                                try {
                                    await vscode.workspace.fs.writeFile(targetUri, Buffer.from(file.proposedCode));
                                    vscode.window.showInformationMessage(`Merged changes for ${file.path}`);
                                } catch (e) {
                                    vscode.window.showErrorMessage(`Failed to write file ${file.path}: ${e}`);
                                }
                            }
                        }
                    }
                }

                vscode.window.showInformationMessage(`✅ Code review approved and merged for ${review.submittedByName}`);
            }
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to approve review: ${err}`);
        }
    }

    private async handleDeclineReview(reviewId: string): Promise<void> {
        try {
            const feedback = await vscode.window.showInputBox({
                prompt: 'Provide feedback for the declined review',
                placeHolder: 'Explain why this review was declined...'
            });

            if (!feedback) return;

            this.state.updateReviewStatus(reviewId, 'declined');
            await this.serverClient.declineCodeReview(reviewId, feedback);
            vscode.window.showInformationMessage('❌ Code review declined with feedback');
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to decline review: ${err}`);
        }
    }

    private async handleLogout(): Promise<void> {
        await this.state.logout();
        this.refresh();
    }

    private async handleSwitchProject(projectId: string): Promise<void> {
        try {
            if (!projectId) {
                await this.state.leaveCurrentProject();
                this.refresh();
                return;
            }

            const user = this.state.getUser();
            if (!user?.name) {
                vscode.window.showErrorMessage('Please login with GitHub first');
                return;
            }

            // Get the saved project to get the token
            const savedProject = this.state.getAllProjects().find(p => p.project.token === projectId);
            if (!savedProject) {
                vscode.window.showErrorMessage('Project not found');
                return;
            }

            vscode.window.showInformationMessage(`Rejoining ${savedProject.project.name}...`);

            // Rejoin the session to get current role and member data from server
            const sessionData = await this.serverClient.joinSession(projectId, user.name);

            // Update state with fresh data from server
            this.state.setProject(sessionData.project);
            this.state.setRole(sessionData.role as import('../../shared/ts-types').UserRole); // Use role from server, not saved role

            // Update the saved project with new data
            await this.state.saveCurrentProject();

            vscode.window.showInformationMessage(`Switched to ${sessionData.project.name} as ${sessionData.role}`);
            await this.scanForFileTasks();
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to switch project: ${err}`);
        }
    }

    private async handleLeaveProject(projectId: string): Promise<void> {
        await this.state.removeProject(projectId);
        vscode.window.showInformationMessage('Project removed from list.');
        this.refresh();
    }

    private async handleLogin(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('manta');
            let serverUrl = config.get<string>('serverUrl') || 'wss://web-production-9466f.up.railway.app';

            // Convert WebSocket URL to HTTP for OAuth
            serverUrl = serverUrl.replace('wss://', 'https://').replace('ws://', 'http://');

            vscode.window.showInformationMessage('Opening GitHub Login...');
            // The server will handle the redirect back to vscode://kraken-labs.manta/auth
            await vscode.env.openExternal(vscode.Uri.parse(`${serverUrl}/auth/github`));
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to open login: ${err}`);
        }
    }

    private async handleRequestTaskAssignment(taskId: string): Promise<void> {
        const project = this.state.getProject();
        if (!project || !project.members) return;

        const members = project.members.map(m => m.name);
        // Include 'None' or cancel option implicitly by escape

        const selectedMember = await vscode.window.showQuickPick(members, {
            placeHolder: 'Select member to assign task to'
        });

        if (selectedMember) {
            // Find task by ID and assign
            const task = this.state.findTaskById(taskId);
            if (task) {
                // In a real scenario, this would call the server
                task.assignee = selectedMember;
                this.state.updateTask(task);

                // Also call server (mocked/wrapped)
                // await this.serverClient.assignTask(task.name, selectedMember);

                vscode.window.showInformationMessage(`Assigned '${task.name}' to ${selectedMember}`);
                this.refresh();
            }
        }
    }

    // AI Review
    private async handleSubmitReview(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to submit');
            return;
        }

        const user = this.state.getUser();
        if (!user) {
            vscode.window.showErrorMessage('Please login first');
            return;
        }

        const filePath = vscode.workspace.asRelativePath(editor.document.uri);
        const content = editor.document.getText();

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Submitting for AI Review...',
            cancellable: false
        }, async () => {
            try {
                // 1. Get AI Analysis
                const analysis = await this.aiClient.analyzeCode(content, editor.document.languageId, filePath);

                // 2. Submit to Server
                // Use simple ID generation to avoid crypto dependency issues
                const reviewId = Date.now().toString(36) + Math.random().toString(36).substring(2);

                const review: import('../../shared/ts-types').CodeReview = {
                    id: reviewId,
                    projectId: this.state.getProject()?.id || '',
                    submittedBy: user.id || user.name,
                    authorId: user.id || user.name,
                    submittedByName: user.name,
                    authorName: user.name,
                    files: [{
                        path: filePath,
                        originalCode: '', // Not available in this context
                        proposedCode: content,
                        language: editor.document.languageId
                    }],
                    filePath: filePath,
                    content: content,
                    aiAnalysis: analysis,
                    status: 'pending',
                    submittedAt: new Date()
                };

                await this.serverClient.submitCodeReview(review);
                vscode.window.showInformationMessage(`Review submitted for ${filePath}`);

                // Add to local state
                this.state.addReview(review);
                this.refresh();
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to submit review: ${err}`);
            }
        });
    }

    // HTML Generation
    private getLoadingHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loading Manta</title>
            <style>
                body { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: var(--vscode-sideBar-background); 
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                }
                #loadingContainer { 
                    text-align: center;
                }
                #title { 
                    font-size: 2rem; 
                    font-weight: 700;
                    margin-bottom: 1rem;
                    letter-spacing: 2px;
                }
                #spinner { 
                    margin: 0 auto; 
                    width: 40px; 
                    height: 40px; 
                    border: 3px solid rgba(255, 255, 255, 0.1); 
                    border-top: 3px solid var(--vscode-focusBorder); 
                    border-radius: 50%; 
                    animation: spin 1s linear 5;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div id="loadingContainer">
                <div id="title">MANTA</div>
                <div id="spinner"></div>
            </div>
            <script>
                window.addEventListener('message', event => {
                    if (event.data.type === 'ready') {
                        document.body.style.opacity = '0';
                        document.body.style.transition = 'opacity 0.3s ease';
                    }
                });
            </script>
        </body>
        </html>`;
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const project = this.state.getProject();

        if (!project) {
            return this.getStartScreenHtml();
        }

        const role = this.state.getRole();

        if (role === 'lead') {
            return this.getLeadDashboardHtml(project);
        }

        return this.getMemberDashboardHtml(project);
    }

    private getStartScreenHtml(): string {
        const projectsListHtml = this.getProjectsListHtml();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Manta - Start</title>
            <style>
                body {
                    padding: 20px;
                    padding-bottom: 50px; /* Space for gradient */
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-sideBar-background);
                    position: relative;
                    min-height: 100vh;
                    box-sizing: border-box;
                }
                .logo-container {
                    text-align: center;
                    margin-bottom: 25px;
                    padding: 10px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                }
                .logo-kraken {
                    font-size: 28px;
                    font-weight: 800;
                    color: #40C4FF; /* Cyan */
                    letter-spacing: 2px;
                    text-shadow: 0 0 10px rgba(64, 196, 255, 0.4);
                    margin: 0;
                    line-height: 1;
                }
                .logo-labs {
                    font-size: 16px;
                    font-weight: 600;
                    color: #40C4FF;
                    letter-spacing: 6px;
                    margin-top: -5px;
                    position: relative;
                    display: inline-block;
                }
                .logo-labs::before, .logo-labs::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    width: 30px;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #40C4FF);
                }
                .logo-labs::before { right: 100%; margin-right: 8px; background: linear-gradient(90deg, transparent, #40C4FF); }
                .logo-labs::after { left: 100%; margin-left: 8px; background: linear-gradient(90deg, #40C4FF, transparent); }
                


                h2 {
                    color: var(--vscode-foreground);
                    margin-bottom: 20px;
                }
                .input-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                }
                input {
                    width: 100%;
                    padding: 8px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                }
                button {
                    padding: 10px 20px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .section {
                    margin-bottom: 30px;
                    padding: 15px;
                    background: rgba(30, 30, 30, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    position: relative;
                    z-index: 1;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
                }
                .project-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: var(--vscode-input-background);
                    margin-bottom: 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .project-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .project-item.active {
                    border: 1px solid var(--vscode-focusBorder);
                }
                .project-info {
                    display: flex;
                    flex-direction: column;
                }
                .project-name {
                    font-weight: 600;
                    font-size: 13px;
                }
                .project-role {
                    font-size: 11px;
                    opacity: 0.7;
                }
                .leave-btn {
                    padding: 4px 8px;
                    background: transparent;
                    color: #ef4444;
                    font-weight: bold;
                    margin: 0;
                }
                .leave-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }
                .spinner {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: var(--vscode-button-foreground);
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    vertical-align: middle;
                    margin-right: 6px;
                }
                button.loading {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .user-avatar-small {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    vertical-align: middle;
                    margin-right: 8px;
                }
                .user-info {
                    display: inline-block;
                    vertical-align: middle;
                }
                .logout-btn {
                    display: block;
                    margin-top: 10px;
                    width: 100%;
                }
            </style>
        </head>
        <body>

            
            <div class="logo-container">
                <div class="logo-kraken">KRAKEN</div>
                <div class="logo-labs">LABS</div>
            </div>
            
            <div class="section">
                <h2>🚀 Start New Project</h2>
                <div class="input-group">
                    <label for="projectName">Project Name</label>
                    <input type="text" id="projectName" placeholder="my-awesome-project">
                </div>
                <button onclick="startProject()">Start Project</button>
            </div>

            <div class="section">
                <h2>🔗 Join Existing Session</h2>
                <div class="input-group">
                    <label for="sessionToken">Session Token</label>
                    <input type="text" id="sessionToken" placeholder="Enter invite token">
                </div>
                <button onclick="joinSession()">Join Session</button>
            </div>

            ${projectsListHtml}

            <div class="section">
                <h2>👤 Authentication</h2>
                ${this.getAuthHtml()}
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function setButtonLoading(buttonElement, isLoading, loadingText = 'Processing...') {
                    if (isLoading) {
                        buttonElement.disabled = true;
                        buttonElement.dataset.originalText = buttonElement.innerHTML;
                        buttonElement.innerHTML = \`<span class="spinner"></span> \${loadingText}\`;
                        buttonElement.classList.add('loading');
                    } else {
                        buttonElement.disabled = false;
                        buttonElement.innerHTML = buttonElement.dataset.originalText || buttonElement.innerHTML;
                        buttonElement.classList.remove('loading');
                    }
                }

                function startProject() {
                    const button = event.target;
                    const projectName = document.getElementById('projectName').value;
                    if (!projectName) return;
                    
                    setButtonLoading(button, true, 'Creating Project...');
                    vscode.postMessage({ type: 'startProject', projectName: projectName });
                }

                function joinSession() {
                    const button = event.target;
                    const token = document.getElementById('sessionToken').value;
                    if (!token) return;
                    
                    setButtonLoading(button, true, 'Joining Session...');
                    vscode.postMessage({ type: 'joinSession', token: token });
                }
                
                function loginWithGithub() {
                    vscode.postMessage({ type: 'login' });
                }
                
                function logout() {
                    vscode.postMessage({ type: 'logout' });
                }

                function switchProject(projectId) {
                    vscode.postMessage({ type: 'switchProject', projectId: projectId });
                }

                function leaveProject(projectId) {
                    if (confirm('Are you sure you want to leave this project?')) {
                        vscode.postMessage({ type: 'leaveProject', projectId: projectId });
                    }
                }
            </script>
        </body>
        </html>`;
    }

    private getProjectsListHtml(): string {
        const allProjects = this.state.getAllProjects();

        if (allProjects.length === 0) {
            return '';
        }

        return `
            <div class="section">
                <h2>📂 Your Projects</h2>
            ${allProjects.map(p => `
                    <div class="project-item ${this.state.getProject()?.token === p.project.token ? 'active' : ''}" onclick="switchProject('${p.project.token}')">
                        <div class="project-info">
                            <span class="project-name">${p.project.name}</span>
                            <span class="project-role">${p.role}</span>
                        </div>
                        <button class="leave-btn" onclick="event.stopPropagation(); leaveProject('${p.project.token}')">Leave</button>
                    </div>
                `).join('')}
            </div>`;
    }

    private getAuthHtml(): string {
        const user = this.state.getUser();

        if (user) {
            return `
                <div class="user-welcome">
                    <img src="${user.avatarUrl || 'https://github.com/identicons/jason.png'}" class="user-avatar-small">
                    <div class="user-info">
                        <span class="user-name">Welcome, ${user.name}</span>
                    </div>
                    <button onclick="logout()" class="logout-btn">Sign Out</button>
                </div>`;
        }

        return `<button onclick="loginWithGithub()">Login with GitHub</button>`;
    }

    private getLeadDashboardHtml(project: Project): string {
        const tasks = this.state.getTasks();
        const pendingReviews = this.state.getPendingReviews();

        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    padding: 20px;
                    padding-bottom: 120px; /* More space for fixed footer */
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-sideBar-background);
                    position: relative;
                    min-height: 100vh;
                    box-sizing: border-box;
                }
                .logo-container {
                    /* Removed default container styles */
                }
                .logo-kraken {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    font-size: 32px;
                    font-weight: 900;
                    color: #40C4FF; /* Cyan */
                    letter-spacing: 4px;
                    text-shadow: 0 0 15px rgba(64, 196, 255, 0.5);
                    margin: 0;
                    line-height: 1;
                    text-transform: uppercase;
                    text-align: center;
                }
                .logo-labs {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: rgba(64, 196, 255, 0.8);
                    letter-spacing: 12px; /* Wide spacing */
                    margin-top: 5px;
                    text-transform: uppercase;
                    text-align: center;
                    margin-left: 12px; /* Offset to center visually due to tracking */
                }
                
                .gradient-footer {
                    margin-top: 60px;
                    width: 100%;
                    height: 100px;
                    background: linear-gradient(to top, rgba(255, 69, 0, 0.2), transparent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                }

                .section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: rgba(30, 30, 30, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                }
                h1, h2, h3 { margin-top: 0; }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 5px;
                    margin-bottom: 5px;
                }
                button:hover { background: var(--vscode-button-hoverBackground); }
                .input-group { margin-bottom: 10px; }
                input {
                    width: 100%;
                    padding: 6px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            
            <div style="margin-bottom: 25px;">
                <h1 style="margin-bottom: 5px; font-size: 1.5em;">${project.name}</h1>
                <p style="margin-top: 5px; margin-bottom: 15px; opacity: 0.8;">Role: <strong>Lead</strong></p>
                
                <div style="display: flex; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="font-family: monospace; user-select: all; margin-right: auto; font-size: 0.9em; opacity: 0.9;">Token: <strong>${project.token || 'N/A'}</strong></span>
                    <button onclick="copyToClipboard('${project.token || ''}')" style="padding: 3px 8px; font-size: 11px; margin: 0;">📋 Copy</button>
                </div>
            </div>
            
            <div class="section">
                <h3>Navigation</h3>
                <button onclick="switchProject()">Switch Project</button>
                <button onclick="logout()">Logout</button>
            </div>

            <div class="section">
                <h3>Create New Task</h3>
                <div class="input-group">
                    <input type="text" id="newTaskName" placeholder="Task description">
                </div>
                <button onclick="createTask()">Add Task</button>
            </div>

            <div class="section">
                <h3>Team Members</h3>
                <ul>
                    ${(project.members || []).map((m: any) => `<li>${m.name} (${m.role})</li>`).join('')}
                </ul>
            </div>
            
            <div class="section">
                <h3>Unassigned Tasks</h3>
                ${tasks.filter(t => !t.assignee).length === 0 ? '<p>No unassigned tasks.</p>' :
                `<ul>${tasks.filter(t => !t.assignee).map((t, index) => `
                    <li style="margin-bottom: 8px;">
                        <div style="margin-bottom: 4px;"><strong>${t.name}</strong></div>
                        <div style="display: flex;">
                            <select id="assign-select-${index}" style="margin-right: 5px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border);">
                                <option value="">Select Member...</option>
                                ${(project.members || []).map((m: any) => `<option value="${m.name}">${m.name}</option>`).join('')}
                            </select>
                            <button onclick="assignTask('${t.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', 'assign-select-${index}')">Assign</button>
                        </div>
                    </li>`).join('')}</ul>`
            }
            </div>

            <div class="section">
                <h3>Pending Reviews</h3>
                ${pendingReviews.length === 0 ? '<p>No pending reviews.</p>' :
                `<ul>${pendingReviews.map(r => `
                    <li style="margin-bottom: 12px; border-left: 3px solid #40C4FF; padding-left: 10px;">
                        <div style="font-weight: bold;">${r.filePath}</div>
                        <div style="font-size: 0.9em; opacity: 0.8; margin-bottom: 4px;">By: ${r.authorName}</div>
                        <div style="font-size: 0.85em; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; margin-bottom: 6px;">
                            ${r.aiAnalysis?.summary || 'No AI summary available.'}
                        </div>
                        <div style="display: flex;">
                            <button onclick="approveReview('${r.id}')" style="background: #22c55e;">Approve & Merge</button>
                            <button onclick="declineReview('${r.id}')" style="background: #ef4444;">Decline</button>
                        </div>
                    </li>`).join('')}</ul>`
            }
            </div>


            
            <div class="gradient-footer">
                <div style="text-align: center;">
                    <div class="logo-kraken">KRAKEN</div>
                    <div class="logo-labs">LABS</div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function approveReview(id) {
                    vscode.postMessage({ type: 'approveReview', reviewId: id });
                }
                
                function declineReview(id) {
                    vscode.postMessage({ type: 'declineReview', reviewId: id });
                }

                function createTask() {
                    const name = document.getElementById('newTaskName').value;
                    if (name) {
                        vscode.postMessage({ type: 'createTask', taskName: name });
                        document.getElementById('newTaskName').value = '';
                    }
                }

                function assignTask(taskId, selectId) {
                    const select = document.getElementById(selectId);
                    const member = select.value;
                    if (member) {
                        vscode.postMessage({ type: 'assignTask', taskId: taskId, member: member });
                    }
                }

                function switchProject() {
                    vscode.postMessage({ type: 'switchProject' });
                }

                function logout() {
                    vscode.postMessage({ type: 'logout' });
                }

                function copyToClipboard(text) {
                    if (text) {
                        vscode.postMessage({ type: 'copyToClipboard', value: text });
                    }
                }

                function submitReview() {
                    vscode.postMessage({ type: 'submitReview' });
                }
            </script>
        </body>
        </html>`;
    }

    private getMemberDashboardHtml(project: Project): string {
        const tasks = this.state.getTasks();
        const myTasks = tasks.filter(t => t.assignee === this.state.getUser()?.name);
        const unassignedTasks = tasks.filter(t => !t.assignee);

        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                /* Reuse Lead Dashboard Styles */
                ${this.getLeadDashboardStyle()}
                .review-cta {
                    background: linear-gradient(45deg, #40C4FF, #8b5cf6);
                    font-weight: bold;
                    width: 100%;
                    padding: 12px;
                    margin-bottom: 20px;
                }
                .logo-kraken {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    font-size: 32px;
                    font-weight: 900;
                    color: #40C4FF;
                    letter-spacing: 4px;
                    text-shadow: 0 0 15px rgba(64, 196, 255, 0.5);
                    margin: 0;
                    line-height: 1;
                    text-transform: uppercase;
                    text-align: center;
                }
                .logo-labs {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: rgba(64, 196, 255, 0.8);
                    letter-spacing: 12px;
                    margin-top: 5px;
                    text-transform: uppercase;
                    text-align: center;
                    margin-left: 12px;
                }
                .gradient-footer {
                    margin-top: 60px;
                    width: 100%;
                    height: 100px;
                    background: linear-gradient(to top, rgba(255, 69, 0, 0.2), transparent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                }
            </style>
        </head>
        <body>
            <div style="margin-bottom: 25px;">
                 <h1 style="margin-bottom: 5px; font-size: 1.5em;">${project.name}</h1>
                 <p style="margin-top: 5px; margin-bottom: 15px; opacity: 0.8;">Role: <strong>Member</strong></p>
            </div>

            <div class="section">
                <h3>Navigation</h3>
                <button onclick="switchProject()">Switch Project</button>
                <button onclick="logout()">Logout</button>
            </div>

            <div class="section">
                <h3>Actions</h3>
                <button onclick="submitReview()" class="review-cta">📤 Submit Active File for Review</button>
            </div>

            <div class="section">
                <h3>Team Members</h3>
                <ul>
                    ${(project.members || []).map((m: any) => `<li>${m.name} (${m.role})</li>`).join('')}
                </ul>
            </div>

            <div class="section">
                <h3>My Tasks</h3>
                ${myTasks.length === 0 ? '<p>No tasks assigned to you.</p>' :
                `<ul>${myTasks.map(t => `<li>${t.name} (${t.status})</li>`).join('')}</ul>`}
            </div>
            
            <div class="section">
                <h3>Unassigned Tasks</h3>
                ${unassignedTasks.length === 0 ? '<p>No unassigned tasks.</p>' :
                `<ul>${unassignedTasks.map((t, index) => `
                    <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${t.name}</span>
                        <button onclick="pickUpTask('${t.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" style="font-size: 12px; padding: 4px 8px;">Pick Up</button>
                    </li>`).join('')}</ul>`
            }
            </div>

            <div class="gradient-footer">
                <div style="text-align: center;">
                    <div class="logo-kraken">KRAKEN</div>
                    <div class="logo-labs">LABS</div>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                function submitReview() {
                    vscode.postMessage({ type: 'submitReview' });
                }
                function pickUpTask(taskId) {
                    vscode.postMessage({ type: 'pickUpTask', taskId: taskId });
                }
                function logout() { vscode.postMessage({ type: 'logout' }); }
                function switchProject() { vscode.postMessage({ type: 'switchProject' }); }
            </script>
        </body>
        </html>`;
    }

    private getLeadDashboardStyle(): string {
        // Reduced for brevity as standard style is in head usually, 
        // but for now returning empty as we rely on the inline style in getLeadDashboardHtml or duplicated it.
        // Actually, to avoid breaking, let's just return the common CSS block.
        return `
            body {
                padding: 20px;
                color: var(--vscode-foreground);
                font-family: var(--vscode-font-family);
                background: var(--vscode-sideBar-background);
            }
            .section {
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(30, 30, 30, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 5px;
                margin-bottom: 5px;
            }
            button:hover { background: var(--vscode-button-hoverBackground); }
        `;
    }


    private async scanForFileTasks(): Promise<void> {
        try {
            // "from web to everything" - explicit web patterns + catch-all, excluding heavy folders and build artifacts
            const files = await vscode.workspace.findFiles(
                '**/*.{html,css,js,ts,jsx,tsx,json,md,txt,py,rb,java,c,cpp,h,go,rs,php,png,jpg,svg,xml,yml,yaml,toml,ini,env,gitignore}*',
                '{**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/build/**,**/.vscode-test/**,**/*.vsix,**/*.map,**/.DS_Store}'
            );
            let newTasksCount = 0;

            for (const file of files) {
                const relativePath = vscode.workspace.asRelativePath(file);
                // Simple ID generation
                const taskId = relativePath;

                if (!this.state.hasTask(taskId)) {
                    this.state.addTask({
                        id: taskId,
                        name: path.basename(relativePath),
                        assignee: undefined, // Unassigned
                        status: 'pending',
                        description: 'Auto-generated task from file: ' + relativePath
                    });
                    newTasksCount++;
                }
            }

            if (newTasksCount > 0) {
                console.log('Scan: Added ' + newTasksCount + ' new tasks from files.');
                // Also sync these to server
                const allTasks = this.state.getTasks();
                // Find the new ones we just added (or all of them to be safe, but let's just sync the new ones ideally)
                // For simplicity, we can just iterate and ensure they exist on server?
                // Or better, let's just refresh. The server creation inside loop would be better.
                this.refresh();
            }
        } catch (err) {
            console.error('Error scanning files:', err);
        }
    }

    private async createProjectFolder(projectName: string): Promise<void> {
        try {
            const desktopPath = path.join(os.homedir(), 'Desktop');
            const projectPath = path.join(desktopPath, projectName);
            const projectFolderUri = vscode.Uri.file(projectPath);

            await vscode.workspace.fs.createDirectory(projectFolderUri);
            const srcFolderUri = vscode.Uri.joinPath(projectFolderUri, 'src');
            await vscode.workspace.fs.createDirectory(srcFolderUri);

            const readmePath = vscode.Uri.joinPath(projectFolderUri, 'README.md');
            const readmeContent = '# ' + projectName + '\n\nManaged with Manta';
            await vscode.workspace.fs.writeFile(readmePath, Buffer.from(readmeContent, 'utf8'));

            vscode.window.showInformationMessage('✅ Project folder created at ' + projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectFolderUri, { forceNewWindow: false });
        } catch (err) {
            vscode.window.showErrorMessage('Failed to create project folder: ' + err);
        }
    }

    public refresh(): void {
        if (this._view) {
            this._view.webview.html = this.getHtmlForWebview(this._view.webview);
        }
    }
}