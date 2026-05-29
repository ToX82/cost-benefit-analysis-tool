/**
 * Manages form input collection for static fields
 */
export class InputManager {
    /**
     * Collects the static form inputs (project name, business model)
     * @returns {Object}
     */
    static collectInputs() {
        const cacRaw = document.getElementById('cac')?.value;
        const cac = cacRaw !== undefined && cacRaw !== '' ? parseFloat(cacRaw) : 0;

        return {
            projectName: document.getElementById('project-name')?.value.trim() || '',
            businessModel: document.getElementById('business-model')?.value || 'saas',
            cac: Number.isFinite(cac) && cac >= 0 ? cac : 0
        };
    }
}
