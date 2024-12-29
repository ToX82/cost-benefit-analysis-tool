import { CONFIG } from '../config.js';
import { InputManager } from '../managers/InputManager.js';
import { UIManager } from '../managers/UIManager.js';
import { StorageManager } from '../managers/StorageManager.js';
import { EvaluationManager } from '../managers/EvaluationManager.js';
import { RiskAnalyzer } from './RiskAnalyzer.js';
import { __ } from '../utils/I18n.js';

/**
 * Main analyzer class that handles cost-benefit calculations and analysis
 */
export class CostBenefitAnalyzer {
    /**
     * Initializes the analyzer, sets up event listeners and loads saved data
     */
    constructor() {
        this.initializeEventListeners();
        this.loadSavedData();
        this.handleBusinessModelChange();
    }

    /**
     * Sets up event listeners for input changes and business model selection
     */
    initializeEventListeners() {
        try {
            document.querySelectorAll('input, select').forEach(element => {
                element.addEventListener('change', () => this.handleInputChange());
            });

            const businessModelSelect = document.getElementById('business-model');
            if (!businessModelSelect) {
                throw new Error('Business model select element not found');
            }

            businessModelSelect.addEventListener('change', () => {
                this.handleBusinessModelChange();
            });
        } catch (e) {
            console.error('Failed to initialize event listeners:', e);
            UIManager.displayError(__('initialization-error'));
        }
    }

    /**
     * Loads previously saved data and recalculates results
     */
    loadSavedData() {
        try {
            StorageManager.loadFromStorage();
            this.calculateResults();
        } catch (e) {
            console.error('Initialization error:', e);
            UIManager.displayError(__('initialization-error'));
        }
    }

    /**
     * Handles input change events by recalculating results and saving data
     */
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
     * Main calculation method that processes all inputs and updates UI
     */
    calculateResults() {
        const inputs = this.getValidatedInputs();
        if (!inputs) return;

        try {
            const costs = this.calculateCosts(inputs);
            const revenues = this.calculateRevenues(inputs);
            const userScenarios = this.calculateUserScenarios(inputs);
            const roi = this.calculateROI(costs, revenues);
            const breakeven = this.calculateBreakeven(costs, revenues, inputs);
            const evaluation = this.calculateEvaluation(roi, breakeven, inputs);
            const riskIndex = this.calculateRiskIndex(inputs, costs);

            this.updateUI(costs, revenues, userScenarios, roi, breakeven, evaluation, riskIndex);
        } catch (e) {
            console.error('Error in calculations:', e);
            UIManager.displayError(__('calculation-error'));
        }
    }

    /**
     * Collects and validates all input values
     * @returns {Object|null} Validated inputs or null if validation fails
     */
    getValidatedInputs() {
        const inputs = InputManager.collectInputs();
        return this.validateInputs(inputs) ? inputs : null;
    }

    /**
     * Validates input values against business rules
     * @param {Object} inputs - Input values to validate
     * @returns {boolean} True if inputs are valid
     */
    validateInputs(inputs) {
        if (inputs.directCosts + inputs.indirectCosts === 0) {
            UIManager.displayError(__('costs-required'));
            return false;
        }

        if (inputs.devWeeks < CONFIG.MIN_DEV_WEEKS) {
            UIManager.displayError(__('invalid-dev-weeks'));
            return false;
        }

        if (inputs.devOccupation < 0 || inputs.devOccupation > 100) {
            UIManager.displayError(__('invalid-occupation'));
            return false;
        }

        return true;
    }

    /**
     * Calculates total costs considering occupation multiplier
     * @param {Object} inputs - Input values
     * @returns {Object} Calculated costs and multiplier
     */
    calculateCosts(inputs) {
        const occupationMultiplier = 1 + Math.max(0, (inputs.devOccupation - 50) / 100);
        const totalCosts = (inputs.directCosts + inputs.indirectCosts) * occupationMultiplier;
        return { totalCosts, occupationMultiplier };
    }

    /**
     * Calculates all revenue scenarios
     * @param {Object} inputs - Input values
     * @returns {Object} Revenue calculations for all scenarios
     */
    calculateRevenues(inputs) {
        const directRevenue = inputs.upfrontPayment + inputs.finalPayment;
        const monthlyRecurringRevenue = inputs.recurringRevenue * inputs.expectedUsers;
        const yearlyRecurringRevenue = monthlyRecurringRevenue * CONFIG.MONTHS_PERIOD;

        return {
            direct: directRevenue,
            monthly: monthlyRecurringRevenue,
            yearly: yearlyRecurringRevenue,
            scenarios: {
                base: this.calculateTotalRevenue(inputs, inputs.expectedUsers),
                optimistic: this.calculateTotalRevenue(inputs, inputs.optimisticUsers),
                pessimistic: this.calculateTotalRevenue(inputs, inputs.pessimisticUsers)
            }
        };
    }

    /**
     * Calculates total revenue for a given number of users
     * @param {Object} inputs - Input values
     * @param {number} users - Number of users
     * @returns {number} Total revenue
     */
    calculateTotalRevenue(inputs, users) {
        return inputs.upfrontPayment + inputs.finalPayment +
               (inputs.recurringRevenue * CONFIG.MONTHS_PERIOD * users);
    }

