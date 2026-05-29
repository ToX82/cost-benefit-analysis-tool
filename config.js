/**
 * Global configuration constants for the application.
 * @constant
 * @type {Object}
 */
export const CONFIG = {
    /** Number of months to consider for financial projections */
    MONTHS_PERIOD: 12,

    /** Minimum number of development weeks allowed */
    MIN_DEV_WEEKS: 1,

    /** Default developer occupation percentage */
    DEFAULT_OCCUPATION: 25,

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
     * Values represent risk scores.
     * @type {Object}
     */
    RISK_THRESHOLDS: {
        /** Very high risk threshold (>=70) */
        VERY_HIGH: 70,
        /** High risk threshold (>=48) */
        HIGH: 48,
        /** Medium risk threshold (>=25) */
        MEDIUM: 25,
        /** Low risk threshold (>=10) */
        LOW: 10
    }
};