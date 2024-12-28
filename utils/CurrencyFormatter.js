import { __ } from './I18n.js';

export class CurrencyFormatter {
    static format(value) {
        try {
            return new Intl.NumberFormat('it-IT', {
                style: 'currency',
                currency: 'EUR'
            }).format(value);
        } catch (e) {
            console.error(__('currency-format-error'), e);
            return `€${value.toFixed(2)}`;
        }
    }
}