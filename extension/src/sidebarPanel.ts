import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { ExtensionState } from './state';
import { ServerClient } from './serverClient';
import { AIClient } from './aiClient';

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private state: ExtensionState,
        private serverClient: ServerClient,
        private aiClient: AIClient
    ) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        const resolveStart = Date.now();
        console.log('📱 [SIDEBAR] resolveWebviewView called');

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        console.log(`📱 [SIDEBAR] Webview options set in ${Date.now() - resolveStart}ms`);

        // Show loading state immediately
        const loadingStart = Date.now();
        webviewView.webview.html = this._getLoadingHtml();
        console.log(`🎬 [SIDEBAR] Loading HTML set in ${Date.now() - loadingStart}ms`);
        console.log(`📱 [SIDEBAR] Total resolve time: ${Date.now() - resolveStart}ms`);

        // Then load full content
        // Then load full content after intro animation
        setTimeout(async () => {
            console.log('⏰ [SIDEBAR] 5-second timer expired, sending ready message');
            // Signal webview to fade out
            await webviewView.webview.postMessage({ type: 'ready' });

            // Wait for fade out animation (500ms) then swap content
            setTimeout(() => {
                const contentStart = Date.now();
                console.log('🔄 [SIDEBAR] Loading main content...');
                webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                console.log(`✅ [SIDEBAR] Main content loaded in ${Date.now() - contentStart}ms`);
            }, 500);
        }, 5000);

        // Handle messages from the webview
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
                case 'assignTask':
                    await this.serverClient.assignTask(data.taskName, data.member);
                    vscode.window.showInformationMessage(`Task "${data.taskName}" assigned to ${data.member}`);
                    this.refresh();
                    break;
                case 'approveMerge':
                    await this.handleApproveMerge(data.taskName);
                    break;
                case 'commitLogic':
                    vscode.commands.executeCommand('manta.commitLogic');
                    break;
                case 'commitStyles':
                    vscode.commands.executeCommand('manta.commitStyles');
                    break;
                case 'approveReview':
                    await this.handleApproveReview(data.reviewId);
                    break;
                case 'declineReview':
                    await this.handleDeclineReview(data.reviewId);
                    break;
                case 'logout':
                    await this.state.logout();
                    this.refresh();
                    break;
            }
        });
    }

    private _getLoadingHtml() {
        const largeMantaUri = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'lottie', 'large_manta.json'));
        const smallMantaUriBase = this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'lottie'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view?.webview.cspSource} 'unsafe-inline'; script-src ${this._view?.webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com; img-src ${this._view?.webview.cspSource} https:; font-src ${this._view?.webview.cspSource}; connect-src ${this._view?.webview.cspSource} https:;">
            <title>Loading Manta</title>
            <style>
                body { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: linear-gradient(to bottom, var(--vscode-sideBar-background), #000000); 
                    overflow: hidden;
                    font-family: var(--vscode-font-family);
                }
                #loadingContainer { 
                    text-align: center; 
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                #largeManta {
                    width: 300px;
                    height: 300px;
                    position: absolute;
                    bottom: -50px;
                    right: -50px;
                    opacity: 0;
                }
                #centerContent {
                    z-index: 10;
                    opacity: 0;
                    transform: scale(0.9);
                    transition: all 0.5s ease;
                }
                #title { 
                    font-size: 2.5rem; 
                    font-weight: 800;
                    color: var(--vscode-foreground); 
                    letter-spacing: 4px;
                    margin-bottom: 0.5rem;
                    text-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
                }
                #desc { 
                    font-size: 0.9rem; 
                    color: var(--vscode-descriptionForeground); 
                    margin-bottom: 2rem;
                    font-weight: 300;
                }
                #spinner { 
                    margin: 0 auto; 
                    width: 40px; 
                    height: 40px; 
                    border: 3px solid rgba(255, 255, 255, 0.1); 
                    border-top: 3px solid #00ffff; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite; 
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                .shoal-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 5;
                }
                .smallManta {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.9.6/lottie.min.js"></script>
        </head>
        <body>
            <div id="loadingContainer">
                <div id="largeManta"></div>
                
                <div id="centerContent">
                    <div id="title">MANTA</div>
                    <div id="desc">Collaborative AI Coding</div>
                    <div id="spinner"></div>
                            ], {
                                duration: 4000,
                                easing: 'ease-in-out',
                                fill: 'forwards'
                            });
                            largeAnim.play();

                            // 2. Show Center Content
                            setTimeout(() => {
                                const center = document.getElementById('centerContent');
                                center.style.opacity = '1';
                                center.style.transform = 'scale(1)';
                                
                                center.animate([
                                    { transform: 'scale(1)' },
                                    { transform: 'scale(1.05)' },
                                    { transform: 'scale(1)' }
                                ], {
                                    duration: 2000,
                                    iterations: Infinity,
                                    easing: 'ease-in-out'
                                });

                                // 3. Start Shoal
                                startShoal();
                            }, 2500);
                        }, 500);
                    } else {
                        console.error('Lottie not loaded');
                        document.getElementById('loadingContainer').innerHTML = '<div style="color:white">Loading...</div>';
                    }
                });

                function startShoal() {
                    const shoalContainer = document.getElementById('shoal');
                    const count = 30;
                    
                    for (let i = 1; i <= count; i++) {
                        const div = document.createElement('div');
                        div.className = 'smallManta';
                        shoalContainer.appendChild(div);

                        const startX = Math.random() * window.innerWidth;
                        const startY = Math.random() * window.innerHeight;
                        
                        div.style.left = startX + 'px';
                        div.style.top = startY + 'px';
                        
                        const animIndex = String(Math.floor(Math.random() * 30) + 1).padStart(2, '0');
                        if (typeof lottie !== 'undefined') {
                            lottie.loadAnimation({
                                container: div,
                                renderer: 'svg',
                                loop: true,
                                autoplay: true,
                                path: smallMantaUriBase + '/small_manta_' + animIndex + '.json'
                            });
                        }

                        animateBoid(div);
                        setTimeout(() => div.style.opacity = '0.6', Math.random() * 1000);
                    }
                }

                function animateBoid(element) {
                    const duration = 5000 + Math.random() * 5000;
                    const x = (Math.random() - 0.5) * 200;
                    const y = (Math.random() - 0.5) * 200;
                    
                    element.animate([
                        { transform: 'translate(0, 0) rotate(0deg)' },
                        { transform: 'translate(' + x + 'px, ' + y + 'px) rotate(' + (Math.atan2(y, x) * 180 / Math.PI) + 'deg)' }
                    ], {
                        duration: duration,
                        iterations: Infinity,
                        direction: 'alternate',
                        easing: 'ease-in-out'
                    });
                }

                window.addEventListener('message', event => {
                    if (event.data.type === 'ready') {
                        document.body.style.opacity = '0';
                        document.body.style.transition = 'opacity 0.5s ease';
                        setTimeout(() => {
                            document.body.innerHTML = '';
                        }, 500);
                    }
                });
            </script>
        </body>
        </html>`;
    }

    private _getStartScreenHtml() {
        const shoal = this._getShoalBackgroundCode();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Manta - Start</title>
            <style>
                body {
                    padding: 20px;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background: var(--vscode-sideBar-background);
                }
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
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                button.loading {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                ${shoal.css}
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.9.6/lottie.min.js"></script>
        </head>
        <body>
            ${shoal.html}
            
            <div class="section">
                <h2>🚀 Start New Project</h2>
                <div class="input-group">
                    <label for="projectName">Project Name</label>
                    <input type="text" id="projectName" placeholder="my-awesome-project" />
                </div>
                <button onclick="startProject()">Start Project</button>
            </div>

            <div class="section">
                <h2>🔗 Join Existing Session</h2>
                <div class="input-group">
                    <label for="sessionToken">Session Token</label>
                    <input type="text" id="sessionToken" placeholder="Enter invite token" />
                </div>
                <button onclick="joinSession()">Join Session</button>
            </div>

            <div class="section">
                <h2>👤 Authentication</h2>
                ${this.state.getUser() ? `
                    <div class="user-welcome">
                        <img src="${this.state.getUser()?.avatarUrl || 'https://github.com/identicons/jason.png'}" class="user-avatar-small" />
                        <div class="user-info">
                            <span class="user-name">Welcome, ${this.state.getUser()?.name}</span>
                            <span class="user-status">Logged in via GitHub</span>
                        </div>
                        <button onclick="logout()" class="logout-btn">Sign Out</button>
                    </div>
                ` : `
                    <button onclick="loginWithGithub()" class="github-btn">
                        <svg height="20" viewBox="0 0 16 16" version="1.1" width="20" aria-hidden="true" style="fill:white; margin-right:8px">
                            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                        </svg>
                        Login with GitHub
                    </button>
                `}
            </div>

            <div class="kraken-footer">
                <img src="${this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'extension', 'resources', 'kraken_logo.svg'))}" alt="Kraken Labs" />
                <span>Powered by Kraken Labs</span>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                // Utility function for button loading states
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
    if (!projectName) {
        alert('Please enter a project name');
        return;
    }

    setButtonLoading(button, true, 'Creating Project...');

    vscode.postMessage({
        type: 'startProject',
        projectName: projectName
    });
}

function joinSession() {
    const button = event.target;
    const token = document.getElementById('sessionToken').value;
    if (!token) {
        alert('Please enter a session token');
        return;
    }

    setButtonLoading(button, true, 'Joining Session...');

    vscode.postMessage({
        type: 'joinSession',
        token: token
    });
}
                
                ${shoal.script}
</script>
    </body>
    </html>`;
    }

    private async handleStartProject(projectName: string) {
        try {
            if (!projectName || projectName.trim() === '') {
                return;
            }

            const token = this.serverClient.generateInviteToken(projectName);
            const newProject = {
                name: projectName,
                token,
                inviteToken: token,
                tasks: [],
                members: []
            };

            this.state.setProject(newProject);
            this.state.setRole('lead' as any);

            // Persist state for after reload
            await this.state.savePendingProject(newProject);

            // Auto-create project folder on Desktop and switch
            await this.createProjectFolder(projectName);

            // Refresh the sidebar (though window will reload soon)
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to start project: ${err} `);
        }
    }

    private async createProjectFolder(projectName: string) {
        try {
            // Always create on Desktop
            const desktopPath = path.join(os.homedir(), 'Desktop');
            const projectPath = path.join(desktopPath, projectName);
            const projectFolderUri = vscode.Uri.file(projectPath);

            // Create project folder
            await vscode.workspace.fs.createDirectory(projectFolderUri);

            // Create src directory
            const srcFolderUri = vscode.Uri.joinPath(projectFolderUri, 'src');
            await vscode.workspace.fs.createDirectory(srcFolderUri);

            // Create README.md
            const readmePath = vscode.Uri.joinPath(projectFolderUri, 'README.md');
            const readmeContent = `# ${projectName}

## Project Description
Add your project description here.

## Getting Started
        1. Install dependencies
        2. Run the application

## Team
            - Project managed with Manta
                `;
            await vscode.workspace.fs.writeFile(readmePath, Buffer.from(readmeContent, 'utf8'));

            // Create .gitignore
            const gitignorePath = vscode.Uri.joinPath(projectFolderUri, '.gitignore');
            const gitignoreContent = `node_modules /
            dist /
            build /
.env
                .DS_Store
            *.log
                `;
            await vscode.workspace.fs.writeFile(gitignorePath, Buffer.from(gitignoreContent, 'utf8'));

            vscode.window.showInformationMessage(`✅ Project folder created at ${projectPath}. Switching workspace...`);

            // Open the new folder (this will reload the window)
            await vscode.commands.executeCommand('vscode.openFolder', projectFolderUri, { forceNewWindow: false });

        } catch (err) {
            vscode.window.showErrorMessage(`Failed to create project folder: ${err} `);
        }
    }

    private async handleJoinSession(token: string) {
        try {
            if (!token || token.trim() === '') {
                return;
            }

            const sessionData = await this.serverClient.joinSession(token);
            this.state.setProject(sessionData.project);
            // Force role to member for joiners
            this.state.setRole('member' as any);

            // Refresh the sidebar
            this._view!.webview.html = this._getHtmlForWebview(this._view!.webview);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to join session: ${err} `);
        }
    }

    private async handleDelegateTask(taskName: string) {
        try {
            if (!taskName || taskName.trim() === '') {
                return;
            }

            const bestMember = await this.aiClient.autoAssignTask(taskName, this.state.getActiveMembers());
            await this.serverClient.assignTask(taskName, bestMember);

            vscode.window.showInformationMessage(`Task "${taskName}" assigned to ${bestMember} `);

            // Refresh the sidebar
            this._view!.webview.html = this._getHtmlForWebview(this._view!.webview);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to delegate task: ${err} `);
        }
    }

    private async handleApproveMerge(taskName: string) {
        try {
            if (!taskName || taskName.trim() === '') {
                return;
            }

            await this.serverClient.approveTask(taskName);
            vscode.window.showInformationMessage(`Task "${taskName}" approved.`);

            // Refresh the sidebar
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to approve merge: ${err} `);
        }
    }

    private async handleApproveReview(reviewId: string) {
        try {
            // Update review status
            this.state.updateReviewStatus(reviewId, 'approved');

            // Get review to update member metrics
            const reviews = this.state.getPendingReviews();
            const review = reviews.find(r => r.id === reviewId);

            if (review) {
                // Increment member metrics
                this.state.incrementMemberMetric(review.submittedBy, 'commitsAccepted');
                this.state.incrementMemberMetric(review.submittedBy, 'tasksCompleted');

                // Send approval to server
                await this.serverClient.approveCodeReview(reviewId);

                vscode.window.showInformationMessage(`✅ Code review approved for ${review.submittedByName}`);
            }

            // Refresh the sidebar
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to approve review: ${err} `);
        }
    }

    private async handleDeclineReview(reviewId: string) {
        try {
            // Get feedback from user
            const feedback = await vscode.window.showInputBox({
                prompt: 'Provide feedback for the declined review',
                placeHolder: 'Explain why this review was declined...'
            });

            if (!feedback) {
                return; // User cancelled
            }

            // Update review status
            this.state.updateReviewStatus(reviewId, 'declined');

            // Send decline to server
            await this.serverClient.declineCodeReview(reviewId, feedback);

            vscode.window.showInformationMessage(`❌ Code review declined with feedback`);

            // Refresh the sidebar
            this.refresh();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to decline review: ${err} `);
        }
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const project = this.state.getProject();
        const tasks = this.state.getTasks();
        const pendingApprovals = this.state.getPendingApprovals();
        const role = this.state.getRole();
        const availableTasks = this.state.getAvailableTasks();

        // If no project, show start/join screen
        if (!project) {
            return this._getStartScreenHtml();
        }

        // If role is lead, show full control panel
        if (role === 'lead') {
            const pendingReviews = this.state.getPendingReviews();
            return this._getLeadDashboardHtml(project, tasks, pendingApprovals, availableTasks, pendingReviews);
        }

        // If role is member, show member dashboard
        return this._getMemberDashboardHtml(project, tasks);
    }

    private _getLeadDashboardHtml(project: any, tasks: any[], pendingApprovals: any[], availableTasks: any[], pendingReviews: any[]) {
        const shoal = this._getShoalBackgroundCode();
        const members = project.members || [];
        const memberOptions = members.length > 0
            ? members.map((m: any) => `< option value = "${m.name}" > ${m.name} (${m.role})</option>`).join('')
            : '<option value="" disabled>No members joined</option>';

        // Mock members for demo if empty
        const demoOptions = members.length === 0
            ? `<option value="Alice">Alice (Implementer)</option><option value="Bob">Bob (Navigator)</option>`
            : '';

        const finalOptions = members.length > 0 ? memberOptions : demoOptions;

        const availableTasksHtml = availableTasks.length > 0
            ? availableTasks.map((task: any) => `
                <div class="task-card">
                    <div class="task-header">
                        <span class="task-icon">${task.name.includes('class') || task.name.includes('function') ? '🧩' : '📄'}</span>
                        <span class="task-name">${task.name}</span>
                    </div>
                    <div class="task-desc">${task.description || 'No description'}</div>
                    <div class="task-assign-row">
                        <select id="assign-${task.id}" class="assign-select">
                            <option value="" disabled selected>Select Member</option>
                            ${finalOptions}
                        </select>
                        <button class="assign-btn" onclick="assignTask('${task.id}', '${task.name}')">Assign</button>
                    </div>
                </div>
            `).join('')
            : '<div class="empty-state">No unassigned tasks available.</div>';

        const pendingListHtml = pendingApprovals.length > 0
            ? pendingApprovals.map((task: any) => `
                <div class="pending-item" onclick="approveMerge('${task.name}')">
                    <span>${task.name}</span>
                    <span style="float:right;font-size:10px;opacity:0.7">Click to Approve</span>
                </div>
            `).join('')
            : '<div class="empty-state">No pending approvals.</div>';

        const pendingReviewsHtml = pendingReviews.length > 0
            ? pendingReviews.map((review: any) => {
                const timeAgo = 'just now'; // Simplified
                return `
                    <div class="review-card">
                        <div class="review-header">
                            <span class="review-submitter">${review.submittedByName}</span>
                            <span class="review-time">${timeAgo}</span>
                        </div>
                        <div class="review-files">${review.files.length} file(s) • ${review.taskName || 'General changes'}</div>
                        <div class="review-scores">
                            <span class="score">🎯 Quality: ${review.aiAnalysis.qualityScore}%</span>
                            <span class="score">⚡ Perf: ${review.aiAnalysis.performanceScore}%</span>
                        </div>
                        <div class="review-summary">${review.aiAnalysis.summary.substring(0, 100)}...</div>
                        <div class="review-actions">
                            <button class="review-btn approve" onclick="approveReview('${review.id}')">✅ Approve</button>
                            <button class="review-btn decline" onclick="declineReview('${review.id}')">❌ Decline</button>
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="empty-state">No pending code reviews.</div>';

        return `<!DOCTYPE html>
<html>
<head>
    ${this._getCommonStyles()}
    <style>
        ${shoal.css}
        .task-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin-bottom: 8px; transition: all 0.2s ease; }
        .task-card:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .task-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .task-icon { font-size: 16px; }
        .task-name { font-weight: 600; font-size: 13px; color: var(--vscode-foreground); }
        .task-desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 12px; line-height: 1.4; }
        .task-assign-row { display: flex; gap: 8px; }
        .assign-select { flex: 1; padding: 6px; border-radius: 4px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); font-size: 11px; }
        .assign-btn { padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .assign-btn:hover { background: #5568d3; }
        
        /* Member Analytics Styles */
        .member-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin-bottom: 12px; transition: all 0.2s ease; }
        .member-card:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .member-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .member-status { font-size: 12px; }
        .member-name { font-weight: 600; font-size: 13px; color: var(--vscode-foreground); }
        .member-role { font-size: 11px; color: var(--vscode-descriptionForeground); }
        .member-activity { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 10px; padding: 6px; background: var(--vscode-input-background); border-radius: 4px; }
        .member-progress { margin-bottom: 8px; }
        .progress-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
        .progress-bar { width: 100%; height: 6px; background: var(--vscode-input-background); border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s ease; }
        .member-stats { display: flex; justify-content: space-between; font-size: 11px; color: var(--vscode-descriptionForeground); }
        
        /* Review Card Styles */
        .review-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 12px; margin-bottom: 12px; transition: all 0.2s ease; }
        .review-card:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .review-submitter { font-weight: 600; font-size: 13px; color: var(--vscode-foreground); }
        .review-time { font-size: 10px; color: var(--vscode-descriptionForeground); }
        .review-files { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
        .review-scores { display: flex; gap: 12px; margin-bottom: 8px; }
        .score { font-size: 11px; padding: 4px 8px; background: var(--vscode-input-background); border-radius: 4px; font-weight: 600; }
        .review-summary { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 10px; line-height: 1.4; font-style: italic; }
        .review-actions { display: flex; gap: 8px; }
        .review-btn { flex: 1; padding: 8px; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .review-btn.approve { background: #4ade80; color: white; }
        .review-btn.approve:hover { background: #22c55e; }
        .review-btn.decline { background: #ef4444; color: white; }
        .review-btn.decline:hover { background: #dc2626; }
    </style>
</head>
<body>
    ${shoal.html}
    <div class="header">
        <div class="header-top">
            <h1>${project.name}</h1>
            ${this.state.getUser() ? `
                <div class="user-badge">
                    <img src="${this.state.getUser()?.avatarUrl}" class="user-avatar-tiny" />
                    <span>${this.state.getUser()?.name}</span>
                </div>
            ` : ''}
        </div>
        <div class="status"><div class="status-dot"></div> Live Session Active</div>
        <div class="token-container">
            <span class="project-token">Token: ${project.token}</span>
            <button class="copy-btn" onclick="copyToken('${project.token}')">📋 Copy</button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">👥 Team Analytics</div>
        ${members.length > 0 ? members.map((member: any) => {
            const metrics = member.metrics || { tasksAssigned: 0, tasksCompleted: 0, tasksPending: 0, commitsTotal: 0, commitsAccepted: 0, commitsPending: 0 };
            const completionRate = metrics.tasksAssigned > 0 ? Math.round((metrics.tasksCompleted / metrics.tasksAssigned) * 100) : 0;
            const acceptanceRate = metrics.commitsTotal > 0 ? Math.round((metrics.commitsAccepted / metrics.commitsTotal) * 100) : 0;
            const isOnline = member.isOnline !== false; // Default to online if not set
            const statusDot = isOnline ? '🟢' : '🔴';
            const statusText = isOnline ? 'Online' : `Offline`;

            return `
                <div class="member-card">
                    <div class="member-header">
                        <span class="member-status">${statusDot}</span>
                        <span class="member-name">${member.name}</span>
                        <span class="member-role">(${member.role})</span>
                    </div>
                    <div class="member-activity">
                        ${member.currentTask ? `📝 Working on: ${member.currentTask}` : '💤 Idle'}
                    </div>
                    <div class="member-progress">
                        <div class="progress-label">Tasks: ${metrics.tasksCompleted}/${metrics.tasksAssigned} (${completionRate}%)</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${completionRate}%"></div>
                        </div>
                    </div>
                    <div class="member-stats">
                        <span>✅ ${metrics.commitsTotal} commits</span>
                        <span>📊 ${acceptanceRate}% accepted</span>
                    </div>
                </div>
            `;
        }).join('') : '<div class="empty-state">No team members yet. Share the invite token!</div>'}
    </div>

    <div class="section">
        <div class="section-title">📋 Pending Reviews (${pendingReviews.length})</div>
        ${pendingReviewsHtml}
    </div>

    <div class="section">
        <div class="section-title">Task Management</div>
        <div class="pending-list">
            ${availableTasksHtml}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Approve Merge</div>
        <div class="pending-list">
            ${pendingListHtml}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Actions</div>
        <button class="command-btn" onclick="commitLogic()">
            <span class="command-icon">💡</span>
            <span>Commit Logic</span>
        </button>
        <button class="command-btn" onclick="commitStyles()">
            <span class="command-icon">🎨</span>
            <span>Commit Styles</span>
        </button>
    </div>

    <div class="kraken-footer">
        <img src="${this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'extension', 'resources', 'kraken_logo.svg'))}" alt="Kraken Labs" />
        <span>Powered by Kraken Labs</span>
    </div>

    ${this._getCommonScripts()}
    <script>
        ${shoal.script}
        function assignTask(taskId, taskName) {
            const button = event.target;
            const select = document.getElementById('assign-' + taskId);
            const member = select.value;
            
            if (member) {
                setButtonLoading(button, true, 'Assigning...');
                vscode.postMessage({ type: 'assignTask', taskName: taskName, member: member, taskId: taskId });
            } else {
                // Show error or shake
                select.style.borderColor = '#ef4444';
                setTimeout(() => select.style.borderColor = '', 2000);
            }
        }
    </script>
</body>
</html>`;
    }
    private _getMemberDashboardHtml(project: any, tasks: any[]) {
        const shoal = this._getShoalBackgroundCode();
        // Filter tasks assigned to this user (mocking user ID check for now, assuming 'me' or similar)
        // In a real app, we'd check against the current user's ID
        // For now, let's just show all tasks but with a "My Tasks" header to simulate the view
        const myTasks = tasks; // In reality: tasks.filter(t => t.assignedTo === this.state.getCurrentUser())

        return `<!DOCTYPE html>
<html lang="en">
<head>
    ${this._getCommonStyles()}
    <style>${shoal.css}</style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.9.6/lottie.min.js"></script>
</head>
<body>
    ${shoal.html}
    <div class="header">
        <div class="header-top">
            <h1>⚡ Manta <span style="font-size:12px;opacity:0.8">(Member)</span></h1>
            ${this.state.getUser() ? `
                <div class="user-badge">
                    <img src="${this.state.getUser()?.avatarUrl}" class="user-avatar-tiny" />
                    <span>${this.state.getUser()?.name}</span>
                </div>
            ` : ''}
        </div>
        <div class="status">
            <span class="status-dot"></span>
            <span>Connected</span>
        </div>
    </div>

    <div class="project-info">
        <div class="project-name">📁 ${project.name}</div>
        <div class="token-container">
            <div class="project-token">Token: ${project.token}</div>
            <button class="copy-btn" onclick="copyToken('${project.token}')" title="Copy invite token">
                📋 Copy
            </button>
        </div>
    </div>

    <div class="section">
        <div class="section-title">My Tasks</div>
        ${myTasks.length === 0 ? `
            <div class="empty-state">No tasks assigned yet.</div>
        ` : `
            <div class="pending-list">
                ${myTasks.map(task => `
                    <div class="pending-item" style="cursor:default">
                        ${task.name} <span style="opacity:0.5">(${task.status})</span>
                    </div>
                `).join('')}
            </div>
        `}
    </div>

    <div class="section">
        <div class="section-title">Code Actions</div>
        <button class="command-btn" onclick="commitLogic()">
            <span class="command-icon">💡</span>
            <span>Commit Logic</span>
        </button>
        <button class="command-btn" onclick="commitStyles()">
            <span class="command-icon">🎨</span>
            <span>Commit Styles</span>
        </button>
    </div>

    <div class="kraken-footer">
        <img src="${this._view?.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'extension', 'resources', 'kraken_logo.svg'))}" alt="Kraken Labs" />
        <span>Powered by Kraken Labs</span>
    </div>

    ${this._getCommonScripts()}
    <script>${shoal.script}</script>
</body>
</html>`;
    }

    private _getCommonStyles() {
        return `<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manta Control Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); padding: 16px; position: relative; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); position: relative; z-index: 1; }
        .header h1 { font-size: 24px; font-weight: 700; color: white; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .status { color: rgba(255, 255, 255, 0.9); font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .section { margin-bottom: 24px; position: relative; z-index: 1; }
        .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-descriptionForeground); margin-bottom: 12px; }
        .command-btn { width: 100%; padding: 12px 16px; margin-bottom: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease; }
        .command-btn:hover { background: var(--vscode-button-hoverBackground); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
        .command-btn:active { transform: translateY(0); }
        .command-icon { font-size: 16px; width: 20px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .stat-card { background: rgba(30, 30, 30, 0.95); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); position: relative; z-index: 1; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); }
        .stat-value { font-size: 24px; font-weight: 700; color: #667eea; margin-bottom: 4px; }
        .stat-label { font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }
        .project-info { background: rgba(30, 30, 30, 0.95); padding: 12px; border-radius: 8px; border-left: 3px solid #667eea; margin-bottom: 20px; position: relative; z-index: 1; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); }
        .project-name { font-weight: 600; margin-bottom: 4px; }
        .project-token { font-size: 11px; color: var(--vscode-descriptionForeground); font-family: monospace; }
        .token-container { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .copy-btn { padding: 4px 8px; background: #667eea; color: white; border: none; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .copy-btn:hover { background: #5568d3; transform: scale(1.05); }
        .copy-btn:active { transform: scale(0.95); }
        .copy-btn.copied { background: #4ade80; }
        .input-form { background: rgba(30, 30, 30, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px; position: relative; z-index: 1; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); }
        .input-form input, .input-form select { width: 100%; padding: 8px 12px; margin-bottom: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; font-size: 13px; font-family: var(--vscode-font-family); }
        .input-form input:focus, .input-form select:focus { outline: none; border-color: #667eea; }
        .input-form input::placeholder { color: var(--vscode-input-placeholderForeground); }
        .form-btn { width: 100%; padding: 10px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .form-btn:hover { background: #5568d3; transform: translateY(-1px); }
        .form-btn:active { transform: translateY(0); }
        .toggle-btn { width: 100%; padding: 10px 16px; margin-bottom: 8px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease; }
        .toggle-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
        .hidden { display: none; }
        .pending-list { max-height: 200px; overflow-y: auto; }
        .pending-item { padding: 8px; margin-bottom: 4px; background: var(--vscode-input-background); border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s ease; position: relative; z-index: 1; }
        .pending-item:hover { background: #667eea; color: white; }
        .empty-state { text-align: center; padding: 24px; color: var(--vscode-descriptionForeground); font-size: 13px; }
        
        /* Global Spinner */
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
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        button.loading {
            opacity: 0.7;
            cursor: not-allowed;
            pointer-events: none;
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        /* Auth & Branding Styles */
        .github-btn { width: 100%; padding: 12px; background: #24292e; color: white; border: none; border-radius: 6px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .github-btn:hover { background: #2f363d; transform: translateY(-1px); }
        
        .user-welcome { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; }
        .user-avatar-small { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #667eea; }
        .user-info { flex: 1; display: flex; flex-direction: column; }
        .user-name { font-weight: 600; font-size: 13px; }
        .user-status { font-size: 11px; color: var(--vscode-descriptionForeground); }
        .logout-btn { padding: 4px 8px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--vscode-descriptionForeground); border-radius: 4px; font-size: 10px; cursor: pointer; }
        .logout-btn:hover { background: rgba(255,255,255,0.1); color: white; }

        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .user-badge { display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 20px; font-size: 11px; }
        .user-avatar-tiny { width: 16px; height: 16px; border-radius: 50%; }

        .kraken-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; gap: 8px; opacity: 0.7; }
        .kraken-footer img { height: 24px; }
        .kraken-footer span { font-size: 10px; color: var(--vscode-descriptionForeground); letter-spacing: 1px; text-transform: uppercase; }
    </style>`;
    }

    private _getCommonScripts() {
        return `<script>
        const vscode = acquireVsCodeApi();

        // Utility function for button loading states
        function setButtonLoading(buttonElement, isLoading, loadingText = 'Processing...') {
            if (!buttonElement) return;
            
            if (isLoading) {
                buttonElement.disabled = true;
                buttonElement.dataset.originalText = buttonElement.innerHTML;
                // Keep icon if present (simple check)
                const hasIcon = buttonElement.querySelector('.command-icon');
                if (hasIcon) {
                    buttonElement.innerHTML = \`<span class="spinner"></span> <span>\${loadingText}</span>\`;
                } else {
                    buttonElement.innerHTML = \`<span class="spinner"></span> \${loadingText}\`;
                }
                buttonElement.classList.add('loading');
            } else {
                buttonElement.disabled = false;
                buttonElement.innerHTML = buttonElement.dataset.originalText || buttonElement.innerHTML;
                buttonElement.classList.remove('loading');
            }
        }

        function toggleForm(formId) {
            const form = document.getElementById(formId);
            document.querySelectorAll('.input-form').forEach(f => { if (f.id !== formId) f.classList.add('hidden'); });
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) { const input = form.querySelector('input'); if (input) input.focus(); }
        }

        function startProject() {
            const button = event.target;
            const projectName = document.getElementById('project-name').value;
            if (projectName.trim()) { 
                setButtonLoading(button, true, 'Creating...');
                vscode.postMessage({ type: 'startProject', projectName: projectName }); 
            }
        }

        function joinSession() {
            const button = event.target;
            const token = document.getElementById('session-token').value;
            if (token.trim()) { 
                setButtonLoading(button, true, 'Joining...');
                vscode.postMessage({ type: 'joinSession', token: token }); 
            }
        }

        function delegateTask() {
            const button = event.target;
            const taskName = document.getElementById('task-name').value;
            if (taskName.trim()) { 
                setButtonLoading(button, true, 'Delegating...');
                vscode.postMessage({ type: 'delegateTask', taskName: taskName }); 
            }
        }

        function approveMerge(taskName) { 
            const item = event.currentTarget;
            item.style.opacity = '0.5';
            item.style.pointerEvents = 'none';
            item.innerHTML = \`<span class="spinner"></span> Approving \${taskName}...\`;
            vscode.postMessage({ type: 'approveMerge', taskName: taskName }); 
        }

        function commitLogic() { 
            const button = event.currentTarget;
            setButtonLoading(button, true, 'Committing...');
            vscode.postMessage({ type: 'commitLogic' }); 
        }

        function commitStyles() { 
            const button = event.currentTarget;
            setButtonLoading(button, true, 'Committing...');
            vscode.postMessage({ type: 'commitStyles' }); 
        }

        function approveReview(reviewId) { 
            const button = event.target;
            setButtonLoading(button, true, 'Approving...');
            vscode.postMessage({ type: 'approveReview', reviewId: reviewId }); 
        }

        function declineReview(reviewId) { 
            const button = event.target;
            setButtonLoading(button, true, 'Declining...');
            vscode.postMessage({ type: 'declineReview', reviewId: reviewId }); 
        }

        function copyToken(token) {
            navigator.clipboard.writeText(token).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = originalText; btn.classList.remove('copied'); }, 2000);
            }).catch(err => { console.error('Failed to copy:', err); alert('Token copied: ' + token); });
        }

        function loginWithGithub() {
            // Redirect to server auth endpoint
            // Assuming server URL is known or passed. For now using hardcoded production URL or localhost
            // Ideally this should be dynamic.
            const serverUrl = 'https://web-production-9466f.up.railway.app'; // Or http://localhost:3000 for dev
            vscode.env.openExternal(vscode.Uri.parse(serverUrl + '/auth/github'));
        }

        function logout() {
            // Clear local state via message
            vscode.postMessage({ type: 'logout' });
        }
    </script>`;
    }

    private _getShoalBackgroundCode() {
        // We don't need the URI anymore since we're using inline SVG

        return {
            css: `
                .shoal-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 0;
                    overflow: hidden;
                }
                .smallManta {
                    position: absolute;
                    width: 60px;
                    height: 60px;
                    opacity: 0;
                    transition: opacity 1s ease;
                    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.3));
                }
            `,
            html: `<div class="shoal-container" id="shoal"></div>`,
            script: `
                // MantaShoal class for realistic manta ray behavior
                class MantaShoal {
                    constructor() {
                        this.mantas = [];
                        this.rules = {
                            minSpeed: 0.3,
                            maxSpeed: 1.5,
                            flapStrength: 0.5,
                            turnRate: 0.02,
                            buoyancy: 0.01,
                            glideFactor: 0.98,
                            momentum: 0.95
                        };
                        this.boundary = {
                            width: window.innerWidth,
                            height: window.innerHeight,
                            margin: 100
                        };
                        this.time = 0;
                    }
                    
                    addManta(element) {
                        this.mantas.push({
                            element: element,
                            x: Math.random() * this.boundary.width,
                            y: Math.random() * this.boundary.height,
                            vx: 0,
                            vy: 0,
                            targetVx: (Math.random() - 0.5) * 0.5,
                            targetVy: (Math.random() - 0.5) * 0.3,
                            rotation: 0,
                            targetRotation: 0,
                            flapFrequency: 0.5 + Math.random() * 0.3,
                            flapOffset: Math.random() * Math.PI * 2,
                            flapAmplitude: 15 + Math.random() * 10,
                            glideTime: 2 + Math.random() * 3,
                            flapCount: 0,
                            state: 'gliding',
                            stateTimer: 0,
                            depth: 0.5 + Math.random() * 0.3,
                            targetDepth: 0.5 + Math.random() * 0.3,
                            wanderTargetX: this.boundary.width / 2,
                            wanderTargetY: this.boundary.height / 2,
                            wanderTimer: 0
                        });
                    }
                    
                    update(deltaTime) {
                        this.time += deltaTime / 1000;
                        this.boundary.width = window.innerWidth;
                        this.boundary.height = window.innerHeight;
                        
                        this.mantas.forEach((manta) => {
                            this.updateSwimState(manta, deltaTime);
                            this.calculateMovement(manta, deltaTime);
                            this.applyPhysics(manta, deltaTime);
                            this.updateVisuals(manta);
                        });
                    }
                    
                    updateSwimState(manta, deltaTime) {
                        const deltaSeconds = deltaTime / 1000;
                        manta.stateTimer += deltaSeconds;
                        
                        if (manta.state === 'gliding') {
                            if (manta.stateTimer > manta.glideTime) {
                                manta.state = 'flapping';
                                manta.stateTimer = 0;
                                manta.flapCount = 0;
                                manta.targetVx = (Math.random() - 0.5) * 0.8;
                                manta.targetVy = (Math.random() - 0.5) * 0.4;
                            }
                        } else if (manta.state === 'flapping') {
                            const flapDuration = 1 / manta.flapFrequency;
                            if (manta.stateTimer > flapDuration) {
                                manta.flapCount++;
                                manta.stateTimer = 0;
                                
                                if (manta.flapCount >= 2 + Math.floor(Math.random() * 3)) {
                                    manta.state = 'gliding';
                                    manta.stateTimer = 0;
                                }
                            }
                        }
                        
                        manta.wanderTimer += deltaSeconds;
                        if (manta.wanderTimer > 8 + Math.random() * 12) {
                            manta.wanderTargetX = 200 + Math.random() * (this.boundary.width - 400);
                            manta.wanderTargetY = 150 + Math.random() * (this.boundary.height - 300);
                            manta.wanderTimer = 0;
                        }
                    }
                    
                    calculateMovement(manta, deltaTime) {
                        const dx = manta.wanderTargetX - manta.x;
                        const dy = manta.wanderTargetY - manta.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 50) {
                            const influence = 0.0002;
                            manta.targetVx += (dx / distance) * influence;
                            manta.targetVy += (dy / distance) * influence;
                        }
                        
                        if (Math.random() < 0.002) {
                            manta.targetDepth = 0.3 + Math.random() * 0.6;
                        }
                        
                        manta.depth += (manta.targetDepth - manta.depth) * 0.005;
                        
                        if (manta.state === 'flapping') {
                            const flapPhase = manta.stateTimer * manta.flapFrequency * Math.PI * 2 + manta.flapOffset;
                            const forwardForce = Math.max(Math.sin(flapPhase), 0) * 0.3;
                            manta.vx += Math.cos(manta.rotation * Math.PI / 180) * forwardForce;
                            manta.vy += Math.sin(manta.rotation * Math.PI / 180) * forwardForce;
                            const verticalMovement = Math.sin(flapPhase * 1.5) * 0.1;
                            manta.vy += verticalMovement;
                        }
                        
                        if (manta.state === 'gliding') {
                            manta.vx *= this.rules.glideFactor;
                            manta.vy *= this.rules.glideFactor;
                        }
                        
                        manta.vy -= this.rules.buoyancy * manta.depth;
                        
                        const margin = this.rules.margin;
                        const turnForce = 0.001;
                        
                        if (manta.x < margin) {
                            manta.targetVx += turnForce * (margin - manta.x);
                        } else if (manta.x > this.boundary.width - margin) {
                            manta.targetVx -= turnForce * (manta.x - (this.boundary.width - margin));
                        }
                        
                        if (manta.y < margin) {
                            manta.targetVy += turnForce * (margin - manta.y);
                        } else if (manta.y > this.boundary.height - margin) {
                            manta.targetVy -= turnForce * (manta.y - (this.boundary.height - margin));
                        }
                        
                        const currentSpeed = Math.sqrt(manta.vx * manta.vx + manta.vy * manta.vy);
                        if (currentSpeed > 0.1) {
                            const desiredRotation = Math.atan2(manta.vy, manta.vx) * (180 / Math.PI);
                            let rotationDiff = desiredRotation - manta.targetRotation;
                            while (rotationDiff > 180) rotationDiff -= 360;
                            while (rotationDiff < -180) rotationDiff += 360;
                            const turnSpeed = this.rules.turnRate * (0.5 + currentSpeed * 0.5);
                            manta.targetRotation += rotationDiff * turnSpeed;
                        }
                        
                        manta.vx += (manta.targetVx - manta.vx) * 0.05;
                        manta.vy += (manta.targetVy - manta.vy) * 0.05;
                        manta.vx *= this.rules.momentum;
                        manta.vy *= this.rules.momentum;
                        
                        const speed = Math.sqrt(manta.vx * manta.vx + manta.vy * manta.vy);
                        if (speed > this.rules.maxSpeed) {
                            manta.vx = (manta.vx / speed) * this.rules.maxSpeed;
                            manta.vy = (manta.vy / speed) * this.rules.maxSpeed;
                        } else if (speed < this.rules.minSpeed) {
                            manta.vx = (manta.vx / Math.max(speed, 0.001)) * this.rules.minSpeed;
                            manta.vy = (manta.vy / Math.max(speed, 0.001)) * this.rules.minSpeed;
                        }
                    }
                    
                    applyPhysics(manta, deltaTime) {
                        manta.rotation += (manta.targetRotation - manta.rotation) * 0.1;
                        manta.x += manta.vx;
                        manta.y += manta.vy;
                        
                        if (manta.x < -50) manta.x = this.boundary.width + 50;
                        if (manta.x > this.boundary.width + 50) manta.x = -50;
                        if (manta.y < -50) manta.y = this.boundary.height + 50;
                        if (manta.y > this.boundary.height + 50) manta.y = -50;
                    }
                    
                    updateVisuals(manta) {
                        const transform = 'translate(' + manta.x + 'px, ' + manta.y + 'px) rotate(' + manta.rotation + 'deg)';
                        manta.element.style.left = '0';
                        manta.element.style.top = '0';
                        manta.element.style.transform = transform;
                        
                        const scale = 0.6 + manta.depth * 0.4;
                        manta.element.style.transform += ' scale(' + scale + ')';
                        manta.element.style.opacity = 0.7 + manta.depth * 0.3;
                    }
                }
                
                const shoal = new MantaShoal();
                
                function startShoal() {
                    const shoalContainer = document.getElementById('shoal');
                    if (!shoalContainer) return;
                    
                    const count = 25;
                    
                    for (let i = 1; i <= count; i++) {
                        const div = document.createElement('div');
                        div.className = 'smallManta';
                        
                        // SVG from SVG Repo - clean, recognizable manta ray!
                        div.innerHTML = \`<svg viewBox="0 0 512 512" width="60" height="60" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#000000" opacity="0.9" d="M21.732 21.732C115.44 146.675 131.057 256.001 115.44 334.09c16.476 5.492 27.146 9.056 34.75 13.402-4.53 1.401-9.472 3.01-14.605 4.815-20.447 7.19-43.892 16.797-57.791 31.25-14.689 15.274-23.998 40.669-30.81 62.767-6.813 22.099-1.635 42.635-1.635 42.635s12.333-16.25 18.834-37.334c6.5-21.085 16.658-45.272 26.584-55.594 9.135-9.5 31.343-19.908 50.789-26.746 8.692-3.056 16.722-5.493 23.058-7.295 4.299 7.593 7.85 18.227 13.297 34.57 78.09-15.617 187.415 0 312.358 93.708C474.65 443.414 459.03 365.324 412.178 256c-9.776-29.327-13.43-52.534-10.969-69.623 15.121-2.598 24.97-12.368 31.266-22.035 6.821-10.474 11.285-20.903 17.302-26.92l-12.726-12.727c-9.6 9.6-14.16 21.383-19.658 29.825-1.928 2.959-3.753 5.487-5.8 7.578-46.029-15.344-46.347-15.662-61.69-61.692 2.09-2.046 4.618-3.871 7.577-5.799 8.442-5.498 20.224-10.057 29.825-19.658l-12.727-12.726c-6.017 6.017-16.446 10.48-26.92 17.302-9.667 6.297-19.437 16.145-22.035 31.266-17.09 2.462-40.296-1.193-69.623-10.969C146.676 52.97 68.586 37.35 21.732 21.732zM215.766 131.06h17.998c0 14.741 2.215 26.782 6.447 35.652 4.232 8.87 10.13 14.748 19.22 18.498l-6.863 16.639c-13.023-5.373-22.744-15.11-28.601-27.387-5.858-12.276-8.201-26.909-8.201-43.402zm-41.553 2.51l17.967 1.052c-.767 13.08 2.013 31.07 9.017 47.291 7.005 16.22 18.026 30.535 33.139 38.285l-8.211 16.016c-19.896-10.202-33.258-28.194-41.451-47.166-8.193-18.973-11.424-39.062-10.461-55.479zm152.578 119c3.75 9.09 9.628 14.988 18.498 19.22 8.87 4.232 20.91 6.447 35.652 6.447v17.998c-16.493 0-31.126-2.343-43.402-8.2-12.276-5.858-22.014-15.579-27.387-28.602l16.639-6.864zm-34.988 25.095c7.75 15.113 22.064 26.134 38.285 33.139 16.22 7.004 34.211 9.784 47.29 9.017l1.054 17.967c-16.417.963-36.506-2.268-55.479-10.46-18.972-8.194-36.964-21.556-47.166-41.452l16.016-8.21z"/>
                            <animateTransform 
                                attributeName="transform"
                                type="rotate"
                                values="0 256 256; -3 256 256; 0 256 256; 3 256 256; 0 256 256"
                                keyTimes="0;0.25;0.5;0.75;1"
                                dur="4s"
                                repeatCount="indefinite"/>
                        </svg>\`;

        shoalContainer.appendChild(div);
        shoal.addManta(div);
    }

                    // Start animation loop
                    let lastTime = 0;
function animate(currentTime) {
    const deltaTime = currentTime - lastTime || 16;
    lastTime = currentTime;

    shoal.update(deltaTime);
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
                }

// Start shoal when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startShoal);
} else {
    startShoal();
}
`
        };
    }
}
