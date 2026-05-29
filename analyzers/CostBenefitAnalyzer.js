import { CONFIG } from '../config.js';
import { InputManager } from '../managers/InputManager.js';
import { UIManager } from '../managers/UIManager.js';
import { StorageManager } from '../managers/StorageManager.js';
import { EvaluationManager } from '../managers/EvaluationManager.js';
import { RiskAnalyzer } from './RiskAnalyzer.js';
import { CostItemsManager } from '../managers/CostItemsManager.js';
import { RevenueItemsManager } from '../managers/RevenueItemsManager.js';
import { __ } from '../utils/I18n.js';

/**
 * Main analyzer class that orchestrates cost-benefit calculations.
 *
 * Costs are now scenario-dependent when 'scaling' cost items are present:
 *   costs.base / costs.optimistic / costs.pessimistic may differ.
 */
export class CostBenefitAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.loadSavedData();
        this.handleBusinessModelChange();
    }

    initializeEventListeners() {
        try {
            document.querySelectorAll('input, select').forEach(el =>
                el.addEventListener('change', () => this.handleInputChange())
            );

            const bm = document.getElementById('business-model');
            if (!bm) throw new Error('Business model select not found');
            bm.addEventListener('change', () => this.handleBusinessModelChange());

            CostItemsManager.initialize();
            RevenueItemsManager.initialize();

            document.addEventListener('costitemschange',   () => this.handleInputChange());
            document.addEventListener('revenueitemschange', () => this.handleInputChange());
        } catch (e) {
            console.error('Failed to initialize event listeners:', e);
            UIManager.displayError(__('initialization-error'));
        }
    }

    loadSavedData() {
        try {
            StorageManager.loadFromStorage();
            this.calculateResults();
        } catch (e) {
            console.error('Initialization error:', e);
            UIManager.displayError(__('initialization-error'));
        }
    }

    handleInputChange() {
        try {
            this.calculateResults();
            StorageManager.saveToStorage();
        } catch (e) {
            console.error('Error calculating results:', e);
            UIManager.displayError(__('calculation-error'));
        }
    }

    calculateResults() {
        const inputs = this.getValidatedInputs();
        if (!inputs) return;

        try {
            const userCounts = {
                base:        inputs.expectedUsers,
                optimistic:  inputs.optimisticUsers,
                pessimistic: inputs.pessimisticUsers
            };

            const elaborationCounts = {
                base:        RevenueItemsManager.getTotalElaborations('base'),
                optimistic:  RevenueItemsManager.getTotalElaborations('optimistic'),
                pessimistic: RevenueItemsManager.getTotalElaborations('pessimistic')
            };

            // Update scaling and per-elab cost previews (B/O/P labels in table rows)
            CostItemsManager.updateScenarioDisplays(userCounts, elaborationCounts);

            const costs    = this.calculateCosts(userCounts, elaborationCounts);
            const revenues = this.calculateRevenues();
            const roi      = this.calculateROI(costs, revenues);
            const breakeven = this.calculateBreakeven(costs, revenues, inputs);
            const evaluation = EvaluationManager.getROIEvaluation(roi.base.percentage);
            const fullEval   = EvaluationManager.addOverallEvaluation(evaluation, roi, breakeven, inputs);
            const riskIndex  = new RiskAnalyzer(inputs, { totalCosts: costs.base }).analyze();

            UIManager.updateFinancialDetails(costs, revenues);
            UIManager.updateROI(roi, inputs.businessModel);
            UIManager.updateBreakeven(breakeven);
            UIManager.updateEvaluation(fullEval, riskIndex);
            UIManager.updateRevenueSummary(revenues);

            const aiBtn = document.getElementById('ai-analysis-btn');
            if (aiBtn) aiBtn.disabled = false;
        } catch (e) {
            console.error('Error in calculations:', e);
            UIManager.displayError(__('calculation-error'));
        }
    }

    /**
     * Collects and enriches inputs with aggregated manager data.
     * annualizedCosts uses minimum-scale values for scaling items
     * (suitable for validation and business-model evaluation ratios).
     */
    getValidatedInputs() {
        const base = InputManager.collectInputs();
        if (!this.validateInputs()) return null;

        return {
            ...base,
            onetimeRevenue:   RevenueItemsManager.getTotalOnetimeRevenue(),
            monthlyRecurring: RevenueItemsManager.getMonthlyRecurring('base'),
            expectedUsers:    RevenueItemsManager.getTotalUnits('base'),
            optimisticUsers:  RevenueItemsManager.getTotalUnits('optimistic'),
            pessimisticUsers: RevenueItemsManager.getTotalUnits('pessimistic'),
            annualizedCosts:  CostItemsManager.getTotalCosts()
        };
    }

    validateInputs() {
        if (CostItemsManager.getCostItems().length === 0) {
            UIManager.displayError(__('cost-items-required'));
            return false;
        }

        const devWeeks = parseFloat(document.getElementById('dev-weeks')?.value) || 0;
        if (devWeeks < CONFIG.MIN_DEV_WEEKS) {
            UIManager.displayError(__('invalid-dev-weeks'));
            return false;
        }

        const devOccupation = parseFloat(document.getElementById('dev-occupation')?.value) || 0;
        if (devOccupation < 0 || devOccupation > 100) {
            UIManager.displayError(__('invalid-occupation'));
            return false;
        }

        return true;
    }

    /**
     * Returns per-scenario annualized costs.
     * @returns {{ base: number, optimistic: number, pessimistic: number }}
     */
    calculateCosts(userCounts, elaborationCounts = {}) {
        return CostItemsManager.getTotalCostsForScenario(userCounts, elaborationCounts);
    }

    calculateRevenues() {
        const onetime  = RevenueItemsManager.getTotalOnetimeRevenue();
        const monthly  = RevenueItemsManager.getMonthlyRecurring('base');
        const monthOpt = RevenueItemsManager.getMonthlyRecurring('optimistic');
        const monthPes = RevenueItemsManager.getMonthlyRecurring('pessimistic');

        const onetimeTierBase = RevenueItemsManager.getOnetimeTierRevenue('base');
        const onetimeTierOpt  = RevenueItemsManager.getOnetimeTierRevenue('optimistic');
        const onetimeTierPes  = RevenueItemsManager.getOnetimeTierRevenue('pessimistic');

        return {
            onetime: onetime + onetimeTierBase,
            monthly,
            yearly: monthly * CONFIG.MONTHS_PERIOD,
            scenarios: {
                base:        onetime + onetimeTierBase + monthly  * CONFIG.MONTHS_PERIOD,
                optimistic:  onetime + onetimeTierOpt  + monthOpt * CONFIG.MONTHS_PERIOD,
                pessimistic: onetime + onetimeTierPes  + monthPes * CONFIG.MONTHS_PERIOD
            }
        };
    }

    /**
     * ROI uses scenario-specific costs so optimistic revenue is weighed against
     * the (potentially higher) optimistic personnel costs.
     */
    calculateROI(costs, revenues) {
        const calc = (rev, cost) => ({
            value:      rev - cost,
            percentage: cost > 0 ? Math.round(((rev / cost) - 1) * 1000) / 10 : 0
        });
        return {
            base:        calc(revenues.scenarios.base,        costs.base),
            optimistic:  calc(revenues.scenarios.optimistic,  costs.optimistic),
            pessimistic: calc(revenues.scenarios.pessimistic, costs.pessimistic)
        };
    }

    /** Breakeven uses base scenario costs. */
    calculateBreakeven(costs, revenues, inputs) {
        const devMonths = inputs.devWeeks / 4;
        const remaining = costs.base - revenues.onetime;
        if (remaining <= 0) return devMonths;
        if (revenues.monthly <= 0) return Infinity;
        return devMonths + (remaining / revenues.monthly);
    }

    handleBusinessModelChange() {
        try {
            const bm = document.getElementById('business-model')?.value;
            if (!bm) throw new Error('Business model not found');

            const showOnetime   = bm === 'commissioned' || bm === 'mixed';
            const showRecurring = bm === 'saas'         || bm === 'mixed';

            document.getElementById('onetime-revenues-section')?.classList.toggle('hidden', !showOnetime);
            document.getElementById('recurring-revenues-section')?.classList.toggle('hidden', !showRecurring);
            document.getElementById('revenue-divider')?.classList.toggle('hidden', bm !== 'mixed');

            this.calculateResults();
        } catch (e) {
            console.error('Error handling business model change:', e);
            UIManager.displayError(__('business-model-error'));
        }
    }
}
