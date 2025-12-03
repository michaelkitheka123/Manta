import * as vscode from 'vscode';
import { Task, AISuggestion, Project, UserRole, DependencyGraph } from '../../shared/ts-types';
import { log } from './utils';

export class ExtensionState {
    private context: vscode.ExtensionContext;

    // Current project info
    private project: Project | null = null;

    // Current user role: 'Navigator' | 'Member'
    private role: UserRole | null = null;

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

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        log('ExtensionState initialized.');
    }

    // -----------------------------
    // Project Management
    // -----------------------------
    setProject(project: Project) {
        this.project = project;
        log(`Project set: ${project.name}`);
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
    }

    getTasks(): Task[] {
        return this.tasks;
    }

    getPendingApprovals(): Task[] {
        return this.tasks.filter((t) => t.status === 'pendingApproval');
    }

    addTask(task: Task) {
        this.tasks.push(task);
        log(`Task added: ${task.name}`);
    }

    updateTask(task: Task) {
        const index = this.tasks.findIndex((t) => t.id === task.id);
        if (index !== -1) {
            this.tasks[index] = task;
            log(`Task updated: ${task.name}`);
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
        // Optionally trigger editor decorations or notifications here
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
    addPendingReview(review: import('../../shared/ts-types').CodeReview) {
        this.pendingReviews.push(review);
        log(`Code review added: ${review.id}`);
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
        }
    }

    removeReview(reviewId: string) {
        this.pendingReviews = this.pendingReviews.filter(r => r.id !== reviewId);
        log(`Review removed: ${reviewId}`);
    }
}
