import * as vscode from 'vscode';
import { Task, AISuggestion, Project, UserRole, DependencyGraph } from '../../shared/ts-types';
import { log } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface User {
    id: string;
    name: string;
    avatarUrl?: string;
}

export class ExtensionState {
    private context: vscode.ExtensionContext;

    // Current project info
    private project: Project | null = null;

    // Current user role: 'Navigator' | 'Member'
    private role: UserRole | null = null;

    // Current authenticated user
    private user: User | null = null;

    // Active tasks for this project
    private tasks: Task[] = [];

    // Available tasks (unassigned)
    private availableTasks: Task[] = [];

    // Dependency graph for tasks
    private dependencyGraph: DependencyGraph | null = null;

    // Active editor file path
    private currentEditorPath: string | null = null;

    // Active members in the session
    private activeMembers: string[] = [];

    // AI suggestions pending application
    private aiSuggestions: AISuggestion[] = [];

    // Code reviews pending approval
    private pendingReviews: import('../../shared/ts-types').CodeReview[] = [];

    // Chat messages
    private chatMessages: Array<{
        id: string;
        sender: string;
        text: string;
        timestamp: Date;
        translatedText?: string;
        meta?: any;
    }> = [];

    // Store all projects user has joined/created
    private allProjects: Array<{
        userId?: string; // Optional for backward compatibility
        project: Project;
        role: UserRole;
        lastAccessed: Date;
    }> = [];

