import * as vscode from 'vscode';
import { ExtensionState } from './state';
import { ServerClient } from './serverClient';
import { AIClient } from './aiClient';
import { log } from './utils';
import { Task } from '../../shared/ts-types';

export class ViewsManager {
    private context: vscode.ExtensionContext;
    private state: ExtensionState;
    private serverClient: ServerClient;
    private aiClient: AIClient;
    private dutyQueueProvider: DutyQueueProvider;

    constructor(
        context: vscode.ExtensionContext,
        state: ExtensionState,
        serverClient: ServerClient,
        aiClient: AIClient
    ) {
        this.context = context;
        this.state = state;
        this.serverClient = serverClient;
        this.aiClient = aiClient;
        this.dutyQueueProvider = new DutyQueueProvider(state);
        log('ViewsManager initialized.');
    }

    initializeViews() {
        // Register Duty Queue tree view
        vscode.window.registerTreeDataProvider('mantaDutyQueue', this.dutyQueueProvider);
        log('Duty Queue initialized.');
    }

    refreshFlowMap() {
        log('Flow Map refresh requested (not implemented yet).');
    }

    refreshDutyQueue() {
        this.dutyQueueProvider.refresh();
        log('Duty Queue refreshed.');
    }

    refreshDependencyHub() {
        log('Dependency Hub refresh requested (not implemented yet).');
    }
}

// Duty Queue Tree Data Provider
class DutyQueueProvider implements vscode.TreeDataProvider<Task> {
    private state: ExtensionState;
    private _onDidChangeTreeData: vscode.EventEmitter<Task | undefined | null | void> =
        new vscode.EventEmitter<Task | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Task | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(state: ExtensionState) {
        this.state = state;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Task): vscode.TreeItem {
        const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
        item.description = element.status;
        item.tooltip = element.description || element.name;
        return item;
    }

    getChildren(): Thenable<Task[]> {
        const tasks = this.state.getTasks();
        return Promise.resolve(tasks);
    }
}
