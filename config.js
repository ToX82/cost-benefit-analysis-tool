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
        /** Excellent ROI threshold (>=100%) */
        EXCELLENT: 100,
        /** Good ROI threshold (>=60%) */
        GOOD: 60,
        /** Moderate ROI threshold (>=30%) */
        MODERATE: 30,
        /** Low ROI threshold (>=10%) */
        LOW: 10
    },

    /**
     * Thresholds for Risk Level evaluation.
     * Values represent risk scores.
     * @type {Object}
     */
    RISK_THRESHOLDS: {
        /** Very high risk threshold (>=60) */
        VERY_HIGH: 60,
        /** High risk threshold (>=40) */
        HIGH: 40,
        /** Medium risk threshold (>=20) */
        MEDIUM: 20,
        /** Low risk threshold (>=10) */
        LOW: 10
    }
};