/**
 * Global configuration constants for the application.
 * @constant
 * @type {Object}
 */
export const CONFIG = {
    /** Number of months to consider for financial projections */
    MONTHS_PERIOD: 12,

    /**
     * Thresholds for Return on Investment (ROI) evaluation.
     * Values are percentages.
     * @type {Object}
     */
    ROI_THRESHOLDS: {
        /** Excellent ROI threshold (>=80%) */
        EXCELLENT: 80,
        /** Good ROI threshold (>=40%) */
        GOOD: 40,
        /** Moderate ROI threshold (>=20%) */
        MODERATE: 20,
        /** Low ROI threshold (>0%) — any positive ROI qualifies as "low" rather than "loss" */
        LOW: 0
    },

    /**
     * Thresholds for Risk Level evaluation.
     * Values represent risk scores (0–100).
     * @type {Object}
     */
    RISK_THRESHOLDS: {
        /** Very high risk threshold (>=70) — includes structurally unprofitable projects */
        VERY_HIGH: 70,
        /** High risk threshold (>=50) */
        HIGH: 50,
        /** Medium risk threshold (>=30) */
        MEDIUM: 30,
        /** Low risk threshold (>=15) */
        LOW: 15
    }
};