> Current product layer: [client decision workroom](CLIENT_WORKROOM_ARCHITECTURE.md). The local blueprint foundation below now serves typed client briefs, comparable decisions, exact figure dependencies, accountable tasks and immutable discussion review. External model/data/voice ports remain deferred.

# MCP-backed financial workspace — 23 October 2026

The M12 foundation used **architecture first; external API/model/data connections later**. Subsequent M14–M16 owner requests activate local subscription-backed agents, guided client direction and fixed public-data ingestion. Licensed feeds, remote API keys and bank integration remain separate. No new key is required for the working local Codex route. [Peer research and sources](PEER_ARCHITECTURE_RESEARCH.md) records the product patterns studied and separates evidence from our design inferences.

## Implemented boundaries

| Boundary | Code | Contract |
|---|---|---|
| Provider ports | `src/providers.rs` | `FinancialSource` and registry descriptors; public archive executes; planned remote adapters fail explicitly |
| Canonical evidence | `src/evidence.rs` | Immutable record ID; canonical SEC entity; raw/normalized units and scale; fiscal/publication dates; filing location; FTS5 discovery |
| MCP gateway | `src/mcp.rs` | Official `rmcp 3.7.0` client/server, schema-described tools, structured results and addressable resources; duplex and stdio |
| Financial methods | `src/finance.rs` | Validated assumptions and sourced actuals produce deterministic outputs; each calculation pins the data used |
| Context selection | `src/evidence.rs` / MCP `build_context` | Selected entities, evidence, citations, analytical outputs, explicit omissions and a bounded serialized-character budget |
| Workflow/model port | `src/workflow.rs`, retained `src/agent.rs` | Explicit blueprint stages; genuine model adapters remain disabled by default; free-form instructions persist pending that phase |
| Document/compiler | `src/materials.rs`, `data/brand-rabobank.json` | Semantic page/block contract → scene frames, geometry, bindings, citation index and review warnings |
| User experience | React workspace / `PlatformWorkspace.tsx` | Data connections, workrooms, materials library, evidence/context inspection, canvas and scoped review |

The application is a modular monolith. Protocol messages cross an actual MCP client/server boundary without requiring multiple local processes. This keeps the local footprint small while leaving remote provider clients and native OS shells replaceable later.

## Data and context

The archive contains annual SEC observations for three covered companies and a dated Treasury par curve. `evidence_records` and `evidence_search` separate financial evidence from chat. Search is deliberately bounded keyword discovery. Every record preserves the source value and unit, then records its normalized scale; a ticker is an alias while the canonical entity uses a SEC CIK. New observations/corrections require new content identities rather than overwriting historic evidence.

The provider layer exposes coverage and phase state. FactSet/S&P/Daloopa entries describe intended integration routes and linked public documentation; they are not authenticated connections or proof of rights. Activating a source later requires actual tool schemas/responses, financial-definition reconciliation, vintage and correction policy, entitlements and permitted AI/output use. Provider-native MCP need not be rewrapped indiscriminately: the host can discover it through its own MCP client, then normalize admitted observations. API/feed sources can use our adapter/server boundary. Bulk ingestion and permission filtering stay behind that boundary.

`build_context` requires selected retrieved entities and a character budget. The packet contains selected financial evidence, dated curve, derived-analysis summaries and citation metadata. It records omitted evidence IDs and never presents its character count as a token allowance. Complete revision history is excluded from retained model-adapter requests; source snapshots are removed from model-facing analysis copies. The host remains responsible for total request budgeting and safe context policy when live models are introduced.

A frame references an existing analysis or evidence identity. Scene citations currently identify relevant underlying facts/analysis snapshots; they are not yet a full per-number dependency graph for every derived metric. Qualitative narrative still requires review. A label or SDK annotation is not a permission or accuracy guarantee.

## MCP surface

Tools: `company_catalog`, `fetch_company_facts`, `fetch_treasury_curve`, `search_evidence`, `calculate_finance`, `build_context`, `compose_materials`, `ask_banker`.

