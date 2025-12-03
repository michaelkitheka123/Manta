import * as vscode from 'vscode';
import WebSocket from 'ws';
import { ExtensionState } from './state';
import { Task, DependencyGraph } from '../../shared/ts-types';
import { log } from './utils';

export class ServerClient {
    private state: ExtensionState;
    private ws: WebSocket | null = null;
    private serverUrl: string;

    constructor(state: ExtensionState) {
        this.state = state;
        this.serverUrl = vscode.workspace.getConfiguration('manta').get('serverUrl', 'wss://web-production-9466f.up.railway.app');
    }

    // -----------------------------
    // Connect to the server
    // -----------------------------
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.on('open', () => {
                    log(`Connected to Manta server at ${this.serverUrl}`);
                    resolve();
                });

                this.ws.on('message', (data) => this.handleMessage(data.toString()));

                this.ws.on('error', (err) => {
                    log(`WebSocket error: ${err}`);
                    vscode.window.showErrorMessage(`Server connection error: ${err}`);
                });

                this.ws.on('close', () => {
                    log('Server connection closed.');
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // -----------------------------
    // Disconnect from the server
    // -----------------------------
    disconnect(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
            this.ws = null;
            log('Disconnected from server.');
        }
    }

    // -----------------------------
    // Handle incoming messages
    // -----------------------------
    private handleMessage(message: string) {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'tasks:update':
                    const tasks: Task[] = data.payload;
                    this.state.setTasks(tasks);
                    break;

                case 'dependency:update':
                    const graph: DependencyGraph = data.payload;
                    this.state.setDependencyGraph(graph);
                    break;

                case 'members:update':
                    const members: string[] = data.payload;
                    this.state.setActiveMembers(members);
                    break;

                case 'notification':
                    vscode.window.showInformationMessage(data.payload.message);
                    break;

                default:
                    log(`Unknown server message type: ${data.type}`);
            }
        } catch (err) {
            log(`Failed to parse server message: ${message}, Error: ${err}`);
        }
    }

    // -----------------------------
    // Send file save event
    // -----------------------------
    async sendFileSaveEvent(filePath: string): Promise<void> {
        this.send({
            type: 'file:saved',
            payload: { filePath },
        });
    }

    // Notify server of file close
    notifyFileClose(filePath: string): void {
        this.send({
            type: 'file:closed',
            payload: { filePath },
        });
    }

    // Assign task to a member
    async assignTask(taskName: string, member: string): Promise<void> {
        this.send({
            type: 'task:assign',
            payload: { taskName, member },
        });
    }

    // Create a new task (unassigned)
    async createTask(task: Task): Promise<void> {
        this.send({
            type: 'task:create',
            payload: task,
        });
    }

    // Approve a task
    async approveTask(taskName: string): Promise<void> {
        this.send({
            type: 'task:approve',
            payload: { taskName },
        });
    }

    // Commit a file (logic or style)
    async commitFile(filePath: string, content: string, type: 'logic' | 'style'): Promise<void> {
        this.send({
            type: 'file:commit',
            payload: { filePath, content, type },
        });
    }

    // Join a session
    async joinSession(token: string): Promise<{ project: any; role: string }> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject('Server not connected.');

            const listener = (message: string) => {
                const data = JSON.parse(message);
                if (data.type === 'session:joined') {
                    this.ws?.off('message', listener);
                    resolve(data.payload);
                }
            };
            this.ws.on('message', listener);

            this.send({
                type: 'session:join',
                payload: { token },
            });
        });
    }

    // Generate invite token for project
    generateInviteToken(projectName: string): string {
        const token = Math.random().toString(36).substring(2, 12);
        this.send({
            type: 'session:create',
            payload: { projectName, token },
        });
        return token;
    }

    // -----------------------------
    // Background event listeners
    // -----------------------------
    onTaskUpdate(callback: (tasks: Task[]) => void) {
        this.ws?.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.type === 'tasks:update') {
                callback(data.payload);
            }
        });
    }

    onDependencyUpdate(callback: (graph: DependencyGraph) => void) {
        this.ws?.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.type === 'dependency:update') {
                callback(data.payload);
            }
        });
    }

    // -----------------------------
    // Code Review Methods
    // -----------------------------
    async submitCodeReview(review: import('../../shared/ts-types').CodeReview): Promise<void> {
        this.send({
            type: 'review:submit',
            payload: review,
        });
        log(`Code review submitted: ${review.id}`);
    }

    async approveCodeReview(reviewId: string, feedback?: string): Promise<void> {
        this.send({
            type: 'review:approve',
            payload: { reviewId, feedback },
        });
        log(`Code review approved: ${reviewId}`);
    }

    async declineCodeReview(reviewId: string, feedback: string): Promise<void> {
        this.send({
            type: 'review:decline',
            payload: { reviewId, feedback },
        });
        log(`Code review declined: ${reviewId}`);
    }

    async requestChanges(reviewId: string, feedback: string): Promise<void> {
        this.send({
            type: 'review:request_changes',
            payload: { reviewId, feedback },
        });
        log(`Changes requested for review: ${reviewId}`);
    }

    onCodeReviewUpdate(callback: (reviews: import('../../shared/ts-types').CodeReview[]) => void) {
        this.ws?.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.type === 'review:update') {
                callback(data.payload);
            }
        });
    }

    // -----------------------------
    // Internal send helper
    // -----------------------------
    private send(payload: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        } else {
            log('Cannot send message: WebSocket not open.');
        }
    }
}
