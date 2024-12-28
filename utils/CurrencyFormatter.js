import { __ } from './I18n.js';

/**
 * Handles currency formatting throughout the application
 */
export class CurrencyFormatter {
    static #formatter = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    /**
     * Formats a number as currency
     * @param {number} value - The value to format
     * @returns {string} The formatted currency string
     */
    static format(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            console.error(__('currency-format-error'), `Invalid value: ${value}`);
            return '€0.00';
        }

        try {
            return this.#formatter.format(value);
        } catch (e) {
            console.error(__('currency-format-error'), e);
            return `€${value.toFixed(2)}`;
        }
    }
}