    /**
     * Calculates user scenarios based on input values
     * @param {Object} inputs - Input values
     * @returns {Object} User scenarios calculations
     */
    calculateUserScenarios(inputs) {
        return {
            base: inputs.expectedUsers,
            optimistic: inputs.optimisticUsers,
            pessimistic: inputs.pessimisticUsers
        };
    }

    /**
     * Calculates ROI for all scenarios
     * @param {Object} costs - Cost calculations
     * @param {Object} revenues - Revenue calculations
     * @returns {Object} ROI calculations for all scenarios
     */
    calculateROI(costs, revenues) {
        const calculateRoiValue = (revenue) => revenue - costs.totalCosts;
        const calculateRoiPercentage = (revenue) =>
            costs.totalCosts > 0 ? ((revenue / costs.totalCosts) - 1) * 100 : 0;

        return {
            base: {
                value: calculateRoiValue(revenues.scenarios.base),
                percentage: calculateRoiPercentage(revenues.scenarios.base)
            },
            optimistic: {
                value: calculateRoiValue(revenues.scenarios.optimistic),
                percentage: calculateRoiPercentage(revenues.scenarios.optimistic)
            },
            pessimistic: {
                value: calculateRoiValue(revenues.scenarios.pessimistic),
                percentage: calculateRoiPercentage(revenues.scenarios.pessimistic)
            }
        };
    }

    /**
     * Calculates breakeven point in months
     * @param {Object} costs - Cost calculations
     * @param {Object} revenues - Revenue calculations
     * @param {Object} inputs - Input values
     * @returns {number} Breakeven point in months
     */
    calculateBreakeven(costs, revenues, inputs) {
        const devMonths = inputs.devWeeks / 4;
        const remainingCosts = costs.totalCosts - inputs.upfrontPayment;

        if (inputs.finalPayment >= remainingCosts) {
            return devMonths;
        }

        const costsAfterFinal = remainingCosts - inputs.finalPayment;

        if (revenues.monthly <= 0) {
            return Infinity;
        }

        return devMonths + (costsAfterFinal / revenues.monthly);
    }

    /**
     * Calculates overall evaluation based on ROI and breakeven
     * @param {Object} roi - ROI calculations
     * @param {number} breakeven - Breakeven point
     * @param {Object} inputs - Input values
     * @returns {string} Evaluation text
     */
    calculateEvaluation(roi, breakeven, inputs) {
        let evaluation = EvaluationManager.getROIEvaluation(roi.base.percentage);
        evaluation = EvaluationManager.addOverallEvaluation(evaluation, roi, breakeven, inputs);
        return evaluation;
    }

    /**
     * Calculates risk index using RiskAnalyzer
     * @param {Object} inputs - Input values
     * @param {Object} costs - Cost calculations
     * @returns {Object} Risk index calculation
     */
    calculateRiskIndex(inputs, costs) {
        return new RiskAnalyzer(inputs, costs).analyze();
    }

    /**
     * Updates all UI components with calculation results
     * @param {Object} costs - Cost calculations
     * @param {Object} revenues - Revenue calculations
     * @param {Object} userScenarios - User scenarios calculations
     * @param {Object} roi - ROI calculations
     * @param {number} breakeven - Breakeven point
     * @param {string} evaluation - Evaluation text
     * @param {Object} riskIndex - Risk index calculation
     */
    updateUI(costs, revenues, userScenarios, roi, breakeven, evaluation, riskIndex) {
        UIManager.updateFinancialDetails(costs, revenues);
        UIManager.updateUserScenarios(userScenarios);
        UIManager.updateROI(roi);
        UIManager.updateBreakeven(breakeven);
        UIManager.updateEvaluation(evaluation, riskIndex);
    }

    /**
     * Handles business model changes and updates UI accordingly
     */
    handleBusinessModelChange() {
        try {
            const businessModel = document.getElementById('business-model')?.value;
            const usersCard = document.querySelector('[data-category="users"]');

            if (!businessModel || !usersCard) {
                throw new Error('Required elements not found');
            }

            if (businessModel === 'commissioned') {
                this.setCommissionedMode(usersCard);
            } else {
                this.setSaaSMode(usersCard);
            }

            this.calculateResults();
        } catch (e) {
            console.error('Error handling business model change:', e);
            UIManager.displayError(__('business-model-error'));
        }
    }

    /**
     * Sets up UI for commissioned business model
     * @param {HTMLElement} usersCard - Users section element
     */
    setCommissionedMode(usersCard) {
        usersCard.classList.add('hidden');
        this.setInputValue('expected-users', '1');
        this.setInputValue('optimistic-multiplier', '1');
        this.setInputValue('pessimistic-multiplier', '1');
    }

    /**
     * Sets up UI for SaaS business model
     * @param {HTMLElement} usersCard - Users section element
     */
    setSaaSMode(usersCard) {
        usersCard.classList.remove('hidden');
        if (this.getInputValue('expected-users') === '1') {
            this.setInputValue('optimistic-multiplier', '1.2');
            this.setInputValue('pessimistic-multiplier', '0.8');
        }
    }

    /**
     * Sets value for an input element
     * @param {string} id - Input element ID
     * @param {string} value - Value to set
     */
    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    /**
     * Gets value from an input element
     * @param {string} id - Input element ID
     * @returns {string} Input value or empty string if not found
     */
    getInputValue(id) {
        return document.getElementById(id)?.value || '';
    }
}