import { __ } from '../utils/I18n.js';

/**
 * Manages data persistence using localStorage
 */
export class StorageManager {
    static #STORAGE_PREFIX = 'cost_benefit_';

    /**
     * Saves form data to localStorage
     * @throws {Error} If storage quota is exceeded
     */
    static saveToStorage() {
        const inputs = document.querySelectorAll('input, select');

        try {
            inputs.forEach(input => {
                if (!input.id) {
                    console.warn('Input element without ID found:', input);
                    return;
                }

                const key = this.#STORAGE_PREFIX + input.id;
                const value = input.value.trim();

                if (value) {
                    localStorage.setItem(key, value);
                }
            });
        } catch (e) {
            console.error(__('storage-save-error'), e);
            throw new Error('Failed to save data to storage');
        }
    }

    /**
     * Loads saved form data from localStorage
     */
    static loadFromStorage() {
        const inputs = document.querySelectorAll('input, select');

        inputs.forEach(input => {
            if (!input.id) {
                console.warn('Input element without ID found:', input);
                return;
            }

            try {
                const key = this.#STORAGE_PREFIX + input.id;
                const savedValue = localStorage.getItem(key);

                if (savedValue !== null) {
                    if (input.type === 'number') {
                        const numValue = parseFloat(savedValue);
                        if (!isNaN(numValue)) {
                            input.value = numValue;
                        }
                    } else {
                        input.value = savedValue;
                    }
                }
            } catch (e) {
                console.error(__('storage-load-error', input.id), e);
            }
        });
    }

    /**
     * Clears all saved data from localStorage
     */
    static clearStorage() {
        try {
            Object.keys(localStorage)
                .filter(key => key.startsWith(this.#STORAGE_PREFIX))
                .forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.error(__('storage-clear-error'), e);
        }
    }
}