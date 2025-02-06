import * as vscode from 'vscode';
import { DIFY_API_KEY, DIFY_API_URL } from '../config';
import { DifyResponse, ProjectContext } from '../types';

export class DifyApiService {
    private static instance: DifyApiService | null = null;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context: vscode.ExtensionContext): DifyApiService {
        if (!DifyApiService.instance) {
            DifyApiService.instance = new DifyApiService(context);
        }
        return DifyApiService.instance;
    }

    public async getResponse(query: string, projectStructure: ProjectContext): Promise<DifyResponse> {
        try {
            const apiKey = await this.getSecureApiKey();
            
            const response = await fetch(DIFY_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: {
                        project_context: projectStructure.summary
                    },
                    query: query,
                    response_mode: "blocking",
                    conversation_id: "",
                    user: `vscode-${Date.now()}`,
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json() as DifyResponse;
            return data;

        } catch (error) {
            console.error('Dify API error:', error);
            throw error;
        }
    }

    private async getSecureApiKey(): Promise<string> {
        let apiKey = await this.context.secrets.get('difyApiKey');
        
        if (!apiKey) {
            apiKey = DIFY_API_KEY;
            await this.context.secrets.store('difyApiKey', apiKey);
        }
        
        return apiKey;
    }
}
