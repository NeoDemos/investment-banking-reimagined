# Investment Banking Reimagined

A local React/TypeScript application for **banker brief → public connectors → financial tools → dynamically composed client materials → conversational revision**. Rust owns retrieval, financial calculations and SQLite state. A model chooses the next tool and designs the narrative and page structure. The owner authorized this external public-data demonstration for Monday 26 October 2026; bank production and confidential processing remain separate.

## Run

On this Mac, double-click **Start Demo.command**, then open **http://localhost:4173**. The compiled app includes React; it needs no Node/Python/Rust runtime. Drafting needs either a signed-in local Claude Code CLI with available capacity or an OpenAI API connection configured privately in **Connections & design**. Never enter a key in chat or commit it.

**Live status on 23 October:** the local Claude Max request reached the provider but returned `usage_limit_reached` / HTTP 429. Its weekly allowance is exhausted. A successful live drafting run is **not yet verified**. Tool-protocol integration tests use an explicitly labelled mock model, with real connector requests; they are not live inference evidence. OpenAI/audio are untested without a key. These are visible connection failures, not an offline template presented as AI.

```sh
npm ci
npm run build
cargo build --release
./target/release/banking-studio --open
```

Cargo is also available at `~/.cargo/bin/cargo` on the development Mac. `scripts/package-mac.sh` builds the local unsigned Apple Silicon browser launcher at `dist/Banking Studio.app`. This is not a native webview app or an enterprise installer. The source launcher uses `.local/studio.sqlite`; the `.app` uses `~/Library/Application Support/Banking Studio Demo`. Only loopback is served.

## Current workflow

- Start with a natural-language brief. Example cards fill a brief; they do not generate canned materials.
- The application-owned agent loop selects allowlisted tools: company catalog, automatic SEC annual facts, automatic USD Treasury curve, deterministic finance, dynamic composition or banker clarification. A visible execution trail records calls, observations, errors and model usage.
- SEC coverage is deliberately limited to PepsiCo, Campbell’s and General Mills with reviewed annual US GAAP mappings. Refresh failures can use an **explicitly dated cache**, controlled in Settings. No provider response is silently advertised as fresh.
- Bond issuance, buyback and acquisition methods use retrieved actuals and explicit transaction assumptions. Each calculation holds its source snapshot. No defaults are silently inserted into the agent's calculation call. Public sources do not supply corporate bond spreads, executable equity prices, forecast earnings or comparable transaction multiples here.
- The model composes 2–12 pages from a brand grammar: cover/split/full/grid compositions with text, bound facts, metrics, charts, workings, sensitivities, assumptions and sources. Page count, order and contents are decisions. Displayed financial figures come from Rust and source references, rather than model-written numbers.
- Ask for a different angle or a changed scenario. Review page by page, collect notes and submit them to the same agent. Direct headline/narrative editing creates a version too. Stale/concurrent edits are rejected; previous draft/source/calculation snapshots are preserved.
- Inspect data and formulas in the workroom. Download the full inspection record as JSON or calculation workings as CSV. These exports are inspection aids. The earlier deterministic workspace's XLSX/HTML APIs remain for compatibility; the current agent canvas does not yet export editable PowerPoint or an agent-aware XLSX.
- Recorded speech can be transcribed to the same brief/review flow with an optional OpenAI key. A live voice team meeting is not claimed. There are no outbound messages to other people; completion appears in the app.

## Corporate design

The wordmark contains the **actual SVG path from Rabobank’s public investor site**, not italic text. The site's Myriad web-font identities were inspected; regular/light/bold files are present only in this owner's ignored local brand folder and served locally. Proprietary fonts are **not committed, bundled or redistributed**. Other installations need authorized local fonts; otherwise installed Myriad or the bundled OFL Source Sans 3 fallback applies. The PDF's customized `MyriadforRabobank` identity is distinct from the public website's `MyriadW01` family: exact PDF typography and pixel-identical layouts are not claimed. The current app uses a 4:3 presentation canvas and the public brand's palette and hierarchy. It is an independent prototype, without bank endorsement or brand approval.

## Verification and limits

```sh
npm run check
cargo test
python3 scripts/verify_agent.py
python3 scripts/verify_demo.py
```

The agent integration utility uses an isolated database and mock CLI process, attempts real public connector requests, and tests quota failures, step bounds, cancellation, stale/concurrent writes, source bindings and restart recovery. No model keys are used. The older verification suite covers the retained deterministic methods/API. See [agent architecture and evidence](docs/AGENT_WORKFLOW.md), [Monday rehearsal](docs/MONDAY_DEMO.md) and [financial conventions](docs/MVP_ARCHITECTURE.md).

This is a single-user public-data prototype. It is not a full valuation/underwriting system, a managed Windows/macOS distribution, a bank-compliant or ZDR route, a confidential-data tool or an approved client deliverable. Narrative claims still require qualified human review. A database does not acquire finance expertise by storing documents: explicit financial methods and conventions are the executable expertise.

[GitHub Project](https://github.com/users/NeoDemos/projects/3) · [Parent issue #1](https://github.com/NeoDemos/investment-banking-reimagined/issues/1) · [Market research](docs/MARKET_RESEARCH.md) · [Provider/platform research](docs/MVP_DATA_AND_PLATFORM.md) · [Monday task plan](docs/planning/MONDAY_MVP.md) · [Full delivery plan](docs/DELIVERY_PLAN.md) · [Bank acceptance gates](docs/BANK_ACCEPTANCE.md).

The original month-one scope includes reviewed comps/DCF, editable PowerPoint and stronger review/identity controls; this smaller demonstration does not complete it. This repository is independent of the NeoDemos product and must contain no credentials, licensed provider responses or confidential information.
