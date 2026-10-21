## Objective

Pressure-test the effort and economics of independently rebuilding the useful capabilities advertised by [Model ML](https://modelml.com/product/dataset-llm) and [Finster](https://www.finster.ai/product) for an international investment bank.

**Research and scoping only. Do not begin implementation.**

The product concept is a decision workspace for acquisition, bond issuance, and IPO questions: evidence-backed research, deterministic financial calculations, scenarios, and interactive HTML briefings in a formal corporate register. Excel and PowerPoint may be exports rather than the primary interface.

## Constraints and boundaries

- Target security and operational scrutiny suitable for a major international bank. Obtain the actual bank's internal requirements before claiming compliance.
- Assume licensed provider data can be purchased, but do not assume an MCP connector exposes every needed dataset, complete screening, historical snapshots, or external redistribution rights.
- Assess FactSet, S&P Global/Kensho, LSEG, contracted API/feed fallbacks, and the limits of public filings.
- Use existing models; independently implement comparable functionality. Proprietary code, branding, and licensed datasets are outside the replication scope.
- Keep this public repository free of confidential bank requirements, client data, and provider content.

## Initial assessment

See [feasibility](https://github.com/NeoDemos/investment-banking-reimagined/blob/main/docs/FEASIBILITY.md) and [token estimate](https://github.com/NeoDemos/investment-banking-reimagined/blob/main/docs/TOKEN_ESTIMATE.md).

The 21 October 2026 estimate is speculative and uncalibrated:
- Analyst pilot: 20–80 million cumulative processed tokens.
- Bounded internal product for bank assessment: 100–500 million.
- Broad competitor-style application: 500 million–2 billion+, excluding a global proprietary data operation.

At standard short-context API rates and an illustrative 85% uncached input / 15% billed output mix, the bank-assessment envelope is $320–$1,600 with GPT-6.1 Sol or $640–$3,200 with Claude Opus 5.5. This is a model-spend illustration, not the cost of bank approval or a fixed-price build. The documents include caching, reasoning/output sensitivity, exclusions, work decomposition, and elapsed-time ranges. No model-specific productivity advantage has been measured.

## Scoping acceptance criteria

- [ ] Define three representative acquisition, bond issuance, and IPO assignments, with expert-reviewed expected results.
- [ ] Map required fields to actual provider tools, entitlements, timeliness, source references, bulk/screening access, and fallbacks.
- [ ] Map the bank's applicable controls to evidence, accountable owners, approved services, and acceptance decisions; include information barriers, model processing, tool identity, generated-content isolation, recovery, and client delivery.
- [ ] Separate the demonstration, pilot, bank-assessment candidate, broad application, and proprietary data-operation scopes.
- [ ] Agree the first workflow and decide internal-bank application versus external supplier product.
- [ ] Revise token and non-token budgets after requirements discovery.
- [ ] Only after explicit implementation authorization, calibrate consumption on one provider adapter, one numerical workflow, and one permission-isolation slice.

## Current status

Initial public-source assessment is documented. Actual provider entitlements and bank requirements have not been inspected. No application, credentials, deployment, or data acquisition is included in this issue's current authorization.
