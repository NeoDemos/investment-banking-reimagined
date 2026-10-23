# Investment Banking Reimagined

A local **React + TypeScript application** integrating financial work and preparation of client materials, backed by Rust and SQLite. The 23 October revision replaces the initial presentation-viewer UI with an engagement workspace: create work, inspect sources, calculate scenarios, write materials and review revisions. **The owner authorized the public-data MVP for Monday 26 October.** The longer-term bank/valuation acceptance gates remain separate.

## Run the demo

On the development Mac, double-click **Start Demo.command**, then open **http://localhost:4173**. A compiled Apple Silicon launcher is also built locally at `dist/Banking Studio.app`; it opens the web application in your existing browser. No Node, Python or Rust runtime is needed to run the compiled application. The unsigned local launcher is not an enterprise-distribution package.

To build from source with Node 24/npm and a Rust toolchain:

```sh
npm ci
npm run build
cargo build --release
./target/release/banking-studio --open
```

The development machine's user-local Cargo is at `~/.cargo/bin/cargo`; installation did not modify shell startup files. Stop the terminal server with Ctrl+C. Source launcher data lives in `.local/studio.sqlite`; the `.app` launcher uses `~/Library/Application Support/Banking Studio Demo`. The server binds to `127.0.0.1` only. Do not expose it on a network.

## What is implemented

- Engagement creation, reusable workflow starters and a workroom connecting source evidence, financial analyses, client materials and review.
- Three independent PepsiCo scenarios per engagement: USD fixed-rate bond financing, cash-funded share repurchase, and a hypothetical Campbell’s acquisition.
- Editable narrative and section titles using Tiptap, with financial blocks linked to the calculated analysis versions. Commentary is preserved when figures update; a banner calls for narrative review after analysis changes.
- Local Myriad and Myriad Light typography with a bundled open-source Source Sans 3 fallback; no proprietary font is redistributed. This is not the exact customized Myriad for Rabobank font package or an official template.
- SEC annual financials for PepsiCo, Campbell’s and General Mills, with period, tag, filing and source provenance; dated U.S. Treasury observations.
- Rust calculations, editable assumptions, sensitivities, source inspection and sortable calculation workings using TanStack Table. SQLite holds application state; Excel is an inspection export.
- Material revisions and saved review copies that preserve the narrative and exact analysis versions together. Further live-model changes do not alter saved review copies.
- Page review notes, bounded offline assumption-edit commands, real background revision jobs, recalculated versions and in-app completion messages. Desktop alerts require browser permission.
- Downloadable offline client briefings with source/assumption audit, inspection XLSX with formulas and cached engine results, and HTML printing to PDF.
- Optional OpenAI text revision, recorded transcription and WebRTC voice-review adapters. Optional Alpha Vantage dated equity-quote adapter. **Live provider calls remain untested without account keys and entitlements.** Add keys privately in the local Settings dialog; never put them in chat or commit them. API use is separately billed from coding/chat subscriptions.

Stock prices and issuer credit spreads start as **scenario assumptions**, not live quotes. This is a financing and capital-allocation demonstration, not a complete valuation, trading, credit or transaction-execution product. No confidential bank/client material is used. There is no bank affiliation, endorsement or acceptance claim.

## Demo, evidence and next steps

- [Monday demonstration script and implementation boundaries](docs/MONDAY_DEMO.md)
- [Free/trial data providers, Copilot integration and native-app path](docs/MVP_DATA_AND_PLATFORM.md)
- [MVP task estimates, horizons and remaining gates](docs/planning/MONDAY_MVP.md)
- [Architecture, financial conventions and limitations](docs/MVP_ARCHITECTURE.md)
- [Reference-product interpretation and open-source reuse](docs/REACT_WORKSPACE_AND_OPEN_SOURCE.md)
- [Local integration measurements and check results](docs/verification.json)
- [React workflow and browser checks](docs/browser-verification.json)

```sh
npm run check
cargo test
python3 scripts/verify_demo.py
scripts/package-mac.sh
```

The verification utility uses an isolated temporary database and never calls external model/data APIs. Node/npm build the React frontend; Python supports development checks. Neither runtime is required by the compiled application. The editor and review room are loaded on demand. `scripts/build.sh` performs a clean frontend install/build and release Rust build. `scripts/refresh_public_data.py` can rebuild a dated SEC/Treasury snapshot; review its diff, rebuild, and use a fresh database before demonstrating refreshed facts. General data-vintage migration remains future work. Open-source notices for production frontend dependencies are embedded and available from Settings.

## Research and full delivery plan

[GitHub Project](https://github.com/users/NeoDemos/projects/3) · [Parent issue #1](https://github.com/NeoDemos/investment-banking-reimagined/issues/1)

- [Market and peer research](docs/MARKET_RESEARCH.md)
- [One-month challenge and full delivery/capacity plan](docs/DELIVERY_PLAN.md)
- [Provider field and entitlement requirements](docs/DATA_REQUIREMENTS.md)
- [Bank control/evidence gates](docs/BANK_ACCEPTANCE.md)
- [Original 37-task register](docs/planning/TASK_REGISTER.md)
- [Initial feasibility](docs/FEASIBILITY.md) and [uncalibrated token/cost illustrations](docs/TOKEN_ESTIMATE.md)

The original month-one scope includes reviewed comps/DCF, editable PowerPoint and stronger review/identity controls. This smaller public demonstration does not replace those requirements. Full bank readiness depends on actual control owners, permitted processing, data contracts, independent review and acceptance.

This repository is independent of the NeoDemos product. It contains independently authored application code, planning and a small public-data snapshot. It must not contain credentials, licensed provider responses or confidential information.
