import { CostBenefitAnalyzer } from './analyzers/CostBenefitAnalyzer.js';
import { AIAnalyzer } from './analyzers/AIAnalyzer.js';
import { __, i18n } from './utils/I18n.js';

// Funzione per tradurre l'interfaccia
function translateUI() {
    // Traduce tutti gli elementi con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = __(key);
    });

    // Traduce i placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = __(key);
    });

    // Aggiorna il titolo della pagina
    document.title = __('tool-title');
}

// Inizializzazione asincrona
async function init() {
    try {
        // Prima carica le traduzioni
        await i18n.loadTranslations();

        // Poi traduci l'interfaccia
        translateUI();

        // Infine inizializza gli analyzer
        const analyzer = new CostBenefitAnalyzer();
        new AIAnalyzer(analyzer);
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
    }
}

// Avvia l'inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', init);