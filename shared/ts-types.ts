export interface Task {
    id: string;
    name: string;
    assignee?: string;
    status: 'pending' | 'active' | 'complete' | 'blocked' | 'pendingApproval';
    description?: string;
}

export interface Activity {
    timestamp: Date;
    type: 'file_save' | 'commit' | 'task_complete' | 'task_start' | 'task_assign';
    description: string;
    fileOrTask?: string;
}

export interface MemberMetrics {
    tasksAssigned: number;
    tasksCompleted: number;
    tasksPending: number;
    commitsTotal: number;
    commitsAccepted: number;
    commitsPending: number;
}

export interface Member {
    id: string;
    name: string;
    role: 'Navigator' | 'Implementer' | 'lead';
    joinedAt?: Date;
    currentTask?: string;
    currentFile?: string;
    lastActivity?: Date;
    isOnline?: boolean;
    metrics?: MemberMetrics;
    activityLog?: Activity[];
}

export interface Project {
    id?: string; // Added for compatibility
    name: string;
    token: string;
    inviteToken?: string;
    tasks: Task[];
    members: Member[];
}

export interface AISuggestion {
    line: number;
    message: string;
    fix?: string;
}

export type UserRole = 'Navigator' | 'Implementer' | 'lead' | 'member';

export interface DependencyGraph {
    nodes: Task[];
    edges: { from: string; to: string }[];
}

export interface Bottleneck {
    line: number;
    type: 'performance' | 'memory' | 'complexity';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
}

export interface Improvement {
    line: number;
    category: 'readability' | 'maintainability' | 'performance' | 'security';
    description: string;
    suggestedCode?: string;
}

export interface InlineComment {
    line: number;
    comment: string;
    type: 'function' | 'class' | 'variable' | 'logic';
}

export interface AIAnalysis {
    bottlenecks: Bottleneck[];
    improvements: Improvement[];
    inlineComments: InlineComment[];
    summary: string;
    performanceScore: number; // 0-100
    qualityScore: number; // 0-100
}

export interface ReviewFile {
    path: string;
    originalCode: string;
    proposedCode: string;
    language: string;
}

export interface CodeReview {
    id: string;
    projectId?: string; // Added
    submittedBy: string;
    authorId?: string; // Added alias
    submittedByName: string;
    authorName?: string; // Added alias
    taskId?: string;
    taskName?: string;
    files: ReviewFile[];
    filePath?: string; // Added alias
    content?: string; // Added alias
    aiAnalysis: AIAnalysis;
    status: 'pending' | 'approved' | 'declined' | 'changes_requested';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    feedback?: string;
}

