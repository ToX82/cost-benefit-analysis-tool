export class CurrencyFormatter {
    static format(value) {
        try {
            return new Intl.NumberFormat('it-IT', {
                style: 'currency',
                currency: 'EUR'
            }).format(value);
        } catch (e) {
            console.error('Errore nella formattazione della valuta:', e);
            return `€${value.toFixed(2)}`;
        }
    }
}