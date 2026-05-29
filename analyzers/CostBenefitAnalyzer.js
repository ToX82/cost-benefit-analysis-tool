import { InputManager } from '../managers/InputManager.js';
import { UIManager } from '../managers/UIManager.js';
import { StorageManager } from '../managers/StorageManager.js';
import { EvaluationManager } from '../managers/EvaluationManager.js';
import { RiskAnalyzer } from './RiskAnalyzer.js';
import { CostItemsManager } from '../managers/CostItemsManager.js';
import { RevenueItemsManager } from '../managers/RevenueItemsManager.js';
import { __ } from '../utils/I18n.js';

const CASH_FLOW_MONTHS = 36;

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
            document.getElementById('project-name')?.addEventListener('input', () => this.handleInputChange());

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
            const riskIndex  = new RiskAnalyzer(inputs, { totalCosts: costs.base }, revenues, roi).analyze();

            const unitEcon   = this.calculateUnitEconomics(revenues, costs);
            const cashFlow   = this.calculateCashFlow(costs, revenues);

            UIManager.updatePageHeader(inputs.projectName);
            UIManager.updateFinancialDetails(costs, revenues);
            UIManager.updateROI(roi, inputs.businessModel);
            UIManager.updateBreakeven(breakeven);
            UIManager.updateEvaluation(fullEval, riskIndex, roi);
            UIManager.updateRevenueSummary(revenues);
            UIManager.updateTierBreakevens(costs.base);
            UIManager.updateUnitEconomics(unitEcon);
            UIManager.updateCashFlowChart(cashFlow);

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
        const onetime = RevenueItemsManager.getTotalOnetimeRevenue();

        const cumSum = (scenario, months) => {
            let sum = 0;
            for (let m = 1; m <= months; m++) {
                sum += RevenueItemsManager.getMonthlyRevenueAtMonth(m, scenario);
            }
            return sum;
        };

        const m12b = cumSum('base', 12);
        const m12o = cumSum('optimistic', 12);
        const m12p = cumSum('pessimistic', 12);

        return {
            onetime,
            monthly: RevenueItemsManager.getMonthlyRevenueAtMonth(12, 'base'),
            yearly: m12b,
            totalCommissions: RevenueItemsManager.getTotalCommissions('base'),
            concentration: RevenueItemsManager.getRevenueConcentration(),
            projections: {
                m12: { base: m12b, optimistic: m12o, pessimistic: m12p },
                m24: {
                    base:        cumSum('base', 24),
                    optimistic:  cumSum('optimistic', 24),
                    pessimistic: cumSum('pessimistic', 24)
                },
                m36: {
                    base:        cumSum('base', 36),
                    optimistic:  cumSum('optimistic', 36),
                    pessimistic: cumSum('pessimistic', 36)
                }
            },
            scenarios: {
                base:        onetime + m12b,
                optimistic:  onetime + m12o,
                pessimistic: onetime + m12p
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

    /**
     * Finds the month at which cumulative cash flow turns positive.
     * Iterates month by month using the growth model (up to 120 months = 10 years).
     */
    calculateBreakeven(costs, revenues, inputs) {
        const onetimeCost = CostItemsManager.getOnetimeCosts();
        const monthlyCost = CostItemsManager.getRecurringAnnualCosts() / 12;

        let cumulative = revenues.onetime - onetimeCost;
        if (cumulative >= 0) return 0;

        for (let m = 1; m <= 120; m++) {
            const monthRev = RevenueItemsManager.getMonthlyRevenueAtMonth(m, 'base');
            cumulative += monthRev - monthlyCost;
            if (cumulative >= 0) return m;
        }
        return Infinity;
    }

    calculateUnitEconomics(revenues, costs) {
        const ltv        = RevenueItemsManager.getWeightedLTV();
        const grossRev   = RevenueItemsManager.getTotalGrossRevenues('base') + revenues.onetime;
        const commRate   = grossRev > 0 ? (revenues.totalCommissions / grossRev) * 100 : 0;
        const totalRev   = revenues.yearly + revenues.onetime;
        const recurCosts = CostItemsManager.getRecurringAnnualCosts();
        const grossMarginPct = revenues.yearly > 0
            ? ((revenues.yearly - recurCosts) / revenues.yearly) * 100
            : null;
        const netMarginPct = totalRev > 0
            ? ((totalRev - costs.base) / totalRev) * 100
            : null;
        return { ltv, commRate, grossMarginPct, netMarginPct };
    }

    calculateCashFlow(costs, revenues) {
        const onetimeCost   = CostItemsManager.getOnetimeCosts();
        const monthlyCost   = CostItemsManager.getRecurringAnnualCosts() / 12;
        const onetimeRev    = revenues.onetime;
        const months        = [];

        let cumulative = onetimeRev - onetimeCost;
        months.push(cumulative);

        for (let m = 1; m <= CASH_FLOW_MONTHS; m++) {
            const monthRev = RevenueItemsManager.getMonthlyRevenueAtMonth(m, 'base');
            cumulative += monthRev - monthlyCost;
            months.push(cumulative);
        }

        return months;
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
