import { __ } from '../utils/I18n.js';

export class AIAnalyzer {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.button = document.getElementById('ai-analysis-btn');
        this.spinner = document.getElementById('ai-spinner');
        this.isAnalyzing = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.button.addEventListener('click', () => this.requestAnalysis());
    }

    async requestAnalysis() {
        if (this.isAnalyzing) return;

        try {
            this.isAnalyzing = true;
            this.updateUIState(true);

            const data = this.prepareAnalysisData();
            const query = this.buildPerplexityQuery(data);

            // Apri una nuova finestra con la richiesta GET a Perplexity
            window.open(`https://www.perplexity.ai/?q=${encodeURIComponent(query)}`, '_blank');

        } catch (error) {
            console.error('Errore durante l\'analisi AI:', error);
        } finally {
            this.isAnalyzing = false;
            this.updateUIState(false);
        }
    }

    buildPerplexityQuery(data) {
        // Costruisci una query strutturata per l'analisi
        let query = __('analyze-software-project') + '\n\n';

        // Aggiungi informazioni sul modello di business
        query += `${__('business-model')}: ${data.costs.businessModel.value}\n\n`;

        // Aggiungi informazioni sui costi
        query += __('costs').toUpperCase() + ':\n';
        query += `- ${__('direct-costs')}: €${data.costs.directCosts.value}\n`;
        query += `- ${__('indirect-costs')}: €${data.costs.indirectCosts.value}\n\n`;

        // Aggiungi informazioni sui ricavi
        query += __('revenues').toUpperCase() + ':\n';
        query += `- ${__('upfront-payment')}: €${data.revenues.upfrontPayment.value}\n`;
        query += `- ${__('final-payment')}: €${data.revenues.finalPayment.value}\n`;
        query += `- ${__('recurring-revenue')}: €${data.revenues.recurringRevenue.value}\n\n`;

        // Aggiungi informazioni sullo sviluppo
        query += __('development').toUpperCase() + ':\n';
        query += `- ${__('dev-weeks')}: ${data.resources.devWeeks.value}\n`;
        query += `- ${__('dev-occupation')}: ${data.resources.devOccupation.value}%\n\n`;

        // Aggiungi informazioni sugli utenti
        query += __('users').toUpperCase() + ':\n';
        query += `- ${__('expected-users')}: ${data.users.expectedUsers.value}\n`;
        query += `- ${__('optimistic-scenario')}: ${Math.round(data.users.expectedUsers.value * data.users.optimisticMultiplier.value)} ${__('users').toLowerCase()}\n`;
        query += `- ${__('pessimistic-scenario')}: ${Math.round(data.users.expectedUsers.value * data.users.pessimisticMultiplier.value)} ${__('users').toLowerCase()}\n\n`;

        query += __('provide-detailed-analysis') + ':\n';
        query += `1. ${__('economic-sustainability')}\n`;
        query += `2. ${__('roi-analysis')}\n`;
        query += `3. ${__('breakeven-estimate')}\n`;
        query += `4. ${__('risks-and-mitigations')}\n`;
        query += `5. ${__('cost-benefit-recommendations')}`;

        return query;
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

    updateUIState(isLoading) {
        this.button.disabled = isLoading;
        this.spinner.classList.toggle('hidden', !isLoading);
    }
}