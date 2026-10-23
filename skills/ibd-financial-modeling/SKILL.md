---
name: ibd-financial-modeling
description: Build and inspect transparent financial scenarios for debt issuance, buybacks, acquisitions, IPO mechanics and illustrative LBOs, with source-linked inputs, formulas and sensitivities. Use when client materials require calculations rather than prose-only estimates.
---

Read the assignment and the evidence pool. Decide the appropriate financial method, required inputs and conventions before calculating. Use the companion rabo-banking-materials references/financial-methods.md for the project's executable model conventions and exclusions. The local Banking Studio MCP engine is available only when actually connected and its source mapping supports the case; its presence in the repository is not a live Cowork connection.

Run deterministic calculations using the connected engine or host code execution. Save the executable script, source inputs and model output. Never infer a result through language-model arithmetic alone. If using a separate script, show an independent reconciliation, boundary checks and the scope of any simplification.

Minimum work by transaction:

- Bond: explicit benchmark date/tenor, spread assumption or observed source, coupon, payment frequency, maturity, notional and fees; reconcile discounted cash flows, price and net proceeds. Show rate/spread stresses separately. Do not confuse par-reference-plus-spread with a full spot-curve valuation.
- Buyback: spend, execution price, shares retired, earnings impact of funding, diluted shares and timing. Compare no-action and alternatives; distinguish EPS accretion from shareholder value.
- M&A: equity purchase price, debt/cash EV bridge, funding, financing cost, synergy assumptions and downside. Keep PPA/integration/fee exclusions explicit. Periods must be comparable or qualified.
- IPO: valuation basis, EV-to-equity bridge, discount, gross/net proceeds, share count and dilution. Do not claim bookbuilding or an executable offer price.
- LBO: sources/uses, opening leverage, operating assumptions, annual debt/interest/cash schedule, exit EV/equity, MOIC and IRR. Suppress investment-return conclusions if operating deficits require unfunded capital.

Represent each model input as observed, estimated or assumed, with currency, unit, period/date and source ID. Record calculated outputs with formulas and input IDs. Check accounting identities, units, signs and sensitivity direction. Missing data must stay missing rather than default to zero. Use sensible numerical precision; do not imply confidence beyond the evidence.

Feed tables, charts and numerical headlines from saved model/evidence records. On a requested assumption change, create a new model version and regenerate all dependent outputs before updating the narrative. Provide an inspection workbook or JSON/calculation files when useful; the model is integral to the presentation workflow, not an afterthought.
