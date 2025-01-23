import { ProjectStructure } from '../types';

export class StateManager {
    private static instance: StateManager;
    private projectStructure: ProjectStructure | null = null;
    private listeners: Array<() => void> = [];

    private constructor() {}

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    public setProjectStructure(structure: ProjectStructure) {
        this.projectStructure = structure;
        this.notifyListeners();
    }

    public getProjectStructure(): ProjectStructure | null {
        return this.projectStructure;
    }

    public onProjectStructureChanged(listener: () => void): void {
        this.listeners.push(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }
}