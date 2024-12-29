import { InputManager } from './InputManager.js';
import { __ } from '../utils/I18n.js';

/**
 * Manages creation and restoration of bookmarks through URL parameters
 */
export class BookmarkManager {
    /**
     * Generates a URL with current form parameters
     * @returns {string} Complete URL with parameters
     */
    static generateBookmarkUrl() {
        const inputs = InputManager.collectInputs();
        const params = new URLSearchParams();

        // Aggiungi tutti i parametri all'URL
        Object.entries(inputs).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, value.toString());
            }
        });

        // Crea l'URL completo
        const url = new URL(window.location.href);
        url.search = params.toString();

        // Aggiorna l'href del link di condivisione
        const shareButton = document.getElementById('share-button');
        if (shareButton) {
            shareButton.href = url.toString();
        }

        return url.toString();
    }

    /**
     * Restores form values from URL parameters
     */
    static restoreFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const inputs = document.querySelectorAll('input, select');

        inputs.forEach(input => {
            const paramName = this.#getParamNameFromId(input.id);
            if (params.has(paramName)) {
                const value = params.get(paramName);

                if (input.type === 'number') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        input.value = numValue;
                    }
                } else {
                    input.value = value;
                }

                // Trigger change event per aggiornare i calcoli
                input.dispatchEvent(new Event('change'));
            }
        });
    }

    /**
     * Copies bookmark URL to clipboard
     * @returns {Promise<boolean>} true if operation succeeded, false otherwise
     */
    static async copyBookmarkUrl() {
        try {
            const url = this.generateBookmarkUrl();
            await navigator.clipboard.writeText(url);
            return true;
        } catch (e) {
            console.error(__('bookmark-copy-error'), e);
            return false;
        }
    }

    /**
     * Converts element ID to corresponding parameter name
     * @private
     * @param {string} id - Form element ID
     * @returns {string} Parameter name for URL
     */
    static #getParamNameFromId(id) {
        // Converte da kebab-case a camelCase
        return id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
}