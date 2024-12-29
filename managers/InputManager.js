import { CONFIG } from '../config.js';

/**
 * Manages the collection and validation of user inputs from the analysis form.
 * Provides methods to gather and process form values with appropriate defaults and constraints.
 */
export class InputManager {
    /**
     * Collects and validates all input values from the analysis form.
     * Applies business rules, constraints and default values according to configuration.
     * @returns {Object} An object containing all validated form inputs with the following properties:
     *   - directCosts: {number} Direct costs value, minimum 0
     *   - indirectCosts: {number} Indirect costs value, minimum 0
     *   - upfrontPayment: {number} Initial payment value, minimum 0
     *   - finalPayment: {number} Final payment value, minimum 0
     *   - recurringRevenue: {number} Monthly recurring revenue per user, minimum 0
     *   - devWeeks: {number} Development weeks, minimum from CONFIG.MIN_DEV_WEEKS
     *   - devOccupation: {number} Developer occupation percentage, between 0 and 100
     *   - expectedUsers: {number} Expected number of users, minimum 0
     *   - optimisticMultiplier: {number} Optimistic scenario multiplier, minimum 1
     *   - pessimisticMultiplier: {number} Pessimistic scenario multiplier, between 0 and 1
     *   - businessModel: {string} Selected business model type
     *   - optimisticUsers: {number} Calculated optimistic number of users
     *   - pessimisticUsers: {number} Calculated pessimistic number of users
     */
    static collectInputs() {
        const getValue = (id, defaultValue = 0) =>
            Math.max(0, parseFloat(document.getElementById(id).value) || defaultValue);

        return {
            directCosts: getValue('direct-costs'),
            indirectCosts: getValue('indirect-costs'),
            upfrontPayment: getValue('upfront-payment'),
            finalPayment: getValue('final-payment'),
            recurringRevenue: getValue('recurring-revenue'),
            devWeeks: Math.max(CONFIG.MIN_DEV_WEEKS, getValue('dev-weeks', CONFIG.MIN_DEV_WEEKS)),
            devOccupation: Math.min(100, Math.max(0, getValue('dev-occupation', CONFIG.DEFAULT_OCCUPATION))),
            expectedUsers: getValue('expected-users'),
            optimisticMultiplier: Math.max(1, getValue('optimistic-multiplier', 1.2)),
            pessimisticMultiplier: Math.min(1, Math.max(0, getValue('pessimistic-multiplier', 0.8))),
            businessModel: document.getElementById('business-model').value,
            optimisticUsers: Math.max(1, Math.round(getValue('expected-users') * Math.max(1, getValue('optimistic-multiplier', 1.2)))),
            pessimisticUsers: Math.max(1, Math.round(getValue('expected-users') * Math.min(1, Math.max(0, getValue('pessimistic-multiplier', 0.8)))))
        };
    }
}