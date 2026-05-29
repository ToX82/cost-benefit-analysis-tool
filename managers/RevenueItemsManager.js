import { __ } from '../utils/I18n.js';
import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';

/**
 * Manages one-time revenues and recurring subscription tiers.
 *
 * Growth model: each tier stores a monthly acquisition rate (new users/month),
 * not a static user count. Active users at month M:
 *   - subscription: U(M) = (acq/churn) × (1 - (1-churn)^M)   if churn > 0
 *                          acq × M                             if churn = 0
 *   - one-time: cumulative sold = acq × M (revenue = acq × netPrice each month)
 *
 * Net tier revenue = (price - commissionPerUnit) × active users.
 */
export class RevenueItemsManager {
    static #onetimeItems = [];
    static #recurringTiers = [];
    static #onetimeCounter = 0;
    static #tierCounter = 0;

    static initialize() {
        document.getElementById('add-onetime-btn')?.addEventListener('click', () => this.addOnetimeRevenue());
        document.getElementById('add-tier-btn')?.addEventListener('click', () => this.addRecurringTier());
    }

    // ── One-time revenues ─────────────────────────────────────────────────────

    static #createOnetimeRow(id, label = '', amount = '') {
        const tr = document.createElement('tr');
        tr.dataset.onetimeId = id;

        tr.innerHTML = `
            <td>
                <input type="text" data-onetime-label class="inp" style="font-size:13px;padding:7px 10px;"
                    placeholder="${__('onetime-label-placeholder')}" value="${label}">
            </td>
            <td class="right">
                <div style="position:relative;display:inline-block;width:130px;">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:13px;pointer-events:none;">€</span>
                    <input type="number" data-onetime-amount min="0" step="any"
                        class="inp" style="font-size:13px;padding:7px 10px 7px 24px;text-align:right;font-weight:600;width:130px;"
                        placeholder="0" value="${amount}">
                </div>
            </td>
            <td class="center">
                <button type="button" class="btn-icon">×</button>
            </td>`;

