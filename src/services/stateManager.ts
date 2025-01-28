import * as vscode from 'vscode';

export class StateManager {
    private static instance: StateManager;
    private projectStructure: any;
    public context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context: vscode.ExtensionContext): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager(context);
        }
        return StateManager.instance;
    }

    public setProjectStructure(structure: any): void {
        this.projectStructure = structure;
    }

    public getProjectStructure(): any {
        return this.projectStructure;
    }
}