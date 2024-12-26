// Configurazione
const CONFIG = {
    MONTHS_PERIOD: 12,
    MIN_DEV_WEEKS: 1,
    DEFAULT_OCCUPATION: 80,
    ROI_THRESHOLDS: {
        EXCELLENT: 50,
        GOOD: 20,
        MODERATE: 0
    },
    RISK_THRESHOLDS: {
        VERY_HIGH: 75,
        HIGH: 50,
        MEDIUM: 25
    }
};

// Classe principale per la gestione dell'analisi
class CostBenefitAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.loadSavedData();
    }

    // Inizializzazione
    initializeEventListeners() {
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => this.handleInputChange());
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

    // Gestione input e calcoli principali
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

    // Input validation e raccolta
    getValidatedInputs() {
        const inputs = InputManager.collectInputs();
        if (inputs.directCosts + inputs.indirectCosts === 0) {
            UIManager.displayError('Inserire almeno un costo per procedere con l\'analisi');
            return null;
        }
        return inputs;
    }

    // Calcoli specifici
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
        const remainingCosts = costs.totalCosts - inputs.upfrontPayment - inputs.finalPayment;

        if (revenues.monthly <= 0) return Infinity;
        if (inputs.upfrontPayment + inputs.finalPayment >= costs.totalCosts) return devMonths;
        return devMonths + (remainingCosts / revenues.monthly);
    }

    calculateEvaluation(roi, breakeven, inputs) {
        let evaluation = EvaluationManager.getROIEvaluation(roi.base.percentage);
        evaluation = EvaluationManager.addOverallEvaluation(evaluation, roi, breakeven, inputs);
        return evaluation;
    }

    calculateRiskIndex(inputs, costs) {
        return new RiskAnalyzer(inputs, costs).analyze();
    }

    // Aggiornamento UI
    updateUI(costs, revenues, userScenarios, roi, breakeven, evaluation, riskIndex) {
        UIManager.updateFinancialDetails(costs, revenues);
        UIManager.updateUserScenarios(userScenarios);
        UIManager.updateROI(roi);
        UIManager.updateBreakeven(breakeven);
        UIManager.updateEvaluation(evaluation, riskIndex);
    }
}

// Gestione Input
class InputManager {
    static collectInputs() {
        const getValue = (id, defaultValue = 0) =>
            Math.max(0, parseFloat(document.getElementById(id).value) || defaultValue);

        return {
            directCosts: getValue('direct-costs'),
            indirectCosts: getValue('indirect-costs'),
            upfrontPayment: getValue('upfront-payment'),
            finalPayment: getValue('final-payment'),
            recurringRevenue: getValue('recurring-revenue'),
            devWeeks: Math.max(CONFIG.MIN_DEV_WEEKS, getValue('dev-weeks', CONFIG.MIN_DEV_WEEKS)),
            devOccupation: Math.min(100, Math.max(0, getValue('dev-occupation', CONFIG.DEFAULT_OCCUPATION))),
            expectedUsers: getValue('expected-users'),
            optimisticMultiplier: Math.max(1, getValue('optimistic-multiplier', 1.2)),
            pessimisticMultiplier: Math.min(1, Math.max(0, getValue('pessimistic-multiplier', 0.8))),
            businessModel: document.getElementById('business-model').value,
            optimisticUsers: Math.max(1, Math.round(getValue('expected-users') * Math.max(1, getValue('optimistic-multiplier', 1.2)))),
            pessimisticUsers: Math.max(1, Math.round(getValue('expected-users') * Math.min(1, Math.max(0, getValue('pessimistic-multiplier', 0.8)))))
        };
    }
}

// Gestione UI
class UIManager {
    static formatCurrency(value) {
        try {
            return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
        } catch (e) {
            console.error('Errore nella formattazione della valuta:', e);
            return `€${value.toFixed(2)}`;
        }
    }

    static updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    static updateFinancialDetails(costs, revenues) {
        this.updateElement('total-costs-detail', this.formatCurrency(costs.totalCosts));
        this.updateElement('direct-revenue-detail', this.formatCurrency(revenues.direct));
        this.updateElement('yearly-revenue-detail', this.formatCurrency(revenues.yearly));
    }

    static updateUserScenarios(scenarios) {
        const element = document.getElementById('users-scenarios');
        if (element) {
            element.innerHTML = `
                Scenario Base: ${scenarios.base} utenti<br>
                Scenario Ottimistico: ${scenarios.optimistic} utenti<br>
                Scenario Pessimistico: ${scenarios.pessimistic} utenti
            `;
        }
    }

