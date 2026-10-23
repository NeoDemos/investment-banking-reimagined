# Monday application demonstration — 26 October 2026

Use the **agent workflow**, not the retained manual workspace. Open `Start Demo.command` and `http://localhost:4173` on the personal Mac. The `.app` is an unsigned browser launcher, not a native webview. Keep the terminal server open. Use public information only and a viewport of at least 1280×800.

## Rehearsal gate

On 23 October the real local Claude Max request returned **weekly usage limit / HTTP 429**. The system reports this rather than generating a canned substitute. Before Monday, verify available Claude capacity or configure an OpenAI API key privately in Connections & design. A full successful live model draft and redraft remain unverified until this is done. The mock-model integration test is not the boss-demo rehearsal.

## Demonstration

| Time | Banker interaction | Expected application behavior |
|---|---|---|
| 0–1 min | Choose Financing discussion to populate an example brief; read it and click Prepare discussion. | The brief explicitly gives illustrative transaction terms. The model decides which tools to call; no template draft is created at engagement creation. |
| 1–3 min | Watch execution; expand a call/result if useful. | SEC company facts and a USD Treasury curve are retrieved automatically. Failed refreshes can use a clearly dated cache when allowed. Disable cache in Settings to require fresh retrieval. |
| 3–5 min | Open the composed materials, then Sources and Analysis. | Page count, sequence and visual blocks come from the model's design decisions. Reported facts retain dates/units/tags/filings. Rust supplies every displayed financial figure from the pinned source snapshot. |
| 5–7 min | Ask: “Increase the assumed spread to 175 bps, show the downside first and make the discussion more concise. Preserve the source context.” | The agent recalculates into a new analysis record and composes another draft. The previous draft and source/calculation snapshot remain in history. The model may clarify an ambiguous instruction. |
| 7–9 min | Choose Review together. Select pages, type a note on each and choose Add page review note; Apply review notes. | All page-specific feedback returns to the same agent pipeline. Completion appears in the app. Direct Edit page changes headline/narrative and saves a revision with concurrency checks. |
| 9–10 min | Download inspection JSON and calculation workings CSV. | The database/engine is the working system; exports allow inspection. Current agent-aware editable PowerPoint/XLSX/standalone deck export is not claimed. |

A natural brief can require clarification. Unobserved share prices and issuer spreads are assumptions, not facts. The example briefs make that explicit so the discussion can proceed without typing reported financial data. Public annual accounts are not current market data, LTM figures or forecasts. The source tab states actual vintages, refresh failures and normalized source hashes. There are three covered entities: PEP, CPB, GIS; unsupported coverage must be explained.

## Audio and branding

Recorded voice can populate the brief/review composer through an optional OpenAI transcription API key entered privately in the app. This audio path is not yet live tested. It is not a virtual human team or a full duplex meeting. Keep typed page review as the rehearsed fallback; no external email/message is sent.

The SVG wordmark is the actual public investor-site vector path. Light/regular/bold Myriad website fonts are installed locally on this Mac, excluded from the repo/bundle. The public PDF's customized MyriadforRabobank font is a distinct identity, and PDF pixel parity or official approval is not claimed. The canvas uses 4:3 pages. Check every page for density and narrative quality before showing it.

This is an independent public-data prototype. No bank affiliation, confidential processing, ZDR assurance, financial advice approval or bank acceptance is implied. Qualified finance review, native managed deployment, bank identity/models, broader valuation coverage and licensed market data remain later work. See [agent workflow](AGENT_WORKFLOW.md) and [financial conventions](MVP_ARCHITECTURE.md).