        tr.querySelector('button').addEventListener('click', () => this.removeOnetimeRevenue(id));
        tr.querySelectorAll('input').forEach(el => el.addEventListener('input', () => this.updateOnetimeRevenue(id)));
        return tr;
    }

    static addOnetimeRevenue(label = '', amount = '') {
        const id = `onetime-${++this.#onetimeCounter}`;
        document.getElementById('onetime-items-body').appendChild(this.#createOnetimeRow(id, label, amount));
        this.#onetimeItems.push({ id, label, amount: parseFloat(amount) || 0 });
        this.#refreshOnetime();
        this.#dispatch();
    }

    static removeOnetimeRevenue(id) {
        document.querySelector(`[data-onetime-id="${id}"]`)?.remove();
        this.#onetimeItems = this.#onetimeItems.filter(i => i.id !== id);
        this.#refreshOnetime();
        this.#dispatch();
    }

    static updateOnetimeRevenue(id) {
        const el = document.querySelector(`[data-onetime-id="${id}"]`);
        if (!el) return;
        const idx = this.#onetimeItems.findIndex(i => i.id === id);
        if (idx === -1) return;
        this.#onetimeItems[idx] = {
            id,
            label: el.querySelector('[data-onetime-label]').value,
            amount: parseFloat(el.querySelector('[data-onetime-amount]').value) || 0
        };
        this.#refreshOnetime();
        this.#dispatch();
    }

    static getTotalOnetimeRevenue() {
        return this.#onetimeItems.reduce((sum, i) => sum + i.amount, 0);
    }

    static #refreshOnetime() {
        const total = this.getTotalOnetimeRevenue();
        const el = document.getElementById('onetime-grand-total');
        if (el) el.textContent = CurrencyFormatter.format(total);

        const count = this.#onetimeItems.length;
        document.getElementById('onetime-empty-state')?.classList.toggle('hidden', count > 0);
        document.getElementById('onetime-table-wrapper')?.classList.toggle('hidden', count === 0);
    }

    // ── Recurring tiers (card layout) ─────────────────────────────────────────

    static #createTierCard(id, label, price, commission, baseAcq, optimisticAcq, pessimisticAcq,
                           elaborationsPerLicense = '', licenseType = 'monthly', churnRate = '') {
        const card = document.createElement('div');
        card.dataset.tierId = id;
        card.className = 'tier-card';

        const isOnetime = licenseType === 'onetime';
        const fmtInp = (attr, val, colorCls = '') =>
            `<input type="number" ${attr} min="0" step="1"
                class="scenario-units-inp ${colorCls}" placeholder="0" value="${val}">`;
        const priceUnit = isOnetime ? __('per-license') : __('per-user-month');

        card.innerHTML = `
            <!-- Header: name + type toggle + delete -->
            <div class="tier-head">
                <input type="text" data-tier-label
                    placeholder="${__('tier-name-placeholder')}" value="${label}">
                <div class="tier-type-toggle">
                    <button type="button" data-tier-type-btn="monthly"
                        class="tier-type-btn${!isOnetime ? ' active' : ''}">${__('license-type-monthly')}</button>
                    <button type="button" data-tier-type-btn="onetime"
                        class="tier-type-btn${isOnetime ? ' active' : ''}">${__('license-type-onetime')}</button>
                </div>
                <input type="hidden" data-tier-license-type value="${licenseType}">
                <button type="button" class="btn-icon" data-tier-delete style="flex-shrink:0;">×</button>
            </div>

            <!-- Pricing block -->
            <div class="tier-pricing">
                <div class="tier-pricing-col">
                    <div class="tier-pricing-label" style="color:#94a3b8;">${__('tier-price-label')}</div>
                    <div style="position:relative;">
                        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#94a3b8;pointer-events:none;">€</span>
                        <input type="number" data-tier-price min="0" step="any"
                            class="inp" style="font-size:14px;font-weight:700;padding:7px 8px 7px 20px;text-align:center;"
                            placeholder="0" value="${price}">
                    </div>
                    <div class="tier-pricing-unit" data-tier-price-unit>${priceUnit}</div>
                </div>
                <div class="tier-pricing-col">
                    <div class="tier-pricing-label" style="color:#fca5a5;">${__('tier-commission-label')}</div>
                    <div style="position:relative;">
                        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#fca5a5;pointer-events:none;">€</span>
                        <input type="number" data-tier-commission min="0" step="any"
                            class="inp inp-danger" style="font-size:14px;font-weight:700;padding:7px 8px 7px 20px;text-align:center;color:#ef4444;"
                            placeholder="0" value="${commission}">
                    </div>
                    <div class="tier-pricing-unit" data-tier-commission-unit>${isOnetime ? __('per-license') : __('per-license-year')}</div>
                </div>
                <div class="tier-pricing-col" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <div class="tier-pricing-label" style="color:#34d399;">${__('tier-net-label')}</div>
                    <div data-tier-net style="font-size:18px;font-weight:800;color:#059669;letter-spacing:-0.4px;margin:6px 0;">—</div>
                    <div class="tier-pricing-unit" data-tier-net-unit>${priceUnit}</div>
                </div>
            </div>

            <!-- Elaborations per license -->
            <div class="tier-elab">
                <span class="tier-elab-label">${__('elab-per-license-label')}</span>
                <input type="number" data-tier-elaborations min="0" step="1"
                    class="inp-bare" style="width:64px;font-weight:700;font-size:14px;"
                    placeholder="0" value="${elaborationsPerLicense}">
                <span style="font-size:10px;color:#94a3b8;">${__('elab-per-license-unit')}</span>
            </div>

            <!-- Churn rate (monthly tiers only) -->
            <div class="tier-elab" data-churn-row style="${isOnetime ? 'display:none;' : ''}">
                <span class="tier-elab-label" style="color:#fca5a5;">${__('churn-rate-label')}</span>
                <input type="number" data-tier-churn min="0" max="100" step="0.1"
                    class="inp-bare" style="width:64px;font-weight:700;font-size:14px;color:#ef4444;"
                    placeholder="0" value="${churnRate}">
                <span style="font-size:10px;color:#94a3b8;">%/mese · LTV: <span data-tier-ltv style="font-weight:700;color:#6366f1;">—</span></span>
            </div>

            <!-- Break-even -->
            <div class="tier-elab" data-breakeven-row>
                <span class="tier-elab-label" style="color:#6366f1;" data-i18n="tier-breakeven-label">Break-even</span>
                <span data-tier-breakeven style="font-size:13px;font-weight:800;color:#4f46e5;">—</span>
                <span style="font-size:10px;color:#94a3b8;" data-i18n="tier-breakeven-unit">utenti (steady state) per coprire i costi</span>
            </div>

            <!-- Scenario acquisition rates -->
            <div class="tier-scenarios">
                <div class="tier-scenarios-label" data-i18n="monthly-acquisition-rate">${__('monthly-acquisition-rate')}</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">

                    <div class="scenario-box s-pess">
                        <div class="scenario-label">${__('pessimistic')}</div>
                        ${fmtInp('data-tier-pessimistic', pessimisticAcq, 's-pess')}
                        <div class="scenario-rev" data-revenue-pessimistic>—</div>
                    </div>

                    <div class="scenario-box s-base">
                        <div class="scenario-label">${__('tier-units-base')}</div>
                        ${fmtInp('data-tier-base', baseAcq, 's-base')}
                        <div class="scenario-rev" data-revenue-base>—</div>
                    </div>

                    <div class="scenario-box s-opt">
                        <div class="scenario-label">${__('optimistic')}</div>
                        ${fmtInp('data-tier-optimistic', optimisticAcq, 's-opt')}
                        <div class="scenario-rev" data-revenue-optimistic>—</div>
                    </div>
                </div>
            </div>
        `;

        card.querySelector('[data-tier-delete]').addEventListener('click', () => this.removeRecurringTier(id));
        card.querySelectorAll('input:not([type=hidden])').forEach(el =>
            el.addEventListener('input', () => this.updateRecurringTier(id))
        );
        card.querySelectorAll('[data-tier-type-btn]').forEach(btn =>
            btn.addEventListener('click', () => {
                const type = btn.dataset.tierTypeBtn;
                card.querySelector('[data-tier-license-type]').value = type;
                card.querySelectorAll('[data-tier-type-btn]').forEach(b =>
                    b.classList.toggle('active', b.dataset.tierTypeBtn === type)
                );
                const churnRow = card.querySelector('[data-churn-row]');
                if (churnRow) churnRow.style.display = type === 'onetime' ? 'none' : '';
                this.updateRecurringTier(id);
            })
        );
        return card;
    }

    static #netMonthly(tier) {
        return tier.licenseType === 'onetime'
            ? tier.price - tier.commissionPerUnit
            : tier.price - tier.commissionPerUnit / 12;
    }

    static #netAnnual(tier) {
        return tier.licenseType === 'onetime'
            ? tier.price - tier.commissionPerUnit
            : tier.price * 12 - tier.commissionPerUnit;
    }

    /**
     * Active users at month M for a given tier (subscription only).
     * One-time tiers: returns cumulative sold (acqPerMonth × M).
     */
    static #activeUsers(tier, month, field) {
        const acq = tier[field] || 0;
        const churn = tier.churnRate || 0;
        if (tier.licenseType === 'onetime') return acq * month;
        return churn > 0
            ? (acq / (churn / 100)) * (1 - Math.pow(1 - churn / 100, month))
            : acq * month;
    }

    static #updateCardRevenues(id) {
        const card = document.querySelector(`[data-tier-id="${id}"]`);
        const tier = this.#recurringTiers.find(t => t.id === id);
        if (!card || !tier) return;

        const netAnnual = this.#netAnnual(tier);
        const fmt = v => CurrencyFormatter.format(v);
        const isOnetime = tier.licenseType === 'onetime';

        const netEl = card.querySelector('[data-tier-net]');
        if (netEl) {
            netEl.textContent = fmt(netAnnual);
            netEl.style.color = netAnnual < 0 ? '#ef4444' : '#059669';
        }

        const priceUnit = isOnetime ? __('per-license') : __('per-user-month');
        card.querySelectorAll('[data-tier-price-unit]').forEach(el => el.textContent = priceUnit);
        const netUnitEl = card.querySelector('[data-tier-net-unit]');
        if (netUnitEl) netUnitEl.textContent = isOnetime ? __('per-license') : __('per-user-year');
        const commUnitEl = card.querySelector('[data-tier-commission-unit]');
        if (commUnitEl) commUnitEl.textContent = isOnetime ? __('per-license') : __('per-license-year');

        // Revenue projection at month 12 per scenario
        const rev12 = (field) => {
            const users = this.#activeUsers(tier, 12, field);
            return Math.max(0, this.#netMonthly(tier)) * users;
        };
        const suffix = isOnetime ? ' (12m)' : ' (a.1)';
        const setRev = (attr, field) => {
            const el = card.querySelector(`[${attr}]`);
            if (!el) return;
            const acq = tier[field] || 0;
            el.textContent = acq > 0 ? `${fmt(rev12(field))}${suffix}` : '—';
        };
        setRev('data-revenue-base', 'baseAcqPerMonth');
        setRev('data-revenue-optimistic', 'optimisticAcqPerMonth');
        setRev('data-revenue-pessimistic', 'pessimisticAcqPerMonth');

        // LTV
        const ltvEl = card.querySelector('[data-tier-ltv]');
        if (ltvEl && !isOnetime) {
            const netMonthly = Math.max(0, this.#netMonthly(tier));
            const churn = tier.churnRate || 0;
            ltvEl.textContent = (churn > 0 && netMonthly > 0)
                ? fmt(netMonthly / (churn / 100))
                : '—';
        }
    }

    static addRecurringTier(label = '', price = '', commission = '', baseAcq = '',
                            optimisticAcq = '', pessimisticAcq = '',
                            elaborationsPerLicense = '', licenseType = 'monthly', churnRate = '') {
        const id = `tier-${++this.#tierCounter}`;
        const card = this.#createTierCard(id, label, price, commission,
            baseAcq, optimisticAcq, pessimisticAcq, elaborationsPerLicense, licenseType, churnRate);
        document.getElementById('recurring-tiers-container').appendChild(card);
        this.#recurringTiers.push({
            id, label,
            price: parseFloat(price) || 0,
            commissionPerUnit: parseFloat(commission) || 0,
            baseAcqPerMonth: parseInt(baseAcq) || 0,
            optimisticAcqPerMonth: parseInt(optimisticAcq) || 0,
            pessimisticAcqPerMonth: parseInt(pessimisticAcq) || 0,
            elaborationsPerLicense: parseInt(elaborationsPerLicense) || 0,
            licenseType,
            churnRate: parseFloat(churnRate) || 0
        });
        this.#updateCardRevenues(id);
        this.#refreshRecurring();
        this.#dispatch();
    }

    static removeRecurringTier(id) {
        document.querySelector(`[data-tier-id="${id}"]`)?.remove();
        this.#recurringTiers = this.#recurringTiers.filter(t => t.id !== id);
        this.#refreshRecurring();
        this.#dispatch();
    }

    static updateRecurringTier(id) {
        const card = document.querySelector(`[data-tier-id="${id}"]`);
        if (!card) return;
        const idx = this.#recurringTiers.findIndex(t => t.id === id);
        if (idx === -1) return;
        this.#recurringTiers[idx] = {
            id,
            label: card.querySelector('[data-tier-label]').value,
            price: parseFloat(card.querySelector('[data-tier-price]').value) || 0,
            commissionPerUnit: parseFloat(card.querySelector('[data-tier-commission]').value) || 0,
            baseAcqPerMonth: parseInt(card.querySelector('[data-tier-base]').value) || 0,
            optimisticAcqPerMonth: parseInt(card.querySelector('[data-tier-optimistic]').value) || 0,
            pessimisticAcqPerMonth: parseInt(card.querySelector('[data-tier-pessimistic]').value) || 0,
            elaborationsPerLicense: parseInt(card.querySelector('[data-tier-elaborations]').value) || 0,
            licenseType: card.querySelector('[data-tier-license-type]').value || 'monthly',
            churnRate: parseFloat(card.querySelector('[data-tier-churn]')?.value) || 0
        };
        this.#updateCardRevenues(id);
        this.#refreshRecurring();
        this.#dispatch();
    }

    // ── Public query methods ─────────────────────────────────────────────────

    /**
     * Monthly revenue at a given month using the growth model.
     * Subscription tiers: activeUsers(month) × netMonthly.
     * One-time tiers: acqPerMonth × netPrice (constant new sales each month).
     */
    static getMonthlyRevenueAtMonth(month, scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticAcqPerMonth'
                    : scenario === 'pessimistic' ? 'pessimisticAcqPerMonth'
                    : 'baseAcqPerMonth';
        return this.#recurringTiers.reduce((sum, t) => {
            const users = this.#activeUsers(t, month, field);
            const net = Math.max(0, this.#netMonthly(t));
            // For subscription: activeUsers × netMonthly
            // For one-time: acqPerMonth × netPrice (users = acq×month, but revenue is per new sale = acq×net)
            if (t.licenseType === 'onetime') {
                return sum + (t[field] || 0) * net;
            }
            return sum + users * net;
        }, 0);
    }

    /**
     * Active subscription users at month 12 (reference snapshot).
     */
    static getActiveUsers(month, scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticAcqPerMonth'
                    : scenario === 'pessimistic' ? 'pessimisticAcqPerMonth'
                    : 'baseAcqPerMonth';
        return this.#recurringTiers
            .filter(t => t.licenseType !== 'onetime')
            .reduce((sum, t) => sum + this.#activeUsers(t, month, field), 0);
    }

    /**
     * Monthly revenue at month 12 (used as "current MRR" reference for evaluations).
     */
    static getMonthlyRecurring(scenario = 'base') {
        return this.getMonthlyRevenueAtMonth(12, scenario);
    }

    /**
     * Total one-time upfront sales (commissioned revenues, not tier one-time).
     * Tier one-time revenue is included in getMonthlyRevenueAtMonth.
     */
    static getOnetimeTierRevenue(scenario = 'base') {
        return 0; // Tier one-time revenue now flows through getMonthlyRevenueAtMonth
    }

    /**
     * Active subscription users at month 12 (used as user-count reference).
     */
    static getTotalUnits(scenario = 'base') {
        return this.getActiveUsers(12, scenario);
    }

    /**
     * Average monthly elaborations over year 1, using month-6 active users as midpoint estimate.
     */
    static getTotalElaborations(scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticAcqPerMonth'
                    : scenario === 'pessimistic' ? 'pessimisticAcqPerMonth'
                    : 'baseAcqPerMonth';
        return this.#recurringTiers.reduce((sum, t) => {
            const users = this.#activeUsers(t, 6, field);
            return sum + users * (t.elaborationsPerLicense || 0);
        }, 0);
    }

    /**
     * Total annual commissions at month-12 active users.
     */
    static getTotalCommissions(scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticAcqPerMonth'
                    : scenario === 'pessimistic' ? 'pessimisticAcqPerMonth'
                    : 'baseAcqPerMonth';
        return this.#recurringTiers.reduce((sum, t) => {
            const users12 = this.#activeUsers(t, 12, field);
            return sum + t.commissionPerUnit * users12;
        }, 0);
    }

    /**
     * Gross annual revenues (before commissions) at month-12 active users.
     */
    static getTotalGrossRevenues(scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticAcqPerMonth'
                    : scenario === 'pessimistic' ? 'pessimisticAcqPerMonth'
                    : 'baseAcqPerMonth';
        return this.#recurringTiers.reduce((sum, t) => {
            const users12 = this.#activeUsers(t, 12, field);
            const gross = t.licenseType === 'onetime'
                ? t.price * users12           // one-time: price × cumulative sold
                : t.price * 12 * users12;     // subscription: annual price × active users
            return sum + gross;
        }, 0);
    }

    /**
     * Revenue concentration by tier (fraction of month-12 base revenue).
     */
    static getRevenueConcentration() {
        const rev12 = (t) => {
            const users = this.#activeUsers(t, 12, 'baseAcqPerMonth');
            return Math.max(0, this.#netMonthly(t)) * (t.licenseType === 'onetime' ? (t.baseAcqPerMonth || 0) : users);
        };
        const total = this.#recurringTiers.reduce((s, t) => s + rev12(t), 0);
        if (total <= 0) return [];
        return this.#recurringTiers
            .map(t => ({ id: t.id, label: t.label || t.id, fraction: rev12(t) / total }))
            .sort((a, b) => b.fraction - a.fraction);
    }

    /**
     * Weighted average LTV (weighted by acquisition rate).
     */
    static getWeightedLTV() {
        const monthly = this.#recurringTiers.filter(t => t.licenseType !== 'onetime' && t.churnRate > 0);
        const totalAcq = monthly.reduce((s, t) => s + (t.baseAcqPerMonth || 0), 0);
        if (totalAcq === 0) return 0;
        return monthly.reduce((s, t) => {
            const net = Math.max(0, this.#netMonthly(t));
            const ltv = net / (t.churnRate / 100);
            return s + ltv * (t.baseAcqPerMonth || 0);
        }, 0) / totalAcq;
    }

    /**
     * Weighted average net monthly revenue per new user (base, monthly tiers).
     */
    static getWeightedMonthlyNetPerUnit() {
        const monthly = this.#recurringTiers.filter(t => t.licenseType !== 'onetime' && t.baseAcqPerMonth > 0);
        const totalAcq = monthly.reduce((s, t) => s + t.baseAcqPerMonth, 0);
        if (totalAcq === 0) return 0;
        return monthly.reduce((s, t) => s + Math.max(0, this.#netMonthly(t)) * t.baseAcqPerMonth, 0) / totalAcq;
    }

    static #refreshRecurring() {
        const fmt = v => CurrencyFormatter.format(v);

        // Cumulative revenue over N months
        const cumRev = (scenario, months) => {
            let sum = 0;
            for (let m = 1; m <= months; m++) sum += this.getMonthlyRevenueAtMonth(m, scenario);
            return sum;
        };

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
        for (const [scen, prefix] of [['base', 'base'], ['optimistic', 'opt'], ['pessimistic', 'pes']]) {
            const y1 = cumRev(scen, 12);
            const y2 = cumRev(scen, 24);
            set(`recurring-${prefix}-total`,
                `${fmt(y1)}<span class="scenario-strip-y2">${fmt(y2)} anno 2</span>`);
        }

        const count = this.#recurringTiers.length;
        const emptyEl   = document.getElementById('recurring-empty-state');
        const container = document.getElementById('recurring-tiers-container');
        const summary   = document.getElementById('recurring-summary');

        if (emptyEl)   emptyEl.classList.toggle('hidden', count > 0);
        if (container) container.classList.toggle('show', count > 0);
        if (summary)   summary.classList.toggle('hidden', count === 0);
    }

    static getOnetimeItems()   { return [...this.#onetimeItems]; }
    static getRecurringTiers() { return [...this.#recurringTiers]; }

    static loadOnetimeItems(items) {
        document.getElementById('onetime-items-body').innerHTML = '';
        this.#onetimeItems = [];
        this.#onetimeCounter = 0;
        items.forEach(i => {
            const id = `onetime-${++this.#onetimeCounter}`;
            document.getElementById('onetime-items-body').appendChild(
                this.#createOnetimeRow(id, i.label || '', i.amount || ''));
            this.#onetimeItems.push({ id, label: i.label || '', amount: parseFloat(i.amount) || 0 });
        });
        this.#refreshOnetime();
        this.#dispatch();
    }

    static loadRecurringTiers(tiers) {
        document.getElementById('recurring-tiers-container').innerHTML = '';
        this.#recurringTiers = [];
        this.#tierCounter = 0;
        tiers.forEach(t => {
            const id = `tier-${++this.#tierCounter}`;
            const licenseType = t.licenseType || 'monthly';
            // Backward compat: old data used baseUnits/optimisticUnits/pessimisticUnits
            const baseAcq       = t.baseAcqPerMonth       ?? t.baseUnits       ?? '';
            const optimisticAcq = t.optimisticAcqPerMonth ?? t.optimisticUnits ?? '';
            const pessimisticAcq= t.pessimisticAcqPerMonth?? t.pessimisticUnits?? '';
            const card = this.#createTierCard(
                id, t.label || '', t.price || '', t.commissionPerUnit || 0,
                baseAcq, optimisticAcq, pessimisticAcq,
                t.elaborationsPerLicense || '', licenseType, t.churnRate || ''
            );
            document.getElementById('recurring-tiers-container').appendChild(card);
            this.#recurringTiers.push({
                id, label: t.label || '',
                price: parseFloat(t.price) || 0,
                commissionPerUnit: parseFloat(t.commissionPerUnit) || 0,
                baseAcqPerMonth: parseInt(baseAcq) || 0,
                optimisticAcqPerMonth: parseInt(optimisticAcq) || 0,
                pessimisticAcqPerMonth: parseInt(pessimisticAcq) || 0,
                elaborationsPerLicense: parseInt(t.elaborationsPerLicense) || 0,
                licenseType,
                churnRate: parseFloat(t.churnRate) || 0
            });
            this.#updateCardRevenues(id);
        });
        this.#refreshRecurring();
        this.#dispatch();
    }

    static #dispatch() {
        document.dispatchEvent(new CustomEvent('revenueitemschange'));
    }
}
