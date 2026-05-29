import { CONFIG } from '../config.js';
import { __ } from '../utils/I18n.js';

/**
 * Analyzes project risks and provides assessment with mitigation strategies.
 * Inputs must include: businessModel, onetimeRevenue, monthlyRecurring,
 * expectedUsers, optimisticUsers, pessimisticUsers, annualizedCosts.
 * Optional roi: { base: { value, percentage } } — aligns viability floor with ROI evaluation.
 */
export class RiskAnalyzer {
    constructor(inputs, costs, revenues = null, roi = null) {
        this.inputs = inputs;
        this.costs = costs;
        this.revenues = revenues;
        this.roi = roi;
        this.riskScore = 0;
        this.details = [];
        this.mitigations = [];
    }

    analyze() {
        this.calculateFinancialRisk();
        this.calculateMarginRisk();
        this.calculateUserRisk();
        this.calculateUserBaseRisk();
        this.calculateConcentrationRisk();
        this.applyViabilityFloor();

        return {
            score: Math.round(Math.min(100, Math.max(0, this.riskScore))),
            level: this.determineRiskLevel(),
            details: this.details,
            mitigations: this.mitigations
        };
    }

    calculateFinancialRisk() {
        const strategies = {
            saas:        () => this.calculateSaaSFinancialRisk(),
            commissioned: () => this.calculateCommissionedFinancialRisk(),
            mixed:       () => this.calculateMixedFinancialRisk()
        };
        strategies[this.inputs.businessModel]?.();
    }

