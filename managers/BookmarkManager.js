import { InputManager } from './InputManager.js';
import { CostItemsManager } from './CostItemsManager.js';
import { RevenueItemsManager } from './RevenueItemsManager.js';
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

        Object.entries(inputs).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, value.toString());
            }
        });

        const costItems = CostItemsManager.getCostItems();
        if (costItems.length > 0) params.set('costItems', JSON.stringify(costItems));

        const onetimeItems = RevenueItemsManager.getOnetimeItems();
        if (onetimeItems.length > 0) params.set('onetimeRevenues', JSON.stringify(onetimeItems));

        const recurringTiers = RevenueItemsManager.getRecurringTiers();
        if (recurringTiers.length > 0) params.set('recurringTiers', JSON.stringify(recurringTiers));

        const url = new URL(window.location.href);
        url.search = params.toString();

        const urlStr = url.toString();
        const shareButton = document.getElementById('share-button');
        if (shareButton) shareButton.href = urlStr;
        const bookmarkButton = document.getElementById('bookmark-button');
        if (bookmarkButton) {
            bookmarkButton.href = urlStr;
            const label = bookmarkButton.querySelector('span[data-i18n]');
            if (label && inputs.projectName) label.textContent = inputs.projectName;
        }

        return urlStr;
    }

    /**
     * Restores form values from URL parameters
     */
    static restoreFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (!params.toString()) return;

        // Restore static inputs
        document.querySelectorAll('input[id], select[id]').forEach(input => {
            const paramName = this.#toParamName(input.id);
            if (!params.has(paramName)) return;
            const value = params.get(paramName);
            if (input.type === 'number') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) input.value = numValue;
            } else {
                input.value = value;
            }
            input.dispatchEvent(new Event('change'));
        });

        // Restore cost items
        const costItemsParam = params.get('costItems');
        if (costItemsParam) {
            try { CostItemsManager.loadCostItems(JSON.parse(costItemsParam)); } catch (e) {
                console.error(__('bookmark-restore-error'), e);
            }
        }

        // Restore one-time revenues
        const onetimeParam = params.get('onetimeRevenues');
        if (onetimeParam) {
            try { RevenueItemsManager.loadOnetimeItems(JSON.parse(onetimeParam)); } catch (e) {
                console.error(__('bookmark-restore-error'), e);
            }
        }

        // Restore recurring tiers
        const tiersParam = params.get('recurringTiers');
        if (tiersParam) {
            try { RevenueItemsManager.loadRecurringTiers(JSON.parse(tiersParam)); } catch (e) {
                console.error(__('bookmark-restore-error'), e);
            }
        }
    }

    /**
     * Updates the browser address bar URL with current form state via history.pushState,
     * so the user can bookmark it with Ctrl+D / Cmd+D.
     * @returns {string} The generated URL
     */
    static updateBrowserUrl() {
        const url = this.generateBookmarkUrl();
        history.pushState(null, '', url);
        return url;
    }

    /**
     * Copies bookmark URL to clipboard
     * @returns {Promise<boolean>}
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
     * Converts kebab-case element ID to camelCase parameter name
     * @private
     */
    static #toParamName(id) {
        return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    }
}
