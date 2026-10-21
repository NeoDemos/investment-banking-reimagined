# Phased delivery plan and the one-month challenge

As of 21 October 2026. Parent: [issue #1](https://github.com/NeoDemos/investment-banking-reimagined/issues/1). [GitHub Project](https://github.com/users/NeoDemos/projects/3). Research and planning only; implementation remains subject to explicit owner authorization.

## Answer

**One month can produce a useful, narrowly scoped valuation and client-briefing demonstration.** Budget one Claude Max 20× subscription for that month, not multiple subscriptions. A broader analyst pilot is more credibly 2–3 months cumulative; a bounded bank-assessment candidate 3–6 months in a favorable approved-platform scenario, with 6–12+ months retained as the conservative institutional planning envelope. Broad competitor-style coverage remains 12–24+ months and is not established by completing the initial roadmap.

These are bottom-up planning judgements, not measured Opus productivity or guaranteed subscription throughput. The calendar is governed by scope, human review and external dependencies as well as coding. Purchasing data removes a major collection burden but not financial interpretation, output quality or bank acceptance.

## Month-one scope

Deliver one application slice for one non-financial sector, 1 subject company and 5–10 reviewer-selected listed peers, one provider, one fixed valuation date, historical/LTM trading comps, and a simple five-year unlevered DCF with approved forecast assumptions. Present strategic context, value ranges, assumptions, sensitivities, sources and limitations in a corporate-language briefing.

Include a controlled HTML decision view, a fixed 8–12-page/slide presentation template, an editable calculation-workbook export, source appendix, review states and frozen outputs. The DCF uses an explicit bounded template; it does not build an integrated forecast from arbitrary financials. PPTX/XLSX are editable templates with reconciled values, not general Office add-ins or full bidirectional editing. Export fidelity is part of acceptance, not a last-minute embellishment.

Exclude comprehensive private-deal precedents, full sell-side CIMs, LBO/VC models, debt issuance and IPO workflows, arbitrary document ingestion, broad screening/origination, custom template authoring, live client collaboration, scheduled monitoring, underwriting/order execution, and legal-document review. Add these through later independently accepted modules. The first data contract may support more fields, but that is not a reason to expand the first month.

The month-one environment uses public/synthetic or explicitly permitted data. Confidential bank/client information requires the actual controls and processing approvals in [BANK_ACCEPTANCE.md](BANK_ACCEPTANCE.md). No live client advice or external sending is automatic.

## What makes a month possible

1. One experienced full-time owner, one Max 20× account, and a familiar application stack. Reuse standard libraries and approved services; no foundation-model training, custom model hosting or proprietary data estate.
2. Provider sandbox, documented permissions and representative data by day 3; otherwise switch to public/synthetic data and downgrade the milestone to a demonstration, never “licensed pilot complete.” Production data rights can remain a later gate.
3. A qualified finance reviewer for roughly 12–16 hours and a security/platform contact for 8–12 hours in the month. These are additional specialist hours, not additional full-time developers. If the owner must absorb them, reduce scope or extend the calendar. An agent is not the independent reviewer.
4. One agreed company/sector, template, accounting convention and gold case before generating deliverables. Human-approved peers and forecast assumptions; uncertain data produces a visible limitation.
5. No new Office add-in, multi-tenant SaaS platform, workflow builder or bespoke distributed-agent framework. Background tasks are bounded jobs, not unrestricted autonomous sessions.
6. Daily integration and small tasks with evidence. Freeze analytical scope by day 10 and new template/feature requests by day 15; finish the agreed exports, review controls, reconciliation, rendering and adversarial checks in the final week.

## Capacity, uncertainty and subscription months

The owner has 20 working days × 8 hours = **160 hours**. The 18 month-one tasks allocate **128 hours** including integration/review coordination, leaving **32 hours** for rework, interruptions and usage-limit delays. This is 80% planned utilization. The [task register](planning/TASK_REGISTER.md) gives each task a low/base/high effort, duration, target start/finish, dependencies, proposed executor and human review/lead-time requirement. Agent time is not added as a second owner's capacity.

The illustrative kickoff is Monday **26 October 2026**, ending Friday **20 November 2026**. Dates are provisional targets, not an authorized start or bank commitment. Shift the whole dependency schedule when kickoff changes. Month one has no weekends assumed. Later dates are broad planning windows; bank holidays, leave and external-review queues require rebaselining.

Use the low/high task ranges for uncertainty, not as statistical confidence intervals. They are correlated: a poor provider schema can delay several tasks. The month-one low/base/high sums are 101/128/192 owner hours, before the separate 32-hour reserve. The high-effort case exceeds available capacity even before procurement delays. The decision is to cut scope or accept 6–8 weeks, not work around a failed control. DCF is the first feature to defer if valuation conventions or API access consume the contingency; retain comps, traceability, review and a complete output.

| Cumulative result | Working delivery estimate | Months of the one subscription if kept active | Subscription cash at $200/month, before tax | Scope / external qualification |
| --- | --- | --- | --- | --- |
| Narrow demonstration | 4 weeks stretch; 6–8 weeks fallback | 1–2 | $200–$400 | One workflow; no bank-production claim |
| Controlled analyst pilot | 8–10+ weeks | About 2–3+ | About $400–$600+ | Rights, pilot controls, actual users and reviewer evidence |
| Bank-assessment candidate | 3–6 months favorable; budget 6–12+ conservatively | 3–6 or 6–12+ if continuously active | $600–$1,200 or $1,200–$2,400+ | Reuse bank services; external requirements and review can extend this |
| Broad competitor-style product | 12–24+ months, uncalibrated | 12–24+ if continuously active | $2,400–$4,800+ | Additional methods, integrations, product iteration and operations; feature/quality parity unproven |

These are elapsed-month arithmetic, **not a conversion of processed tokens to subscription allowance**. Buying additional seats is not assumed; parallel workers on the same account share its limits. Pausing a subscription during external waits could change cash spend. This does not make the total project cost $200/month.

## Claude Code, agents and runtime economics

Anthropic lists [Max 20× at $200/month](https://support.claude.com/en/articles/11049741-what-is-the-max-plan). Its [Claude Code plan documentation](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) specifies shared five-hour and weekly limits. There is no stable published processed-token allowance from which to prove that this project's workload fits one month. Do not use stale prompts-per-five-hours examples as an Opus 5.5 throughput guarantee.

The [current monthly API-credit offer](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans) lists $200 per billing cycle for Max 20×, requiring eligibility and linking a Console organization, with rollout/claim conditions. Credits expire and do not extend interactive Claude Code limits or cover partner clouds. Treat eligibility/activation as unverified for the owner's account; include any actually claimed credit once, against eligible runtime/API usage. It is not $200 of extra coding allowance or unlimited production inference.

[Anthropic's authentication guidance](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account) directs products for others to API-key or supported-cloud authentication. Use Max for authorized development in Claude Code; budget the delivered app's inference separately on a bank-approved route. A personal subscription is not evidence of an approved bank processor contract. Source code can be developed with permitted fixtures while bank processing is evaluated independently.

Proposed future execution model:

- **Opus 5.5 lead:** specification, architecture, financial-method decisions with reviewer, security boundaries, complex integration and final code review.
- **Sonnet-class agents:** bounded adapters, UI components and meaningful tests with explicit schemas/acceptance criteria.
- **Haiku-class agents:** file discovery, mechanical documentation, schema comparisons and classification. Escalate ambiguity. Do not delegate final finance judgement, access-control design or acceptance to a small model.
- Start with at most two bounded workers plus the lead; use isolated branches/worktrees when concurrent edits would conflict. Keep task briefs short, return evidence/diffs, and integrate each slice before expanding concurrency. This is a scheduling policy, not a claim of threefold output.

[Claude Code's subagent docs](https://code.claude.com/docs/en/sub-agents) confirm that subagent requests count against the same usage limits and allow model selection. Model availability in this app's live catalog was inspected, but that does not establish Max entitlement or relative productivity. No benchmark or current-task multi-agent speedup is asserted.

After implementation is authorized, calibrate during the initial application/security/adapter tasks (T06–T08) on one adapter, one numerical example and one permission-isolation example. Record approved task completion, correction time, input/output/cache tokens if available, model, usage-limit depletion/reset waits and total human hours. If the weekly allowance cannot sustain the observed pace, reduce context/concurrency, use smaller models for bounded work and cut scope or extend time. No automatic API overage purchase or additional account is planned.

Non-model costs remain outside subscription arithmetic:

| Cost | Planning treatment |
| --- | --- |
| Data and AI/machine/output licences | Vendor quotes required; minimum annual commitments and separate redistribution rights may dominate. No price invented. |
| Development hosting/CI/storage | Illustrative allowance $100–$500/month for a small sandbox, not a quote; bank platform chargeback and production requirements unpriced. |
| App runtime/model evaluations | Usage-based. Compute per run as input/cache/output × relevant prices + tools; then multiply by runs, users and retries. No user-volume assumption has been established. |
| Specialist finance/security work, penetration test, assurance, procurement/legal | Hours and external gates appear in tasks; fees and bank internal cost unquoted. Independent services are additional cash or institutional capacity. |
| Operations, support, monitoring, disaster recovery and maintenance | Required operating ownership before production; excluded from the one-month coding budget. |

Existing [token envelopes](TOKEN_ESTIMATE.md) remain uncalibrated processed-work illustrations. They do not establish elapsed time, subscription feasibility, bank approval, or total development cost.

## Architecture to scope, not implement

Data flow: user/deal identity → authorized job → provider MCP/API adapter → typed facts and evidence → deterministic financial calculations → structured narrative/visual specification → controlled briefing and Office renderer → maker/checker review → immutable approved artifact. Every boundary carries matter permissions and usage rights. The model chooses/explains tools and drafts the narrative; it does not become the arithmetic engine or permission authority.

Use a modular monolith and standard relational/object storage initially, with a bounded job runner and audit records. No vector database is required for the first structured-data workflow. Add document retrieval only when authorized internal-document use is in scope; embeddings may assist retrieval, but never replace fact typing or authorization. Avoid arbitrary agent-generated JavaScript with application privileges. Revisit job isolation, Office add-ins, multiple providers, high-volume screening and tenancy only after the first slice is measured.

## Phases and gates

| Phase | Proposed horizon from kickoff | Exit result | Critical dependency |
| --- | --- | --- | --- |
| P0: evidence and scope gates | Week 1; external work may continue | First workflow, gold-case specification, entitlement/control questions, design and build decision | Owner authorization, actual provider rights and permitted environment |
| P1: one-month challenge | Weeks 1–4 together with P0 | Reviewed valuation/comps briefing, bounded DCF, source appendix, reconciled editable exports and frozen snapshot | One working provider/fixture path and reviewer access; G1 |
| P2: controlled analyst pilot | Weeks 5–10+ | Authorized internal documents, selected precedents, draft CIM sections, 3–5 users, measured quality/time/economics | Rights, approved processing, SSO/matter controls and pilot acceptance; G2 |
| P3: bank assessment | Weeks 11–26+; conservative overall horizon 6–12+ months | Control/evaluation/security/operations evidence and assessment decision | Bank owners, independent testing, procurement; G3 candidate is distinct from acceptance |
| P4: workflow expansion | Months 7–13+ initial modules; breadth may extend to 12–24+ | Debt, IPO, PE/VC modules and product/operational expansion | Per-module method/data/review gates and production approval where applicable |

Do not sum overlapping external lead times. Workstreams can overlap only where inputs permit; the sole owner cannot do multiple full-time tasks simultaneously. Phase windows include sequencing/queues and available capacity, not merely the sum of model-call runtimes.

Critical chain: chosen workflow → rights/tool sample and reference case → schema/adapter → semantic reconciliation → calculation validation → outputs/review → adversarial tests → demonstration decision. A separate bank chain begins immediately: sponsor/control route → processing/data rights → identity/barriers → independent tests and evidence → bank acceptance. More coding agents cannot remove that external chain.

## Proposed acceptance gates for the initial slice

Before calling the month complete:

- Run five end-to-end cases and at least ten edge/failure cases, selected before implementation: mixed scale, wrong fiscal year, stale quote, restatement, missing metric, invalid/negative multiple, DCF terminal-growth constraint, denied access, cross-matter retrieval, and injected document instructions.
- Independently reconcile at least 30 material inputs and 10 derived outputs; predefine numerical tolerances and conventions with the finance reviewer. Every displayed material figure has period, unit, as-of date and a resolvable source/calculation record.
- Check all material narrative claims against evidence or mark them as explicit assumptions/judgements; no fabricated source or value. Any unresolved critical numerical or confidentiality defect blocks the gate.
- Reconcile tables/charts across HTML, PPTX and XLSX; visually inspect exported pages/slides, workbook formulas and source links. Changing assumptions or source data invalidates prior approval and creates a new version.
- Demonstrate permission denial/revocation and no observed cross-matter leakage in the agreed test set; no secret in generated content/logs; blocked unapproved tool/network action. This is finite-test evidence, not universal security proof.
- Record analyst and reviewer time against the baseline, defects and usage waits. A demonstration can pass functional gates while failing the economic case; report both.

GitHub tasks remain open until evidence exists. “Planned,” “built,” “finance-validated,” “security-assessed,” and “accepted by the bank” are different states. The current research does not complete provider procurement, expert validation or bank acceptance.
