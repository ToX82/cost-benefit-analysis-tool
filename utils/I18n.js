/**
 * Classe per la gestione delle traduzioni
 */
class I18n {
    constructor() {
        this.translations = {};
        //this.currentLang = navigator.language.split('-')[0] || 'it';
        this.currentLang = 'en';
    }

    /**
     * Carica le traduzioni dal file JSON
     */
    async loadTranslations() {
        try {
            const response = await fetch('lang/translations.json');
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    /**
     * Traduce una stringa nella lingua corrente
     * @param {string} key - La chiave da tradurre
     * @returns {string} La stringa tradotta o la chiave originale se non trovata
     */
    translate(key, ...args) {
        if (!this.translations[key]) {
            return key;
        }

        let text = this.translations[key][this.currentLang] || this.translations[key]['it'] || key;

        // Sostituisce i placeholder {0}, {1}, ecc. con i valori forniti
        args.forEach((arg, i) => {
            text = text.replace(`{${i}}`, arg);
        });

        return text;
    }
}

// Esporta sia la classe che un'istanza singleton
export const i18n = new I18n();
export const __ = (key, ...args) => i18n.translate(key, ...args);
