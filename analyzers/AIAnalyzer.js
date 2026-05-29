import { __ } from '../utils/I18n.js';
import { CostItemsManager } from '../managers/CostItemsManager.js';
import { RevenueItemsManager } from '../managers/RevenueItemsManager.js';
import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';
import { UIManager } from '../managers/UIManager.js';

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
            if (!query) {
                UIManager.displayTemporaryMessage(__('costs-required'), 'error');
                return;
            }

            window.open(`https://www.perplexity.ai/?q=${encodeURIComponent(query)}`, '_blank');
        } catch (error) {
            console.error('Error during AI analysis:', error);
            UIManager.displayTemporaryMessage(__('ai-analysis-error'), 'error');
        } finally {
            this.isAnalyzing = false;
            this.updateUIState(false);
        }
    }

    buildQuery() {
        const snap = this.analyzer.getAnalysisSnapshot();
        if (!snap) return null;

        const lines = [];
        const push = (...parts) => lines.push(parts.join(''));

        push(__('analyze-software-project'), '\n');
        push(`${__('project-name')}: ${this.#text(snap.inputs.projectName)}`);
        push(`${__('business-model')}: ${this.#businessModelLabel(snap.inputs.businessModel)}`);
        push('');

        this.#appendCosts(push, snap);
        this.#appendOnetimeRevenues(push, snap);
        this.#appendRecurringTiers(push, snap);
        this.#appendResults(push, snap);
        this.#appendProjections(push, snap);

        push(__('provide-detailed-analysis'), ':');
        push(`1. ${__('economic-sustainability')}`);
        push(`2. ${__('roi-analysis')}`);
        push(`3. ${__('breakeven-estimate')}`);
        push(`4. ${__('risks-and-mitigations')}`);
        push(`5. ${__('cost-benefit-recommendations')}`);

        const query = lines.join('\n');
        if (/\b(undefined|NaN)\b/.test(query)) {
            console.error('AI query contains invalid values');
            return null;
        }
        return query;
    }

    #appendCosts(push, snap) {
        push(__('costs').toUpperCase(), ':');

        snap.costItems.forEach(item => {
            const label = this.#text(item.label);
            const cat = this.#categoryLabel(item.category);

            if (item.frequency === 'per-elab') {
                const elabMo = this.#num(snap.elaborationCounts.base);
                const unit = this.#num(item.costPerElab);
                const annual = CostItemsManager.getItemScenarioCost(item, 0, elabMo);
                push(`- [${cat}] ${label}: ${this.#fmt(unit)}/elab × ${elabMo} elab/mese = ${this.#fmt(annual)}/anno (${this.#freqLabel(item.frequency)})`);
            } else if (item.frequency === 'scaling') {
                const base = CostItemsManager.getItemScenarioCost(item, snap.userCounts.base, 0);
                const opt  = CostItemsManager.getItemScenarioCost(item, snap.userCounts.optimistic, 0);
                const pes  = CostItemsManager.getItemScenarioCost(item, snap.userCounts.pessimistic, 0);
                push(`- [${cat}] ${label}: ${this.#fmt(this.#num(item.costPerUnit))}/unità × ${this.#num(item.usersPerUnit)} utenti/unità (${this.#freqLabel(item.frequency)})`);
                push(`  B/O/P: ${this.#fmt(base)} / ${this.#fmt(opt)} / ${this.#fmt(pes)} /anno`);
            } else {
                const ann = CostItemsManager.getItemScenarioCost(item);
                push(`- [${cat}] ${label}: ${this.#fmt(ann)}/anno (${this.#freqLabel(item.frequency)})`);
            }
        });

        const { costs } = snap;
        push(`${__('total-annualized')} (${__('revenue-scenario-base')} / ${__('optimistic')} / ${__('pessimistic')}): ${this.#fmt(costs.base)} / ${this.#fmt(costs.optimistic)} / ${this.#fmt(costs.pessimistic)}`);
        if (costs.acquisition?.base > 0) {
            push(`${__('acquisition-costs-y1')}: ${this.#fmt(costs.acquisition.base)} (${__('cac-label')}: ${this.#fmt(snap.inputs.cac)} × ${this.#num(RevenueItemsManager.getMonthlyNewAcquisitions('base'))} ${__('clients-per-month-short')})`);
        }
        push('');
    }

    #appendOnetimeRevenues(push, snap) {
        if (snap.onetimeItems.length === 0) return;

        push(__('onetime-revenues').toUpperCase(), ':');
        snap.onetimeItems.forEach(i => {
            push(`- ${this.#text(i.label)}: ${this.#fmt(i.amount)}`);
        });
        push(`${__('total-onetime')}: ${this.#fmt(snap.revenues.onetime)}`);
        push('');
    }

    #appendRecurringTiers(push, snap) {
        if (snap.recurringTiers.length === 0) return;

        push(__('recurring-revenues').toUpperCase(), ':');
        snap.recurringTiers.forEach(t => {
            const isOnetime = t.licenseType === 'onetime';
            const typeLabel = isOnetime ? __('license-type-onetime') : __('license-type-monthly');
            const priceUnit = isOnetime ? __('per-license') : __('per-user-month');
            const netAnnual = this.#tierNetAnnual(t);

            push(`- ${this.#text(t.label)} [${typeLabel}]: ${this.#fmt(t.price)} ${priceUnit}, ${__('tier-commission-label')} ${this.#fmt(t.commissionPerUnit)}`);
            push(`  ${__('tier-net-label')}: ${this.#fmt(netAnnual)}/anno`);
            push(`  ${__('revenue-scenario-base')}: ${this.#num(t.baseAcqPerMonth)} ${__('clients-per-month-short')}, ${__('optimistic')}: ${this.#num(t.optimisticAcqPerMonth)}, ${__('pessimistic')}: ${this.#num(t.pessimisticAcqPerMonth)}`);

            if (!isOnetime) {
                push(`  ${__('churn-rate-label')}: ${this.#fmtPct(t.churnRate)}/mese, LTV: ${this.#fmt(this.#tierLTV(t))}`);
            }
            push(`  ${__('elab-per-license-label')}: ${this.#num(t.elaborationsPerLicense)} ${__('elab-per-license-unit')}`);
        });

        const mrr = snap.revenues.monthly;
        push(`${__('revenue-scenario-base')} MRR (mese 12): ${this.#fmt(mrr)}/mese (${this.#fmt(mrr * 12)}/anno)`);
        push(`${__('ai-active-users-label')}: ${this.#num(snap.userCounts.base)} (${__('optimistic')}: ${this.#num(snap.userCounts.optimistic)}, ${__('pessimistic')}: ${this.#num(snap.userCounts.pessimistic)})`);
        push('');
    }

    #appendResults(push, snap) {
        const { costs, revenues, roi, breakeven, riskIndex, unitEcon } = snap;

        push(`${__('results-kpi-label').toUpperCase()}:`);
        push(`- ${__('roi-12-months')}: ${this.#fmtRoi(roi.base)}`);
        push(`  ${__('optimistic')}: ${this.#fmtRoi(roi.optimistic)}`);
        push(`  ${__('pessimistic')}: ${this.#fmtRoi(roi.pessimistic)}`);
        push(`- ${__('breakeven-time')}: ${this.#fmtBreakeven(breakeven)}`);
        push(`- ${__('costs')}: ${this.#fmt(costs.base)}`);
        push(`- ${__('direct-revenues')}: ${this.#fmt(revenues.onetime)}`);
        push(`- ${__('recurring-annual-revenues')}: ${this.#fmt(revenues.yearly)}`);
        push(`- ${__('annual-net-profit-y1')}: ${this.#fmt(roi.base.value)}`);
        if (snap.inputs.cac > 0) {
            push(`- ${__('ue-cac')}: ${this.#fmt(snap.inputs.cac)}`);
            push(`- ${__('ue-ltvcac')}: ${unitEcon.ltvCac !== null ? `${unitEcon.ltvCac.toFixed(1)}x` : '—'}`);
            push(`- ${__('ue-payback')}: ${unitEcon.cacPayback !== null ? `${Math.ceil(unitEcon.cacPayback)} ${__('months')}` : '—'}`);
        }
        push(`- ${__('total-commissions')}: ${this.#fmt(revenues.totalCommissions)}`);
        push(`- ${__('ue-ltv')}: ${this.#fmt(unitEcon.ltv)}`);
        push(`- ${__('ue-gmargin')}: ${this.#fmtPctOrDash(unitEcon.grossMarginPct)}`);
        push(`- ${__('ue-nmargin')}: ${this.#fmtPctOrDash(unitEcon.netMarginPct)}`);
        push(`- ${__('ue-commrate')}: ${this.#fmtPct(unitEcon.commRate)}`);
        push(`- ${__('risk-index')}: ${this.#text(riskIndex.level)} · ${this.#num(riskIndex.score)}/100`);
        push('');
    }

    #appendProjections(push, snap) {
        if (snap.inputs.businessModel === 'commissioned') return;

        const p = snap.projections;
        const row = (label, data) =>
            push(`${label}: ${this.#fmtRoi(data.pessimistic)} / ${this.#fmtRoi(data.base)} / ${this.#fmtRoi(data.optimistic)}`);

        push(`${__('projection-scenarios-label').toUpperCase()}:`);
        row(__('projection-year-1'), p.m12);
        row(__('projection-year-2'), p.m24);
        row(__('projection-year-3'), p.m36);
        push('');
    }

    #num(v, fallback = 0) {
        const n = typeof v === 'number' ? v : parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    }

    #text(v, fallback = '—') {
        if (v === null || v === undefined) return fallback;
        const s = String(v).trim();
        return s.length > 0 ? s : fallback;
    }

    #fmt(v) {
        return CurrencyFormatter.format(this.#num(v));
    }

    #fmtPct(v) {
        return `${this.#num(v).toFixed(1)}%`;
    }

    #fmtPctOrDash(v) {
        return v === null || v === undefined || !Number.isFinite(v) ? '—' : this.#fmtPct(v);
    }

    #fmtRoi(roi) {
        return `${this.#fmt(roi?.value)} (${this.#fmtPct(roi?.percentage)})`;
    }

    #fmtBreakeven(months) {
        if (!Number.isFinite(months) || months === Infinity) return __('not-reachable');
        return `${Math.ceil(this.#num(months))} ${__('months')}`;
    }

    #businessModelLabel(model) {
        const label = __(model);
        return label === model ? this.#text(model) : label;
    }

    #categoryLabel(category) {
        const key = `category-${category}`;
        const label = __(key);
        return label === key ? this.#text(category) : label;
    }

    #freqLabel(freq) {
        const key = `freq-${freq}`;
        const label = __(key);
        return label === key ? this.#text(freq) : label;
    }

    #tierNetAnnual(t) {
        const price = this.#num(t.price);
        const comm = this.#num(t.commissionPerUnit);
        return t.licenseType === 'onetime' ? price - comm : price * 12 - comm;
    }

    #tierLTV(t) {
        if (t.licenseType === 'onetime') return 0;
        const churn = this.#num(t.churnRate);
        const netMonthly = Math.max(0, this.#num(t.price) - this.#num(t.commissionPerUnit) / 12);
        if (churn <= 0 || netMonthly <= 0) return 0;
        return netMonthly / (churn / 100);
    }

    updateUIState(isLoading) {
        this.button.disabled = isLoading;
        this.spinner.classList.toggle('hidden', !isLoading);
    }
}
