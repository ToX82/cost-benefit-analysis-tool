/**
 * Handles internationalization and translations for the application.
 * Provides methods to load and manage translations from a JSON file.
 * Supports fallback to English if a translation is not available in the current language.
 */
class I18n {
    /**
     * Creates a new I18n instance.
     * Initializes translations as an empty object and sets the current language
     * based on the browser's language settings, defaulting to English.
     */
    constructor() {
        this.translations = {};
        this.currentLang = navigator.language.split('-')[0] || 'en';
    }

    /**
     * Loads translations from the JSON file at 'lang/translations.json'.
     * @throws {Error} If translations cannot be loaded due to network issues or invalid JSON.
     * @returns {Promise<void>}
     */
    async loadTranslations() {
        try {
            const response = await fetch('lang/translations.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
            throw new Error('Failed to load translations');
        }
    }

    /**
     * Translates a key to the current language with optional placeholder replacements.
     * Falls back to English if the translation is not available in the current language.
     * @param {string} key - The translation key to look up
     * @param {...any} args - Arguments to replace placeholders in the format {0}, {1}, etc.
     * @returns {string} The translated string or the original key if no translation is found
     */
    translate(key, ...args) {
        const translation = this.translations[key];
        if (!translation) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        let text = translation[this.currentLang] || translation['en'] || key;

        args.forEach((arg, i) => {
            text = text.replace(`{${i}}`, arg);
        });

        return text;
    }
}

export const i18n = new I18n();
export const __ = (key, ...args) => i18n.translate(key, ...args);