    calculateSaaSFinancialRisk() {
        const BREAKEVEN_MONTHS = 18; // SaaS startups routinely need 12-18 months runway
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;

        if (this.inputs.monthlyRecurring <= 0) {
            this.riskScore += MAX_RISK;
            this.details.push(__('no-recurring-revenue-risk'));
            this.mitigations.push(__('consider-user-acquisition'));
            this.mitigations.push(__('evaluate-price-increase'));
            return;
        }

        const monthsToBreakeven = this.costs.totalCosts / this.inputs.monthlyRecurring;
        const risk = Math.min(MAX_RISK, Math.max(0, (monthsToBreakeven - BREAKEVEN_MONTHS) * 2));

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('high-breakeven-time', Math.round(monthsToBreakeven)));
            this.mitigations.push(__('consider-user-acquisition'));
            this.mitigations.push(__('evaluate-price-increase'));
        }
    }

    calculateCommissionedFinancialRisk() {
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;

        const upfrontRatio = this.costs.totalCosts > 0
            ? this.inputs.onetimeRevenue / this.costs.totalCosts
            : 0;
        const risk = Math.max(0, (1 - upfrontRatio) * MAX_RISK);

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('low-upfront-ratio', (upfrontRatio * 100).toFixed(1)));
            this.mitigations.push(__('negotiate-milestones'));
        }
    }

    calculateMixedFinancialRisk() {
        const BREAKEVEN_MONTHS = 12;
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;

        const upfrontRatio = this.costs.totalCosts > 0
            ? this.inputs.onetimeRevenue / this.costs.totalCosts
            : 0;

        const upfrontRisk = Math.max(0, (1 - upfrontRatio) * MAX_RISK);
        const recurringRisk = this.inputs.monthlyRecurring > 0
            ? Math.min(MAX_RISK, Math.max(0, (this.costs.totalCosts / this.inputs.monthlyRecurring - BREAKEVEN_MONTHS) * 2))
            : MAX_RISK;

        const totalRisk = (upfrontRisk * 0.4) + (recurringRisk * 0.6);
        this.riskScore += totalRisk;

        if (upfrontRisk > RISK_THRESHOLD || recurringRisk > RISK_THRESHOLD) {
            this.details.push(__('revenue-balance-not-optimal'));
            this.mitigations.push(__('consider-hybrid-pricing'));
        }
    }

    calculateUserRisk() {
        if (this.inputs.expectedUsers === 0) return;

        const MAX_BASE_RISK = 20;
        const RISK_THRESHOLD = 10;
        const VARIABILITY_FACTOR = 20;

        const maxVariation = Math.max(
            Math.abs(this.inputs.optimisticUsers - this.inputs.expectedUsers),
            Math.abs(this.inputs.expectedUsers - this.inputs.pessimisticUsers)
        );
        const userVariability = maxVariation / this.inputs.expectedUsers;
        const baseRisk = Math.min(MAX_BASE_RISK, userVariability * VARIABILITY_FACTOR);
        const risk = this.inputs.businessModel === 'saas' ? baseRisk * 1.2 : baseRisk;

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('high-user-variability', (userVariability * 100).toFixed(1)));
            this.mitigations.push(__('conduct-market-tests'));
        }
    }

    calculateUserBaseRisk() {
        const THRESHOLDS = { high: 20, low: 100 }; // realistic early-stage SaaS numbers
        const BASE_RISK_COMMISSIONED = 5;
        const RISK_THRESHOLD = 8; // only warn when genuinely micro-scale (< 20 users)

        if (this.inputs.businessModel === 'commissioned') {
            // Warn if commissioned project has recurring revenue
            if (this.inputs.monthlyRecurring > 0) {
                this.details.push(__('commissioned-recurring-warning'));
                this.mitigations.push(__('consider-one-time-payment'));
                this.riskScore += BASE_RISK_COMMISSIONED;
            }
            return;
        }

        const expectedUsers = this.inputs.expectedUsers;
        let risk = 0;

        if (expectedUsers < THRESHOLDS.high) {
            risk = 10;
        } else if (expectedUsers < THRESHOLDS.low) {
            risk = 5;
        }

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('low-user-base', THRESHOLDS.low, expectedUsers));
        }
    }

    calculateMarginRisk() {
        const totalCosts = this.costs.totalCosts;
        const revenue = this.inputs.onetimeRevenue + (this.inputs.monthlyRecurring * 12);
        const margin = revenue - totalCosts;
        const marginPercentage = totalCosts > 0 ? (margin / totalCosts) * 100 : 0;

        let risk = 0;

        if (margin < 0) {
            // Scale with loss severity: -20% → ~19, -50% → ~29, -100% → ~45
            risk = Math.round(12 + Math.min(33, Math.abs(marginPercentage) * 0.33));
            this.details.push(__('project-loss', Math.abs(marginPercentage).toFixed(1)));
            this.mitigations.push(__('review-costs-revenues'));
            this.mitigations.push(__('consider-contract-renegotiation'));
        } else if (marginPercentage < 15) {
            risk = 12;
            this.details.push(__('very-low-margin', marginPercentage.toFixed(1)));
            this.mitigations.push(__('identify-cost-optimization'));
            this.mitigations.push(__('evaluate-revenue-increase'));
        } else if (marginPercentage < 30) {
            risk = 6;
            this.details.push(__('below-average-margin', marginPercentage.toFixed(1)));
            this.mitigations.push(__('monitor-costs'));
        }

        this.riskScore += risk;
    }

    calculateConcentrationRisk() {
        if (!this.revenues?.concentration) return;
        const top = this.revenues.concentration[0];
        if (!top) return;
        if (top.fraction >= 0.7) {
            this.riskScore += 15;
            this.details.push(__('revenue-concentration-high', top.label, Math.round(top.fraction * 100)));
            this.mitigations.push(__('revenue-concentration-mitigation'));
        } else if (top.fraction >= 0.5) {
            this.riskScore += 7;
            this.details.push(__('revenue-concentration-medium', top.label, Math.round(top.fraction * 100)));
        }
    }

    /**
     * Economic non-viability dominates operational factors: a structurally
     * unprofitable project cannot be downgraded by low team load or short duration.
     */
    applyViabilityFloor() {
        const totalCosts = this.costs.totalCosts;
        if (totalCosts <= 0) return;

        const roiPct = this.roi?.base?.percentage ?? this.getMarginPercentage();
        if (roiPct >= 0) return;

        const lossSeverity = Math.min(100, Math.abs(roiPct));

        if (lossSeverity >= 100) {
            this.riskScore = Math.max(this.riskScore, 100);
            this.details.push(__('structural-unviability-risk'));
            return;
        }

        // -20% ROI → floor ~72, -50% → ~83, -80% → ~93
        const floor = 65 + lossSeverity * 0.35;
        if (this.riskScore < floor) {
            this.riskScore = floor;
            this.details.push(__('structural-unviability-risk'));
        }
    }

    getMarginPercentage() {
        const totalCosts = this.costs.totalCosts;
        const revenue = this.inputs.onetimeRevenue + (this.inputs.monthlyRecurring * 12);
        const margin = revenue - totalCosts;
        return totalCosts > 0 ? (margin / totalCosts) * 100 : 0;
    }

    determineRiskLevel() {
        if (this.riskScore >= CONFIG.RISK_THRESHOLDS.VERY_HIGH) return __('risk-level-very-high');
        if (this.riskScore >= CONFIG.RISK_THRESHOLDS.HIGH) return __('risk-level-high');
        if (this.riskScore >= CONFIG.RISK_THRESHOLDS.MEDIUM) return __('risk-level-medium');
        return __('risk-level-low');
    }
}
