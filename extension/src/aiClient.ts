import axios from 'axios';
import { ExtensionState } from './state';
import { AISuggestion } from '../../shared/ts-types';
import { log } from './utils';
import * as vscode from 'vscode';

export class AIClient {
    private state: ExtensionState;
    private baseUrl: string;

    // Optional: Polling interval for background tasks (ms)
    private pollingInterval = 5000;
    private pollingTimer: NodeJS.Timeout | null = null;

    constructor(state: ExtensionState) {
        this.state = state;
        this.baseUrl = vscode.workspace.getConfiguration('manta').get('aiServerUrl', 'http://localhost:8000');
        this.googleKey = vscode.workspace.getConfiguration('manta').get('googleStudioToken');
        log(`AIClient initialized with baseUrl=${this.baseUrl}, googleKey=${this.googleKey ? 'PRESENT' : 'MISSING'}`);
    }

    private googleKey: string | undefined;

    // -----------------------------
    // Connect to the AI service
    // -----------------------------
    async connect(): Promise<void> {
        try {
            // Skip AI connection - no AI server deployed yet
            log('AI service connection skipped (no AI server deployed)');

            // Note: AI features (code analysis, suggestions) will not be available
            // until an AI server is deployed and configured

            // Don't start polling if there's no server
            // this.pollingTimer = setInterval(() => this.fetchBackgroundSuggestions(), this.pollingInterval);
        } catch (err) {
            log(`Error: ${err}`);
        }
    }

