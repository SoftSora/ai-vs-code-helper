import * as vscode from 'vscode';
import { ProjectContext } from '../types';

export class ExtensionState {
    constructor(private context: vscode.ExtensionContext) {}

    public setProjectStructure(projectContext: ProjectContext): void {
        this.context.workspaceState.update('projectStructure', projectContext);
    }

    public getProjectStructure(): ProjectContext | undefined {
        return this.context.workspaceState.get('projectStructure');
    }
}
