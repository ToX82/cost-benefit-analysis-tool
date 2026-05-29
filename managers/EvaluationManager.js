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
            this.evaluateBusinessModel(inputs)
        ];
        return evaluations.filter(e => e).join('<br><br>');
    }

    static evaluateFinancials(roi, breakeven) {
        const { value: roiValue, percentage: roiPct } = roi.base;

        if (roiValue < 0) {
            return `<span class="eval-badge danger">${__('project-loss-warning')}</span> ${__('project-loss-detail', Math.abs(roiPct).toFixed(1))}`;
        }

        if (breakeven > 24) {
            return `<span class="eval-badge warning">${__('high-breakeven-warning')}</span> ${__('high-breakeven-detail', Math.ceil(breakeven))}`;
        }

        if (roiPct >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return `<span class="eval-badge success">${__('excellent-profitability')}</span> ${__('excellent-profitability-detail', roiPct.toFixed(1))}`;
        }
        if (roiPct >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return `<span class="eval-badge success">${__('good-profitability')}</span> ${__('good-profitability-detail', roiPct.toFixed(1))}`;
        }
        if (roiPct >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return `<span class="eval-badge info">${__('moderate-profitability')}</span> ${__('moderate-profitability-detail', roiPct.toFixed(1))}`;
        }
        if (roiPct >= CONFIG.ROI_THRESHOLDS.LOW) {
            return `<span class="eval-badge warning">${__('low-profitability')}</span> ${__('low-profitability-detail', roiPct.toFixed(1))}`;
        }
        return `<span class="eval-badge danger">${__('critical-profitability')}</span> ${__('critical-profitability-detail', roiPct.toFixed(1))}`;
    }

    static evaluateBusinessModel(inputs) {
        if (inputs.businessModel === 'commissioned') {
            const ratio = inputs.annualizedCosts > 0
                ? inputs.onetimeRevenue / inputs.annualizedCosts
                : 0;
            if (ratio < 0.3) {
                return `<span class="eval-badge warning">${__('payment-structure')}</span> ${__('low-upfront-detail', (ratio * 100).toFixed(1))}`;
            }
        } else if (inputs.businessModel === 'mixed' && inputs.onetimeRevenue > 0 && inputs.monthlyRecurring > 0) {
            const recurringRatio = (inputs.monthlyRecurring * 12) / inputs.onetimeRevenue;
            if (recurringRatio < 0.5) {
                return `<span class="eval-badge warning">${__('revenue-mix')}</span> ${__('low-recurring-revenue')}`;
            }
        }
        return '';
    }
}
