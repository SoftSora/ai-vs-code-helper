import * as vscode from 'vscode';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils';
import { DIFYResponse, ProjectStructure } from '../types';
import { DIFY_API_KEY, DIFY_API_URL } from '../config/config.secure';

export class DifyApiService {
    private static instance: DifyApiService;
    private apiKey: string = '';
    private readonly apiUrl: string = DIFY_API_URL;
    private static secretStorage: vscode.SecretStorage;

    private constructor() { }

    public static async initialize(context: vscode.ExtensionContext): Promise<void> {
        DifyApiService.secretStorage = context.secrets;
        const storedKey = await context.secrets.get('difyApiKey');
        if (!storedKey) {
            await context.secrets.store('difyApiKey', DIFY_API_KEY);
        }
    }

    public static getInstance(): DifyApiService {
        if (!DifyApiService.instance) {
            DifyApiService.instance = new DifyApiService();
        }
        return DifyApiService.instance;
    }

    private async getApiKey(): Promise<string> {
        if (!this.apiKey) {
            this.apiKey = (await DifyApiService.secretStorage.get('difyApiKey')) || '';
            if (!this.apiKey) {
                throw new Error('Dify.ai API key not available');
            }
        }
        return this.apiKey;
    }

    public async query(
        query: string,
        projectContext?: ProjectStructure
    ): Promise<DIFYResponse> {
        try {
            const apiKey = await this.getApiKey();

            const payload = {
                inputs: {
                    project_context: projectContext ? JSON.stringify(projectContext) : '',
                },
                query: query,
                response_mode: 'blocking',
                conversation_id: uuidv4(),
                user: `vscode-${uuidv4()}`,
            };

            const response = await axios.post<DIFYResponse>(this.apiUrl, payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            Logger.error('Dify.ai API Error:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    await DifyApiService.secretStorage.delete('difyApiKey');
                    this.apiKey = '';
                    throw new Error('Invalid Dify.ai API key configuration');
                }
                throw new Error(`Dify.ai API Error: ${error.response?.data?.message || error.message}`);
            }
            throw new Error(`Dify.ai API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}