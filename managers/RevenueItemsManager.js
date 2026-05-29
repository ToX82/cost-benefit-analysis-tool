import { __ } from '../utils/I18n.js';
import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';

/**
 * Manages one-time revenues and recurring subscription tiers.
 * Net tier revenue = (price - commissionPerUnit) × units.
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

    static #createTierCard(id, label, price, commission, baseUnits, optimisticUnits, pessimisticUnits) {
        const card = document.createElement('div');
        card.dataset.tierId = id;
        card.className = 'tier-card';

        const fmtInp = (attr, val, colorCls = '') =>
            `<input type="number" ${attr} min="0" step="any"
                class="scenario-units-inp ${colorCls}" placeholder="0" value="${val}">`;

        card.innerHTML = `
            <!-- Header: name + delete -->
            <div class="tier-head">
                <input type="text" data-tier-label
                    placeholder="${__('tier-name-placeholder')}" value="${label}">
                <button type="button" class="btn-icon" style="flex-shrink:0;">×</button>
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
                    <div class="tier-pricing-unit">${__('per-user-month')}</div>
                </div>
                <div class="tier-pricing-col">
                    <div class="tier-pricing-label" style="color:#fca5a5;">${__('tier-commission-label')}</div>
                    <div style="position:relative;">
                        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#fca5a5;pointer-events:none;">€</span>
                        <input type="number" data-tier-commission min="0" step="any"
                            class="inp inp-danger" style="font-size:14px;font-weight:700;padding:7px 8px 7px 20px;text-align:center;color:#ef4444;"
                            placeholder="0" value="${commission}">
                    </div>
                    <div class="tier-pricing-unit">${__('per-license')}</div>
                </div>
                <div class="tier-pricing-col" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <div class="tier-pricing-label" style="color:#34d399;">${__('tier-net-label')}</div>
                    <div data-tier-net style="font-size:18px;font-weight:800;color:#059669;letter-spacing:-0.4px;margin:6px 0;">—</div>
                    <div class="tier-pricing-unit">${__('per-user-month')}</div>
                </div>
            </div>

            <!-- Scenario quantities -->
            <div class="tier-scenarios">
                <div class="tier-scenarios-label" data-i18n="expected-users">${__('expected-users')}</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">

                    <div class="scenario-box s-pess">
                        <div class="scenario-label">${__('pessimistic')}</div>
                        ${fmtInp('data-tier-pessimistic', pessimisticUnits, 's-pess')}
                        <div class="scenario-rev" data-revenue-pessimistic>—</div>
                    </div>

                    <div class="scenario-box s-base">
                        <div class="scenario-label">${__('tier-units-base')}</div>
                        ${fmtInp('data-tier-base', baseUnits, 's-base')}
                        <div class="scenario-rev" data-revenue-base>—</div>
                    </div>

                    <div class="scenario-box s-opt">
                        <div class="scenario-label">${__('optimistic')}</div>
                        ${fmtInp('data-tier-optimistic', optimisticUnits, 's-opt')}
                        <div class="scenario-rev" data-revenue-optimistic>—</div>
                    </div>
                </div>
            </div>
        `;

        card.querySelector('button').addEventListener('click', () => this.removeRecurringTier(id));
        card.querySelectorAll('input').forEach(el => el.addEventListener('input', () => this.updateRecurringTier(id)));
        return card;
    }

    static #updateCardRevenues(id) {
        const card = document.querySelector(`[data-tier-id="${id}"]`);
        const tier = this.#recurringTiers.find(t => t.id === id);
        if (!card || !tier) return;

        const net = Math.max(0, tier.price - tier.commissionPerUnit);
        const fmt = v => CurrencyFormatter.format(v);

        const netEl = card.querySelector('[data-tier-net]');
        if (netEl) netEl.textContent = fmt(net);

        const set = (attr, units) => {
            const el = card.querySelector(`[${attr}]`);
            if (el) el.textContent = units > 0 ? `${fmt(net * units)}/mese` : '—';
        };
        set('data-revenue-base', tier.baseUnits);
        set('data-revenue-optimistic', tier.optimisticUnits);
        set('data-revenue-pessimistic', tier.pessimisticUnits);
    }

    static addRecurringTier(label = '', price = '', commission = '', baseUnits = '', optimisticUnits = '', pessimisticUnits = '') {
        const id = `tier-${++this.#tierCounter}`;
        const card = this.#createTierCard(id, label, price, commission, baseUnits, optimisticUnits, pessimisticUnits);
        document.getElementById('recurring-tiers-container').appendChild(card);
        this.#recurringTiers.push({
            id, label,
            price: parseFloat(price) || 0,
            commissionPerUnit: parseFloat(commission) || 0,
            baseUnits: parseInt(baseUnits) || 0,
            optimisticUnits: parseInt(optimisticUnits) || 0,
            pessimisticUnits: parseInt(pessimisticUnits) || 0
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
            baseUnits: parseInt(card.querySelector('[data-tier-base]').value) || 0,
            optimisticUnits: parseInt(card.querySelector('[data-tier-optimistic]').value) || 0,
            pessimisticUnits: parseInt(card.querySelector('[data-tier-pessimistic]').value) || 0
        };
        this.#updateCardRevenues(id);
        this.#refreshRecurring();
        this.#dispatch();
    }

    /**
     * Total monthly net recurring revenue for given scenario
     */
    static getMonthlyRecurring(scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticUnits'
                    : scenario === 'pessimistic' ? 'pessimisticUnits'
                    : 'baseUnits';
        return this.#recurringTiers.reduce((sum, t) => {
            const net = Math.max(0, t.price - t.commissionPerUnit);
            return sum + net * t[field];
        }, 0);
    }

    static getTotalUnits(scenario = 'base') {
        const field = scenario === 'optimistic' ? 'optimisticUnits'
                    : scenario === 'pessimistic' ? 'pessimisticUnits'
                    : 'baseUnits';
        return this.#recurringTiers.reduce((sum, t) => sum + t[field], 0);
    }

    static #refreshRecurring() {
        const fmt = v => CurrencyFormatter.format(v);
        const base = this.getMonthlyRecurring('base');
        const opt  = this.getMonthlyRecurring('optimistic');
        const pes  = this.getMonthlyRecurring('pessimistic');

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
        set('recurring-base-total', `<strong>${fmt(base)}</strong>/mese &nbsp;<span style="opacity:.65;font-size:11px;">${fmt(base * 12)}/anno</span>`);
        set('recurring-opt-total',  `<strong>${fmt(opt)}</strong>/mese &nbsp;<span style="opacity:.65;font-size:11px;">${fmt(opt * 12)}/anno</span>`);
        set('recurring-pes-total',  `<strong>${fmt(pes)}</strong>/mese &nbsp;<span style="opacity:.65;font-size:11px;">${fmt(pes * 12)}/anno</span>`);

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
            document.getElementById('onetime-items-body').appendChild(this.#createOnetimeRow(id, i.label || '', i.amount || ''));
            this.#onetimeItems.push({ id, label: i.label || '', amount: parseFloat(i.amount) || 0 });
        });
        this.#refreshOnetime();
    }

    static loadRecurringTiers(tiers) {
        document.getElementById('recurring-tiers-container').innerHTML = '';
        this.#recurringTiers = [];
        this.#tierCounter = 0;
        tiers.forEach(t => {
            const id = `tier-${++this.#tierCounter}`;
            const card = this.#createTierCard(
                id, t.label || '', t.price || '', t.commissionPerUnit || 0,
                t.baseUnits || '', t.optimisticUnits || '', t.pessimisticUnits || ''
            );
            document.getElementById('recurring-tiers-container').appendChild(card);
            this.#recurringTiers.push({
                id, label: t.label || '',
                price: parseFloat(t.price) || 0,
                commissionPerUnit: parseFloat(t.commissionPerUnit) || 0,
                baseUnits: parseInt(t.baseUnits) || 0,
                optimisticUnits: parseInt(t.optimisticUnits) || 0,
                pessimisticUnits: parseInt(t.pessimisticUnits) || 0
            });
            this.#updateCardRevenues(id);
        });
        this.#refreshRecurring();
    }

    static #dispatch() {
        document.dispatchEvent(new CustomEvent('revenueitemschange'));
    }
}
