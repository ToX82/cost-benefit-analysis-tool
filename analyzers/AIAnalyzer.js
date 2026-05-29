import { __ } from '../utils/I18n.js';
import { InputManager } from '../managers/InputManager.js';
import { CostItemsManager } from '../managers/CostItemsManager.js';
import { RevenueItemsManager } from '../managers/RevenueItemsManager.js';
import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';

/**
 * Handles AI-based analysis via Perplexity AI
 */
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
            const query = this.buildQuery();
            window.open(`https://www.perplexity.ai/?q=${encodeURIComponent(query)}`, '_blank');
        } catch (error) {
            console.error('Error during AI analysis:', error);
        } finally {
            this.isAnalyzing = false;
            this.updateUIState(false);
        }
    }

    buildQuery() {
        const inputs        = InputManager.collectInputs();
        const costItems     = CostItemsManager.getCostItems();
        const onetimeItems  = RevenueItemsManager.getOnetimeItems();
        const recurringTiers = RevenueItemsManager.getRecurringTiers();
        const fmt = v => CurrencyFormatter.format(v);

        let q = __('analyze-software-project') + '\n\n';
        if (inputs.projectName) q += `Progetto: ${inputs.projectName}\n`;
        q += `${__('business-model')}: ${inputs.businessModel}\n\n`;

        // Costs
        q += __('costs').toUpperCase() + ':\n';
        if (costItems.length > 0) {
            const elabBase = RevenueItemsManager.getTotalElaborations('base');
            costItems.forEach(item => {
                if (item.frequency === 'per-elab') {
                    q += `- [${__(`category-${item.category}`)}] ${item.label || '-'}: ${fmt(item.costPerElab)}/elab`;
                    if (elabBase > 0) q += ` × ${elabBase} elab/mese = ${fmt(item.costPerElab * elabBase * 12)}/anno`;
                    q += ` (${__('freq-per-elab')})\n`;
                } else {
                    const ann = CostItemsManager.annualizedAmount(item);
                    q += `- [${__(`category-${item.category}`)}] ${item.label || '-'}: ${fmt(ann)} `;
                    q += `(${__(`freq-${item.frequency}`)})\n`;
                }
            });
        }
        q += `${__('total-annualized')}: ${fmt(CostItemsManager.getTotalCosts())}\n\n`;

        // One-time revenues
        if (onetimeItems.length > 0) {
            q += __('onetime-revenues').toUpperCase() + ':\n';
            onetimeItems.forEach(i => q += `- ${i.label || '-'}: ${fmt(i.amount)}\n`);
            q += `Totale: ${fmt(RevenueItemsManager.getTotalOnetimeRevenue())}\n\n`;
        }

        // Recurring tiers
        if (recurringTiers.length > 0) {
            q += __('recurring-revenues').toUpperCase() + ':\n';
            recurringTiers.forEach(t => {
                const typeLabel = t.licenseType === 'onetime' ? __('license-type-onetime') : __('license-type-monthly');
                const unitSuffix = t.licenseType === 'onetime' ? '/licenza' : '/utente/mese';
                q += `- ${t.label || '-'} [${typeLabel}]: ${fmt(t.price)}${unitSuffix}`;
                q += ` × ${t.baseUnits} base (ottimistico: ${t.optimisticUnits}, pessimistico: ${t.pessimisticUnits})\n`;
            });
            q += `${__('revenue-scenario-base')}: ${fmt(RevenueItemsManager.getMonthlyRecurring('base'))}/mese`;
            q += ` (${fmt(RevenueItemsManager.getMonthlyRecurring('base') * 12)}/anno)\n\n`;
        }

        // Analysis requests
        q += __('provide-detailed-analysis') + ':\n';
        q += `1. ${__('economic-sustainability')}\n`;
        q += `2. ${__('roi-analysis')}\n`;
        q += `3. ${__('breakeven-estimate')}\n`;
        q += `4. ${__('risks-and-mitigations')}\n`;
        q += `5. ${__('cost-benefit-recommendations')}`;

        return q;
    }

    updateUIState(isLoading) {
        this.button.disabled = isLoading;
        this.spinner.classList.toggle('hidden', !isLoading);
    }
}
