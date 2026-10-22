# Monday demonstration — 26 October 2026

Prepared 22 October. Demonstrate on the personal Mac using public information. Allow 7–10 minutes. The reliable path works without internet or API keys after launch.

## Before the meeting

1. Double-click `Start Demo.command` in the project folder. Open `http://localhost:4173` in Chrome, Edge or Safari. Keep the terminal open. A locally built `dist/Banking Studio.app` also opens the browser; it is not a native presentation editor yet.
2. Check all three scenarios. Use a browser window at least 1280×800; **Present** enlarges the deck and arrow keys change pages. Escape exits presentation mode.
3. Keep one exported HTML presentation and XLSX available as a fallback. The HTML opens offline and includes assumptions, calculation workings, sources and limitations after the six pages.

   A prepared public-data fallback is saved locally in `outputs/monday-demo/pepsico-bond-v3.html` with the matching `pepsico-bond-v3.xlsx`. These are generated outputs, not runtime dependencies or tracked source files.
4. If demonstrating voice, enter your own API key privately in **Settings**, then test microphone permission, live speech and a full revision beforehand. This has not been live-tested in development because no API key was supplied. Account access and network restrictions can still prevent it. Do not promise it in the meeting until that rehearsal passes.
5. If no key is configured, use typed page review plus **Read page** device narration. Explain that narration is a device voice; local numeric command handling is deterministic and is not an AI meeting.

## The demonstration story

| Time | Action | What the boss should see |
|---|---|---|
| 0–1 min | Open USD bond financing; click Present | A presentation workspace adapted from public Rabobank design references, rather than a chat transcript. |
| 1–2 min | Show Company context, then Sources & methods | Dated reported financials with fiscal-period differences and click-through evidence. |
| 2–3 min | Show Financial implications and sensitivities | A five-year USD500m scenario, published Treasury reference, assumed credit spread, deterministic pricing and net proceeds. |
| 3–5 min | Exit Present; open Review on page 3; click the sample note and Finish review & revise | Spread changes to 175bps, calculations run again, a new draft appears and the completion message confirms readiness. The old version remains in history. |
| 5–6 min | Show buyback and acquisition | The same data/method structure supports other capital-allocation questions. Opportunity cost reduces buyback earnings; acquisition earnings and leverage include funding effects. |
| 6–7 min | Export HTML and XLSX | Digital briefing is the output; spreadsheet is the inspection copy. |
| 7–10 min | Optional voice meeting, then next-step discussion | Discuss each page, save feedback, end the meeting, generate another version and inspect the changes. |

The sample local review command is `Increase the spread to 175 bps and show the downside first.` Buyback uses `Change the execution price to $140 and show the downside first.` Acquisition uses `Change the premium to 30% and the synergies to 100 million. Show the downside first.` These are bounded commands; unsupported instructions remain pending for clarification. A partially recognized instruction can apply the recognized numeric edit while retaining the whole note as unresolved. Inspect the change and pending state together.

## Voice and model-assisted revision

The optional implementation uses OpenAI Responses for structured proposed edits, transcription for recorded feedback, and WebRTC for a live AI reviewer. Audio is sent to the external provider only after recording/voice is explicitly started. Recorded audio is not stored in SQLite; returned text becomes a saved review note. Live audio travels over WebRTC; the local server exchanges the initial SDP with the provider while keeping the API key off the browser connection.

The voice reviewer can save page-specific notes through a narrowly scoped function. It cannot directly change financial facts or approve client materials. Ending a voice review triggers the revision job if notes exist. Rust validates proposed inputs and recalculates. The UI then shows a completion message; desktop notifications are optional and local. There is no Teams invitation, external message or email automation.

Current defaults are configurable in `.env.local`: `gpt-6.1-sol` for text, `gpt-transcribe` for recordings and `gpt-realtime-2.1-mini` for live voice. This is a demonstration API route, not a verified bank-approved or ZDR processing route. `store:false` on text requests does not establish ZDR. See [OpenAI WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc), [speech transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text), and [Realtime model documentation](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini).

## Present the limitations accurately

The data snapshot is as of **22 October 2026**; the latest available Treasury observation retrieved was **21 October**. PepsiCo is FY2025, Campbell’s and General Mills are FY2026. No LTM or fiscal calendarization is claimed. Corporate bond spreads, equity prices, deal shares and transaction terms are assumptions unless a dated quote is explicitly applied. The optional quote route requires both an account and permitted use; it has not been live-tested.

This is a hypothetical acquisition, not a reported mandate or recommendation. The acquisition excludes purchase accounting, one-off costs, timing, new equity issuance and most EV adjustments. Financial review by a qualified banker remains outstanding. Full comps, DCF, bond market execution, CIM/IM preparation, legal workflows, editable PPTX, multi-user approvals, native Windows packaging and bank deployment remain later work.