    private _onDidChangeState: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeState: vscode.Event<void> = this._onDidChangeState.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // Restore user from global state
        const savedUser = this.context.globalState.get<User>('manta_user');
        if (savedUser) {
            this.user = savedUser;
            log(`Restored user session: ${savedUser.name}`);
        }
        log('ExtensionState initialized.');
    }

    private notifyStateChange() {
        this._onDidChangeState.fire();
    }

    // -----------------------------
    // User Management
    // -----------------------------
    async setUser(user: User) {
        this.user = user;
        await this.context.globalState.update('manta_user', user);
        log(`User authenticated: ${user.name}`);
        this.notifyStateChange();
    }

    getUser(): User | null {
        return this.user;
    }

    async logout() {
        this.user = null;
        this.project = null;
        this.role = null;
        this.tasks = [];
        this.availableTasks = [];
        this.pendingReviews = [];
        this.aiSuggestions = [];
        this.activeMembers = [];
        this.dependencyGraph = null;
        // Don't clear allProjects, just hide them via getter
        await this.context.globalState.update('manta_user', undefined);
        log('User logged out and session cleared completely.');
        this.notifyStateChange();
    }

    // -----------------------------
    // Project Management
    // -----------------------------
    setProject(project: Project) {
        this.project = project;
        log(`Project set: ${project.name}`);
        this.notifyStateChange();
    }

    getProject(): Project | null {
        return this.project;
    }

    // -----------------------------
    // Role Management
    // -----------------------------
    setRole(role: UserRole) {
        this.role = role;
        log(`Role set: ${role}`);
        this.notifyStateChange();
    }

    getRole(): UserRole | null {
        return this.role;
    }

    // -----------------------------
    // Task Management
    // -----------------------------
    setTasks(tasks: Task[]) {
        this.tasks = tasks;
        log(`Tasks updated: ${tasks.length} tasks`);
        this.notifyStateChange();
    }

    getTasks(): Task[] {
        return this.tasks;
    }

    hasTask(taskId: string): boolean {
        return this.tasks.some(t => t.id === taskId);
    }

    getPendingApprovals(): Task[] {
        return this.tasks.filter((t) => t.status === 'pendingApproval');
    }

    addTask(task: Task) {
        this.tasks.push(task);
        log(`Task added: ${task.name}`);
        this.notifyStateChange();
    }

    updateTask(task: Task) {
        const index = this.tasks.findIndex((t) => t.id === task.id);
        if (index !== -1) {
            this.tasks[index] = task;
            log(`Task updated: ${task.name}`);
            this.notifyStateChange();
        }
    }

    // -----------------------------
    // Available Tasks Management
    // -----------------------------
    addAvailableTask(task: Task) {
        this.availableTasks.push(task);
        log(`Available task added: ${task.name}`);
    }

    getAvailableTasks(): Task[] {
        return this.availableTasks;
    }

    removeAvailableTask(taskId: string) {
        this.availableTasks = this.availableTasks.filter((t) => t.id !== taskId);
        log(`Available task removed: ${taskId}`);
    }

    getActiveMembers(): string[] {
        return this.activeMembers;
    }

    setActiveMembers(members: string[]) {
        this.activeMembers = members;
    }

    // Update members list from server (Websocket event)
    updateMembers(members: import('../../shared/ts-types').Member[]) {
        if (this.project) {
            this.project.members = members;
            log(`Updated ${members.length} members for project ${this.project.name}`);
            this.notifyStateChange();
        }
    }

    // -----------------------------
    // Dependency Graph
    // -----------------------------
    setDependencyGraph(graph: DependencyGraph) {
        this.dependencyGraph = graph;
        log('Dependency graph updated.');
    }

    getDependencyGraph(): DependencyGraph | null {
        return this.dependencyGraph;
    }

    // -----------------------------
    // Active Editor
    // -----------------------------
    setCurrentEditor(path: string) {
        this.currentEditorPath = path;
    }

    getCurrentEditor(): string | null {
        return this.currentEditorPath;
    }

    // -----------------------------
    // AI Suggestions
    // -----------------------------
    applyAISuggestions(suggestions: AISuggestion[]) {
        this.aiSuggestions.push(...suggestions);
        log(`Applied ${suggestions.length} AI suggestions.`);
    }

    getAISuggestions(): AISuggestion[] {
        return this.aiSuggestions;
    }

    clearAISuggestions() {
        this.aiSuggestions = [];
    }

    // -----------------------------
    // Helpers
    // -----------------------------
    findTaskById(taskId: string): Task | undefined {
        return this.tasks.find((t) => t.id === taskId);
    }

    removeTask(taskId: string) {
        this.tasks = this.tasks.filter((t) => t.id !== taskId);
        log(`Task removed: ${taskId}`);
    }

    // -----------------------------
    // Persistence (Cross-window reload)
    // -----------------------------
    async savePendingProject(project: Project) {
        await this.context.globalState.update('manta_pending_project', project);
        await this.context.globalState.update('manta_pending_role', 'lead');
        log(`Saved pending project state: ${project.name}`);
    }

    getPendingProject(): { project: Project; role: UserRole } | null {
        const project = this.context.globalState.get<Project>('manta_pending_project');
        const role = this.context.globalState.get<UserRole>('manta_pending_role');

        if (project && role) {
            return { project, role };
        }
        return null;
    }

    async clearPendingProject() {
        await this.context.globalState.update('manta_pending_project', undefined);
        await this.context.globalState.update('manta_pending_role', undefined);
        log('Cleared pending project state.');
    }

    // -----------------------------
    // Project List Management
    // -----------------------------

    // Save current project to persistent storage (device-specific, no user filtering)
    async saveCurrentProject() {
        if (!this.project || !this.role) {
            log('[SAVE] Cannot save: no project or role set');
            return;
        }

        // Try to find existing entry
        const existingIndex = this.allProjects.findIndex(
            p => p.project.token === this.project!.token
        );

        const projectData = {
            project: this.project,
            role: this.role,
            lastAccessed: new Date()
        };

        if (existingIndex >= 0) {
            // Update existing
            this.allProjects[existingIndex] = projectData;
            log(`[SAVE] Updated existing project: ${this.project.name} (token: ${this.project.token})`);
        } else {
            // Add new
            this.allProjects.push(projectData);
            log(`[SAVE] Added new project: ${this.project.name} (token: ${this.project.token})`);
        }

        // Save to globalState
        await this.context.globalState.update('manta_all_projects', this.allProjects);
        await this.context.globalState.update('manta_current_project_token', this.project.token);

        log(`[SAVE] Total projects in storage: ${this.allProjects.length}`);
        log(`[SAVE] Projects: ${JSON.stringify(this.allProjects.map(p => ({ name: p.project.name, token: p.project.token, role: p.role })))}`);
    }

    // Load all projects from storage (device-specific)
    loadAllProjects() {
        const saved = this.context.globalState.get<Array<{
            userId?: string; // Legacy field, ignored
            project: Project;
            role: UserRole;
            lastAccessed: Date;
        }>>('manta_all_projects');

        if (saved) {
            this.allProjects = saved;
            log(`[LOAD] Loaded ${saved.length} projects from storage`);
            log(`[LOAD] Projects: ${JSON.stringify(saved.map(p => ({ name: p.project.name, token: p.project.token, role: p.role })))}`);
        } else {
            log('[LOAD] No saved projects found in storage');
        }
    }

    // Get all saved projects (sorted by last accessed, device-specific - no user filtering)
    // Also validates existence on Desktop
    getAllProjects() {
        const initialCount = this.allProjects.length;
        this.allProjects = this.allProjects.filter(p => {
            const projectPath = path.join(os.homedir(), 'Desktop', p.project.name);
            return fs.existsSync(projectPath);
        });

        if (this.allProjects.length < initialCount) {
            const removedCount = initialCount - this.allProjects.length;
            log(`[GET_ALL] Removed ${removedCount} projects that no longer exist on Desktop`);
            // Persist cleanup
            this.context.globalState.update('manta_all_projects', this.allProjects);
        }

        log(`[GET_ALL] Returning ${this.allProjects.length} projects`);
        return this.allProjects
            .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
    }

    // Switch to a different project (device-specific, no user checks)
    async switchToProject(projectToken: string) {
        const projectData = this.allProjects.find(p => p.project.token === projectToken);

        if (projectData) {
            this.project = projectData.project;
            this.role = projectData.role;
            projectData.lastAccessed = new Date(); // Update access time
            await this.saveCurrentProject();
            log(`[SWITCH] Switched to project: ${projectData.project.name} (token: ${projectToken})`);
            return true;
        }
        log(`[SWITCH] Project not found: ${projectToken}`);
        return false;
    }

    // Leave current project (but keep in history)
    async leaveCurrentProject() {
        this.project = null;
        this.role = null;
        await this.context.globalState.update('manta_current_project_token', undefined);
        log('Left current project');
    }

    // Remove project from history
    async removeProject(projectToken: string) {
        const beforeCount = this.allProjects.length;
        this.allProjects = this.allProjects.filter(p => p.project.token !== projectToken);
        await this.context.globalState.update('manta_all_projects', this.allProjects);
        log(`[REMOVE] Removed project: ${projectToken}`);
        log(`[REMOVE] Projects before: ${beforeCount}, after: ${this.allProjects.length}`);
    }

    // Restore last active project on startup
    async restoreLastProject() {
        const currentProjectToken = this.context.globalState.get<string>('manta_current_project_token');
        if (currentProjectToken) {
            // Attempt switch
            const restored = await this.switchToProject(currentProjectToken);
            if (restored) {
                log(`Restored last active project: ${currentProjectToken}`);
                return true;
            } else {
                // If restore failed (e.g. user mismatch), clear the token
                await this.context.globalState.update('manta_current_project_token', undefined);
            }
        }
        return false;
    }

    // -----------------------------
    // Member Analytics
    // -----------------------------
    updateMemberActivity(memberId: string, activityType: 'file_save' | 'commit' | 'task_complete' | 'task_start' | 'task_assign', description: string) {
        if (!this.project) return;

        const member = this.project.members.find(m => m.id === memberId);
        if (!member) return;

        // Update last activity
        member.lastActivity = new Date();
        member.isOnline = true;

        // Add to activity log
        if (!member.activityLog) member.activityLog = [];
        member.activityLog.unshift({
            timestamp: new Date(),
            type: activityType,
            description,
            fileOrTask: description
        });

        // Keep only last 20 activities
        if (member.activityLog.length > 20) {
            member.activityLog = member.activityLog.slice(0, 20);
        }

        log(`Member activity updated: ${memberId} - ${activityType}`);
    }

    updateMemberCurrentFile(memberId: string, filePath: string) {
        if (!this.project) return;

        const member = this.project.members.find(m => m.id === memberId);
        if (member) {
            member.currentFile = filePath;
            member.lastActivity = new Date();
            member.isOnline = true;
        }
    }

    updateMemberCurrentTask(memberId: string, taskId: string | undefined) {
        if (!this.project) return;

        const member = this.project.members.find(m => m.id === memberId);
        if (member) {
            member.currentTask = taskId;
            member.lastActivity = new Date();
        }
    }

    incrementMemberMetric(memberId: string, metric: keyof import('../../shared/ts-types').MemberMetrics) {
        if (!this.project) return;

        const member = this.project.members.find(m => m.id === memberId);
        if (member) {
            if (!member.metrics) {
                member.metrics = {
                    tasksAssigned: 0,
                    tasksCompleted: 0,
                    tasksPending: 0,
                    commitsTotal: 0,
                    commitsAccepted: 0,
                    commitsPending: 0
                };
            }
            member.metrics[metric]++;
            log(`Member metric incremented: ${memberId} - ${metric}`);
        }
    }

    getMemberMetrics(memberId: string) {
        if (!this.project) return null;

        const member = this.project.members.find(m => m.id === memberId);
        return member?.metrics || null;
    }

    checkMemberOnlineStatus() {
        if (!this.project) return;

        const now = new Date();
        this.project.members.forEach(member => {
            if (member.lastActivity) {
                const timeSinceActivity = now.getTime() - new Date(member.lastActivity).getTime();
                member.isOnline = timeSinceActivity < 5 * 60 * 1000; // 5 minutes
            }
        });
    }

    // -----------------------------
    // Code Review Management
    // -----------------------------
    setReviews(reviews: import('../../shared/ts-types').CodeReview[]) {
        this.pendingReviews = reviews;
        log(`Synced ${reviews.length} reviews from server`);
        this.notifyStateChange();
    }

    addPendingReview(review: import('../../shared/ts-types').CodeReview) {
        this.pendingReviews.push(review);
        log(`Code review added: ${review.id}`);
        this.notifyStateChange();
    }

    addReview(review: import('../../shared/ts-types').CodeReview) {
        this.addPendingReview(review);
    }

    getPendingReviews(): import('../../shared/ts-types').CodeReview[] {
        return this.pendingReviews.filter(r => r.status === 'pending');
    }

    updateReviewStatus(reviewId: string, status: 'approved' | 'declined' | 'changes_requested') {
        const review = this.pendingReviews.find(r => r.id === reviewId);
        if (review) {
            review.status = status;
            review.reviewedAt = new Date();
            log(`Review ${reviewId} status updated to ${status}`);
            this.notifyStateChange();
        }
    }

    removeReview(reviewId: string) {
        this.pendingReviews = this.pendingReviews.filter(r => r.id !== reviewId);
        log(`Review removed: ${reviewId}`);
    }

    // -----------------------------
    // Chat Management
    // -----------------------------
    addChatMessage(message: { id: string; sender: string; text: string; timestamp: Date; translatedText?: string; meta?: any }) {
        this.chatMessages.push(message);
        log(`Chat message added from ${message.sender}`);
        this.notifyStateChange();
    }

    getChatMessages() {
        return this.chatMessages;
    }

    clearChatMessages() {
        this.chatMessages = [];
        this.notifyStateChange();
    }
}
