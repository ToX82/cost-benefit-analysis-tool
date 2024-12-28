import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';
import { __ } from '../utils/I18n.js';

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
                ${__('base-scenario')}: ${scenarios.base} ${__('users')}<br>
                ${__('optimistic-scenario')}: ${scenarios.optimistic} ${__('users')}<br>
                ${__('pessimistic-scenario')}: ${scenarios.pessimistic} ${__('users')}
            `;
        }
    }

    static updateROI(roi) {
        const element = document.getElementById('roi');
        if (element) {
            const businessModel = document.getElementById('business-model').value;
            const formatROI = (value, percentage) =>
                `${CurrencyFormatter.format(value)} (${percentage.toFixed(1)}%)`;

            if (businessModel === 'commissioned') {
                element.innerHTML = formatROI(roi.base.value, roi.base.percentage);
            } else {
                element.innerHTML = `
                    ${formatROI(roi.base.value, roi.base.percentage)}<br>
                    <span class="text-sm text-gray-600">
                        ${__('optimistic')}: ${formatROI(roi.optimistic.value, roi.optimistic.percentage)}<br>
                        ${__('pessimistic')}: ${formatROI(roi.pessimistic.value, roi.pessimistic.percentage)}
                    </span>
                `;
            }
            element.className = roi.base.value >= 0 ? 'text-2xl font-bold text-green-500' : 'text-2xl font-bold text-red-500';
        }
    }

    static updateBreakeven(breakeven) {
        this.updateElement('breakeven',
            breakeven !== Infinity ? `${Math.ceil(breakeven)} ${__('months')}` : __('not-reachable')
        );
    }

    static updateEvaluation(evaluation, riskIndex) {
        const element = document.getElementById('overall-evaluation');
        if (element && riskIndex) {
            element.innerHTML = `${evaluation}
                <br><br><span class="font-bold">${__('risk-index')}: ${riskIndex.level} (${riskIndex.score}/100)</span>`;
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