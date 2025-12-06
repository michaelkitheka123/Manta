import * as vscode from 'vscode';
import { ExtensionState } from './state';
import { ServerClient } from './serverClient';
import { AIClient } from './aiClient';
import { ViewsManager } from './views';
import { log } from './utils';

export function registerCommands(
    context: vscode.ExtensionContext,
    state: ExtensionState,
    serverClient: ServerClient,
    aiClient: AIClient,
    viewsManager: ViewsManager
) {
    // -----------------------------
    // Start a new Manta project
    // -----------------------------
    const startProject = vscode.commands.registerCommand('manta.startProject', async () => {
        try {
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter the new Manta project name',
                value: 'MyMantaProject',
            });

            if (!projectName) {
                return vscode.window.showWarningMessage('Project creation canceled.');
            }

            // Get current user
            const user = state.getUser();
            if (!user || !user.name) {
                return vscode.window.showWarningMessage('Please login with GitHub first');
            }

            const project = await serverClient.createProject(projectName, user.name);
            state.setProject(project);
            state.setRole('lead' as any);

            vscode.window.showInformationMessage(`Project "${projectName}" created. Invite token generated.`);
            log(`Project "${projectName}" created with token: ${project.token}`);

            viewsManager.refreshFlowMap();
            viewsManager.refreshDutyQueue();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to start project: ${err}`);
            log(`Error: ${err}`);
        }
    });

    // -----------------------------
    // Join an existing Manta session
    // -----------------------------
    const joinSession = vscode.commands.registerCommand('manta.joinSession', async () => {
        try {
            const token = await vscode.window.showInputBox({ prompt: 'Enter Manta invite token' });
            if (!token) return;

            // Get current user
            const user = state.getUser();
            if (!user || !user.name) {
                return vscode.window.showWarningMessage('Please login with GitHub first');
            }

            const sessionData = await serverClient.joinSession(token, user.name);
            state.setProject(sessionData.project);
            state.setRole(sessionData.role as import('../../shared/ts-types').UserRole);

            vscode.window.showInformationMessage(`Joined project "${sessionData.project.name}" as ${sessionData.role}`);
            viewsManager.refreshFlowMap();
            viewsManager.refreshDutyQueue();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to join session: ${err}`);
            console.error(err);
        }
    });

    // -----------------------------
    // Delegate a task using AI
    // -----------------------------
    const delegateTask = vscode.commands.registerCommand('manta.delegateTask', async () => {
        try {
            const taskName = await vscode.window.showInputBox({ prompt: 'Enter task name to delegate' });
            if (!taskName) return;

            const bestMember = await aiClient.autoAssignTask(taskName, state.getActiveMembers());
            await serverClient.assignTask(taskName, bestMember);

            vscode.window.showInformationMessage(`Task "${taskName}" assigned to ${bestMember}`);
            viewsManager.refreshDutyQueue();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to delegate task: ${err}`);
            console.error(err);
        }
    });

    // -----------------------------
    // Approve a merge / code review
    // -----------------------------
    const approveMerge = vscode.commands.registerCommand('manta.approveMerge', async () => {
        try {
            const pendingTasks = state.getPendingApprovals();
            if (pendingTasks.length === 0) {
                return vscode.window.showInformationMessage('No pending merges to approve.');
            }

            const selectedTask = await vscode.window.showQuickPick(
                pendingTasks.map((t) => t.name),
                { placeHolder: 'Select task to approve' }
            );
            if (!selectedTask) return;

            await serverClient.approveTask(selectedTask);
            vscode.window.showInformationMessage(`Task "${selectedTask}" approved.`);
            viewsManager.refreshDutyQueue();
            viewsManager.refreshFlowMap();
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to approve merge: ${err}`);
            console.error(err);
        }
    });

    // -----------------------------
    // Commit logic changes (triggers AI review)
    // -----------------------------
    const commitLogic = vscode.commands.registerCommand('manta.commitLogic', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return vscode.window.showWarningMessage('No active editor.');

            const fileContent = editor.document.getText();
            const filePath = editor.document.uri.fsPath;

            const aiReview = await aiClient.reviewCode(filePath, fileContent, 'logic');
            if (aiReview.suggestions.length > 0) {
                vscode.window.showInformationMessage(`AI suggestions received for "${filePath}".`);
                state.applyAISuggestions(aiReview.suggestions);
            }

            await serverClient.commitFile(filePath, fileContent, 'logic');
            vscode.window.showInformationMessage(`Logic changes committed for "${filePath}".`);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to commit logic: ${err}`);
            console.error(err);
        }
    });

    // -----------------------------
    // Commit style changes (triggers AI review)
    // -----------------------------
    const commitStyles = vscode.commands.registerCommand('manta.commitStyles', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return vscode.window.showWarningMessage('No active editor.');

            const fileContent = editor.document.getText();
            const filePath = editor.document.uri.fsPath;

            const aiReview = await aiClient.reviewCode(filePath, fileContent, 'style');
            if (aiReview.suggestions.length > 0) {
                vscode.window.showInformationMessage(`AI suggestions received for "${filePath}".`);
                state.applyAISuggestions(aiReview.suggestions);
            }

            await serverClient.commitFile(filePath, fileContent, 'style');
            vscode.window.showInformationMessage(`Style changes committed for "${filePath}".`);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to commit styles: ${err}`);
            console.error(err);
        }
    });

    // -----------------------------
    // Review & Commit (AI-Powered)
    // -----------------------------
    const reviewAndCommit = vscode.commands.registerCommand('manta.reviewAndCommit', async () => {
        try {
            const project = state.getProject();
            if (!project) {
                return vscode.window.showWarningMessage('No active project. Please start or join a project first.');
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing code with AI...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Collecting modified files..." });

                // Get all modified files (simplified - in real implementation, use git status)
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error('No workspace folder open');
                }

                // For demo, get currently open/modified files
                const modifiedFiles: import('../../shared/ts-types').ReviewFile[] = [];
                const textDocuments = vscode.workspace.textDocuments.filter(doc =>
                    !doc.isUntitled && doc.uri.scheme === 'file' && doc.isDirty
                );

                if (textDocuments.length === 0) {
                    vscode.window.showInformationMessage('No modified files to review. Save your changes first.');
                    return;
                }

                progress.report({ increment: 20, message: `Found ${textDocuments.length} modified files...` });

                // Collect file data
                for (const doc of textDocuments) {
                    const filePath = vscode.workspace.asRelativePath(doc.uri);
                    const language = doc.languageId;
                    const proposedCode = doc.getText();

                    modifiedFiles.push({
                        path: filePath,
                        originalCode: proposedCode, // In real impl, get from git
                        proposedCode: proposedCode,
                        language: language
                    });
                }

                progress.report({ increment: 30, message: "Running AI analysis..." });

                // Run AI analysis
                const analysisPromises = modifiedFiles.map(file =>
                    aiClient.analyzeCode(file.proposedCode, file.language, file.path)
                );
                const analyses = await Promise.all(analysisPromises);

                // Combine analyses
                const combinedAnalysis: import('../../shared/ts-types').AIAnalysis = {
                    bottlenecks: analyses.flatMap(a => a.bottlenecks),
                    improvements: analyses.flatMap(a => a.improvements),
                    inlineComments: analyses.flatMap(a => a.inlineComments),
                    summary: analyses.map(a => a.summary).join('\n'),
                    performanceScore: Math.round(analyses.reduce((sum, a) => sum + a.performanceScore, 0) / analyses.length),
                    qualityScore: Math.round(analyses.reduce((sum, a) => sum + a.qualityScore, 0) / analyses.length)
                };

                progress.report({ increment: 60, message: "Generating inline comments..." });

                // Apply inline comments back to editor
                for (const file of modifiedFiles) {
                    file.proposedCode = await aiClient.generateInlineComments(file.proposedCode, file.language);

                    // Find document and apply edit
                    const doc = textDocuments.find(d => d.uri.fsPath.endsWith(file.path));
                    if (doc) {
                        const edit = new vscode.WorkspaceEdit();
                        const fullRange = new vscode.Range(
                            doc.positionAt(0),
                            doc.positionAt(doc.getText().length)
                        );
                        edit.replace(doc.uri, fullRange, file.proposedCode);
                        await vscode.workspace.applyEdit(edit);
                        await doc.save();
                    }
                }

                progress.report({ increment: 80, message: "Submitting for review..." });

                // Create code review
                const review: import('../../shared/ts-types').CodeReview = {
                    id: Math.random().toString(36).substring(2, 15),
                    submittedBy: 'current-user-id', // TODO: Get from state
                    submittedByName: 'Current User', // TODO: Get from state
                    taskId: undefined,
                    taskName: undefined,
                    files: modifiedFiles,
                    aiAnalysis: combinedAnalysis,
                    status: 'pending',
                    submittedAt: new Date()
                };

                // Send to server (if available)
                try {
                    await serverClient.submitCodeReview(review);
                    progress.report({ increment: 100, message: "Submitted!" });
                    vscode.window.showInformationMessage(
                        `✅ Code review submitted! Quality: ${combinedAnalysis.qualityScore}%, Performance: ${combinedAnalysis.performanceScore}%`
                    );
                } catch (e) {
                    progress.report({ increment: 100, message: "Done (Local only)" });
                    vscode.window.showInformationMessage(
                        `✅ AI Review applied locally! Quality: ${combinedAnalysis.qualityScore}%, Performance: ${combinedAnalysis.performanceScore}% (Server offline)`
                    );
                }
            });

        } catch (err) {
            vscode.window.showErrorMessage(`Failed to submit code review: ${err}`);
            console.error(err);
        }
    });

    // -----------------------------
    // Register all disposables
    // -----------------------------
    context.subscriptions.push(
        startProject,
        joinSession,
        delegateTask,
        approveMerge,
        commitLogic,
        commitStyles,
        reviewAndCommit
    );

    log('Manta commands registered.');
}
