import { CONFIG } from '../config.js';

/**
 * Manages form input collection and validation
 */
export class InputManager {
    /**
     * Collects and validates all form inputs
     * @returns {Object} Object containing:
     *   - businessModel: {string} Selected business model
     *   - directCosts: {number} Direct project costs
     *   - indirectCosts: {number} Indirect project costs
     *   - upfrontPayment: {number} Upfront payment amount
     *   - finalPayment: {number} Final payment amount
     *   - recurringRevenue: {number} Monthly recurring revenue per user
     *   - devWeeks: {number} Development duration in weeks
     *   - devOccupation: {number} Team occupation percentage
     *   - expectedUsers: {number} Expected number of users
     *   - optimisticUsers: {number} Optimistic estimate of users
     *   - pessimisticUsers: {number} Pessimistic estimate of users
     */
    static collectInputs() {
        const getValue = (id, defaultValue = 0) => {
            const value = parseFloat(document.getElementById(id)?.value || defaultValue);
            return isNaN(value) ? defaultValue : value;
        };

        return {
            businessModel: document.getElementById('business-model')?.value || 'saas',
            directCosts: getValue('direct-costs'),
            indirectCosts: getValue('indirect-costs'),
            upfrontPayment: getValue('upfront-payment'),
            finalPayment: getValue('final-payment'),
            recurringRevenue: getValue('recurring-revenue'),
            devWeeks: Math.max(1, getValue('dev-weeks', 4)),
            devOccupation: Math.min(100, Math.max(0, getValue('dev-occupation', 50))),
            expectedUsers: Math.max(0, getValue('expected-users', 100)),
            optimisticUsers: Math.max(0, getValue('optimistic-users', 120)),
            pessimisticUsers: Math.max(0, getValue('pessimistic-users', 80))
        };
    }
}