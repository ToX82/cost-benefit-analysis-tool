# Cost-Benefit Analysis Tool

A simple web-based tool for conducting cost-benefit analyses of software projects, with support for different business models and AI-powered insights.

## Features

- **Multiple Business Models Support**
  - SaaS projects
  - Commissioned projects
  - Mixed model (SaaS + Commissioned)

- **Advanced Financial Analysis**
  - Categorized costs (fixed, one-time, scaling, per-elaboration)
  - Revenue projection with monthly acquisition and churn
  - ROI calculation with optimistic / base / pessimistic scenarios
  - Cash-flow break-even with costs that scale with users and usage
  - Cumulative cash flow chart (36 months)
  - CAC input with LTV:CAC and CAC payback metrics

- **Risk Assessment**
  - Automated risk scoring
  - Detailed risk analysis across multiple dimensions
  - Mitigation suggestions
  - User base variability analysis

- **Smart Features**
  - AI-powered project analysis (via Perplexity export)
  - Multi-scenario modeling (optimistic/pessimistic)
  - Internationalization support (English and Italian)
  - Modern, responsive UI with real-time updates
  - Shareable URLs and local storage persistence

- **Multi-language support**
  - English and Italian are supported. Feel free to make a pull request to add your language.

## Technology Stack

- Pure JavaScript (ES6+)
- Modular architecture with separate managers and analyzers
- No backend required - runs entirely in the browser
- Uses local storage for data persistence

## Project Structure

```
├── analyzers/
│   ├── AIAnalyzer.js         # AI export to Perplexity
│   ├── CostBenefitAnalyzer.js # Core analysis logic
│   └── RiskAnalyzer.js       # Risk assessment
├── managers/
│   ├── CostItemsManager.js   # Cost line items
│   ├── RevenueItemsManager.js # Revenue tiers and one-time revenues
│   ├── EvaluationManager.js  # Results evaluation
│   ├── InputManager.js       # Input handling
│   ├── StorageManager.js     # Data persistence
│   ├── BookmarkManager.js    # URL sharing
│   └── UIManager.js          # UI updates
├── utils/
│   ├── CurrencyFormatter.js  # Currency formatting
│   └── I18n.js              # Internationalization
├── lang/
│   └── translations.json     # Language translations
├── index.html               # Main application page
├── script.js               # Application entry point
└── config.js              # Configuration settings
```

## Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Select your business model
4. Input your project parameters (costs, revenues, CAC for SaaS)
5. Review the analysis results and recommendations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GPL-3.0 License - see the LICENSE file for details.

## Support

For support and feature requests, please open an issue in the repository.
