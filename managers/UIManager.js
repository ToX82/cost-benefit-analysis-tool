import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';

export class UIManager {
    static updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    static updateFinancialDetails(costs, revenues) {
        this.updateElement('total-costs-detail', CurrencyFormatter.format(costs.totalCosts));
        this.updateElement('direct-revenue-detail', CurrencyFormatter.format(revenues.direct));
        this.updateElement('yearly-revenue-detail', CurrencyFormatter.format(revenues.yearly));
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
            const businessModel = document.getElementById('business-model').value;

            if (businessModel === 'commissioned') {
                element.innerHTML = `${CurrencyFormatter.format(roi.base.value)} (${roi.base.percentage.toFixed(1)}%)`;
            } else {
                element.innerHTML = `
                    ${CurrencyFormatter.format(roi.base.value)} (${roi.base.percentage.toFixed(1)}%)<br>
                    <span class="text-sm text-gray-600">
                        Ottimistico: ${CurrencyFormatter.format(roi.optimistic.value)} (${roi.optimistic.percentage.toFixed(1)}%)<br>
                        Pessimistico: ${CurrencyFormatter.format(roi.pessimistic.value)} (${roi.pessimistic.percentage.toFixed(1)}%)
                    </span>
                `;
            }
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
            element.innerHTML = `${evaluation}
                <br><br><span class="font-bold">Indice di Rischio: ${riskIndex.level} (${riskIndex.score}/100)</span>`;
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