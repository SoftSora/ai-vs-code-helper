import { ProjectStructure } from '../types';

export class StateManager {
    private static instance: StateManager;
    private projectStructure: ProjectStructure | null = null;

    private constructor() {}

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    public setProjectStructure(structure: ProjectStructure) {
        this.projectStructure = structure;
    }

    public getProjectStructure(): ProjectStructure | null {
        return this.projectStructure;
    }
}