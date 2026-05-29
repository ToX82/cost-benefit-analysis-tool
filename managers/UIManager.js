import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';
import { __ } from '../utils/I18n.js';

/**
 * Manages UI updates and interactions
 */
export class UIManager {
    /**
     * Updates a DOM element's text content
     * @param {string} id - Element ID
     * @param {string} value - New text content
     */
    static updateElement(id, value) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
            return;
        }
        element.textContent = value;
    }

    /**
     * Updates financial details in the UI
     * @param {Object} costs - Cost details
     * @param {Object} revenues - Revenue details
     */
    static updateFinancialDetails(costs, revenues) {
        if (!costs || !revenues) return;
        this.updateElement('total-costs-detail', CurrencyFormatter.format(costs.totalCosts));
        this.updateElement('direct-revenue-detail', CurrencyFormatter.format(revenues.onetime));
        this.updateElement('yearly-revenue-detail', CurrencyFormatter.format(revenues.yearly));
    }

    /**
     * Updates the revenue scenario summary (monthly recurring per scenario)
     * @param {Object} revenues - Revenue data
     */
    static updateRevenueSummary(revenues) {
        const element = document.getElementById('users-scenarios');
        const businessModel = document.getElementById('business-model')?.value;

        if (!element) return;

        if (businessModel === 'commissioned') {
            element.classList.add('hidden');
            return;
        }

        element.classList.remove('hidden');
        const optMonthly = revenues.scenarios.optimistic / 12;
        const pesMonthly = revenues.scenarios.pessimistic / 12;

        element.innerHTML = `
            ${__('base-scenario')}: ${CurrencyFormatter.format(revenues.monthly)}/mese<br>
            ${__('optimistic-scenario')}: ${CurrencyFormatter.format(optMonthly)}/mese<br>
            ${__('pessimistic-scenario')}: ${CurrencyFormatter.format(pesMonthly)}/mese
        `;
    }

    /**
     * Updates ROI information in the UI
     * @param {Object} roi - ROI data
     * @param {string} businessModel - Current business model
     */
    static updateROI(roi, businessModel) {
        if (!roi?.base) return;

        const element = document.getElementById('roi');
        if (!element) return;

        const fmt = (value, pct) =>
            `${CurrencyFormatter.format(value)} (${pct.toFixed(1)}%)`;

        if (businessModel === 'commissioned') {
            element.innerHTML = fmt(roi.base.value, roi.base.percentage);
        } else {
            element.innerHTML = `
                ${fmt(roi.base.value, roi.base.percentage)}<br>
                <span class="text-sm text-gray-600">
                    ${__('optimistic')}: ${fmt(roi.optimistic.value, roi.optimistic.percentage)}<br>
                    ${__('pessimistic')}: ${fmt(roi.pessimistic.value, roi.pessimistic.percentage)}
                </span>`;
        }

        element.className = roi.base.value >= 0
            ? 'text-2xl font-bold text-green-500'
            : 'text-2xl font-bold text-red-500';
    }

    /**
     * Updates breakeven information in the UI
     * @param {number} breakeven - Breakeven period in months
     */
    static updateBreakeven(breakeven) {
        if (typeof breakeven !== 'number') return;
        this.updateElement(
            'breakeven',
            breakeven !== Infinity
                ? `${Math.ceil(breakeven)} ${__('months')}`
                : __('not-reachable')
        );
    }

    /**
     * Updates evaluation and risk index in the UI
     * @param {string} evaluation - Evaluation HTML
     * @param {Object} riskIndex - Risk index data
     */
    static updateEvaluation(evaluation, riskIndex) {
        if (!evaluation || !riskIndex) return;

        const element = document.getElementById('overall-evaluation');
        if (!element) return;

        element.innerHTML = `${evaluation}
            <br><br><span class="font-bold">${__('risk-index')}: ${riskIndex.level} (${riskIndex.score}/100)</span>`;
    }

    /**
     * Displays an error message in the UI
     * @param {string} message - Error message to display
     */
    static displayError(message) {
        if (!message) return;
        const element = document.getElementById('overall-evaluation');
        if (element) element.innerHTML = `<span class="text-red-600">${message}</span>`;
        console.error(message);
    }

    /**
     * Shows a temporary toast message
     * @param {string} message
     * @param {string} type - 'success' or 'error'
     */
    static displayTemporaryMessage(message, type = 'success') {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'fixed', top: '20px', right: '20px',
            padding: '14px 20px', borderRadius: '12px',
            background: type === 'success' ? '#059669' : '#dc2626',
            color: '#fff', fontSize: '13px', fontWeight: '600',
            fontFamily: 'inherit',
            boxShadow: '0 10px 25px rgba(0,0,0,.15)',
            zIndex: '9999', opacity: '0',
            transition: 'opacity .25s'
        });
        container.textContent = message;
        document.body.appendChild(container);
        requestAnimationFrame(() => { container.style.opacity = '1'; });
        setTimeout(() => {
            container.style.opacity = '0';
            setTimeout(() => container.remove(), 300);
        }, 3000);
    }
}
