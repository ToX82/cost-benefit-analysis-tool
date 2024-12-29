import { CONFIG } from '../config.js';
import { __ } from '../utils/I18n.js';

/**
 * Analyzes various risk factors associated with a project and provides risk assessment.
 * Calculates risk scores based on multiple factors including occupation, duration, financial aspects,
 * and provides mitigation strategies.
 */
export class RiskAnalyzer {
    /**
     * Creates a new RiskAnalyzer instance.
     * @param {Object} inputs - The validated form inputs
     * @param {Object} costs - The calculated project costs
     */
    constructor(inputs, costs) {
        this.inputs = inputs;
        this.costs = costs;
        this.riskScore = 0;
        this.details = [];
        this.mitigations = [];
    }

    /**
     * Performs a comprehensive risk analysis considering all risk factors.
     * @returns {Object} The analysis results containing:
     *   - score: {number} Overall risk score (0-100)
     *   - level: {string} Risk level description
     *   - details: {Array<string>} Detailed risk explanations
     *   - mitigations: {Array<string>} Suggested risk mitigation strategies
     */
    analyze() {
        this.calculateOccupationRisk();
        this.calculateDurationRisk();
        this.calculateFinancialRisk();
        this.calculateMarginRisk();
        this.calculateUserRisk();
        this.calculateUserBaseRisk();

        return {
            score: Math.round(Math.min(100, Math.max(0, this.riskScore))),
            level: this.determineRiskLevel(),
            details: this.details,
            mitigations: this.mitigations
        };
    }

