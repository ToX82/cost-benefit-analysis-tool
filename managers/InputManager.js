/**
 * Manages form input collection for static fields
 */
export class InputManager {
    /**
     * Collects the static form inputs (project name, business model)
     * @returns {Object}
     */
    static collectInputs() {
        return {
            projectName: document.getElementById('project-name')?.value.trim() || '',
            businessModel: document.getElementById('business-model')?.value || 'saas'
        };
    }
}
