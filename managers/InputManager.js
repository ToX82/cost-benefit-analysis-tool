import { CONFIG } from '../config.js';

export class InputManager {
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