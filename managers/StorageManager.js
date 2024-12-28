export class StorageManager {
    static saveToStorage() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            try {
                localStorage.setItem(input.id, input.value);
            } catch (e) {
                console.error(`Errore nel salvataggio di ${input.id}:`, e);
            }
        });
    }

    static loadFromStorage() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            try {
                const savedValue = localStorage.getItem(input.id);
                if (savedValue !== null) {
                    input.value = savedValue;
                }
            } catch (e) {
                console.error(`Errore nel caricamento di ${input.id}:`, e);
            }
        });
    }
}