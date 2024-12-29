import { CostBenefitAnalyzer } from './analyzers/CostBenefitAnalyzer.js';
import { AIAnalyzer } from './analyzers/AIAnalyzer.js';
import { __, i18n } from './utils/I18n.js';
import { BookmarkManager } from './managers/BookmarkManager.js';
import { UIManager } from './managers/UIManager.js';

/**
 * Translates all UI elements using data attributes
 * - Elements with data-i18n: translates text content
 * - Elements with data-i18n-placeholder: translates placeholder text
 * - Elements with data-i18n-title: translates title attribute
 * Also updates page title
 */
function translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = __(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = __(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = __(key);
    });

    document.title = __('tool-title');
}

/**
 * Initializes the application:
 * 1. Loads translations
 * 2. Translates UI
 * 3. Initializes analyzers
 * 4. Restores state from URL parameters
 * 5. Sets up share button functionality
 */
async function init() {
    try {
        await i18n.loadTranslations();
        translateUI();

        const analyzer = new CostBenefitAnalyzer();
        new AIAnalyzer(analyzer);

        BookmarkManager.restoreFromUrl();

        document.getElementById('share-button').addEventListener('click', async (e) => {
            e.preventDefault();
            const success = await BookmarkManager.copyBookmarkUrl();
            UIManager.displayTemporaryMessage(
                success ? __('bookmark-copied') : __('bookmark-copy-error'),
                success ? 'success' : 'error'
            );
        });
    } catch (error) {
        console.error('Error during I18n initialization:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);