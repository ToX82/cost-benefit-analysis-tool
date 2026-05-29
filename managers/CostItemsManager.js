import { __ } from '../utils/I18n.js';
import { CurrencyFormatter } from '../utils/CurrencyFormatter.js';

/**
 * Manages categorized cost items.
 * Supports three frequency types:
 *   'monthly'  – recurring monthly cost, annualized ×12
 *   'onetime'  – one-time cost
 *   'scaling'  – cost that grows step-wise with total users
 *                (costPerUnit, usersPerUnit, minUnits)
 *
 * Scaling items contribute different amounts per scenario.
 * Call updateScenarioDisplays(userCounts) after revenue tiers change.
 */
export class CostItemsManager {
    static #items = [];
    static #counter = 0;

    static CATEGORIES = ['personnel', 'hardware', 'licenses', 'ai', 'support', 'other'];

    static #COLORS = {
        personnel: { badge: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
        hardware:  { badge: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
        licenses:  { badge: '#06b6d4', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
        ai:        { badge: '#a855f7', bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
        support:   { badge: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
        other:     { badge: '#64748b', bg: '#f8fafc', text: '#374151', border: '#e2e8f0' }
    };

    static initialize() {
        document.getElementById('add-cost-btn')?.addEventListener('click', () => this.addCostItem());
    }

    // ── Options ───────────────────────────────────────────────────────────────

    static #categoryOptions(selected = 'personnel') {
        return this.CATEGORIES
            .map(c => `<option value="${c}"${c === selected ? ' selected' : ''}>${__(`category-${c}`)}</option>`)
            .join('');
    }

    static #frequencyOptions(selected = 'monthly') {
        return ['monthly', 'onetime', 'scaling']
            .map(f => `<option value="${f}"${f === selected ? ' selected' : ''}>${__(`freq-${f}`)}</option>`)
            .join('');
    }

    // ── Row creation ──────────────────────────────────────────────────────────

    static #createRow(id, category = 'personnel', label = '', amount = '', frequency = 'monthly',
                      costPerUnit = '', usersPerUnit = '', minUnits = '1') {
        const tr = document.createElement('tr');
        tr.dataset.costId = id;

        const c = this.#COLORS[category] || this.#COLORS.other;
        tr.style.borderLeft = `3px solid ${c.badge}`;

        const inpClass = 'border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-white font-medium outline-none';
        const isScaling = frequency === 'scaling';

        tr.innerHTML = `
            <td style="padding:8px 8px 8px 16px; vertical-align:top; padding-top:10px; width:150px;">
                <select data-cost-category class="${inpClass}" style="width:100%; font-size:13px; padding:7px 8px;">
                    ${this.#categoryOptions(category)}
                </select>
            </td>
            <td style="padding:8px; vertical-align:top; padding-top:10px;">
                <input type="text" data-cost-label class="${inpClass}" style="width:100%; font-size:13px; padding:7px 10px;"
                    placeholder="${__('cost-description-placeholder')}" value="${label}">
            </td>
            <td style="padding:8px; vertical-align:top; padding-top:10px; width:155px;">
                <select data-cost-frequency class="${inpClass}" style="width:100%; font-size:13px; padding:7px 8px;">
                    ${this.#frequencyOptions(frequency)}
                </select>
            </td>
            <td style="padding:8px; vertical-align:top; padding-top:10px; text-align:right; width:240px;">

                <!-- Regular amount (monthly / onetime) -->
                <div data-amount-section style="${isScaling ? 'display:none;' : ''}">
                    <div style="position:relative; display:inline-block; width:130px;">
                        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:13px;pointer-events:none;">€</span>
                        <input type="number" data-cost-amount min="0" step="any"
                            class="${inpClass}" style="width:130px;font-size:13px;padding:7px 10px 7px 24px;text-align:right;font-weight:600;"
                            placeholder="0" value="${amount}">
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:3px;text-align:right;" data-annualized-hint></div>
                </div>

                <!-- Scaling fields -->
                <div data-scaling-section style="${!isScaling ? 'display:none;' : ''}; text-align:right;">
                    <!-- Unit cost -->
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:5px;">
                        <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">${__('scaling-per-unit-label')}</span>
                        <div style="position:relative;width:100px;">
                            <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;pointer-events:none;">€</span>
                            <input type="number" data-scaling-unit-cost min="0" step="any"
                                class="${inpClass}" style="width:100px;font-size:13px;padding:6px 8px 6px 20px;text-align:right;font-weight:600;"
                                placeholder="0" value="${costPerUnit}">
                        </div>
                    </div>
                    <!-- Users per unit + min units -->
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-bottom:7px;font-size:12px;">
                        <span style="color:#94a3b8;">${__('scaling-every-label')}</span>
                        <input type="number" data-scaling-users-per-unit min="1" step="1"
                            class="${inpClass}" style="width:52px;text-align:center;font-size:13px;padding:6px 4px;font-weight:600;"
                            placeholder="100" value="${usersPerUnit}">
                        <span style="color:#94a3b8;">${__('scaling-users-label')}</span>
                        <span style="color:#cbd5e1;">·</span>
                        <span style="color:#94a3b8;">${__('scaling-min-label')}</span>
                        <input type="number" data-scaling-min-units min="0" step="1"
                            class="${inpClass}" style="width:40px;text-align:center;font-size:13px;padding:6px 4px;font-weight:600;"
                            placeholder="1" value="${minUnits}">
                    </div>
                    <!-- Scenario previews -->
                    <div style="display:flex;gap:8px;justify-content:flex-end;font-size:10.5px;font-weight:700;padding-top:5px;border-top:1px dashed #f1f5f9;">
                        <span style="color:#4f46e5;">B: <span data-scaling-base>—</span></span>
                        <span style="color:#10b981;">O: <span data-scaling-opt>—</span></span>
                        <span style="color:#f97316;">P: <span data-scaling-pes>—</span></span>
                    </div>
                </div>

            </td>
            <td style="padding:8px;vertical-align:top;padding-top:10px;text-align:center;width:40px;">
                <button type="button" class="btn-icon">×</button>
            </td>`;

        tr.querySelector('button').addEventListener('click', () => this.removeCostItem(id));
        tr.querySelectorAll('input, select').forEach(el =>
            el.addEventListener('input', () => this.updateCostItem(id))
        );

        this.#applyRowVisuals(tr, { category, amount: parseFloat(amount) || 0, frequency,
            costPerUnit: parseFloat(costPerUnit) || 0 });
        return tr;
    }

    static #applyRowVisuals(el, item) {
        const c = this.#COLORS[item.category] || this.#COLORS.other;
        el.style.borderLeft = `3px solid ${c.badge}`;

        const isScaling = item.frequency === 'scaling';
        const amountSection  = el.querySelector('[data-amount-section]');
        const scalingSection = el.querySelector('[data-scaling-section]');
        if (amountSection)  amountSection.style.display  = isScaling ? 'none' : '';
        if (scalingSection) scalingSection.style.display = isScaling ? '' : 'none';

        if (!isScaling) {
            const hint = el.querySelector('[data-annualized-hint]');
            if (hint) {
                hint.textContent = (item.frequency === 'monthly' && item.amount > 0)
                    ? `= ${CurrencyFormatter.format(item.amount * 12)}/anno`
                    : '';
            }
        }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    static addCostItem(category = 'personnel', label = '', amount = '', frequency = 'monthly',
                       costPerUnit = '', usersPerUnit = '', minUnits = '1') {
        const id = `cost-${++this.#counter}`;
        document.getElementById('cost-items-body').appendChild(
            this.#createRow(id, category, label, amount, frequency, costPerUnit, usersPerUnit, minUnits)
        );
        this.#items.push(this.#buildItem(id, category, label, amount, frequency, costPerUnit, usersPerUnit, minUnits));
        this.#refresh();
        this.#dispatch();
    }

    static removeCostItem(id) {
        document.querySelector(`[data-cost-id="${id}"]`)?.remove();
        this.#items = this.#items.filter(i => i.id !== id);
        this.#refresh();
        this.#dispatch();
    }

    static updateCostItem(id) {
        const el = document.querySelector(`[data-cost-id="${id}"]`);
        if (!el) return;
        const idx = this.#items.findIndex(i => i.id === id);
        if (idx === -1) return;

        const frequency = el.querySelector('[data-cost-frequency]').value;
        const newItem = this.#buildItemFromDOM(id, el, frequency);
        this.#items[idx] = newItem;
        this.#applyRowVisuals(el, newItem);
        this.#refresh();
        this.#dispatch();
    }

    static #buildItem(id, category, label, amount, frequency, costPerUnit, usersPerUnit, minUnits) {
        return {
            id, category, label,
            frequency,
            amount:       parseFloat(amount)      || 0,
            costPerUnit:  parseFloat(costPerUnit)  || 0,
            usersPerUnit: parseInt(usersPerUnit)   || 100,
            minUnits:     parseInt(minUnits)       || 1
        };
    }

    static #buildItemFromDOM(id, el, frequency) {
        return {
            id,
            category:     el.querySelector('[data-cost-category]').value,
            label:        el.querySelector('[data-cost-label]').value,
            frequency,
            amount:       parseFloat(el.querySelector('[data-cost-amount]')?.value) || 0,
            costPerUnit:  parseFloat(el.querySelector('[data-scaling-unit-cost]')?.value) || 0,
            usersPerUnit: parseInt(el.querySelector('[data-scaling-users-per-unit]')?.value) || 100,
            minUnits:     parseInt(el.querySelector('[data-scaling-min-units]')?.value) || 1
        };
    }

    // ── Calculations ──────────────────────────────────────────────────────────

    /**
     * Annualized cost for a single item at minimum scale (used for validation and AI query)
     */
    static annualizedAmount(item) {
        if (item.frequency === 'scaling') {
            return (item.minUnits || 1) * (item.costPerUnit || 0) * 12;
        }
        return item.frequency === 'monthly' ? (item.amount || 0) * 12 : (item.amount || 0);
    }

    static #getScalingCost(item, userCount) {
        if (!item.usersPerUnit || item.usersPerUnit <= 0) return 0;
        const units = Math.max(item.minUnits || 0, Math.ceil(userCount / item.usersPerUnit));
        return units * (item.costPerUnit || 0) * 12;
    }

    /**
     * Per-scenario totals. Pass userCounts = { base, optimistic, pessimistic }.
     * @returns {{ base: number, optimistic: number, pessimistic: number }}
     */
    static getTotalCostsForScenario(userCounts = {}) {
        let base = 0, opt = 0, pes = 0;
        this.#items.forEach(item => {
            if (item.frequency === 'scaling') {
                base += this.#getScalingCost(item, userCounts.base        || 0);
                opt  += this.#getScalingCost(item, userCounts.optimistic  || 0);
                pes  += this.#getScalingCost(item, userCounts.pessimistic || 0);
            } else {
                const ann = this.annualizedAmount(item);
                base += ann; opt += ann; pes += ann;
            }
        });
        return { base, optimistic: opt, pessimistic: pes };
    }

    /**
     * Simplified total using minimum units for scaling items.
     * Used for validation (at least one cost item with some value).
     */
    static getTotalCosts() {
        return this.#items.reduce((sum, item) => sum + this.annualizedAmount(item), 0);
    }

    /**
     * Returns true if any items are of type 'scaling'
     */
    static hasScalingCosts() {
        return this.#items.some(i => i.frequency === 'scaling');
    }

    // ── Display updates ───────────────────────────────────────────────────────

    /**
     * Updates B/O/P labels in scaling rows and the grand total.
     * Called from the analyzer after computing user counts from revenue tiers.
     * @param {{ base: number, optimistic: number, pessimistic: number }} userCounts
     * @returns {{ base: number, optimistic: number, pessimistic: number }} total costs per scenario
     */
    static updateScenarioDisplays(userCounts) {
        const fmt = v => CurrencyFormatter.format(v);

        this.#items.filter(i => i.frequency === 'scaling').forEach(item => {
            const el = document.querySelector(`[data-cost-id="${item.id}"]`);
            if (!el) return;
            const set = (attr, val) => {
                const span = el.querySelector(`[${attr}]`);
                if (span) span.textContent = val > 0 ? fmt(val) : '—';
            };
            set('data-scaling-base', this.#getScalingCost(item, userCounts.base        || 0));
            set('data-scaling-opt',  this.#getScalingCost(item, userCounts.optimistic  || 0));
            set('data-scaling-pes',  this.#getScalingCost(item, userCounts.pessimistic || 0));
        });

        const totals = this.getTotalCostsForScenario(userCounts);
        const grandEl = document.getElementById('cost-grand-total');
        if (grandEl) grandEl.textContent = CurrencyFormatter.format(totals.base);
        return totals;
    }

    static #refresh() {
        const total = this.getTotalCosts();
        const count = this.#items.length;

        // Category badges (using min-scale costs for consistent display)
        const byCat = Object.fromEntries(this.CATEGORIES.map(c => [c, 0]));
        this.#items.forEach(i => {
            byCat[i.category] = (byCat[i.category] || 0) + this.annualizedAmount(i);
        });

        const totalsEl = document.getElementById('cost-category-totals');
        if (totalsEl) {
            totalsEl.innerHTML = this.CATEGORIES
                .filter(c => byCat[c] > 0)
                .map(c => {
                    const col = this.#COLORS[c];
                    return `<span class="cat-badge" style="background:${col.bg};color:${col.text};border-color:${col.border};">
                        <span class="cat-dot" style="background:${col.badge};"></span>
                        ${__(`category-${c}`)}: ${CurrencyFormatter.format(byCat[c])}
                    </span>`;
                }).join('');
        }

        const grandEl = document.getElementById('cost-grand-total');
        if (grandEl) grandEl.textContent = CurrencyFormatter.format(total);

        const emptyEl = document.getElementById('cost-empty-state');
        const tableEl = document.getElementById('cost-items-table-wrapper');
        if (emptyEl) emptyEl.classList.toggle('hidden', count > 0);
        if (tableEl) tableEl.classList.toggle('hidden', count === 0);
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    static getCostItems() { return [...this.#items]; }

    static loadCostItems(items) {
        document.getElementById('cost-items-body').innerHTML = '';
        this.#items = [];
        this.#counter = 0;
        items.forEach(item => {
            const id = `cost-${++this.#counter}`;
            const freq = item.frequency || 'monthly';
            document.getElementById('cost-items-body').appendChild(
                this.#createRow(id, item.category || 'other', item.label || '',
                    item.amount || '', freq,
                    item.costPerUnit || '', item.usersPerUnit || '', item.minUnits ?? '1')
            );
            this.#items.push(this.#buildItem(id, item.category || 'other', item.label || '',
                item.amount || '', freq, item.costPerUnit || '', item.usersPerUnit || '', item.minUnits ?? '1'));
        });
        this.#refresh();
    }

    static #dispatch() {
        document.dispatchEvent(new CustomEvent('costitemschange', { detail: { total: this.getTotalCosts() } }));
    }
}
