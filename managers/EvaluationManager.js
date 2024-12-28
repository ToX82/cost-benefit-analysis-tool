import { CONFIG } from '../config.js';
import { __ } from '../utils/I18n.js';

export class EvaluationManager {
    static getROIEvaluation(roiPercentage) {
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return __('roi-excellent');
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return __('roi-good');
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return __('roi-moderate');
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.LOW) {
            return __('roi-low');
        }
        return __('roi-loss');
    }

    static addOverallEvaluation(evaluation, roi, breakeven, inputs) {
        const evaluations = [];

        evaluations.push(this.evaluateFinancials(roi, breakeven, inputs));
        evaluations.push(this.evaluateTimeline(inputs));
        evaluations.push(this.evaluateResources(inputs));
        evaluations.push(this.evaluateBusinessModel(inputs, roi, breakeven));

        return evaluations.filter(e => e).join('<br><br>');
    }

    static evaluateFinancials(roi, breakeven, inputs) {
        const roiValue = roi.base.value;
        const roiPercentage = roi.base.percentage;

        if (roiValue <= 0) {
            return `<span class="text-red-600 font-semibold">${__('project-loss-warning')}</span>.
                    ${__('project-loss-detail', roiPercentage.toFixed(1))}`;
        }

        if (breakeven > 24) {
            return `<span class="text-yellow-600 font-semibold">${__('high-breakeven-warning')}</span>.
                    ${__('high-breakeven-detail', Math.ceil(breakeven))}`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return `<span class="text-green-600 font-semibold">${__('excellent-profitability')}</span>.
                    ${__('excellent-profitability-detail', roiPercentage.toFixed(1))}`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return `<span class="text-green-600 font-semibold">${__('good-profitability')}</span>.
                    ${__('good-profitability-detail', roiPercentage.toFixed(1))}`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return `<span class="text-blue-600 font-semibold">${__('moderate-profitability')}</span>.
                    ${__('moderate-profitability-detail', roiPercentage.toFixed(1))}`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.LOW) {
            return `<span class="text-yellow-600 font-semibold">${__('low-profitability')}</span>.
                    ${__('low-profitability-detail', roiPercentage.toFixed(1))}`;
        }

        return `<span class="text-red-600 font-semibold">${__('critical-profitability')}</span>.
                ${__('critical-profitability-detail', roiPercentage.toFixed(1))}`;
    }

    static evaluateTimeline(inputs) {
        const warnings = [];

        if (inputs.devWeeks > 16) {
            warnings.push(__('long-development', inputs.devWeeks));
        }

        if (inputs.devWeeks < 4) {
            warnings.push(__('short-development', inputs.devWeeks));
        }

        return warnings.length ?
            `<span class="text-yellow-600 font-semibold">${__('timeline')}:</span><br>` +
            warnings.join('<br>') : '';
    }

    static evaluateResources(inputs) {
        if (inputs.devOccupation > 80) {
            return `<span class="text-red-600 font-semibold">${__('resource-saturation-risk')}</span>.
                    ${__('resource-saturation-detail', inputs.devOccupation)}`;
        }

        if (inputs.devOccupation < 30) {
            return `<span class="text-yellow-600 font-semibold">${__('low-allocation-warning')}</span>.
                    ${__('low-allocation-detail', inputs.devOccupation)}`;
        }

        return '';
    }

    static evaluateBusinessModel(inputs, roi, breakeven) {
        if (inputs.businessModel === 'commissioned') {
            const upfrontRatio = inputs.upfrontPayment / (inputs.directCosts + inputs.indirectCosts);

            if (upfrontRatio < 0.3) {
                return `<span class="text-yellow-600 font-semibold">${__('payment-structure')}</span>:
                        ${__('low-upfront-detail', (upfrontRatio * 100).toFixed(1))}`;
            }
        } else {
            const recurringRatio = (inputs.recurringRevenue * inputs.expectedUsers * 12) /
                                 (inputs.upfrontPayment + inputs.finalPayment);

            if (recurringRatio < 0.5) {
                return `<span class="text-yellow-600 font-semibold">${__('revenue-mix')}</span>:
                        ${__('low-recurring-revenue')}`;
            }
        }

        return '';
    }
}