Resources: `banking://catalog`, `banking://brand/rabobank-public`, `banking://methodology/finance`, `banking://session/context`, plus exact `banking://evidence/<id>` reads. Unknown resources, arbitrary local paths and arbitrary URL arguments are rejected. Stdio exposes a fresh in-memory public workspace; it does not read another application's credentials or the web app’s private local database.

The SDK negotiates the current 2026-07-28 protocol and supported legacy versions. The independent stdio check also uses a 2025-11-25 initialization sequence. Current application scope is explicit in the server/host instance; it is not a claim that newer stateless MCP provides application memory or tenant isolation. A future shared HTTP server must carry explicit authorized workroom/principal scope rather than infer it from a connection.

Input structs and financial/document validators enforce the allowed operations. Tool descriptions and read-only hints cannot substitute for those checks. Default network/model/voice execution is disabled. There is no arbitrary shell, filesystem, external-mail or dynamic-code tool.

## Workflows and artifacts

The local blueprint runner executes discovery → evidence retrieval/search → financial calculation → context assembly → semantic composition → scene compilation. It records the actual MCP calls and structured observations. Different examples currently produce five, four and seven pages. Blueprints provide explicit narrative and illustrative terms; they do not impersonate autonomous language understanding.

A free-form brief or saved review request is persisted with a deferred model-port state. It does not manufacture a draft. In the next phase, a model selects tools and proposes composition/patches through the same host boundary. Provider-native function calling, refusal, budget and adversarial evaluations still need acceptance then.

Semantic pages have stable IDs. Scene frames contain geometry and references; the current React canvas consumes those frame bounds. A scoped edit can change a headline/composition or move a page. The compiler reruns while the underlying evidence and calculations stay unchanged. Legibility rules reject paired financial blocks in a stacked layout and dense data in small multi-row frames; these are structural safeguards, not universal pixel-perfect typesetting.

`agent_rooms` stores committed application state; `agent_runs` and `agent_events` retain execution history. Draft history captures document, scene, sources, calculations and selected context together. A stale or partly invalid edit batch fails before commit. Lightweight room summaries omit source/analysis/history payloads; the selected workroom loads its full record on demand. Exact floating-point JSON round trips are enabled after an integration test detected a last-digit persistence change. None of this constitutes regulatory records, multi-user maker/checker or banker approval.

The semantic document and scene are the common contract for a future editable PowerPoint exporter. PptxGenJS is a researched candidate; a separately generated image/deck would lose the bindings. Current JSON/CSV exports support inspection. Current financial conventions remain the narrow methods in [FINANCIAL_METHODS.md](FINANCIAL_METHODS.md).

## Phase plan and estimates

These are owner planning estimates, **not recorded agent runtime, processed tokens or subscription capacity**. The current architecture work overlaps reusable M10/M11 foundations; do not add every historical correction estimate as if it were independently delivered effort. Bank/finance reviewers, data licensing and external waits are additional.

| Work | Horizon | Owner effort low/base/high | Acceptance |
|---|---|---:|---|
| Peer/MCP research and contracts | 23 Oct | 1 / 2 / 4 h | Primary sources, pattern-to-implementation mapping, explicit unknowns |
| Evidence/provider/MCP boundary | 23–24 Oct | 2 / 4 / 7 h | Actual SDK discovery/calls/resources, canonical IDs/units/vintages and deferred adapters |
| Context and document/scene contracts | 23–24 Oct | 2 / 3 / 5 h | Bounded context, resolvable citations, deterministic bindings and scoped revisions |
| React workspace and local blueprint path | 24–25 Oct | 2 / 3 / 5 h | Usable source/library/context/materials flow, no API-key requirement or fake inference |
| Protocol, state and layout verification | 24–25 Oct | 1 / 2 / 3 h | Independent stdio, offline workflows, numeric preservation, browser review |
| Connect one permitted source | Next phase; 1–4+ elapsed weeks for access | 6 / 10 / 18 h | Contract, entitled schemas, field/vintage/rights reconciliation and failure cases |
| Connect one model decision port | Next phase; roughly 2–5 working days after access | 4 / 8 / 14 h | Real brief-to-tools-to-draft/redraft; missing-data/refusal/limits and injection checks |
| Multi-company analytical grid / richer document retrieval | After a measured first live workflow; roughly 1–2 weeks | 8 / 16 / 28 h | Reconciled periods/definitions, exact citations, retrieval evaluation and review savings |
| Editable Office export | After scene acceptance; roughly 1–2 weeks | 8 / 16 / 28 h | Editable charts/tables/text, preserved bindings/audit snapshot and visual verification |
| Native shell and bank-route work | Separate planned phases | Existing programme estimates | Actual device policies, approved processing, identity, control owners and acceptance |