    /**
     * Calculates risk based on team occupation percentage.
     * High occupation levels may indicate resource constraints and delivery risks.
     * @private
     */
    calculateOccupationRisk() {
        const OCCUPATION_THRESHOLD = 50;
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;
        const occupationFactor = (this.inputs.devOccupation - OCCUPATION_THRESHOLD) / OCCUPATION_THRESHOLD;
        const risk = Math.max(0, occupationFactor * MAX_RISK);

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('high-team-saturation', this.inputs.devOccupation));
            this.mitigations.push(__('add-team-resources'));
        }
    }

    /**
     * Calculates risk based on project duration.
     * Longer projects have exponentially increasing risk due to complexity and market changes.
     * @private
     */
    calculateDurationRisk() {
        const WEEK_THRESHOLD = 4;
        const BASE_RISK_PER_THRESHOLD = 10;
        const EXPONENTIAL_FACTOR_BASE = 1.05;
        const HIGH_RISK = 20;
        const MEDIUM_RISK = 10;

        const weeksOver = Math.max(0, this.inputs.devWeeks - WEEK_THRESHOLD);
        const baseRisk = (weeksOver / WEEK_THRESHOLD) * BASE_RISK_PER_THRESHOLD;
        const exponentialFactor = Math.pow(EXPONENTIAL_FACTOR_BASE, weeksOver / WEEK_THRESHOLD);
        const risk = baseRisk * exponentialFactor;

        this.riskScore += risk;

        if (risk > HIGH_RISK) {
            this.details.push(__('critical-project-duration', this.inputs.devWeeks));
            this.mitigations.push(__('split-project-phases'));
            this.mitigations.push(__('implement-incremental'));
            this.mitigations.push(__('increase-client-checks'));
        } else if (risk > MEDIUM_RISK) {
            this.details.push(__('high-project-duration', this.inputs.devWeeks));
            this.mitigations.push(__('plan-milestones'));
            this.mitigations.push(__('define-phase-objectives'));
        }
    }

    /**
     * Calculates financial risk based on the selected business model.
     * Delegates to specific risk calculation strategies based on the business model type.
     * @private
     */
    calculateFinancialRisk() {
        const strategies = {
            saas: () => this.calculateSaaSFinancialRisk(),
            commissioned: () => this.calculateCommissionedFinancialRisk(),
            mixed: () => this.calculateMixedFinancialRisk()
        };

        const strategy = strategies[this.inputs.businessModel];
        if (strategy) {
            strategy();
        }
    }

    calculateSaaSFinancialRisk() {
        const BREAKEVEN_MONTHS = 12;
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;

        const monthlyRevenue = this.inputs.recurringRevenue * this.inputs.expectedUsers;
        const monthsToBreakeven = this.costs.totalCosts / monthlyRevenue;
        const risk = Math.min(MAX_RISK, Math.max(0, (monthsToBreakeven - BREAKEVEN_MONTHS) * 2));

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('high-breakeven-time', Math.round(monthsToBreakeven)));
            this.mitigations.push(__('consider-user-acquisition'));
            this.mitigations.push(__('evaluate-price-increase'));
        }
    }

    calculateCommissionedFinancialRisk() {
        const MIN_UPFRONT_RATIO = 0.3;
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;

        const upfrontRatio = this.inputs.upfrontPayment / this.costs.totalCosts;
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

        const upfrontRatio = this.inputs.upfrontPayment / this.costs.totalCosts;
        const monthlyRevenue = this.inputs.recurringRevenue * this.inputs.expectedUsers;

        const upfrontRisk = Math.max(0, (1 - upfrontRatio) * MAX_RISK);
        const recurringRisk = Math.min(MAX_RISK, Math.max(0, (this.costs.totalCosts / monthlyRevenue - BREAKEVEN_MONTHS) * 2));

        const totalRisk = (upfrontRisk * 0.4) + (recurringRisk * 0.6);
        this.riskScore += totalRisk;

        if (upfrontRisk > RISK_THRESHOLD || recurringRisk > RISK_THRESHOLD) {
            this.details.push(__('revenue-balance-not-optimal'));
            this.mitigations.push(__('consider-hybrid-pricing'));
        }
    }

    calculateUserRisk() {
        const MAX_BASE_RISK = 20;
        const RISK_THRESHOLD = 10;
        const VARIABILITY_FACTOR = 20;

        const userVariability = Math.abs(this.inputs.optimisticUsers - this.inputs.pessimisticUsers) / this.inputs.expectedUsers;
        const baseRisk = Math.min(MAX_BASE_RISK, userVariability * VARIABILITY_FACTOR);
        const risk = this.inputs.businessModel === 'saas' ? baseRisk * 1.2 : baseRisk;

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(__('high-user-variability', (userVariability * 100).toFixed(1)));
            this.mitigations.push(__('conduct-market-tests'));
        }
    }

    calculateUserBaseRisk() {
        const THRESHOLDS = { high: 50, low: 200 };
        const BASE_RISK_COMMISSIONED = 5;
        const RISK_THRESHOLD = 5;

        if (this.inputs.businessModel === 'commissioned') {
            if (this.inputs.recurringRevenue > 0) {
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
        const revenue = this.inputs.upfrontPayment + this.inputs.finalPayment +
                       (this.inputs.recurringRevenue * this.inputs.expectedUsers * 12);
        const margin = revenue - totalCosts;
        const marginPercentage = (margin / totalCosts) * 100;

        let risk = 0;

        if (margin < 0) {
            risk = 35;
            this.details.push(__('project-loss', marginPercentage.toFixed(1)));
            this.mitigations.push(__('review-costs-revenues'));
            this.mitigations.push(__('consider-contract-renegotiation'));
        } else if (marginPercentage < 15) {
            risk = 25;
            this.details.push(__('very-low-margin', marginPercentage.toFixed(1)));
            this.mitigations.push(__('identify-cost-optimization'));
            this.mitigations.push(__('evaluate-revenue-increase'));
        } else if (marginPercentage < 30) {
            risk = 15;
            this.details.push(__('below-average-margin', marginPercentage.toFixed(1)));
            this.mitigations.push(__('monitor-costs'));
        }

        this.riskScore += risk;
    }

    /**
     * Determines the overall risk level based on the calculated risk score.
     * @private
     * @returns {string} Risk level description (very high, high, medium, or low)
     */
    determineRiskLevel() {
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.VERY_HIGH) return __('risk-level-very-high');
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.HIGH) return __('risk-level-high');
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.MEDIUM) return __('risk-level-medium');
        return __('risk-level-low');
    }
}