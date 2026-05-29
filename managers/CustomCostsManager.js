import { __ } from '../utils/I18n.js';

/**
 * Manages custom costs functionality
 */
export class CustomCostsManager {
    static #customCosts = [];
    static #counter = 0;

    /**
     * Initializes custom costs manager
     */
    static initialize() {
        const addButton = document.getElementById('add-cost-btn');
        if (addButton) {
            addButton.addEventListener('click', () => this.addCustomCost());
        }
    }

    /**
     * Creates a new custom cost element
     * @returns {HTMLElement} The custom cost container element
     */
    static createCustomCostElement(id, label = '', amount = '') {
        const container = document.createElement('div');
        container.className = 'flex items-center gap-2';
        container.dataset.costId = id;

        container.innerHTML = `
            <div class="flex-1 flex items-center gap-2">
                <input type="text"
                       class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                       placeholder="${__('cost-label')}"
                       value="${label}"
                       data-cost-label>
                <div class="relative w-32">
                    <span class="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500">€</span>
                    <input type="number"
                           class="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                           placeholder="${__('cost-amount')}"
                           value="${amount}"
                           data-cost-amount>
                </div>
            </div>
            <button type="button"
                    class="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="${__('remove-cost')}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>`;

        // Add event listeners
        container.querySelector('button').addEventListener('click', () => this.removeCustomCost(id));
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => this.updateCustomCost(id));
        });

        return container;
    }

    /**
     * Adds a new custom cost
     */
    static addCustomCost(label = '', amount = '') {
        const id = `custom-cost-${++this.#counter}`;
        const costElement = this.createCustomCostElement(id, label, amount);

        document.getElementById('custom-costs-container').appendChild(costElement);

        this.#customCosts.push({
            id,
            label: label || __('custom-cost'),
            amount: parseFloat(amount) || 0
        });

        this.triggerChange();
    }

    /**
     * Removes a custom cost
     * @param {string} id - The ID of the cost to remove
     */
    static removeCustomCost(id) {
        const element = document.querySelector(`[data-cost-id="${id}"]`);
        if (element) {
            element.remove();
            this.#customCosts = this.#customCosts.filter(cost => cost.id !== id);
            this.triggerChange();
        }
    }

    /**
     * Updates a custom cost
     * @param {string} id - The ID of the cost to update
     */
    static updateCustomCost(id) {
        const element = document.querySelector(`[data-cost-id="${id}"]`);
        if (element) {
            const labelInput = element.querySelector('[data-cost-label]');
            const amountInput = element.querySelector('[data-cost-amount]');

            const costIndex = this.#customCosts.findIndex(cost => cost.id === id);
            if (costIndex !== -1) {
                this.#customCosts[costIndex] = {
                    id,
                    label: labelInput.value || __('custom-cost'),
                    amount: parseFloat(amountInput.value) || 0
                };
                this.triggerChange();
            }
        }
    }

    /**
     * Gets all custom costs
     * @returns {Array} Array of custom costs
     */
    static getCustomCosts() {
        return [...this.#customCosts];
    }

    /**
     * Gets the total amount of all custom costs
     * @returns {number} Total amount
     */
    static getTotalCustomCosts() {
        return this.#customCosts.reduce((total, cost) => total + (cost.amount || 0), 0);
    }

    /**
     * Loads custom costs from storage
     * @param {Array} costs - Array of custom costs to load
     */
    static loadCustomCosts(costs) {
        // Clear existing costs
        document.getElementById('custom-costs-container').innerHTML = '';
        this.#customCosts = [];
        this.#counter = 0;

        // Add loaded costs
        costs.forEach(cost => {
            this.addCustomCost(cost.label, cost.amount);
        });
    }

    /**
     * Triggers a change event on the custom costs container
     */
    static triggerChange() {
        const event = new CustomEvent('customcostschange', {
            detail: {
                costs: this.getCustomCosts(),
                total: this.getTotalCustomCosts()
            }
        });
        document.getElementById('custom-costs-container').dispatchEvent(event);
    }
}