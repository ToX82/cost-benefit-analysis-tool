import { __ } from '../utils/I18n.js';

export class StorageManager {
    static saveToStorage() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            try {
                localStorage.setItem(input.id, input.value);
            } catch (e) {
                console.error(__('storage-save-error', input.id), e);
            }
        });
    }

    static loadFromStorage() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            try {
                const savedValue = localStorage.getItem(input.id);
                if (savedValue !== null) {
                    input.value = savedValue;
                }
            } catch (e) {
                console.error(__('storage-load-error', input.id), e);
            }
        });
    }
}