    // Disconnect and clean up
    disconnect() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        log('AIClient disconnected.');
    }

    // -----------------------------
    // Auto-assign a task
    // -----------------------------
    async autoAssignTask(taskName: string, members: string[]): Promise<string> {
        try {
            const res = await axios.post(`${this.baseUrl}/assign/task`, {
                taskName,
                members,
            });
            const assignedMember: string = res.data.assignedMember;
            log(`Task "${taskName}" auto-assigned to ${assignedMember}`);
            return assignedMember;
        } catch (err) {
            log(`AutoAssign failed: ${err}`);
            return members[0]; // fallback
        }
    }

    // -----------------------------
    // Request AI code review
    // -----------------------------
    async reviewCode(filePath: string, content: string, reviewType: 'logic' | 'style') {
        // Direct Google AI Path
        if (this.googleKey) {
            try {
                const prompt = `Review this code for ${reviewType}. Provide suggestions as a JSON array of objects with properties: "line" (number), "description" (string), "severity" (string: 'info'|'warning'|'error'). Code:\n\n${content}`;
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.googleKey}`,
                    { contents: [{ parts: [{ text: prompt }] }] }
                );

                const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
                // Try to extract JSON from markdown block
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
                const cleanJson = jsonMatch[1] || text;

                const suggestions: AISuggestion[] = JSON.parse(cleanJson);
                if (suggestions.length > 0) {
                    this.state.applyAISuggestions(suggestions);
                }
                return { suggestions };
            } catch (err) {
                log(`Google AI review failed: ${err}`);
                return { suggestions: [] };
            }
        }

        try {
            const res = await axios.post(`${this.baseUrl}/review/code`, {
                filePath,
                content,
                type: reviewType,
            });

            const suggestions: AISuggestion[] = res.data.suggestions || [];
            if (suggestions.length > 0) {
                this.state.applyAISuggestions(suggestions);
            }

            return { suggestions };
        } catch (err) {
            log(`AI code review failed: ${err}`);
            return { suggestions: [] };
        }
    }

    // -----------------------------
    // Notify AI of a file save
    // -----------------------------
    async notifyFileSave(filePath: string, content: string) {
        try {
            await axios.post(`${this.baseUrl}/file/saved`, {
                filePath,
                content,
            });
            log(`File save notified to AI: ${filePath}`);
        } catch (err) {
            log(`Failed to notify AI of file save: ${err}`);
        }
    }

    // -----------------------------
    // Fetch background suggestions (polling)
    // -----------------------------
    private suggestionCallbacks: ((suggestions: AISuggestion[]) => void)[] = [];

    // -----------------------------
    // Fetch background suggestions (polling)
    // -----------------------------
    private async fetchBackgroundSuggestions() {
        try {
            const res = await axios.get(`${this.baseUrl}/suggestions`);
            const suggestions: AISuggestion[] = res.data.suggestions || [];
            if (suggestions.length > 0) {
                this.state.applyAISuggestions(suggestions);
                log(`Fetched ${suggestions.length} background AI suggestions`);

                // Notify listeners
                this.suggestionCallbacks.forEach(cb => cb(suggestions));
            }
        } catch (err) {
            // Log silently or with less verbosity to avoid spamming if server is down
            // log(`Failed to fetch background AI suggestions: ${err}`);
        }
    }

    // -----------------------------
    // Risk monitoring (optional)
    // -----------------------------
    async getRiskReport() {
        try {
            const res = await axios.get(`${this.baseUrl}/risk/report`);
            return res.data;
        } catch (err) {
            log(`Failed to fetch risk report: ${err}`);
            return null;
        }
    }

    // -----------------------------
    // Event listener for incoming AI suggestions
    // -----------------------------
    onSuggestions(callback: (suggestions: AISuggestion[]) => void) {
        this.suggestionCallbacks.push(callback);
    }

    // -----------------------------
    // AI-Powered Code Analysis
    // -----------------------------
    async analyzeCode(code: string, language: string, filePath: string): Promise<import('../../shared/ts-types').AIAnalysis> {
        // Direct Google AI Path
        if (this.googleKey) {
            try {
                const prompt = `Analyze this ${language} code. Return a JSON object with: "summary" (string), "qualityScore" (0-100), "performanceScore" (0-100), "bottlenecks" (string array), "improvements" (string array). Code:\n\n${code}`;
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.googleKey}`,
                    { contents: [{ parts: [{ text: prompt }] }] }
                );

                const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error('No response from Google AI');

                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
                const cleanJson = jsonMatch[1] || text;
                const analysis: import('../../shared/ts-types').AIAnalysis = JSON.parse(cleanJson);

                // Ensure defaults
                analysis.inlineComments = analysis.inlineComments || [];

                log(`Google AI Code analysis completed for ${filePath}`);
                return analysis;
            } catch (err: any) {
                const errorMsg = err.response?.data?.error?.message || err.message || err;
                log(`Google AI Code analysis failed: ${errorMsg}`);
                return {
                    bottlenecks: [], improvements: [], inlineComments: [],
                    summary: `Direct AI Analysis failed: ${errorMsg}`, performanceScore: 0, qualityScore: 0
                };
            }
        }

        try {
            const res = await axios.post(`${this.baseUrl}/analyze/code`, {
                code,
                language,
                filePath
            });

            const analysis: import('../../shared/ts-types').AIAnalysis = res.data.analysis || {
                bottlenecks: [],
                improvements: [],
                inlineComments: [],
                summary: 'No analysis available',
                performanceScore: 0,
                qualityScore: 0
            };

            log(`Code analysis completed for ${filePath}: Quality ${analysis.qualityScore}%, Performance ${analysis.performanceScore}%`);
            return analysis;
        } catch (err) {
            log(`Code analysis failed: ${err}`);
            // Return empty analysis on error
            return {
                bottlenecks: [],
                improvements: [],
                inlineComments: [],
                summary: 'Analysis failed',
                performanceScore: 0,
                qualityScore: 0
            };
        }
    }

    async generateInlineComments(code: string, language: string): Promise<string> {
        // Direct Google AI Path
        if (this.googleKey) {
            try {
                // Modified prompt to ensure comments are added
                const prompt = `Review this ${language} code. Add detailed inline comments explaining the logic and adding suggestions for best practices. Return the FULL code with comments integrated. Do NOT output markdown code blocks, just the code. Code:\n\n${code}`;
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.googleKey}`,
                    { contents: [{ parts: [{ text: prompt }] }] }
                );

                let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) return code;

                // Strip markdown if present
                const jsonMatch = text.match(/```[\w]*\n([\s\S]*?)\n```/);
                if (jsonMatch) text = jsonMatch[1];

                log(`Google AI Generated inline comments for ${language} code`);
                return text;
            } catch (err) {
                log(`Google AI Failed to generate inline comments: ${err}`);
                return code;
            }
        }

        try {
            const res = await axios.post(`${this.baseUrl}/generate/comments`, {
                code,
                language
            });

            const commentedCode: string = res.data.commentedCode || code;
            log(`Generated inline comments for ${language} code`);
            return commentedCode;
        } catch (err) {
            log(`Failed to generate inline comments: ${err}`);
            return code; // Return original code on error
        }
    }

    async analyzeMultipleFiles(files: Array<{ path: string; code: string; language: string }>): Promise<import('../../shared/ts-types').AIAnalysis> {
        try {
            const res = await axios.post(`${this.baseUrl}/analyze/multiple`, {
                files
            });

            const analysis: import('../../shared/ts-types').AIAnalysis = res.data.analysis || {
                bottlenecks: [],
                improvements: [],
                inlineComments: [],
                summary: 'No analysis available',
                performanceScore: 0,
                qualityScore: 0
            };

            log(`Multi-file analysis completed: Quality ${analysis.qualityScore}%, Performance ${analysis.performanceScore}%`);
            return analysis;
        } catch (err) {
            log(`Multi-file analysis failed: ${err}`);
            return {
                bottlenecks: [],
                improvements: [],
                inlineComments: [],
                summary: 'Analysis failed',
                performanceScore: 0,
                qualityScore: 0
            };
        }
    }
}

