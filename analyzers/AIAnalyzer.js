export class AIAnalyzer {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.button = document.getElementById('ai-analysis-btn');
        this.spinner = document.getElementById('ai-spinner');
        this.section = document.getElementById('ai-analysis-section');
        this.error = document.getElementById('ai-error');
        this.result = document.getElementById('ai-result');
        this.isAnalyzing = false;
        this.lastAnalyzedData = null;

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

        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => this.validateAndUpdateButton());
        });

        this.providerSelect.addEventListener('change', () => {
            this.updateProviderConfig();
            this.saveAIConfig();
        });

        [this.perplexityKeyInput, this.perplexityModelSelect,
         this.openaiKeyInput, this.openaiModelSelect].forEach(element => {
            element.addEventListener('change', () => this.saveAIConfig());
        });
    }

    loadAIConfig() {
        try {
            const config = JSON.parse(localStorage.getItem('aiConfig') || '{}');

            if (config.provider) {
                this.providerSelect.value = config.provider;
                this.updateProviderConfig();
            }

            if (config.perplexityKey) {
                this.perplexityKeyInput.value = config.perplexityKey;
            }

            if (config.perplexityModel) {
                this.perplexityModelSelect.value = config.perplexityModel;
            }

            if (config.openaiKey) {
                this.openaiKeyInput.value = config.openaiKey;
            }

            if (config.openaiModel) {
                this.openaiModelSelect.value = config.openaiModel;
            }

        } catch (e) {
            console.error('Errore nel caricamento della configurazione AI:', e);
        }
    }

    saveAIConfig() {
        try {
            const config = {
                provider: this.providerSelect.value,
                perplexityKey: this.perplexityKeyInput.value,
                perplexityModel: this.perplexityModelSelect.value,
                openaiKey: this.openaiKeyInput.value,
                openaiModel: this.openaiModelSelect.value
            };

            localStorage.setItem('aiConfig', JSON.stringify(config));
            this.validateAndUpdateButton();
        } catch (e) {
            console.error('Errore nel salvataggio della configurazione AI:', e);
        }
    }

    updateProviderConfig() {
        const provider = this.providerSelect.value;
        this.perplexityConfig.classList.toggle('hidden', provider !== 'perplexity');
        this.openaiConfig.classList.toggle('hidden', provider !== 'openai');
        this.validateAndUpdateButton();
    }

    validateAndUpdateButton() {
        const provider = this.providerSelect.value;
        let isValid = false;

        if (provider === 'perplexity') {
            isValid = this.perplexityKeyInput.value && this.perplexityModelSelect.value;
        } else if (provider === 'openai') {
            isValid = this.openaiKeyInput.value && this.openaiModelSelect.value;
        }

        this.button.disabled = !isValid || this.isAnalyzing;
    }

    async requestAnalysis() {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.updateUIState(true);

        try {
            const provider = this.providerSelect.value;
            const config = this.getProviderConfig(provider);
            const data = this.prepareAnalysisData();

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider,
                    config,
                    data
                })
            });

            const result = await response.json();
            this.showResult(result);
        } catch (e) {
            this.showError('Si è verificato un errore durante l\'analisi. Riprova più tardi.');
            console.error('Errore nell\'analisi AI:', e);
        } finally {
            this.isAnalyzing = false;
            this.updateUIState(false);
        }
    }

    getProviderConfig(provider) {
        if (provider === 'perplexity') {
            return {
                apiKey: this.perplexityKeyInput.value,
                model: this.perplexityModelSelect.value
            };
        } else if (provider === 'openai') {
            return {
                apiKey: this.openaiKeyInput.value,
                model: this.openaiModelSelect.value
            };
        }
        return null;
    }

    prepareAnalysisData() {
        // Raccogli tutti i dati necessari per l'analisi
        const inputs = document.querySelectorAll('input, select');
        const data = {};

        inputs.forEach(input => {
            if (input.type === 'password') return; // Salta i campi password
            data[input.id] = input.value;
        });

        return data;
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

        const renderer = new marked.Renderer();

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
        });

        this.result.innerHTML = marked.parse(result.result);

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