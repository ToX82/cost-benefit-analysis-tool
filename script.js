import { CostBenefitAnalyzer } from './analyzers/CostBenefitAnalyzer.js';
import { AIAnalyzer } from './analyzers/AIAnalyzer.js';

// Inizializzazione
const analyzer = new CostBenefitAnalyzer();
new AIAnalyzer(analyzer);