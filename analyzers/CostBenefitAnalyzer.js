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

    /**
     * Full analysis payload for AI export — all numbers finite, all strings non-empty.
     * @returns {object|null}
     */
    getAnalysisSnapshot() {
        const inputs = this.getValidatedInputs();
        if (!inputs) return null;

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

        const costs = this.#withAcquisitionCosts(
            this.calculateCosts(userCounts, elaborationCounts),
            inputs.cac
        );
        const revenues = this.calculateRevenues();
        const roi = this.calculateROI(costs, revenues);

        const breakeven = this.calculateBreakeven(costs, revenues, inputs);

        return {
            inputs,
            userCounts,
            elaborationCounts,
            costs,
            revenues,
            roi,
            breakeven,
            riskIndex: new RiskAnalyzer(inputs, { totalCosts: costs.base }, revenues, roi, breakeven).analyze(),
            unitEcon: this.calculateUnitEconomics(revenues, costs, inputs),
            projections: this.calculateProjectionROI(costs, revenues, inputs),
            costItems: CostItemsManager.getCostItems(),
            onetimeItems: RevenueItemsManager.getOnetimeItems(),
            recurringTiers: RevenueItemsManager.getRecurringTiers()
        };
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

            const operatingCosts = this.calculateCosts(userCounts, elaborationCounts);
            const costs    = this.#withAcquisitionCosts(operatingCosts, inputs.cac);
            const revenues = this.calculateRevenues();
            const roi      = this.calculateROI(costs, revenues);
            const breakeven = this.calculateBreakeven(costs, revenues, inputs);
            const evaluation = EvaluationManager.getROIEvaluation(roi.base.percentage);
            const fullEval   = EvaluationManager.addOverallEvaluation(evaluation, roi, breakeven, inputs);
            const riskIndex  = new RiskAnalyzer(inputs, { totalCosts: costs.base }, revenues, roi, breakeven).analyze();

            const unitEcon   = this.calculateUnitEconomics(revenues, costs, inputs);
            const cashFlow   = this.calculateCashFlow(costs, revenues, inputs);

            UIManager.updatePageHeader(inputs.projectName);
            UIManager.updateFinancialDetails(costs, revenues, roi);
            UIManager.updateROI(roi, inputs.businessModel);
            UIManager.updateBreakeven(breakeven);
            UIManager.updateEvaluation(fullEval, riskIndex, roi);
            UIManager.updateRevenueSummary(this.calculateProjectionROI(costs, revenues, inputs));
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
            annualizedCosts:  CostItemsManager.getTotalCosts(),
            ltv:              RevenueItemsManager.getWeightedLTV()
        };
    }

    /**
     * Adds year-1 acquisition spend (CAC × new customers/month × 12) per scenario.
     * @param {{ base, optimistic, pessimistic }} operatingCosts
     * @param {number} cac
     */
    #withAcquisitionCosts(operatingCosts, cac) {
        const zeroAcq = { base: 0, optimistic: 0, pessimistic: 0 };
        if (!cac || cac <= 0) {
            return { ...operatingCosts, operating: { ...operatingCosts }, acquisition: zeroAcq };
        }

        const acquisition = {
            base:        RevenueItemsManager.getAcquisitionCostForMonths(cac, 12, 'base'),
            optimistic:  RevenueItemsManager.getAcquisitionCostForMonths(cac, 12, 'optimistic'),
            pessimistic: RevenueItemsManager.getAcquisitionCostForMonths(cac, 12, 'pessimistic')
        };

        return {
            base:        operatingCosts.base + acquisition.base,
            optimistic:  operatingCosts.optimistic + acquisition.optimistic,
            pessimistic: operatingCosts.pessimistic + acquisition.pessimistic,
            operating:   operatingCosts,
            acquisition
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
     * Cumulative ROI at 12 / 24 / 36 months per scenario (P / B / O).
     * One-time costs count once; recurring and scaling costs scale with horizon years.
     * Acquisition spend scales linearly with months (CAC × new customers/month).
     */
    calculateProjectionROI(costs, revenues, inputs = {}) {
        const cac         = inputs.cac || 0;
        const onetimeRev  = revenues.onetime;
        const onetimeCost = CostItemsManager.getOnetimeCosts();
        const opCosts     = costs.operating || costs;
        const p           = revenues.projections;

        const calcAt = (cumRecurring, scenarioOpCost, scenario, months) => {
            const totalRev  = onetimeRev + cumRecurring;
            const years     = months / 12;
            const acqSpend  = RevenueItemsManager.getAcquisitionCostForMonths(cac, months, scenario);
            const totalCost = onetimeCost + (scenarioOpCost - onetimeCost) * years + acqSpend;
            return {
                value: totalRev - totalCost,
                percentage: totalCost > 0
                    ? Math.round(((totalRev / totalCost) - 1) * 1000) / 10
                    : 0
            };
        };

        const forHorizon = (key, months) => ({
            base:        calcAt(p[key].base,        opCosts.base,        'base',        months),
            optimistic:  calcAt(p[key].optimistic,  opCosts.optimistic,  'optimistic',  months),
            pessimistic: calcAt(p[key].pessimistic, opCosts.pessimistic, 'pessimistic', months)
        });

        return {
            m12: forHorizon('m12', 12),
            m24: forHorizon('m24', 24),
            m36: forHorizon('m36', 36)
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
     * Uses month-by-month revenue growth and operating costs that scale with users/elaborations.
     */
    calculateBreakeven(costs, revenues, inputs) {
        const cac         = inputs?.cac || 0;
        const onetimeCost = CostItemsManager.getOnetimeCosts();
        let cumulative    = revenues.onetime - onetimeCost;
        if (cumulative >= 0) return 0;

        for (let m = 1; m <= 120; m++) {
            const users     = RevenueItemsManager.getTotalUsersAtMonth(m, 'base');
            const elabs     = RevenueItemsManager.getElaborationsAtMonth(m, 'base');
            const monthRev  = RevenueItemsManager.getMonthlyRevenueAtMonth(m, 'base');
            const monthCost = CostItemsManager.getMonthlyOperatingCost(users, elabs)
                + RevenueItemsManager.getMonthlyAcquisitionCost(cac, 'base');
            cumulative += monthRev - monthCost;
            if (cumulative >= 0) return m;
        }
        return Infinity;
    }

    calculateUnitEconomics(revenues, costs, inputs = {}) {
        const ltv        = RevenueItemsManager.getWeightedLTV();
        const cac        = inputs.cac || 0;
        const grossRev   = RevenueItemsManager.getTotalGrossRevenues('base') + revenues.onetime;
        const netRev     = grossRev - (revenues.totalCommissions || 0);
        const commRate   = grossRev > 0 ? ((revenues.totalCommissions || 0) / grossRev) * 100 : 0;

        const users12       = RevenueItemsManager.getTotalUsersAtMonth(12, 'base');
        const elabs12       = RevenueItemsManager.getElaborationsAtMonth(12, 'base');
        const variableCosts = CostItemsManager.getVariableAnnualCosts(users12, elabs12);

        const totalRev   = revenues.yearly + revenues.onetime;
        const grossMarginPct = grossRev > 0
            ? ((netRev - variableCosts) / grossRev) * 100
            : null;
        const netMarginPct = totalRev > 0
            ? ((totalRev - costs.base) / totalRev) * 100
            : null;

        const netMonthlyPerUser = RevenueItemsManager.getWeightedMonthlyNetPerUnit();
        const ltvCac = cac > 0 && ltv > 0 ? ltv / cac : null;
        const cacPayback = cac > 0 && netMonthlyPerUser > 0 ? cac / netMonthlyPerUser : null;

        return { ltv, cac, ltvCac, cacPayback, commRate, grossMarginPct, netMarginPct };
    }

    calculateCashFlow(costs, revenues, inputs = {}) {
        const cac         = inputs.cac || 0;
        const onetimeCost = CostItemsManager.getOnetimeCosts();
        const onetimeRev  = revenues.onetime;
        const months      = [];

        let cumulative = onetimeRev - onetimeCost;
        months.push(cumulative);

        for (let m = 1; m <= CASH_FLOW_MONTHS; m++) {
            const users     = RevenueItemsManager.getTotalUsersAtMonth(m, 'base');
            const elabs     = RevenueItemsManager.getElaborationsAtMonth(m, 'base');
            const monthRev  = RevenueItemsManager.getMonthlyRevenueAtMonth(m, 'base');
            const monthCost = CostItemsManager.getMonthlyOperatingCost(users, elabs)
                + RevenueItemsManager.getMonthlyAcquisitionCost(cac, 'base');
            cumulative += monthRev - monthCost;
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
            const showCac       = bm === 'saas'         || bm === 'mixed';

            document.getElementById('onetime-revenues-section')?.classList.toggle('hidden', !showOnetime);
            document.getElementById('recurring-revenues-section')?.classList.toggle('hidden', !showRecurring);
            document.getElementById('revenue-divider')?.classList.toggle('hidden', bm !== 'mixed');
            document.getElementById('market-cac-section')?.classList.toggle('hidden', !showCac);

            this.calculateResults();
        } catch (e) {
            console.error('Error handling business model change:', e);
            UIManager.displayError(__('business-model-error'));
        }
    }
}
