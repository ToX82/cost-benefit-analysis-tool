import { __ } from '../utils/I18n.js';

/**
 * Handles AI-based analysis of project data.
 * Prepares and processes form data for AI analysis and manages UI state during analysis.
 */
export class AIAnalyzer {
    /**
     * Creates an instance of AIAnalyzer
     * @param {Object} analyzer - The main analyzer instance
     */
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.button = document.getElementById('ai-analysis-btn');
        this.spinner = document.getElementById('ai-spinner');
        this.isAnalyzing = false;

        this.initializeEventListeners();
    }

    /**
     * Sets up event listeners for the AI analysis button
     */
    initializeEventListeners() {
        this.button.addEventListener('click', () => this.requestAnalysis());
    }

    /**
     * Handles the AI analysis request
     * Opens Perplexity AI in a new tab with the analysis query
     */
    async requestAnalysis() {
        if (this.isAnalyzing) return;

        try {
            this.isAnalyzing = true;
            this.updateUIState(true);

            const data = this.prepareAnalysisData();
            const query = this.buildPerplexityQuery(data);

            window.open(`https://www.perplexity.ai/?q=${encodeURIComponent(query)}`, '_blank');

        } catch (error) {
            console.error('Error during AI analysis:', error);
        } finally {
            this.isAnalyzing = false;
            this.updateUIState(false);
        }
    }

    /**
     * Builds a structured query for Perplexity AI analysis
     * @param {Object} data - The prepared form data
     * @returns {string} The formatted query string
     */
    buildPerplexityQuery(data) {
        let query = __('analyze-software-project') + '\n\n';

        // Business model section
        query += `${__('business-model')}: ${data.costs.businessModel.value}\n\n`;

        // Costs section
        query += __('costs').toUpperCase() + ':\n';
        query += `- ${__('direct-costs')}: €${data.costs.directCosts.value}\n`;
        query += `- ${__('indirect-costs')}: €${data.costs.indirectCosts.value}\n\n`;

        // Revenue section
        query += __('revenues').toUpperCase() + ':\n';
        query += `- ${__('upfront-payment')}: €${data.revenues.upfrontPayment.value}\n`;
        query += `- ${__('final-payment')}: €${data.revenues.finalPayment.value}\n`;
        query += `- ${__('recurring-revenue')}: €${data.revenues.recurringRevenue.value}\n\n`;

        // Development section
        query += __('development').toUpperCase() + ':\n';
        query += `- ${__('dev-weeks')}: ${data.resources.devWeeks.value}\n`;
        query += `- ${__('dev-occupation')}: ${data.resources.devOccupation.value}%\n\n`;

        // Users section
        query += __('users').toUpperCase() + ':\n';
        query += `- ${__('expected-users')}: ${data.users.expectedUsers.value} ${__('users').toLowerCase()}\n`;
        query += `- ${__('optimistic-scenario')}: ${data.users.optimisticUsers.value} ${__('users').toLowerCase()}\n`;
        query += `- ${__('pessimistic-scenario')}: ${data.users.pessimisticUsers.value} ${__('users').toLowerCase()}\n\n`;

        // Analysis requests
        query += __('provide-detailed-analysis') + ':\n';
        query += `1. ${__('economic-sustainability')}\n`;
        query += `2. ${__('roi-analysis')}\n`;
        query += `3. ${__('breakeven-estimate')}\n`;
        query += `4. ${__('risks-and-mitigations')}\n`;
        query += `5. ${__('cost-benefit-recommendations')}`;

        return query;
    }

    /**
     * Prepares form data for AI analysis by grouping fields by category
     * @returns {Object} Structured data object with categorized form fields
     */
    prepareAnalysisData() {
        const form = document.getElementById('analysis-form');
        const data = {};

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

    /**
     * Updates UI elements to reflect the current analysis state
     * @param {boolean} isLoading - Whether the analysis is currently running
     */
    updateUIState(isLoading) {
        this.button.disabled = isLoading;
        this.spinner.classList.toggle('hidden', !isLoading);
    }
}