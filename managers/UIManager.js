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
        if (!costs || !revenues) {
            console.error('Invalid financial data provided');
            return;
        }

        this.updateElement('total-costs-detail', CurrencyFormatter.format(costs.totalCosts));
        this.updateElement('direct-revenue-detail', CurrencyFormatter.format(revenues.direct));
        this.updateElement('yearly-revenue-detail', CurrencyFormatter.format(revenues.yearly));
    }

    /**
     * Updates user scenarios in the UI
     * @param {Object} scenarios - User scenarios data
     */
    static updateUserScenarios(scenarios) {
        if (!scenarios) {
            console.error('Invalid scenarios data provided');
            return;
        }

        const element = document.getElementById('users-scenarios');
        const businessModel = document.getElementById('business-model')?.value;

        if (!element) {
            console.warn('Users scenarios element not found');
            return;
        }

        // Only show scenarios for SaaS and mixed models
        if (businessModel === 'commissioned') {
            element.classList.add('hidden');
            return;
        }

        element.classList.remove('hidden');
        element.innerHTML = `
            ${__('base-scenario')}: ${scenarios.base} ${__('users')}<br>
            ${__('optimistic-scenario')}: ${scenarios.optimistic} ${__('users')}<br>
            ${__('pessimistic-scenario')}: ${scenarios.pessimistic} ${__('users')}
        `;
    }

    /**
     * Updates ROI information in the UI
     * @param {Object} roi - ROI data
     */
    static updateROI(roi) {
        if (!roi || !roi.base) {
            console.error('Invalid ROI data provided');
            return;
        }

        const element = document.getElementById('roi');
        const businessModelSelect = document.getElementById('business-model');

        if (!element || !businessModelSelect) {
            console.warn('Required elements not found');
            return;
        }

        const formatROI = (value, percentage) =>
            `${CurrencyFormatter.format(value)} (${percentage.toFixed(1)}%)`;

        if (businessModelSelect.value === 'commissioned') {
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

        element.className = this.getROIClassName(roi.base.value);
    }

    /**
     * Updates breakeven information in the UI
     * @param {number} breakeven - Breakeven period in months
     */
    static updateBreakeven(breakeven) {
        if (typeof breakeven !== 'number') {
            console.error('Invalid breakeven value provided');
            return;
        }

        this.updateElement(
            'breakeven',
            breakeven !== Infinity ?
                `${Math.ceil(breakeven)} ${__('months')}` :
                __('not-reachable')
        );
    }

    /**
     * Updates evaluation and risk index in the UI
     * @param {string} evaluation - Evaluation text
     * @param {Object} riskIndex - Risk index data
     */
    static updateEvaluation(evaluation, riskIndex) {
        if (!evaluation || !riskIndex) {
            console.error('Invalid evaluation data provided');
            return;
        }

        const element = document.getElementById('overall-evaluation');
        if (!element) {
            console.warn('Evaluation element not found');
            return;
        }

        element.innerHTML = `${evaluation}
            <br><br><span class="font-bold">${__('risk-index')}: ${riskIndex.level} (${riskIndex.score}/100)</span>`;
    }

    /**
     * Displays an error message in the UI
     * @param {string} message - Error message to display
     */
    static displayError(message) {
        if (!message) {
            console.warn('Empty error message provided');
            return;
        }

        const element = document.getElementById('overall-evaluation');
        if (element) {
            element.innerHTML = `<span class="text-red-600">${message}</span>`;
        }
        console.error(message);
    }

    /**
     * Gets the appropriate CSS class for ROI display
     * @private
     * @param {number} roiValue - ROI value
     * @returns {string} CSS class name
     */
    static getROIClassName(roiValue) {
        return roiValue >= 0 ?
            'text-2xl font-bold text-green-500' :
            'text-2xl font-bold text-red-500';
    }

    /**
     * Shows a temporary message to the user
     * @param {string} message - The message to display
     * @param {string} type - The message type ('success' or 'error')
     */
    static displayTemporaryMessage(message, type = 'success') {
        const container = document.createElement('div');
        container.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white z-50 transition-opacity duration-300`;
        container.textContent = message;

        document.body.appendChild(container);

        // Fade in
        requestAnimationFrame(() => {
            container.style.opacity = '1';
        });

        // Fade out and remove after 3 seconds
        setTimeout(() => {
            container.style.opacity = '0';
            setTimeout(() => container.remove(), 300);
        }, 3000);
    }
}