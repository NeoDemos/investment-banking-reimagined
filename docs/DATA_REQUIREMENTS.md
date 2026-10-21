# Data contract and provider acceptance specification

Planning specification, 21 October 2026. This contains no licensed data. All coverage below is **required / unverified in the owner's contract**, not a claim of availability.

## Three representative assignments

1. **Initial acquisition/valuation briefing:** one industrial company and 5–10 banker-selected listed peers in one accounting/currency setting; three annual periods plus LTM; fixed valuation date. Calculate historical trading multiples and a simple scenario DCF. Compare strategic options and show source-supported risks. Explicitly exclude banks, insurers, complex conglomerates and negative-EBITDA multiples from the initial template. Negative denominators show “not meaningful.” No NTM claim without actual forward estimates.
2. **Later bond/refinancing briefing:** one issuer, current debt structure, maturity ladder, 5–10 comparable fixed-rate bonds, benchmark curve and spread observations, issuer scenarios and indicative financing alternatives. Define as-of times, clean/dirty prices, accrued interest, day count, compounding, yield/spread type, seniority, currency, rating and liquidity. Never treat an indicative quote as executable financing.
3. **Later IPO briefing:** one issuer with authorized management projections, public peers and selected recent offerings. Provide equity story, value range, primary/secondary proceeds, dilution, ownership and sensitivity scenarios. Establish pre/post-money and basic/fully diluted share conventions. This is financial preparation, not a legal readiness opinion.

Private-company, PE and VC examples add management information, funding terms and cap tables that an off-the-shelf public-company feed may not contain. A public filing demonstration is not evidence of a complete CIM, LBO or VC investment memo capability.

## Required field families and routes to test

| Family | Required fields / meaning | Candidate public catalog route | Evidence needed before using |
| --- | --- | --- | --- |
| Entity / security identity | Provider ID, LEI where applicable, issuer vs security, parent/subsidiary, country, exchange, share class | FactSet EntityReference; S&P company intelligence | Ambiguous-name, dual-listing and parent/child cases resolved; stable crosswalk |
| Historical financials | Revenue, EBITDA/EBIT, D&A, tax, capex, working capital, debt, cash, minority interests, leases where relevant | FactSet Fundamentals; S&P financials; Daloopa fundamentals | As-reported vs standardized vs adjusted definitions, source references, fiscal dates, restatements |
| Equity valuation inputs | Price, valuation timestamp, currency, share count and dilution basis, relevant corporate actions | FactSet GlobalPrices; S&P market data; Daloopa prices plus explicitly sourced share data | Correct security, share-count dates, corporate-action treatment and valuation convention |
| Forward estimates | Revenue/EBITDA/EPS, fiscal period, consensus date, statistic, contributors if licensed | FactSet EstimatesConsensus; S&P entitled estimates; LSEG estimates | Actual dataset entitlement and point-in-time vintage. No substitution of historic figures for consensus |
| Screening | Defined population, inclusion filters, industry, geography, size, completeness | FactSet CompanyScreener; provider-side API/feed alternative | Pagination/caps, surviving exclusions, universe date, all records returned; selected peer list remains banker-approved |
| M&A precedents | Announcement/close dates and status, target/acquirer, ownership/stake, transaction consideration, EV vs equity, historical financial basis | FactSet MergersAcquisitions for public targets; S&P M&A; separately entitled private source | Private target coverage, undisclosed values, control/minority treatment, deal-date financials and transaction definitions |
| Private markets | Funding rounds, investor/ownership history, instrument and stake, valuation basis | FactSet PrivateCompany/PrivateEquityVC; PitchBook API | Actual private company/country coverage, stale/missing values, available terms; no invented cap table |
| Debt / rates | Instrument ID, maturity, coupon, seniority, currency, clean/dirty price, yield, benchmark/spread, rating | FactSet DebtCapitalStructure/TermsConditions/BondPrices; LSEG analytics | Conventions, quote source/timestamp, liquidity and stale-price flags, rating rights, call features |
| Issuer evidence | Filing identifier, page/table/cell or paragraph, publication date, retrieval version | Provider audit links; issuer document; EDGAR | A provider link that actually supports the specific number/claim; stable access for reviewer |
| Internal management data | Forecast versions, EBITDA adjustments, customer/segment KPIs, ownership and deal assumptions | Approved document store / governed upload | Authority to use, matter-level access, version and management/banker approval |

