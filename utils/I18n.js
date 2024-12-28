/**
 * Handles internationalization and translations for the application
 */
class I18n {
    constructor() {
        this.translations = {};
        this.currentLang = navigator.language.split('-')[0] || 'en';
    }

    /**
     * Loads translations from the JSON file
     * @throws {Error} If translations cannot be loaded
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
     * Translates a key to the current language
     * @param {string} key - The translation key
     * @param {...any} args - Arguments to replace placeholders
     * @returns {string} The translated string or the original key if not found
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
