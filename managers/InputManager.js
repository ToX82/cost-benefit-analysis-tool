/**
 * Manages form input collection for static fields
 */
export class InputManager {
    /**
     * Collects the static form inputs (business model, dev timeline, occupation)
     * @returns {Object} Object containing businessModel, devWeeks, devOccupation
     */
    static collectInputs() {
        const getValue = (id, defaultValue = 0) => {
            const value = parseFloat(document.getElementById(id)?.value || defaultValue);
            return isNaN(value) ? defaultValue : value;
        };

        return {
            projectName: document.getElementById('project-name')?.value.trim() || '',
            businessModel: document.getElementById('business-model')?.value || 'saas',
            devWeeks: Math.max(1, getValue('dev-weeks', 4)),
            devOccupation: Math.min(100, Math.max(0, getValue('dev-occupation', 50)))
        };
    }
}
