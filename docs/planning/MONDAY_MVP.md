> Current local scope is M13/#53 and M14/#54 below: five independent banker-lens gauntlets, then director-led actual local Codex planning/composition over the public data pool. Earlier UI/blueprint estimates and evidence are historical foundations, not the current primary product or a cumulative actual-hours record. #48 qualified owner/banker review remains open.

# Accelerated Monday MVP track

Scope authorized 22 October 2026. Target demonstration: Monday **26 October 2026**, personal Mac, public information only. This supplements the [original 37-task plan](TASK_REGISTER.md); it does not mark its bank controls or full valuation acceptance work complete.

[GitHub Monday MVP track #39](https://github.com/NeoDemos/investment-banking-reimagined/issues/39) · [Project](https://github.com/users/NeoDemos/projects/3) · [Structured task metadata](monday-mvp.json). Tasks M01–M09 are issues #40–48, with native child/dependency links and per-task project dates/effort. Live API rehearsal (#46) and model-port acceptance (#51) are deferred to the next phase by the owner. Owner/banker review (#48) remains open for Monday. **M12 / #52 is the current technical architecture acceptance baseline.**

**23 October correction:** the owner required an integrated React application rather than a presentation-viewer interface. M10 supplements the original nine tasks: engagement/workflow navigation, React/TypeScript, Tiptap material editing, linked financial blocks, saved review copies and local Myriad typography. Target 23–26 October; incremental prospective owner effort **8/12/20 hours low/base/high**, not recorded agent runtime. The initial 35-hour base estimate below remains the original baseline; including this correction the prospective base becomes 47 hours. See [reference/open-source decisions](../REACT_WORKSPACE_AND_OPEN_SOURCE.md). This is historical scope: live APIs are now deferred; owner/banker review remains separate.

The estimates below are **prospective owner-effort ranges**, not elapsed agent runtime or recorded hours. Base effort totals 35 hours before optional provider-account delays; one focused owner can prepare the narrow slice in the Thursday–Sunday window, with scope/review risk. Existing implementation reduces remaining coding work but does not eliminate rehearsal or specialist review. Neither a Max subscription nor more agents makes external entitlements, expert decisions or tenant approval instantaneous.

| Task | Horizon / target | Owner hours low / base / high | Dependencies | Current evidence / remaining work |
|---|---|---:|---|---|
| M01 — Public references and data/provider verification | Thu 22 Oct | 3 / 4 / 6 | Owner scope | Public Rabobank PDFs inspected; SEC/Treasury fetched; provider offers and Copilot preview documented. No institutional trial purchased. |
| M02 — Three bounded finance methods and data semantics | Thu–Fri 22–23 Oct | 4 / 6 / 9 | M01 | Rust bond/buyback/acquisition calculations implemented; primary outputs independently recomputed. Qualified banker review remains separate. |
| M03 — Lightweight Rust/SQLite local application | Thu–Fri 22–23 Oct | 3 / 4 / 6 | M01 | Release binary, isolated tests, embedded UI/snapshot, loopback API and version state implemented. |
| M04 — Digital corporate-identity presentations | Fri 23 Oct | 3 / 5 / 8 | M02, M03 | Six-page layouts implemented and browser inspected. Official template/font and brand-owner approval are excluded. |
| M05 — Page review, revisions and completion messages | Fri–Sat 23–24 Oct | 2 / 3 / 5 | M03, M04 | Typed bounded commands, background job, new version, unresolved notes and local completion tested. |
| M06 — Offline presentation and inspection exports | Sat 24 Oct | 2 / 3 / 4 | M02, M04 | HTML and XLSX implemented; XLSX cached results checked. Native PPTX excluded. |
| M07 — API voice and structured-edit adapters | Next phase; 1–3 working days after model acceptance/access | 2 / 3 / 6 | M05, permitted API access | **Deferred by owner; not a Monday blocker.** Retained adapters are disabled by default. |
| M08 — Local correctness, UI, security and footprint checks | Sat–Sun 24–25 Oct | 4 / 5 / 8 | M02–M07 | Unit/integration/browser evidence recorded; production and managed-device verification excluded. Re-run only after relevant changes. |
| M09 — Package, financial review and boss-demo rehearsal | Sun 25 Oct; show Mon 26 Oct | 2 / 2 / 3 | M04–M06, M08, M12 | Local Mac launcher and no-API demonstration script prepared. Owner/banker walkthrough remains outstanding. |

Suggested specialist time, additional to the owner estimates: 2–4 finance-review hours for the three demonstrations. Cut live voice first if account/network testing fails; retain a complete typed review, recalculation, presentation and export story. Do not fill missing market quotes with invented observations. Do not add native installers, bank SSO, confidential data, full DCF, precedent-transaction feeds or a general CIM writer before Monday.

## Current architecture baseline — M12 / #52

The owner deferred external connections and requested a proper source → MCP → context/workflow → dynamic-materials application. [M12 #52](https://github.com/NeoDemos/investment-banking-reimagined/issues/52) is technically complete in draft PR #49. It uses actual MCP SDK discovery/calls/resources and curated local blueprints; free-form briefs are saved pending the later model port. No autonomous natural-language generation is claimed.

| Subtask | Window | Owner h low/base/high | Completion evidence |
|---|---|---:|---|
| Primary-source peer/MCP research and contracts | 23 Oct | 1 / 2 / 4 | Product/provider/SDK evidence and independent implementation decisions |
| Evidence/provider/MCP boundary | 23–24 Oct | 2 / 4 / 7 | Canonical IDs/units/vintages; actual SDK tools/resources; planned adapters fail explicitly |
| Context and document/scene contracts | 23–24 Oct | 2 / 3 / 5 | Bounded packets, resolvable citations, numeric bindings and scoped revisions |
| React workspace and local blueprint flow | 24–25 Oct | 2 / 3 / 5 | Connections, library, context, materials and saved review; no API-key gate |
| Protocol/state/rendering verification | 24–25 Oct | 1 / 2 / 3 | Independent stdio, exact numeric persistence, three workflows and browser review |

Total **8 / 14 / 24 prospective owner hours**, not recorded runtime. This scope overlaps the M10/M11 foundation: historical correction forecasts are **not cumulative delivered effort**. The current evidence includes 23 Rust tests, 11 actual MCP/workflow check groups, 28 retained API checks and all 16 example pages inspected at 1280×800. Model calls: zero. [Architecture, remaining tasks and estimates](../MCP_ARCHITECTURE.md) · [Research](../PEER_ARCHITECTURE_RESEARCH.md) · [Verification](../mcp-verification.json).

Historical M11 (#51) implemented a custom model/tool loop and hit a live quota limit. Its live acceptance now belongs to the next phase; the former quota is not a present blocker. Remaining model-port work is re-estimated at **4 / 8 / 14 owner h**, roughly **2–5 working days after access and architecture review**. #46 voice/API acceptance is also deferred. #48 owner/banker walkthrough remains open. Public website Myriad differs from PDF-custom MyriadforRabobank; exact PDF pixel parity is not claimed.

## After Monday

| Work | Earliest sensible horizon | Active owner effort | External dependency / completion definition |
|---|---|---:|---|
| Correct finance/UX feedback and rehearse live APIs | 1–3 working days | 6–12 h | Banker's observations, API entitlement and real calls; display/processing rights for any quote used. |
| Evaluate one institutional dataset/schema | 1–4+ elapsed weeks | 8–16 h | Written trial terms, actual sample responses, field/period reconciliation and onward-use rights. |
| Native OS-webview shell and packaging spike | 1–2 weeks | 20–40 h | Both OS test machines, signing/distribution constraints, Windows webview prerequisites. Not bank acceptance. |
| Copilot tenant integration spike | 1–2 weeks after consent | 12–24 h | Preview permission approval, licence and tenant registration; assess broad delegated scopes before coding integration. |
| One-month reviewed comps/DCF and editable output slice | Original 20-workday plan, rebaseline after demo | Original 101 / 128 / 192 h | Provider/finance/platform gates in DELIVERY_PLAN; this demo supplies reusable components only. |
| Bank-assessment candidate | 3–6 favorable / 6–12+ conditional months in original plan | Task-specific register | Actual control owners and requirements, permitted models/retention, data rights, security testing and bank acceptance decision. |

For future execution, assign bounded implementation/research slices to the requested Opus lead and smaller workers, with one owner retaining financial and product decisions. Subscription allowances are shared usage limits, not guaranteed delivered hours or a runtime API licence. No new subagent/model throughput measurement has been made in this MVP; do not derive a month estimate from token counts alone.

## Current director-led acceptance — M13 / #53 and M14 / #54

The owner requested five fresh independent GPT-6.1 Sol banker-lens reviews, then sharpened the product into director instruction → client storyline → pooled public reporting/rates → deterministic financial model → generated narrative/charts/frames → another turn. [Five reports and responses](../reviews/GAUNTLET.md), [the work catalog](../CLIENT_WORK_CATALOG.md), [local agent contract](../LOCAL_AGENT.md) and [current demo](../MONDAY_DEMO.md) define this scope. Model reviews are defect discovery, not qualified banker/value validation.

| Task | Window | Prospective owner h low/base/high | Completion definition |
|---|---|---:|---|
| M13 client brief, accountable work plan and scoped recalculation | 23–24 Oct | 6 / 10 / 16 | Persisted decision, criteria, comparable actions/status quo and controlled financial changes |
| M13 lineage, complete advice and exact review | 23–25 Oct | 8 / 12 / 20 | Exact input dependencies, complete conditions, manual-block gates and immutable review/history |
| M13 five independent review rounds and corrections | 23–25 Oct | 3 / 5 / 9 | Five raw GPT-6.1 Sol reports, substantive fixes and retained unresolved objections |
| M13 history, evaluation and regression evidence | 24–25 Oct | 4 / 7 / 12 | Bounded hot reads, exact historical retrieval and complete quality-failure-aware evaluation export |
| M13 package, technical demonstration and docs | 25–26 Oct | 2 / 3 / 6 | Running latest local app and honest handoff; human walkthrough remains #48 |
| M14 local account and bounded agent stages | 23–24 Oct | 3 / 5 / 8 | Actual saved-login Codex inference, typed plan/composition, invalid/stale refusal |
| M14 public pool and ingestion slice | 23–24 Oct | 3 / 5 / 9 | Retained versions, SEC/Treasury fetch jobs, explicit errors and pending document extraction |
| M14 director-first storyline and bound frames | 24–25 Oct | 3 / 5 / 8 | Natural-language assignment primary, financial work integral, client/peer/Rabobank argument and dynamic pages |
| M14 banking work catalog and public references | 23–25 Oct | 2 / 3 / 5 | Client-facing jobs mapped to models/evidence; sector lookup and implemented/future coverage explicit |
| M14 live rehearsal, targeted fifth-review follow-up and handoff | 25–26 Oct | 3 / 6 / 10 | Real assignment/next turn, page-fit and boundary verification; no human gains invented |

M13 totals23/37/63h; M14 totals14/24/40h. These are prospective owner-effort ranges with overlap, not elapsed execution, guaranteed subscription throughput or additive delivered-hours claims. Finance specialist review adds2–4h. The structured JSON includes each subtask's target date and estimate; GitHub issues#53/#54 have matching project dates, fields and native dependencies. The current bank/full-valuation programme is not completed by these demo tasks.

The local CLI route has actual execution evidence and does not require a new API key on this signed-in Mac. Separate remote/Claude/API acceptance #51 and voice #46 remain future work. Wider company/EU report ingestion, EUR rates, equity/index data, full IPO/DCF/LBO models and editable Office/native shells are explicitly later modules. Rebaseline their task estimates against the demonstrated interfaces and actual provider/control requirements rather than infer completion from a polished example.

## M15 — observable drafting and capital models

[Issue #55](https://github.com/NeoDemos/investment-banking-reimagined/issues/55) is the current technical correction track. Target 23 October 2026; prospective effort 8 / 12 / 16 developer hours (1–2 focused days), not recorded runtime or model allowance. The structured register assigns the same-day horizon to every subtask. Scope: persistent feedback/cancellation, selected live public sources, Codex High / Claude Opus Medium profiles, inspectable IPO/LBO models and actual multi-prompt/coaching validation. The narrow Apple report and German reference-rate adapters are now implemented; general report extraction and full underwriting remain future work. Claude's actual readiness hit its weekly quota. Qualified banker evaluation remains #48.
