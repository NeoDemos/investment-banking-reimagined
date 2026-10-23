# Public routes and archive

Fixed helper routes (no keys):

- `treasury-history`: FRED CSV of Federal Reserve H.15 DGS3/DGS5/DGS10 series, https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3,DGS5,DGS10 . Rates are constant-maturity government yields, not issuer funding costs or a spot curve. Individual dates may be missing.
- `sec-company-facts --symbol AAPL|PEP|GIS|CPB`: SEC data API. Access may return 403. Use a descriptive identity supplied privately through `SEC_USER_AGENT` when appropriate; do not invent an email or bypass access controls. https://www.sec.gov/search-filings/edgar-application-programming-interfaces

The portable archive `assets/public-snapshot.json` is copied from the project's public source pool. It retains source URLs, original financial tags, periods and filing dates. `assets/issuer-credit-reference.json` contains explicitly dated Apple issue terms and disclosed ratings, not current secondary spreads/current rating affirmation or a complete outstanding debt inventory. `assets/sector-reference.json` contains a dated NYU Stern broad industry reference, not current transaction comparables.

For Apple, also inspect issuer-hosted financial reporting through https://investor.apple.com/sec-filings/default.aspx and the public Form 10-K source URLs retained in the archive. For Rabobank's public positioning/design, use https://www.rabobank.com/about-us/investor-relations/presentations . Do not infer an official bank mandate or approval from public material.

Command example, resolving the script relative to this skill:

```
python3 scripts/fetch_public_sources.py treasury-history /absolute/task/treasury-receipt.json
```

Successful receipts retain raw response text. Parse the relevant rows or tags, preserve dates and check units before using them. The helper saves unsuccessful HTTP/network outcomes as failures and exits nonzero; it does not convert failures into empty datasets.