    static updateROI(roi) {
        const element = document.getElementById('roi');
        if (element) {
            element.innerHTML = `
                ${this.formatCurrency(roi.base.value)} (${roi.base.percentage.toFixed(1)}%)<br>
                <span class="text-sm text-gray-600">
                    Ottimistico: ${this.formatCurrency(roi.optimistic.value)} (${roi.optimistic.percentage.toFixed(1)}%)<br>
                    Pessimistico: ${this.formatCurrency(roi.pessimistic.value)} (${roi.pessimistic.percentage.toFixed(1)}%)
                </span>
            `;
            element.className = roi.base.value >= 0 ? 'text-2xl font-bold text-green-500' : 'text-2xl font-bold text-red-500';
        }
    }

    static updateBreakeven(breakeven) {
        this.updateElement('breakeven',
            breakeven !== Infinity ? `${Math.ceil(breakeven)} mesi` : 'Non raggiungibile'
        );
    }

    static updateEvaluation(evaluation, riskIndex) {
        const element = document.getElementById('overall-evaluation');
        if (element && riskIndex) {
            const riskDetails = riskIndex.details?.length > 0 ?
                '<br><span class="text-xs text-red-600">Fattori di rischio principali:<br>• ' +
                riskIndex.details.join('<br>• ') + '</span>' : '';

            const riskMitigations = riskIndex.mitigations?.length > 0 ?
                '<br><span class="text-xs text-blue-600">Suggerimenti:<br>• ' +
                riskIndex.mitigations.join('<br>• ') + '</span>' : '';

            element.innerHTML = `${evaluation}
                <br><br><span class="font-bold">Indice di Rischio: ${riskIndex.level} (${riskIndex.score}/100)</span>
                ${riskDetails}
                ${riskMitigations}`;
        }
    }

    static displayError(message) {
        const element = document.getElementById('overall-evaluation');
        if (element) {
            element.innerHTML = `<span class="text-red-600">${message}</span>`;
        }
        console.error(message);
    }
}

// Gestione Storage
class StorageManager {
    static saveToStorage() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            try {
                localStorage.setItem(input.id, input.value);
            } catch (e) {
                console.error(`Errore nel salvataggio di ${input.id}:`, e);
            }
        });
    }

    static loadFromStorage() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            try {
                const savedValue = localStorage.getItem(input.id);
                if (savedValue !== null) {
                    input.value = savedValue;
                }
            } catch (e) {
                console.error(`Errore nel caricamento di ${input.id}:`, e);
            }
        });
    }
}

// Gestione Valutazioni
class EvaluationManager {
    static getROIEvaluation(roiPercentage) {
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return 'Eccellente ritorno sull\'investimento';
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return 'Buon ritorno sull\'investimento';
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return 'Ritorno sull\'investimento moderato';
        }
        return 'Investimento in perdita';
    }

    static addOverallEvaluation(evaluation, roi, breakeven, inputs) {
        let overall = '';
        if (roi.base.value > 0 && breakeven < (12 + inputs.devWeeks/4) && inputs.devOccupation < 40) {
            overall = 'Progetto molto promettente con buon potenziale di successo';
        } else if (roi.base.value > 0 && breakeven < (24 + inputs.devWeeks/4)) {
            overall = 'Progetto fattibile ma con alcuni rischi da monitorare';
        } else {
            overall = 'Progetto ad alto rischio, necessaria una revisione della strategia';
        }

        if (inputs.devOccupation > 50) {
            overall += '<br>ATTENZIONE: Occupazione programmatori molto alta, possibili ritardi e costi aggiuntivi';
        }

        return overall;
    }
}

// Analisi del Rischio
class RiskAnalyzer {
    constructor(inputs, costs) {
        this.inputs = inputs;
        this.costs = costs;
        this.riskScore = 0;
        this.details = [];
        this.mitigations = [];
    }

    analyze() {
        this.calculateOccupationRisk();
        this.calculateDurationRisk();
        this.calculateFinancialRisk();
        this.calculateUserRisk();
        this.calculateUserBaseRisk();

        return {
            score: Math.round(Math.min(100, Math.max(0, this.riskScore))),
            level: this.determineRiskLevel(),
            details: this.details,
            mitigations: this.mitigations
        };
    }

