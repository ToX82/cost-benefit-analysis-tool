import { CONFIG } from '../config.js';

export class RiskAnalyzer {
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

    calculateOccupationRisk() {
        const OCCUPATION_THRESHOLD = 50;
        const MAX_RISK = 25;
        const RISK_THRESHOLD = 15;
        const occupationFactor = (this.inputs.devOccupation - OCCUPATION_THRESHOLD) / OCCUPATION_THRESHOLD;
        const risk = Math.max(0, occupationFactor * MAX_RISK);

        this.riskScore += risk;

        if (risk > RISK_THRESHOLD) {
            this.details.push(`Alto rischio di saturazione team (${this.inputs.devOccupation}% occupazione)`);
            this.mitigations.push('Considerare l\'aggiunta di risorse al team');
        }
    }

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
            this.details.push(`Durata progetto critica (${this.inputs.devWeeks} settimane)`);
            this.mitigations.push('Suddividere il progetto in fasi indipendenti');
            this.mitigations.push('Implementare un approccio incrementale con rilasci frequenti');
            this.mitigations.push('Aumentare la frequenza delle verifiche con il cliente');
        } else if (risk > MEDIUM_RISK) {
            this.details.push(`Durata progetto elevata (${this.inputs.devWeeks} settimane)`);
            this.mitigations.push('Pianificare milestone intermedie di verifica');
            this.mitigations.push('Definire chiaramente gli obiettivi di ogni fase');
        }
    }

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
            this.details.push(`Tempo di recupero investimento elevato (${Math.round(monthsToBreakeven)} mesi)`);
            this.mitigations.push('Considerare strategie di acquisizione utenti più aggressive');
            this.mitigations.push('Valutare un aumento del prezzo per utente');
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
            this.details.push(`Basso anticipo rispetto ai costi (${(upfrontRatio * 100).toFixed(1)}%)`);
            this.mitigations.push('Negoziare pagamenti intermedi basati su milestone');
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
            this.details.push('Bilanciamento ricavi non ottimale');
            this.mitigations.push('Considerare un modello di pricing ibrido con setup fee');
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
            this.details.push(`Alta variabilità nelle stime utenti (±${(userVariability * 100).toFixed(1)}%)`);
            this.mitigations.push('Effettuare test di mercato preliminari');
        }
    }

    calculateUserBaseRisk() {
        const THRESHOLDS = { high: 50, low: 200 };
        const BASE_RISK_COMMISSIONED = 5;
        const RISK_THRESHOLD = 5;

        if (this.inputs.businessModel === 'commissioned') {
            if (this.inputs.recurringRevenue > 0) {
                this.details.push('Il progetto è commissionato ma include ricavi ricorrenti. Valutare se ha senso per questo tipo di progetto');
                this.mitigations.push('Considerare un modello di pricing basato su pagamento unico invece che ricorrente');
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
            this.details.push(`Base utenti iniziale sotto la soglia ottimale di ${THRESHOLDS.low} utenti (${expectedUsers} utenti)`);
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
            // Progetto in perdita
            risk = 35; // Rischio molto alto
            this.details.push(`Progetto in perdita (${marginPercentage.toFixed(1)}% di margine negativo)`);
            this.mitigations.push('Rivedere urgentemente i costi e/o aumentare i ricavi');
            this.mitigations.push('Considerare la rinegoziazione del contratto');
        } else if (marginPercentage < 15) {
            // Margine basso
            risk = 25; // Rischio alto
            this.details.push(`Margine molto basso (${marginPercentage.toFixed(1)}%)`);
            this.mitigations.push('Identificare opportunità di ottimizzazione dei costi');
            this.mitigations.push('Valutare possibili aumenti dei ricavi');
        } else if (marginPercentage < 30) {
            // Margine medio-basso
            risk = 15;
            this.details.push(`Margine sotto la media (${marginPercentage.toFixed(1)}%)`);
            this.mitigations.push('Monitorare attentamente i costi durante l\'esecuzione');
        }

        this.riskScore += risk;
    }

    determineRiskLevel() {
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.VERY_HIGH) return 'Molto Alto';
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.HIGH) return 'Alto';
        if (this.riskScore > CONFIG.RISK_THRESHOLDS.MEDIUM) return 'Medio';
        return 'Basso';
    }
}