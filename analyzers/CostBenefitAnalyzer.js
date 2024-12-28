import { CONFIG } from '../config.js';
import { InputManager } from '../managers/InputManager.js';
import { UIManager } from '../managers/UIManager.js';
import { StorageManager } from '../managers/StorageManager.js';
import { EvaluationManager } from '../managers/EvaluationManager.js';
import { RiskAnalyzer } from './RiskAnalyzer.js';

export class CostBenefitAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.loadSavedData();
        this.handleBusinessModelChange();
    }

    initializeEventListeners() {
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => this.handleInputChange());
        });

        document.getElementById('business-model').addEventListener('change', () => {
            this.handleBusinessModelChange();
        });
    }

    loadSavedData() {
        try {
            StorageManager.loadFromStorage();
            this.calculateResults();
        } catch (e) {
            console.error('Errore nell\'inizializzazione:', e);
            UIManager.displayError('Si è verificato un errore nell\'inizializzazione dell\'applicazione.');
        }
    }

    handleInputChange() {
        try {
            this.calculateResults();
        } catch (e) {
            console.error('Errore nel calcolo dei risultati:', e);
            UIManager.displayError('Si è verificato un errore nel calcolo. Verificare i dati inseriti.');
        }
    }

    calculateResults() {
        const inputs = this.getValidatedInputs();
        if (!inputs) return;

        const costs = this.calculateCosts(inputs);
        const revenues = this.calculateRevenues(inputs);
        const userScenarios = this.calculateUserScenarios(inputs);
        const roi = this.calculateROI(costs, revenues);
        const breakeven = this.calculateBreakeven(costs, revenues, inputs);
        const evaluation = this.calculateEvaluation(roi, breakeven, inputs);
        const riskIndex = this.calculateRiskIndex(inputs, costs);

        this.updateUI(costs, revenues, userScenarios, roi, breakeven, evaluation, riskIndex);
        StorageManager.saveToStorage();
    }

    getValidatedInputs() {
        const inputs = InputManager.collectInputs();
        if (inputs.directCosts + inputs.indirectCosts === 0) {
            UIManager.displayError('Inserire almeno un costo per procedere con l\'analisi');
            return null;
        }
        return inputs;
    }

    calculateCosts(inputs) {
        const occupationMultiplier = 1 + Math.max(0, (inputs.devOccupation - 50) / 100);
        const totalCosts = (inputs.directCosts + inputs.indirectCosts) * occupationMultiplier;
        return { totalCosts, occupationMultiplier };
    }

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

    calculateTotalRevenue(inputs, users) {
        return inputs.upfrontPayment + inputs.finalPayment +
               (inputs.recurringRevenue * CONFIG.MONTHS_PERIOD * users);
    }

    calculateUserScenarios(inputs) {
        return {
            base: inputs.expectedUsers,
            optimistic: inputs.optimisticUsers,
            pessimistic: inputs.pessimisticUsers
        };
    }

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

    calculateEvaluation(roi, breakeven, inputs) {
        let evaluation = EvaluationManager.getROIEvaluation(roi.base.percentage);
        evaluation = EvaluationManager.addOverallEvaluation(evaluation, roi, breakeven, inputs);
        return evaluation;
    }

    calculateRiskIndex(inputs, costs) {
        return new RiskAnalyzer(inputs, costs).analyze();
    }

    updateUI(costs, revenues, userScenarios, roi, breakeven, evaluation, riskIndex) {
        UIManager.updateFinancialDetails(costs, revenues);
        UIManager.updateUserScenarios(userScenarios);
        UIManager.updateROI(roi);
        UIManager.updateBreakeven(breakeven);
        UIManager.updateEvaluation(evaluation, riskIndex);
    }

    handleBusinessModelChange() {
        const businessModel = document.getElementById('business-model').value;
        const usersCard = document.querySelector('[data-category="users"]');

        if (usersCard) {
            if (businessModel === 'commissioned') {
                usersCard.classList.add('hidden');
                document.getElementById('expected-users').value = '1';
                document.getElementById('optimistic-multiplier').value = '1';
                document.getElementById('pessimistic-multiplier').value = '1';
            } else {
                usersCard.classList.remove('hidden');
                if (document.getElementById('expected-users').value === '1') {
                    document.getElementById('optimistic-multiplier').value = '1.2';
                    document.getElementById('pessimistic-multiplier').value = '0.8';
                }
            }
            this.calculateResults();
        }
    }
}