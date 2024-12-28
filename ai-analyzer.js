
// Gestione Analisi AI
class AIAnalyzer {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.button = document.getElementById('ai-analysis-btn');
        this.spinner = document.getElementById('ai-spinner');
        this.section = document.getElementById('ai-analysis-section');
        this.error = document.getElementById('ai-error');
        this.result = document.getElementById('ai-result');
        this.isAnalyzing = false;
        this.lastAnalyzedData = null;

        // Riferimenti ai campi di configurazione
        this.providerSelect = document.getElementById('ai-provider');
        this.perplexityConfig = document.getElementById('perplexity-config');
        this.openaiConfig = document.getElementById('openai-config');
        this.perplexityKeyInput = document.getElementById('perplexity-key');
        this.perplexityModelSelect = document.getElementById('perplexity-model');
        this.openaiKeyInput = document.getElementById('openai-key');
        this.openaiModelSelect = document.getElementById('openai-model');

        this.initializeEventListeners();
        this.loadAIConfig();
        this.validateAndUpdateButton();
    }

    initializeEventListeners() {
        this.button.addEventListener('click', () => this.requestAnalysis());

        // Aggiorna lo stato del bottone quando cambiano i dati
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => this.validateAndUpdateButton());
        });

        // Gestione cambio provider
        this.providerSelect.addEventListener('change', () => {
            this.updateProviderConfig();
            this.saveAIConfig();
        });

        // Salva la configurazione AI quando cambia
        [this.perplexityKeyInput, this.perplexityModelSelect,
         this.openaiKeyInput, this.openaiModelSelect].forEach(element => {
            element.addEventListener('change', () => this.saveAIConfig());
        });
    }

    updateProviderConfig() {
        const provider = this.providerSelect.value;
        this.perplexityConfig.classList.toggle('hidden', provider !== 'perplexity');
        this.openaiConfig.classList.toggle('hidden', provider !== 'openai');
    }

    loadAIConfig() {
        try {
            const savedProvider = localStorage.getItem('aiProvider');
            const savedPerplexityKey = localStorage.getItem('perplexityApiKey');
            const savedPerplexityModel = localStorage.getItem('perplexityModel');
            const savedOpenaiKey = localStorage.getItem('openaiApiKey');
            const savedOpenaiModel = localStorage.getItem('openaiModel');

            if (savedProvider) {
                this.providerSelect.value = savedProvider;
                this.updateProviderConfig();
            }
            if (savedPerplexityKey) this.perplexityKeyInput.value = savedPerplexityKey;
            if (savedPerplexityModel) this.perplexityModelSelect.value = savedPerplexityModel;
            if (savedOpenaiKey) this.openaiKeyInput.value = savedOpenaiKey;
            if (savedOpenaiModel) this.openaiModelSelect.value = savedOpenaiModel;
        } catch (e) {
            console.error('Errore nel caricamento della configurazione AI:', e);
        }
    }

    saveAIConfig() {
        try {
            localStorage.setItem('aiProvider', this.providerSelect.value);
            localStorage.setItem('perplexityApiKey', this.perplexityKeyInput.value);
            localStorage.setItem('perplexityModel', this.perplexityModelSelect.value);
            localStorage.setItem('openaiApiKey', this.openaiKeyInput.value);
            localStorage.setItem('openaiModel', this.openaiModelSelect.value);
            this.validateAndUpdateButton();
        } catch (e) {
            console.error('Errore nel salvataggio della configurazione AI:', e);
        }
    }

    validateAndUpdateButton() {
        const inputs = InputManager.collectInputs();
        const isValid = this.validateInputs(inputs) && this.validateAIConfig();

        // Disabilita il bottone se i dati non sono validi o se sono gli stessi dell'ultima analisi
        const currentDataString = JSON.stringify(inputs);
        const isSameAsLast = this.lastAnalyzedData === currentDataString;

        this.button.disabled = !isValid || isSameAsLast || this.isAnalyzing;
    }

    validateAIConfig() {
        const provider = this.providerSelect.value;
        if (!provider) return false;

        if (provider === 'perplexity') {
            return this.perplexityKeyInput.value.trim() !== '' &&
                   this.perplexityModelSelect.value !== '';
        } else if (provider === 'openai') {
            return this.openaiKeyInput.value.trim() !== '' &&
                   this.openaiModelSelect.value !== '';
        }

        return false;
    }

    validateInputs(inputs) {
        return (inputs.directCosts > 0 || inputs.indirectCosts > 0) && // almeno un costo
               (inputs.upfrontPayment > 0 || inputs.finalPayment > 0 || inputs.recurringRevenue > 0) && // almeno un ricavo
               inputs.devWeeks >= CONFIG.MIN_DEV_WEEKS && // settimane di sviluppo valide
               inputs.expectedUsers > 0; // utenti previsti
    }

    prepareAnalysisData() {
        const form = document.getElementById('analysis-form');
        const data = {};

        // Raggruppa i campi per categoria
        form.querySelectorAll('[data-category]').forEach(category => {
            const categoryName = category.dataset.category;
            data[categoryName] = {};

            category.querySelectorAll('input, select').forEach(field => {
                const fieldName = field.name.replace(/[^a-zA-Z]/g, '');
                data[categoryName][fieldName] = {
                    value: field.type === 'number' ? parseFloat(field.value) || 0 : field.value,
                    description: field.previousElementSibling?.firstChild?.textContent || field.name
                };
            });
        });

        return data;
    }

    async requestAnalysis() {
        try {
            this.isAnalyzing = true;
            this.updateUIState(true);

            const data = this.prepareAnalysisData();
            this.lastAnalyzedData = JSON.stringify(InputManager.collectInputs());

            const headers = {
                'Content-Type': 'application/json'
            };

            // Aggiungi gli headers specifici del provider
            if (this.providerSelect.value === 'perplexity') {
                headers['X-Provider'] = 'perplexity';
                headers['X-Perplexity-Key'] = this.perplexityKeyInput.value.trim();
                headers['X-Perplexity-Model'] = this.perplexityModelSelect.value;
            } else {
                headers['X-Provider'] = 'openai';
                headers['X-OpenAI-Key'] = this.openaiKeyInput.value.trim();
                headers['X-OpenAI-Model'] = this.openaiModelSelect.value;
            }

            const response = await fetch('ai.php', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.showResult(result);
        } catch (error) {
            this.showError('Si è verificato un errore durante l\'analisi. Riprova più tardi.');
            console.error('Errore durante l\'analisi AI:', error);
        } finally {
            this.isAnalyzing = false;
            this.updateUIState(false);
        }
    }

    updateUIState(isLoading) {
        this.button.disabled = isLoading;
        this.spinner.classList.toggle('hidden', !isLoading);
        if (!isLoading) {
            this.validateAndUpdateButton();
        }
    }

    showResult(result) {
        this.error.classList.add('hidden');
        this.section.classList.remove('hidden');

        if (result.error) {
            this.showError(result.error);
            return;
        }

        // Configura marked per gestire le classi di Bootstrap
        const renderer = new marked.Renderer();

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
        });

        // Converti il markdown in HTML
        this.result.innerHTML = marked.parse(result.result);

        // Reset lastAnalyzedData per riabilitare il bottone
        this.lastAnalyzedData = null;
        this.validateAndUpdateButton();
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        this.section.classList.remove('hidden');
        this.result.innerHTML = '';
    }
}
