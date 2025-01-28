import { DifyApiService, StateManager } from '../services';
import { showWebView } from '../ui';

export function createAskQuestionCommand(difyApiService: DifyApiService, stateManager: StateManager) {
    return async () => {
        // Show the WebView for user input
        showWebView(stateManager);

        // Handle the user query (this will be triggered via WebView message)
    };
}