    calculateOccupationRisk() {
        const risk = Math.max(0, ((this.inputs.devOccupation - 50) / 50) * 25);
        this.riskScore += risk;
        if (risk > 15) {
            this.details.push(`Alto rischio di saturazione team (${this.inputs.devOccupation}% occupazione)`);
            this.mitigations.push('Considerare l\'aggiunta di risorse al team');
        }
    }

    calculateDurationRisk() {
        const risk = Math.min(20, Math.max(0, ((this.inputs.devWeeks - 12) / 12) * 20));
        this.riskScore += risk;
        if (risk > 10) {
            this.details.push(`Durata progetto elevata (${this.inputs.devWeeks} settimane)`);
            this.mitigations.push('Valutare la possibilità di suddividere il progetto in fasi');
        }
    }

    calculateFinancialRisk() {
        const strategies = {
            saas: () => this.calculateSaaSFinancialRisk(),
            commissioned: () => this.calculateCommissionedFinancialRisk(),
            mixed: () => this.calculateMixedFinancialRisk()
        };

        const strategy = strategies[this.inputs.businessModel];
        if (strategy) strategy();
    }

    calculateSaaSFinancialRisk() {
        const monthlyRevenue = this.inputs.recurringRevenue * this.inputs.expectedUsers;
        const monthsToBreakeven = this.costs.totalCosts / monthlyRevenue;
        const risk = Math.min(25, Math.max(0, (monthsToBreakeven - 12) * 2));

        this.riskScore += risk;
        if (risk > 15) {
            this.details.push(`Tempo di recupero investimento elevato (${Math.round(monthsToBreakeven)} mesi)`);
            this.mitigations.push('Considerare strategie di acquisizione utenti più aggressive');
            this.mitigations.push('Valutare un aumento del prezzo per utente');
        }
    }

    calculateCommissionedFinancialRisk() {
        const upfrontRatio = this.inputs.upfrontPayment / this.costs.totalCosts;
        const risk = Math.max(0, (1 - upfrontRatio) * 25);

        this.riskScore += risk;
        if (risk > 15) {
            this.details.push(`Basso anticipo rispetto ai costi (${(upfrontRatio * 100).toFixed(1)}%)`);
            this.mitigations.push('Negoziare pagamenti intermedi basati su milestone');
        }
    }

    calculateMixedFinancialRisk() {
        const upfrontRatio = this.inputs.upfrontPayment / this.costs.totalCosts;
        const monthlyRev = this.inputs.recurringRevenue * this.inputs.expectedUsers;

        const upfrontRisk = Math.max(0, (1 - upfrontRatio) * 25);
        const recurringRisk = Math.min(25, Math.max(0, (this.costs.totalCosts / monthlyRev - 12) * 2));

        this.riskScore += (upfrontRisk * 0.4) + (recurringRisk * 0.6);

        if (upfrontRisk > 15 || recurringRisk > 15) {
            this.details.push('Bilanciamento ricavi non ottimale');
            this.mitigations.push('Considerare un modello di pricing ibrido con setup fee');
        }
    }

    calculateUserRisk() {
        const userVariability = (this.inputs.optimisticUsers - this.inputs.pessimisticUsers) / this.inputs.expectedUsers;
        const baseRisk = Math.min(20, userVariability * 20);
        const risk = this.inputs.businessModel === 'saas' ? baseRisk * 1.2 : baseRisk;

        this.riskScore += risk;
        if (risk > 10) {
            this.details.push(`Alta variabilità nelle stime utenti (±${(userVariability * 100).toFixed(1)}%)`);
            this.mitigations.push('Effettuare test di mercato preliminari');
        }
    }

    calculateUserBaseRisk() {
        const thresholds = this.inputs.businessModel === 'saas' ?
            { high: 50, low: 200 } : { high: 10, low: 50 };

        const risk = this.inputs.expectedUsers < thresholds.high ? 10 :
                    this.inputs.expectedUsers < thresholds.low ? 5 : 0;

        this.riskScore += risk;
        if (risk > 5) {
            this.details.push(`Base utenti iniziale sotto la soglia ottimale di ${thresholds.low} utenti (${this.inputs.expectedUsers} utenti)`);
        }
    }

    determineRiskLevel() {
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.VERY_HIGH) return 'Molto Alto';
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.HIGH) return 'Alto';
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.MEDIUM) return 'Medio';
        return 'Basso';
    }
}

// Inizializzazione
new CostBenefitAnalyzer();