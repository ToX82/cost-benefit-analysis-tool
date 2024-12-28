import { CONFIG } from '../config.js';

export class EvaluationManager {
    static getROIEvaluation(roiPercentage) {
        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return 'Eccellente ritorno sull\'investimento';
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return 'Buon ritorno sull\'investimento';
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return 'Ritorno sull\'investimento moderato';
        } else if (roiPercentage >= CONFIG.ROI_THRESHOLDS.LOW) {
            return 'Ritorno sull\'investimento basso';
        }
        return 'Investimento in perdita';
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
            return `<span class="text-red-600 font-semibold">⚠️ Il progetto è in perdita</span>.
                    Con un ROI negativo del ${roiPercentage.toFixed(1)}%, si consiglia di rivedere
                    la struttura dei costi o aumentare i ricavi.`;
        }

        if (breakeven > 24) {
            return `<span class="text-yellow-600 font-semibold">⚠️ Tempo di pareggio elevato</span>.
                    Il progetto richiederà ${Math.ceil(breakeven)} mesi per raggiungere il break-even.
                    Considerare strategie per accelerare il ritorno dell'investimento.`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.EXCELLENT) {
            return `<span class="text-green-600 font-semibold">✓ Redditività eccellente</span>.
                    Con un ROI del ${roiPercentage.toFixed(1)}% il progetto mostra ottime prospettive
                    di ritorno economico.`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.GOOD) {
            return `<span class="text-green-600 font-semibold">✓ Buona redditività</span>.
                    Con un ROI del ${roiPercentage.toFixed(1)}% il progetto mostra buone
                    prospettive di ritorno economico.`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.MODERATE) {
            return `<span class="text-blue-600 font-semibold">ℹ️ Redditività moderata</span>.
                    Il ROI del ${roiPercentage.toFixed(1)}% indica un progetto con discrete
                    prospettive di ritorno.`;
        }

        if (roiPercentage >= CONFIG.ROI_THRESHOLDS.LOW) {
            return `<span class="text-yellow-600 font-semibold">⚠️ Redditività bassa</span>.
                    Il ROI del ${roiPercentage.toFixed(1)}% indica margini di guadagno limitati.
                    Valutare possibili ottimizzazioni.`;
        }

        return `<span class="text-red-600 font-semibold">⚠️ Redditività critica</span>.
                Il ROI del ${roiPercentage.toFixed(1)}% è molto basso.
                Si consiglia di rivedere attentamente il modello di business.`;
    }

    static evaluateTimeline(inputs) {
        const warnings = [];

        if (inputs.devWeeks > 16) {
            warnings.push(`La durata dello sviluppo (${inputs.devWeeks} settimane) è significativa.
                         Assicurati di pianificare attentamente il lavoro per evitare ritardi.`);
        }

        if (inputs.devWeeks < 4) {
            warnings.push(`La stima di ${inputs.devWeeks} settimane potrebbe essere ottimistica.
                         Verificare attentamente la pianificazione.`);
        }

        return warnings.length ?
            `<span class="text-yellow-600 font-semibold">⏱️ Timeline:</span><br>` +
            warnings.join('<br>') : '';
    }

    static evaluateResources(inputs) {
        if (inputs.devOccupation > 80) {
            return `<span class="text-red-600 font-semibold">⚠️ Rischio saturazione risorse</span>.
                    L'occupazione al ${inputs.devOccupation}% potrebbe causare ritardi e stress del team.
                    Considerare l'aggiunta di risorse o una redistribuzione del carico.`;
        }

        if (inputs.devOccupation < 30) {
            return `<span class="text-yellow-600 font-semibold">⚠️ Bassa allocazione</span>.
                    Un'occupazione al ${inputs.devOccupation}% potrebbe indicare scarsa priorità
                    o rischi di dilatazione dei tempi.`;
        }

        return '';
    }

    static evaluateBusinessModel(inputs, roi, breakeven) {
        if (inputs.businessModel === 'commissioned') {
            const upfrontRatio = inputs.upfrontPayment / (inputs.directCosts + inputs.indirectCosts);

            if (upfrontRatio < 0.3) {
                return `<span class="text-yellow-600 font-semibold">💰 Struttura pagamenti</span>:
                        L'anticipo è basso (${(upfrontRatio * 100).toFixed(1)}%).
                        Considerare milestone intermedie per migliorare il flusso di cassa.`;
            }
        } else {
            const recurringRatio = (inputs.recurringRevenue * inputs.expectedUsers * 12) /
                                 (inputs.upfrontPayment + inputs.finalPayment);

            if (recurringRatio < 0.5) {
                return `<span class="text-yellow-600 font-semibold">📈 Mix ricavi</span>:
                        I ricavi ricorrenti sono bassi rispetto ai pagamenti una tantum.
                        Valutare strategie per aumentare il valore ricorrente.`;
            }
        }

        return '';
    }
}