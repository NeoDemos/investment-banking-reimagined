---
name: public-financial-research
description: Retrieve and reconcile public company filings, annual reports, government yields and public market references for investment banking presentations and financial scenarios. Use for public-data IBD research and source-linked evidence pools without paid provider accounts.
---

Start from the client's decision and identify the evidence required for the transaction. Choose relevant sources; do not fetch every source automatically. Use primary issuer disclosures, securities-regulator filings and central-bank/government series. Explain differences in reporting periods, currencies, definitions and observation dates.

Read `references/public-sources.md` for tested source routes and the included archive. Use the host's web search/retrieval tools to find and open the original disclosures. If code execution has network access, `scripts/fetch_public_sources.py` retrieves fixed public endpoints and writes a dated receipt. It is not an arbitrary URL downloader or a complete filing parser. A successful HTTP fetch is not proof that a value has been extracted correctly.

Record each usable observation in evidence.json with entity/security identifier, metric/definition, numeric value, original scale and unit, currency, fiscal period, publication date, observation/retrieval dates, URL/document locator and classification. Keep raw receipts in the task's private output directory. Normalize scales before arithmetic and retain the original value. Do not silently mix US GAAP and adjusted EBITDA, annual and LTM periods, or equity and enterprise values.

For a bond pitch, seek leverage, cash/liquidity, maturity profile, interest coverage when supported, rating/outlook with affirmation date, original issue terms, current issuer spreads when available, benchmark curve and its history. Treat missing issuer spread evidence as missing; a sector or government series is not a substitute. For equity/M&A, research prices, shares, earnings, forecasts when available, appropriate peers and valuation drivers. A quoted share price does not supply a complete valuation.

When network access or SEC retrieval fails, report the failure and use an explicitly dated public archive if suitable. The included archive covers AAPL, PEP, GIS and CPB and is a rehearsal dataset, not a live market feed. Preserve every retained source URL and date. Never label the archive as fresh because the file was copied today.

Deliver a concise source-coverage summary before drafting advice: available evidence, dated evidence, assumptions and material gaps. Use the companion IBD financial modeling and slide-production skills for calculations and presentation; never infer licensed provider access from the presence of its name in a catalogue.
