import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | null = null;

/**
 * Logs messages to the VS Code output channel and the Debug Console.
 */
export function log(message: string) {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Manta');
    }
    const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
    outputChannel.appendLine(timestampedMessage);
    console.log(timestampedMessage); // Also log to Debug Console for "livestreaming"
}

/**
 * Generates a random alphanumeric token for project invites or session IDs.
 * @param length Length of the token
 */
export function generateToken(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Generates a unique ID for tasks or other entities.
 */
export function generateId(prefix = 'id'): string {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Converts a VS Code URI to a normalized file path.
 */
export function uriToPath(uri: vscode.Uri): string {
    return uri.fsPath.replace(/\\/g, '/');
}

/**
 * Safely parses JSON with fallback
 */
export function safeParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json);
    } catch (err) {
        log(`Failed to parse JSON: ${err}`);
        return fallback;
    }
}