Current bounded architecture baseline totals **8 / 14 / 24 prospective owner hours** across its first five rows. This is a new scope baseline, not a claimed execution log. Monday owner/banker walkthrough remains a separate review task. Live API/model tasks are deferred, not blockers for this phase.

## Verification

Use `cargo test`, `npm run check`, the production build, `scripts/verify_mcp_architecture.py` and the retained `verify_demo.py`. The current protocol/workflow test uses no model keys or mock model; external connections are disabled and its proxy points to a closed port. It checks SDK discovery, legacy stdio interoperability, source/resource identities, bounded context, distinct workflows, exact data preservation, invalid/stale edits, lightweight reads and restart recovery. Browser checks cover actual scene frames, source/context views and scoped editing. Evidence is recorded in `mcp-verification.json`; historical pre-MCP agent evidence is labelled separately.

No successful live provider/model behavior or bank acceptance is claimed in this phase, and none is required by the revised instruction.

## ADR-001 — Local modular monolith with real MCP boundaries

**Status:** Implemented for the local MVP; owner product review remains open. **Date:** 23 October 2026. **Deciders:** owner for product scope; implementation agent for reversible technical choices. Future bank/platform owners decide any institutional deployment.

**Context:** A personal Mac must demonstrate the financial workflow on Monday without external credentials. The eventual application needs replaceable data/model ports, inspectable calculations and dynamically composed client materials. Managed bank hardware is a future test environment; low local overhead is a design constraint, not a measured bank performance guarantee.

| Option considered | Complexity / cost | Advantages | Consequences |
|---|---|---|---|
| Direct function calls and chat-owned slide payloads | Lowest initial overhead | Fast prototype | Weak protocol interoperability; evidence and artifact lifecycle easily become coupled to messages |
| Rust/SQLite modular monolith with SDK MCP over duplex and optional stdio | Moderate implementation effort; one backend process | Actual discovery and schemas, isolated session authority, deterministic finance, durable evidence/document state and small local footprint | In-process modules still share a failure domain; application policy must enforce scope; MCP is not a security sandbox |
| Separate connector, retrieval, agent and rendering services | Highest local/operational overhead | Independent deployment and scaling | Extra processes, deployment state and authentication before a single-user demo establishes demand |

**Decision:** Use the second option. Keep public evidence, context selection, finance, workflow and document compilation as explicit Rust modules. React consumes a compiled semantic scene. The host exchanges actual MCP messages using the official SDK. Provider-native MCP clients and plain-source adapters remain replaceable future ports.

**Trade-off:** This introduces more structure than a direct function dispatcher while avoiding a distributed local system. Deterministic calculation and immutable evidence are authoritative; model output is a proposal. The local blueprint is an explicit executor for this phase, not a substitute for later model acceptance. SQLite/FTS5 serves the bounded archive; a larger licensed corpus may justify different retrieval infrastructure after measurement.

**Consequences and follow-up:** Protocol overhead and shared-process failure remain measurable concerns; tenant authorization, multi-user concurrency and provider entitlements need their own design before deployment. The current artifact contract supports future export but does not by itself deliver editable Office files. [M12 #52](https://github.com/NeoDemos/investment-banking-reimagined/issues/52) records implemented acceptance; model-port #51 and API/voice #46 are deferred, and owner review #48 remains open.

## M16: request-specific market context

The current catalog has nine tools. `fetch_market_context` accepts no arbitrary URL or query: it reads the host-validated workroom evidence plan and pins normalized market/credit records and gaps from the public pool. The context packet includes that summary; observed price baselines retain their source records in financial lineage. Public network ingestion occurs through separate fixed adapters. [Guided workflow and source contracts](GUIDED_EVIDENCE_WORKFLOW.md) describe the actual implemented coverage and missing current issuer-level inputs.
