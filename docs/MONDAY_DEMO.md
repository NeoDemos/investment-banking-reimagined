# Monday application demonstration — 26 October 2026

Revised 23 October after the owner's feedback: show the **application workflow**, integrating financial work and materials. This is a React/TypeScript application, not a presentation viewer. Allow 8–10 minutes on the personal Mac, using public information only.

## Prepare

Double-click `Start Demo.command`, then open `http://localhost:4173`. The existing compiled application embeds the React assets; Node/npm are only needed to rebuild. The local unsigned `dist/Banking Studio.app` launcher opens the same application in the browser. It is not yet a native OS-webview editor. Keep the terminal open; Ctrl+C stops the source launcher. Closing a browser tab does not stop the server; for the `.app` launcher, quit `banking-studio` through Activity Monitor when finished.

Use at least 1280×800 for a comfortable workroom. Hash URLs identify engagements and tabs so reload/back navigation can return to the working context. Inspect sources and calculations before presenting. Myriad/Light are loaded from installed Mac fonts when available; Source Sans 3 is the bundled fallback. Exact customized Myriad for Rabobank and official brand/template approval remain unverified.

## Demonstration flow

| Time | User action | Application behavior |
|---|---|---|
| 0–1 min | Start on Engagements. Choose Financing alternatives or type a brief and Create engagement. | An engagement brief, three independent financial analyses and a six-section editable material draft are saved in SQLite. Demo client coverage is explicitly PepsiCo. |
| 1–2 min | Open Source library; click a reported number. | Inspect the original value/unit, period, filing date, XBRL definition and source filing. No invented live quote is needed. |
| 2–4 min | Open Financial analysis. Change the bond credit spread from 125 to 175bps and recalculate. | Rust validates and recalculates the model, saves a new analysis version, and updates financial outputs. Sensitivity and sortable calculation workings are inspectable. |
| 4–6 min | Use in client materials. Edit a narrative paragraph or section heading; save the draft. | The linked financial block reflects the new model version. Tiptap supports actual text/formatting edits. Changing numbers later preserves the written commentary; a banner requests narrative review. Generated financial summaries are live-bound, not manually copied prose. |
| 6–8 min | Open Review room, choose the analysis, select a material section and save a numeric edit request. Apply review & revise. | A real revision job produces another calculation version. Linked figures update and the completion message appears. Unsupported requests stay unresolved. |
| 8–10 min | Open Version history and Save current review copy. Change a model input again, then reopen that review copy. Export. | The saved narrative and old financial versions remain together. The live draft can keep evolving. HTML export includes the briefing plus source/assumption audit; XLSX is financial inspection. |

The initial seeded engagement is Capital allocation review. A separate browser-tested engagement may also be present locally. Creating a new engagement is the cleanest demonstration. All three analysis methods are included; the workflow choice determines the initial emphasis rather than claiming a general workflow builder.

## Typed review examples

- Bond: `Increase the spread to 175 bps and show the downside first.`
- Buyback: `Change the execution price to $140 and show the downside first.`
- Acquisition: `Change the premium to 30% and the synergies to 100 million. Show the downside first.`

Without an API key, these use bounded numeric-command interpretation. This is not a general AI editor. Recognized numeric edits can apply while an unsupported part of a mixed note remains pending; inspect the change and unresolved state together. Human narrative is not automatically approved or rewritten. “Narrative checked” records a local user action, not bank sign-off.

Build client draft prepares a local template using current scenarios and saves a new material revision. It explicitly replaces the current narrative; use it before manual editing, or save a review copy first. Earlier revisions remain stored; the UI exposes complete review copies, not a general historical-revision restore tool.

## Optional voice rehearsal

Enter a user-owned API key privately in local Settings. Before the meeting, test real text revision, transcription and WebRTC microphone/audio access. Those calls have not been live-tested during development because no API key was supplied. Keep typed review as the reliable fallback.

The review room discusses the selected analysis and material sections. The optional AI voice gets public engagement context and can save proposed section notes. Ending the meeting triggers revision if notes exist. Rust validates numeric changes and recalculates. Read section uses device narration and is explicitly separate from external AI voice. No Teams invitation, external email or message is sent. Desktop completion alerts require browser permission.

## Scope to state accurately

The public snapshot is as of 22 October; the Treasury observation is 21 October. Stock prices, issuer spreads, deal shares and transaction terms are assumptions unless explicitly sourced. PepsiCo is FY2025; Campbell’s and General Mills are FY2026, without LTM/calendarization. Acquisition analysis excludes PPA, one-off costs, timing, new equity issuance and most EV adjustments. Qualified banker review is still required.

The UI is an independently implemented public-reference design. This is not an official Rabobank product, approved financial advice or a verified bank/ZDR processing route. Native Windows/macOS webview packaging, enterprise identity, multi-user controls, broader valuation coverage, institutional feeds and editable PowerPoint remain later work. See [open-source/reference decisions](REACT_WORKSPACE_AND_OPEN_SOURCE.md) and [bank acceptance gates](BANK_ACCEPTANCE.md).
