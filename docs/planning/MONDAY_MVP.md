# Accelerated Monday MVP track

Scope authorized 22 October 2026. Target demonstration: Monday **26 October 2026**, personal Mac, public information only. This supplements the [original 37-task plan](TASK_REGISTER.md); it does not mark its bank controls or full valuation acceptance work complete.

[GitHub Monday MVP track #39](https://github.com/NeoDemos/investment-banking-reimagined/issues/39) · [Project](https://github.com/users/NeoDemos/projects/3) · [Structured task metadata](monday-mvp.json). Tasks M01–M09 are issues #40–48, with native child/dependency links and per-task project dates/effort. Live API rehearsal (#46) and owner/banker review (#48) remain open.

**23 October correction:** the owner required an integrated React application rather than a presentation-viewer interface. M10 supplements the original nine tasks: engagement/workflow navigation, React/TypeScript, Tiptap material editing, linked financial blocks, saved review copies and local Myriad typography. Target 23–26 October; incremental prospective owner effort **8/12/20 hours low/base/high**, not recorded agent runtime. The initial 35-hour base estimate below remains the original baseline; including this correction the prospective base becomes 47 hours. See [reference/open-source decisions](../REACT_WORKSPACE_AND_OPEN_SOURCE.md). Live APIs and owner/banker review remain separate outstanding gates.

The estimates below are **prospective owner-effort ranges**, not elapsed agent runtime or recorded hours. Base effort totals 35 hours before optional provider-account delays; one focused owner can prepare the narrow slice in the Thursday–Sunday window, with scope/review risk. Existing implementation reduces remaining coding work but does not eliminate rehearsal or specialist review. Neither a Max subscription nor more agents makes external entitlements, expert decisions or tenant approval instantaneous.

| Task | Horizon / target | Owner hours low / base / high | Dependencies | Current evidence / remaining work |
|---|---|---:|---|---|
| M01 — Public references and data/provider verification | Thu 22 Oct | 3 / 4 / 6 | Owner scope | Public Rabobank PDFs inspected; SEC/Treasury fetched; provider offers and Copilot preview documented. No institutional trial purchased. |
| M02 — Three bounded finance methods and data semantics | Thu–Fri 22–23 Oct | 4 / 6 / 9 | M01 | Rust bond/buyback/acquisition calculations implemented; primary outputs independently recomputed. Qualified banker review remains separate. |
| M03 — Lightweight Rust/SQLite local application | Thu–Fri 22–23 Oct | 3 / 4 / 6 | M01 | Release binary, isolated tests, embedded UI/snapshot, loopback API and version state implemented. |
| M04 — Digital corporate-identity presentations | Fri 23 Oct | 3 / 5 / 8 | M02, M03 | Six-page layouts implemented and browser inspected. Official template/font and brand-owner approval are excluded. |
| M05 — Page review, revisions and completion messages | Fri–Sat 23–24 Oct | 2 / 3 / 5 | M03, M04 | Typed bounded commands, background job, new version, unresolved notes and local completion tested. |
| M06 — Offline presentation and inspection exports | Sat 24 Oct | 2 / 3 / 4 | M02, M04 | HTML and XLSX implemented; XLSX cached results checked. Native PPTX excluded. |
| M07 — API voice and structured-edit adapters | Sat 24 Oct | 2 / 3 / 6 | M05, user-owned API access | Adapters implemented. **Live text/transcription/voice rehearsal pending key, account access and microphone/network permission.** Keep typed fallback. |
| M08 — Local correctness, UI, security and footprint checks | Sat–Sun 24–25 Oct | 4 / 5 / 8 | M02–M07 | Unit/integration/browser evidence recorded; production and managed-device verification excluded. Re-run only after relevant changes. |
| M09 — Package, financial review and boss-demo rehearsal | Sun 25 Oct; show Mon 26 Oct | 2 / 2 / 3 | M04–M08 | Local Mac launchers and demonstration script prepared. Owner/banker rehearsal and live-voice decision remain outstanding. |

Suggested specialist time, additional to the owner estimates: 2–4 finance-review hours for the three demonstrations. Cut live voice first if account/network testing fails; retain a complete typed review, recalculation, presentation and export story. Do not fill missing market quotes with invented observations. Do not add native installers, bank SSO, confidential data, full DCF, precedent-transaction feeds or a general CIM writer before Monday.

## Agent-workflow correction — M11 / #51

The owner rejected the manual-first six-section interaction after M10. M11 introduces the genuine intent → source connectors → financial tools → dynamic materials → conversational review path. Target **23–26 October**; incremental prospective owner effort **12 / 20 / 32 hours low/base/high**, not measured coding-agent runtime. This supplements the prior 47-hour base to **67 prospective base hours for the revised scope**, not a record of elapsed work or proof of subscription capacity. Finance review adds 2–4h; model availability is an external gate.

| Subtask | Window | Base owner h | Completion evidence |
|---|---|---:|---|
| Intent/tool/source/assumption contract | 23 Oct | 2 | Application-owned action/observation protocol and explicit unsupported coverage |
| Automatic connectors and pinned sources | 23–24 Oct | 4 | SEC/Treasury calls, normalized metadata, dated cache and hashes |
| Bounded model loop and durable run lifecycle | 23–24 Oct | 4 | Tool allowlist, clarification, step/time bounds, cancellation/restart |
| Primary React interaction and dynamic composition | 24–25 Oct | 5 | Banker brief, trace, 2–12 composed pages, same-agent page review |
| Exact public SVG and local-only Myriad | 23–24 Oct | 1 | Vector path and website font identities inspected; no redistribution |
| State/adversarial/UI checks | 24–25 Oct | 3 | Mock-model protocol, real connector attempts, source bindings, concurrent writes |
| Live first draft/redraft and banker rehearsal | 25–26 Oct | 1 + wait | **Open:** real Claude Max request hit weekly quota; no successful live draft yet |

[M11 issue #51](https://github.com/NeoDemos/investment-banking-reimagined/issues/51) remains open. The original #46 live API/audio and #48 owner-review gates also remain open. A mock model test is not a live demonstration. The public website Myriad differs from PDF-custom MyriadforRabobank; exact PDF pixel parity is not claimed. See [current architecture and evidence](../AGENT_WORKFLOW.md). Proposed lead/worker assignments remain planning roles; no multi-agent implementation throughput was measured here.

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
