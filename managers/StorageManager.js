import { __ } from '../utils/I18n.js';
import { CostItemsManager } from './CostItemsManager.js';
import { RevenueItemsManager } from './RevenueItemsManager.js';

/**
 * Manages data persistence using localStorage
 */
export class StorageManager {
    static #STORAGE_PREFIX = 'cost_benefit_';
    static #COST_ITEMS_KEY = 'cost_items';
    static #ONETIME_REVENUES_KEY = 'onetime_revenues';
    static #RECURRING_TIERS_KEY = 'recurring_tiers';

    /**
     * Saves form data to localStorage
     */
    static saveToStorage() {
        try {
            // Save static inputs (project name, business model, CAC, …)
            document.querySelectorAll('input[id], select[id]').forEach(input => {
                const value = input.value.trim();
                if (value) {
                    localStorage.setItem(this.#STORAGE_PREFIX + input.id, value);
                }
            });

            // Save cost items
            const costItems = CostItemsManager.getCostItems();
            if (costItems.length > 0) {
                localStorage.setItem(this.#STORAGE_PREFIX + this.#COST_ITEMS_KEY, JSON.stringify(costItems));
            } else {
                localStorage.removeItem(this.#STORAGE_PREFIX + this.#COST_ITEMS_KEY);
            }

            // Save one-time revenues
            const onetimeItems = RevenueItemsManager.getOnetimeItems();
            if (onetimeItems.length > 0) {
                localStorage.setItem(this.#STORAGE_PREFIX + this.#ONETIME_REVENUES_KEY, JSON.stringify(onetimeItems));
            } else {
                localStorage.removeItem(this.#STORAGE_PREFIX + this.#ONETIME_REVENUES_KEY);
            }

            // Save recurring tiers
            const recurringTiers = RevenueItemsManager.getRecurringTiers();
            if (recurringTiers.length > 0) {
                localStorage.setItem(this.#STORAGE_PREFIX + this.#RECURRING_TIERS_KEY, JSON.stringify(recurringTiers));
            } else {
                localStorage.removeItem(this.#STORAGE_PREFIX + this.#RECURRING_TIERS_KEY);
            }
        } catch (e) {
            console.error(__('storage-save-error'), e);
            throw new Error('Failed to save data to storage');
        }
    }

    /**
     * Loads saved form data from localStorage
     */
    static loadFromStorage() {
        // Load static inputs
        document.querySelectorAll('input[id], select[id]').forEach(input => {
            try {
                const savedValue = localStorage.getItem(this.#STORAGE_PREFIX + input.id);
                if (savedValue !== null) {
                    if (input.type === 'number') {
                        const numValue = parseFloat(savedValue);
                        if (!isNaN(numValue)) input.value = numValue;
                    } else {
                        input.value = savedValue;
                    }
                }
            } catch (e) {
                console.error(__('storage-load-error', input.id), e);
            }
        });

        // Load cost items
        try {
            const saved = localStorage.getItem(this.#STORAGE_PREFIX + this.#COST_ITEMS_KEY);
            if (saved) CostItemsManager.loadCostItems(JSON.parse(saved));
        } catch (e) {
            console.error(__('storage-load-error', 'cost-items'), e);
        }

        // Load one-time revenues
        try {
            const saved = localStorage.getItem(this.#STORAGE_PREFIX + this.#ONETIME_REVENUES_KEY);
            if (saved) RevenueItemsManager.loadOnetimeItems(JSON.parse(saved));
        } catch (e) {
            console.error(__('storage-load-error', 'onetime-revenues'), e);
        }

        // Load recurring tiers
        try {
            const saved = localStorage.getItem(this.#STORAGE_PREFIX + this.#RECURRING_TIERS_KEY);
            if (saved) RevenueItemsManager.loadRecurringTiers(JSON.parse(saved));
        } catch (e) {
            console.error(__('storage-load-error', 'recurring-tiers'), e);
        }
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
