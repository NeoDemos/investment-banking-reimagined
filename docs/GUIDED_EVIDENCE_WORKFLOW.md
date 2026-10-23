# Guided client direction and request-specific evidence

23 October 2026 · [M16 / #56](https://github.com/NeoDemos/investment-banking-reimagined/issues/56). This is an external public-data MVP. The bank’s actual controls, provider entitlements and qualified banker acceptance remain separate.

## Product flow

The primary screen accepts a director assignment. A real local-model planning request proposes the storyline and asks two to four tailored questions about the client objective, desired takeaway and adviser positioning. The response is saved as `awaiting_direction`; it creates no financial workroom and claims no finished materials. The banker answers conversationally or selects suggested directions. A subsequent request validates the required answers, refines the plan and starts research/calculation/composition.

Source checkboxes are available in a compact dropdown. They enable connections; the agent selects a relevant subset for the specific assignment. A short status bar keeps progress visible. Receipts, source failures and heartbeats live in an activity popover. The storyline has concise frame previews and an adjacent evidence-coverage panel; detailed observations and gaps remain in Evidence. Activity does not consume the presentation workspace.

```mermaid
flowchart LR
    A[Director assignment] --> B[Native model discovery]
    B --> C[Client objective and adviser positioning]
    C --> D[Validated evidence plan]
    D --> E[Fixed public ingestion adapters]
    E --> F[Versioned local pool]
    F --> G[MCP market and company context]
    G --> H[Rust financial methods]
    H --> I[Model narrative and typed client frames]
    I --> J[Banker inspection and review]
```

## Different jobs require different data

| Job | Required evidence | Implemented MVP path and limitations |
|---|---|---|
| Bond issuance/refinancing | Company accounts, benchmark curve/history, credit metrics, ratings, debt/issuance terms, current issuer spreads and bank proposition | Live Apple report and Treasury curve; live Federal Reserve H.15 history; calculated debt/cash/net-leverage proxy; dated Apple issuance terms/ratings. Current issuer secondary spreads, current rating affirmation, full current debt inventory and verified interest-coverage adjustments remain explicit gaps. |
| Equity/capital returns | Company accounts, price observations, relevant peers and industry context | Public Cboe delayed observations can anchor a proposed buyback price baseline. Observation time is retained; it is not an executable or guaranteed real-time feed. No historical total-return or consensus-estimate claim. |
| M&A | Both companies’ financials, target equity price, comparable peers and valuation drivers | Mapped public accounts, delayed observations and broad NYU sector context feed the simplified acquisition method. A current share register, forecasts, proper transaction comparables, full valuation and purchase accounting are not supplied by those sources. |
| IPO / LBO | Valuation/ownership or operating/debt/return assumptions with peer and source context | Existing bounded IPO/LBO modules remain executable illustrations. Market observations do not turn them into underwritten valuations or commitments. |

The host enforces core evidence needs for each method. The model can add catalogued needs and choose mapped peers; it cannot introduce arbitrary source URLs or pretend missing data exists. Enabled connections remain an allowlist. Apple does not receive food-company valuation peers automatically. Broader company financial discovery/mappings remain outside current coverage.

## Source and calculation contracts

`fetch_market_context` is the ninth MCP tool. It reads the workroom’s evidence plan, pins retained observations, calculates reported-credit context and attaches a coverage matrix with `available`, `dated`, `partial` or `missing` status. The existing bounded context packet includes the market/credit summary. Fixed host adapters handle network ingestion separately; models have no unrestricted network, shell or credential access.

The history adapter reads [Federal Reserve H.15 Treasury constant-maturity series](https://fred.stlouisfed.org/series/DGS5), retains the recent valid as-of window and compares observations about ninety calendar days apart. Benchmark changes are not issuer funding-cost changes. It does not assume that credit spreads, fees or credit quality were unchanged.

Apple’s small [issuer pricing-term reference](https://www.sec.gov/Archives/edgar/data/320193/000114036125017410/ny20048442x2_fwp.htm) is explicitly dated 5 May 2025. Coupons, original issue spreads/yields and disclosed ratings do not establish today’s secondary spreads, current rating affirmation or a complete current outstanding-debt inventory. SEC HTTP403 is an access failure, not proof of an unknown equity ticker. The successful issuer annual-report route remains separately identified.

The delayed equity adapter validates requested/returned ticker, positive finite price, quote snapshot and last-trade dates. A recent observation can feed a proposed buyback/acquisition baseline only when the plan permits market prices; an explicitly requested price is preserved. The retained quote is attached to the analysis source snapshot and key-number lineage. Old observations remain dated, and older-than-seven-day snapshots do not silently become new price baselines. Financial outputs still come from Rust.

Public quote records stay in the local database and ignored verification artifacts; this public repository contains no copied delayed-quote dataset. Public display access does not establish enterprise or redistribution rights. Current FINRA TRACE access is a separate entitlement/integration question; the [FINRA developer catalog](https://developer.finra.org/docs) distinguishes its API datasets from TRACE access. This implementation does not claim a connected issuer-level TRACE quote feed.

## Typed outputs and verification

`research_summary`, `credit_context`, `rate_history` and `equity_context` render stored values and gaps. Their scene bindings retain source dates/URLs/receipt references; credit metrics also cite the annual reporting inputs. The final generated document must keep the relevant evidence frames. No missing issuer spread is replaced with a historical issue spread or broad index without a separate, explicitly qualified scenario decision.

The actual guided Apple and equity rehearsals, browser checks and isolated contract/arithmetic checks are recorded in the M16 verification file. Earlier five model gauntlets remain historical reviews of the prior baseline; they are not a fresh independent review of this extension. No human productivity/client-impact outcome or bank approval is inferred.
