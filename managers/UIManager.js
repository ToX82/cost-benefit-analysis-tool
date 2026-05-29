import { CONFIG } from '../config.js';
import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';
import { __ } from '../utils/I18n.js';

/**
 * Manages UI updates and interactions
 */
export class UIManager {
    static updateElement(id, value) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
            return;
        }
        element.textContent = value;
    }

    static updatePageHeader(projectName) {
        const el = document.getElementById('page-subtitle');
        if (!el) return;

        if (projectName) {
            el.innerHTML = `${__('page-subtitle-project')} <strong>${projectName}</strong>`;
        } else {
            el.textContent = __('page-subtitle-default');
        }
    }

    static setResultCardState(cardId, state) {
        const card = document.getElementById(cardId);
        if (!card) return;
        card.classList.remove('is-positive', 'is-negative', 'is-warning', 'is-neutral');
        if (state) card.classList.add(state);
    }

    static updateFinancialDetails(costs, revenues, roi) {
        if (!costs || !revenues) return;
        this.updateElement('total-costs-detail', CurrencyFormatter.format(costs.base));
        this.updateElement('direct-revenue-detail', CurrencyFormatter.format(revenues.onetime));
        this.updateElement('yearly-revenue-detail', CurrencyFormatter.format(revenues.yearly));
        this.updateElement('total-commissions-detail', CurrencyFormatter.format(revenues.totalCommissions ?? 0));

        const acqRow = document.getElementById('acquisition-cost-row');
        const acqEl  = document.getElementById('acquisition-cost-detail');
        const acqSpend = costs.acquisition?.base ?? 0;
        if (acqRow) acqRow.classList.toggle('hidden', acqSpend <= 0);
        if (acqEl && acqSpend > 0) {
            acqEl.textContent = CurrencyFormatter.format(acqSpend);
        }

        const netProfit = roi?.base?.value ?? (revenues.onetime + revenues.yearly - costs.base);
        const el = document.getElementById('annual-net-profit-detail');
        const totalRow = document.querySelector('.fin-row-total');
        if (el) {
            el.textContent = CurrencyFormatter.format(netProfit);
            el.style.color = netProfit >= 0 ? '#059669' : '#ef4444';
        }
        if (totalRow) {
            totalRow.style.borderTopColor = netProfit >= 0 ? '#fde68a' : '#fecaca';
        }

        this.setResultCardState('financial-card', netProfit >= 0 ? 'is-positive' : 'is-negative');

        const overline = document.querySelector('#financial-card .overline');
        if (overline) overline.style.color = netProfit >= 0 ? '#f59e0b' : '#ef4444';
    }

    static updateRevenueSummary(roiProjections) {
        const element = document.getElementById('users-scenarios');
        const businessModel = document.getElementById('business-model')?.value;

        if (!element) return;

        if (businessModel === 'commissioned' || !roiProjections) {
            element.classList.add('hidden');
            return;
        }

        element.classList.remove('hidden');
        const fmt = ({ value, percentage }) =>
            `${CurrencyFormatter.format(value)} (${percentage.toFixed(1)}%)`;
        const p = roiProjections;

        const row = (year, data) => `
            <div style="margin-bottom:8px;">
                <span class="projection-year"><strong>${year}</strong></span>
                <div class="projection-values" style="display:flex;flex-direction:column;gap:3px;margin-top:4px;">
                    <span class="v-pess"><span style="font-size:10px;font-weight:700;color:#ea580c;text-transform:uppercase;">${__('scenario-abbr-pess')}:</span> ${fmt(data.pessimistic)}</span>
                    <span class="v-base"><span style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;">${__('scenario-abbr-base')}:</span> ${fmt(data.base)}</span>
                    <span class="v-opt"><span style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;">${__('scenario-abbr-opt')}:</span> ${fmt(data.optimistic)}</span>
                </div>
            </div>`;

        element.innerHTML = `
            <div style="margin-bottom:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;">${__('projection-scenarios-label')}</div>
            <p class="hint-text" style="margin-bottom:8px;">${__('projection-order-hint')}</p>
            ${row(__('projection-year-1'), p.m12)}
            ${row(__('projection-year-2'), p.m24)}
            ${row(__('projection-year-3'), p.m36)}
        `;
    }

    static updateROI(roi, businessModel) {
        if (!roi?.base) return;

        const element = document.getElementById('roi');
        if (!element) return;

        const fmt = (value, pct) =>
            `${CurrencyFormatter.format(value)} (${pct.toFixed(1)}%)`;

        const isPositive = roi.base.value >= 0;
        element.className = `roi-hero tabular${isPositive ? '' : ' is-negative'}`;

        if (businessModel === 'commissioned') {
            element.innerHTML = `
                ${fmt(roi.base.value, roi.base.percentage)}
                <p class="hint-text" style="margin-top:8px;font-weight:500;line-height:1.45;">${__('roi-12-months-hint')}</p>`;
        } else {
            element.innerHTML = `
                ${fmt(roi.base.value, roi.base.percentage)}
                <p class="hint-text" style="margin-top:8px;font-weight:500;line-height:1.45;">${__('roi-12-months-hint')}</p>
                <div class="roi-scenarios">
                    <div class="roi-scenario-row">
                        <span class="roi-scenario-label opt">${__('optimistic')}<span style="display:block;font-weight:400;font-size:10px;color:#94a3b8;">${__('roi-scenario-opt-hint')}</span></span>
                        <span class="roi-scenario-value tabular">${fmt(roi.optimistic.value, roi.optimistic.percentage)}</span>
                    </div>
                    <div class="roi-scenario-row">
                        <span class="roi-scenario-label pess">${__('pessimistic')}<span style="display:block;font-weight:400;font-size:10px;color:#94a3b8;">${__('roi-scenario-pess-hint')}</span></span>
                        <span class="roi-scenario-value tabular">${fmt(roi.pessimistic.value, roi.pessimistic.percentage)}</span>
                    </div>
                </div>`;
        }

        this.setResultCardState('roi-card', isPositive ? 'is-positive' : 'is-negative');

        const overline = document.querySelector('#roi-card .overline');
        if (overline) overline.style.color = isPositive ? '#10b981' : '#ef4444';
    }

    static updateBreakeven(breakeven) {
        if (typeof breakeven !== 'number') return;

        const el = document.getElementById('breakeven');
        if (!el) return;

        const text = breakeven !== Infinity
            ? `${Math.ceil(breakeven)} ${__('months')}`
            : __('not-reachable');
        el.innerHTML = `${text}<p class="hint-text" style="margin-top:8px;font-weight:500;line-height:1.45;">${__('breakeven-time-hint')}</p>`;

        el.className = 'stat-hero tabular';
        if (breakeven === Infinity) {
            el.classList.add('is-danger');
            this.setResultCardState('breakeven-card', 'is-warning');
        } else if (breakeven > 24) {
            el.classList.add('is-warning');
            this.setResultCardState('breakeven-card', 'is-warning');
        } else {
            this.setResultCardState('breakeven-card', 'is-neutral');
        }
    }

    static getRiskMeterClass(score) {
        if (score >= CONFIG.RISK_THRESHOLDS.VERY_HIGH) return 'critical';
        if (score >= CONFIG.RISK_THRESHOLDS.HIGH) return 'high';
        if (score >= CONFIG.RISK_THRESHOLDS.MEDIUM) return 'medium';
        return 'low';
    }

    static updateEvaluation(evaluation, riskIndex, roi = null) {
        if (!evaluation || !riskIndex) return;

        const element = document.getElementById('overall-evaluation');
        const card = document.getElementById('eval-card');
        if (!element) return;

        const paragraphs = evaluation.split('<br><br>').filter(Boolean);
        element.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');

        const meterClass = this.getRiskMeterClass(riskIndex.score);
        const riskHtml = `
            <div class="risk-panel">
                <div class="risk-panel-header">
                    <span class="risk-panel-label">${__('risk-index')}</span>
                    <span class="risk-panel-score">${riskIndex.level} · ${riskIndex.score}/100</span>
                </div>
                <div class="risk-meter" role="meter" aria-valuenow="${riskIndex.score}" aria-valuemin="0" aria-valuemax="100" aria-label="${__('risk-index')}">
                    <div class="risk-meter-fill ${meterClass}" style="width:${riskIndex.score}%"></div>
                </div>
            </div>`;

        element.insertAdjacentHTML('beforeend', riskHtml);

        if (card) {
            card.classList.remove('is-danger', 'is-warning', 'is-success');
            if (roi?.base?.value < 0 || riskIndex.score >= CONFIG.RISK_THRESHOLDS.VERY_HIGH) {
                card.classList.add('is-danger');
            } else if (riskIndex.score >= CONFIG.RISK_THRESHOLDS.HIGH || roi?.base?.percentage < CONFIG.ROI_THRESHOLDS.LOW) {
                card.classList.add('is-warning');
            } else if (roi?.base?.value > 0) {
                card.classList.add('is-success');
            }
        }
    }

    static updateUnitEconomics(data) {
        if (!data) return;
        const fmt    = v => CurrencyFormatter.format(v);
        const fmtPct = v => v !== null ? `${v.toFixed(1)}%` : '—';
        const fmtRatio = v => v !== null ? `${v.toFixed(1)}x` : '—';
        const fmtMonths = v => v !== null ? `${Math.ceil(v)} ${__('months')}` : '—';

        this.updateElement('ue-ltv',      data.ltv > 0 ? fmt(data.ltv) : '—');
        this.updateElement('ue-cac',      data.cac > 0 ? fmt(data.cac) : '—');
        this.updateElement('ue-ltvcac',   fmtRatio(data.ltvCac));
        this.updateElement('ue-payback',  fmtMonths(data.cacPayback));
        this.updateElement('ue-commrate', data.commRate > 0 ? fmtPct(data.commRate) : '—');
        this.updateElement('ue-gmargin',  data.grossMarginPct !== null ? fmtPct(data.grossMarginPct) : '—');
        this.updateElement('ue-nmargin',  data.netMarginPct  !== null ? fmtPct(data.netMarginPct)  : '—');

        const ltvcacTile = document.getElementById('ue-ltvcac-tile');
        if (ltvcacTile && data.ltvCac !== null) {
            ltvcacTile.classList.remove('is-good', 'is-warning', 'is-bad');
            ltvcacTile.classList.add(data.ltvCac >= 3 ? 'is-good' : data.ltvCac >= 1 ? 'is-warning' : 'is-bad');
        }

        const nmarginEl = document.getElementById('ue-nmargin');
        const nmarginTile = document.getElementById('ue-nmargin-tile');
        if (nmarginEl && data.netMarginPct !== null) {
            nmarginEl.style.color = data.netMarginPct >= 0 ? '#059669' : '#ef4444';
            nmarginTile?.classList.remove('is-good', 'is-warning', 'is-bad');
            nmarginTile?.classList.add(data.netMarginPct >= 20 ? 'is-good' : data.netMarginPct >= 0 ? 'is-warning' : 'is-bad');
        }
    }

    static updateCashFlowChart(months) {
        const el = document.getElementById('cashflow-chart');
        if (!el || !months?.length) return;

        const W = el.clientWidth || 600;
        const H = 180;
        const pad = { top: 20, right: 16, bottom: 32, left: 72 };
        const iW  = W - pad.left - pad.right;
        const iH  = H - pad.top  - pad.bottom;

        const min = Math.min(0, ...months);
        const max = Math.max(0, ...months);
        const range = max - min || 1;

        const xOf = i => pad.left + (i / (months.length - 1)) * iW;
        const yOf = v => pad.top  + iH - ((v - min) / range) * iH;
        const y0  = yOf(0);

        const pts  = months.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
        const area = `${pad.left},${y0} ` + pts + ` ${xOf(months.length - 1)},${y0}`;

        const fmtShort = v => {
            const abs = Math.abs(v);
            if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M €`;
            if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k €`;
            return CurrencyFormatter.format(v);
        };

        const yTicks = [...new Set([min, 0, max].map(v => Math.round(v * 100) / 100))].sort((a, b) => a - b);
        const ticks = [0, 6, 12, 18, 24, 30, 36].filter(i => i < months.length);
        const lineColor = max >= 0 && months[months.length - 1] >= 0 ? '#10b981' : '#4f46e5';

        el.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block;" aria-label="Cash flow cumulativo 36 mesi">
            <defs>
                <linearGradient id="cfGradPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity=".22"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="cfGradNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#ef4444" stop-opacity="0"/>
                    <stop offset="100%" stop-color="#ef4444" stop-opacity=".18"/>
                </linearGradient>
            </defs>
            <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + iH}"
                stroke="#e2e8f0" stroke-width="1"/>
            <line x1="${pad.left}" y1="${y0}" x2="${pad.left + iW}" y2="${y0}"
                stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4"/>
            ${yTicks.map(v => {
                const y = yOf(v);
                return `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end"
                    font-size="10" fill="${v === 0 ? '#64748b' : '#94a3b8'}" font-weight="${v === 0 ? '600' : '400'}">${fmtShort(v)}</text>
                <line x1="${pad.left}" y1="${y}" x2="${pad.left + iW}" y2="${y}"
                    stroke="#f1f5f9" stroke-width="1"/>`;
            }).join('')}
            <polygon points="${area}" fill="url(#${months[months.length - 1] >= 0 ? 'cfGradPos' : 'cfGradNeg'})"/>
            <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            ${ticks.map(i => {
                const isYear = i > 0 && i % 12 === 0;
                const lbl = isYear ? `${__('cashflow-year-short')}${i / 12}` : `${i}m`;
                return `<text x="${xOf(i).toFixed(1)}" y="${pad.top + iH + 18}"
                    text-anchor="middle" font-size="10" fill="${isYear ? '#4f46e5' : '#94a3b8'}"
                    font-weight="${isYear ? '700' : '400'}">${lbl}</text>`;
            }).join('')}
        </svg>`;
    }

    static displayError(message) {
        if (!message) return;
        const element = document.getElementById('overall-evaluation');
        const card = document.getElementById('eval-card');
        if (element) element.innerHTML = `<p><span class="eval-badge danger">${message}</span></p>`;
        if (card) card.classList.add('is-danger');
        console.error(message);
    }

    static displayTemporaryMessage(message, type = 'success') {
        const colors = { success: '#059669', error: '#dc2626', info: '#2563eb' };
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'fixed', top: '20px', right: '20px',
            padding: '14px 20px', borderRadius: '12px',
            background: colors[type] ?? colors.error,
            color: '#fff', fontSize: '13px', fontWeight: '600',
            fontFamily: 'inherit',
            boxShadow: '0 10px 25px rgba(0,0,0,.15)',
            zIndex: '9999', opacity: '0',
            transition: 'opacity .25s'
        });
        container.textContent = message;
        document.body.appendChild(container);
        requestAnimationFrame(() => { container.style.opacity = '1'; });
        const duration = type === 'info' ? 5000 : 3000;
        setTimeout(() => {
            container.style.opacity = '0';
            setTimeout(() => container.remove(), 300);
        }, duration);
    }
}
