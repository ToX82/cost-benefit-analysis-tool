import { CONFIG } from '../config.js';
import { __ } from '../utils/I18n.js';

/**
 * Handles evaluation and assessment of project metrics and KPIs.
 * Inputs must include: businessModel, onetimeRevenue, monthlyRecurring, annualizedCosts.
 */
export class EvaluationManager {
    static getROIEvaluation(roiPercentage) {
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.EXCELLENT) return __('roi-excellent');
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.GOOD)      return __('roi-good');
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.MODERATE)  return __('roi-moderate');
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.LOW)       return __('roi-low');
        return __('roi-loss');
    }

    static addOverallEvaluation(evaluation, roi, breakeven, inputs) {
        const evaluations = [
            this.evaluateFinancials(roi, breakeven),
            this.evaluateTimeline(inputs),
            this.evaluateResources(inputs),
            this.evaluateBusinessModel(inputs)
        ];
        return evaluations.filter(e => e).join('<br><br>');
    }

    static evaluateFinancials(roi, breakeven) {
        const { value: roiValue, percentage: roiPct } = roi.base;

        if (roiValue < 0) {
            return `<span class="text-red-600 font-semibold">${__('project-loss-warning')}</span>. ${__('project-loss-detail', Math.abs(roiPct).toFixed(1))}`;
        }

        if (breakeven > 24) {
            return `<span class="text-yellow-600 font-semibold">${__('high-breakeven-warning')}</span>. ${__('high-breakeven-detail', Math.ceil(breakeven))}`;
        }

        if (roiPct >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return `<span class="text-green-600 font-semibold">${__('excellent-profitability')}</span>. ${__('excellent-profitability-detail', roiPct.toFixed(1))}`;
        }
        if (roiPct >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return `<span class="text-green-600 font-semibold">${__('good-profitability')}</span>. ${__('good-profitability-detail', roiPct.toFixed(1))}`;
        }
        if (roiPct >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return `<span class="text-blue-600 font-semibold">${__('moderate-profitability')}</span>. ${__('moderate-profitability-detail', roiPct.toFixed(1))}`;
        }
        if (roiPct >= CONFIG.ROI_THRESHOLDS.LOW) {
            return `<span class="text-yellow-600 font-semibold">${__('low-profitability')}</span>. ${__('low-profitability-detail', roiPct.toFixed(1))}`;
        }
        return `<span class="text-red-600 font-semibold">${__('critical-profitability')}</span>. ${__('critical-profitability-detail', roiPct.toFixed(1))}`;
    }

    static evaluateTimeline(inputs) {
        const warnings = [];
        if (inputs.devWeeks > 16) warnings.push(__('long-development', inputs.devWeeks));
        if (inputs.devWeeks < 4)  warnings.push(__('short-development', inputs.devWeeks));
        return warnings.length
            ? `<span class="text-yellow-600 font-semibold">${__('timeline')}:</span><br>` + warnings.join('<br>')
            : '';
    }

    static evaluateResources(inputs) {
        if (inputs.devOccupation > 80) {
            return `<span class="text-red-600 font-semibold">${__('resource-saturation-risk')}</span>. ${__('resource-saturation-detail', inputs.devOccupation)}`;
        }
        if (inputs.devOccupation < 30) {
            return `<span class="text-yellow-600 font-semibold">${__('low-allocation-warning')}</span>. ${__('low-allocation-detail', inputs.devOccupation)}`;
        }
        return '';
    }

    static evaluateBusinessModel(inputs) {
        if (inputs.businessModel === 'commissioned') {
            const ratio = inputs.annualizedCosts > 0
                ? inputs.onetimeRevenue / inputs.annualizedCosts
                : 0;
            if (ratio < 0.3) {
                return `<span class="text-yellow-600 font-semibold">${__('payment-structure')}</span>: ${__('low-upfront-detail', (ratio * 100).toFixed(1))}`;
            }
        } else if (inputs.businessModel === 'mixed' && inputs.onetimeRevenue > 0 && inputs.monthlyRecurring > 0) {
            const recurringRatio = (inputs.monthlyRecurring * 12) / inputs.onetimeRevenue;
            if (recurringRatio < 0.5) {
                return `<span class="text-yellow-600 font-semibold">${__('revenue-mix')}</span>: ${__('low-recurring-revenue')}`;
            }
        }
        return '';
    }
}