Catalog references: [FactSet](https://developer.factset.com/mcp/factset-ai-ready-data-mcp), [S&P](https://docs.kensho.com/llmreadyapi/overview), [Daloopa tool/API mapping](https://docs.daloopa.com/docs/api-vs-mcp), [LSEG](https://www.lseg.com/en/solutions/ai-finance-solutions/lseg-mcp), [PitchBook](https://pitchbook.com/products/direct-access-data/api). Authenticated field coverage and samples remain to be inspected. In particular, FactSet's public M&A description is narrower than its separate private-market offerings.

## Canonical fact record

Specify, without implementing yet:

- Identity: entity ID, security ID when relevant, provider ID and crosswalk version.
- Meaning: metric name/code, raw label, accounting basis, reported/standardized/management-adjusted status, consolidated/segment scope and adjustment notes.
- Measurement: raw value, canonical value, currency, scale/unit, sign convention, precision and null/undisclosed/not-applicable reason.
- Time: fiscal period start/end and label, frequency, LTM/calendarization method, valuation date/time, publication/availability date, retrieval time and revision/restatement vintage.
- Evidence: provider/product/tool/endpoint, permitted query reference, original document ID and location, payload/version hash where retention is allowed, transformation/calculation ID.
- Rights and security: entitlement identity/scope, permitted use/export/retention classification, tenant/matter/access labels and source permissions inherited by derivatives.
- Quality: stale/estimated/missing/conflicting flags, reconciliation status and reviewer decision. An LLM confidence score is not financial validation.

Store raw and normalized meanings together where permitted. A correction creates a new fact version; it must not silently rewrite a frozen client deliverable. Track both the financial period and what was available at the relevant historical date. Retrieval timestamps alone do not provide point-in-time history.

## Off-the-shelf data does not resolve these decisions

Calendar versus fiscal year, millions versus units, cash-flow versus balance-sheet FX, US GAAP/IFRS and lease treatment, reported versus adjusted earnings, LTM versus NTM, enterprise versus equity value, and listed versus private/share-class valuation all need explicit policies. Do not average mixed definitions or auto-merge inconsistent providers. Escalate material disagreement to a reviewer.

For DCF, keep operating cash flow/discount-rate conventions consistent and document taxes, terminal value and EV-to-equity adjustments. The initial calculation engine is bounded to one simple non-financial issuer template and user-approved assumptions. It is not a fully integrated forecast, fairness opinion or sector-wide valuation engine.

## Supplier test and purchase gate

Before committing to integration, retain a private evidence pack with:

1. Entitled MCP `tools/list` or API schema/version and 20 representative redacted result shapes; identifiers, currencies, periods, sources, missing-data behavior and error codes.
2. A replay of one complete valuation assignment; independently reconcile at least 30 material inputs and 10 derived figures against the finance reviewer's reference. Set tolerances before running, for each metric/convention.
3. A complete screen with record counts and pagination, not a top-ranked search result; historical and revised examples; denied-access, throttling and outage behavior.
4. Written rights for AI/machine use, internal users/service accounts, model processors, storage/caching, derivative outputs, external-client display/export, original-document access, attribution and deletion/termination. Clarify whether native data can be reproduced or only derived summaries.
5. Quote covering minimum term/spend, named/concurrent/service users, dataset packages, usage/overage limits, sandbox/production, support/SLA, renewal, and exit. Do not infer these from a terminal seat price.

No critical field may silently become a guessed value. If rights or coverage fail, choose another supplier or explicitly downgrade to a public-data demonstration. Keep contracts, price quotes, provider responses and bank control materials outside this public repository. No supplier purchase or outreach is authorized by this plan.
