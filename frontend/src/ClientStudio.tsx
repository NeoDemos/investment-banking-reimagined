import { useEffect, useRef, useState } from "react";
import {
  DirectorDesk,
  ClientStoryline,
  DirectorProgress,
  useDirector,
} from "./DirectorDesk";
import { DataPool } from "./DataPool";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  FolderOpen,
  Layers3,
  LoaderCircle,
  MessageSquare,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import { api, setToken } from "./api";
import { INPUTS, format } from "./types";
import { Page } from "./AgentStudio";
import { ClientReview, ProofDrawer } from "./ClientReview";
import { ClientBriefEditor, WorkItem } from "./ClientPlan";
import { ClientMaterials } from "./ClientMaterials";
import { ClientEvaluation } from "./ClientEvaluation";
import { useRevisionDraft } from "./useRevisionDraft";
import { PlatformWorkspace, type Platform } from "./PlatformWorkspace";
import "./client.css";
type J = Record<string, any>;
const names: Record<string, string> = {
  PEP: "PepsiCo",
  AAPL: "Apple",
  CPB: "Campbell’s",
  GIS: "General Mills",
};
const labels: Record<string, string> = {
  bond: "Funding decision",
  buyback: "Capital allocation",
  acquisition: "Acquisition discussion",
};
const defaults: Record<string, Record<string, number>> = {
  bond: { amount: 500, tenor: 5, spread: 125, coupon: 6.25, fees: 50 },
  buyback: { amount: 500, sharePrice: 150, tax: 25 },
  acquisition: {
    targetPrice: 25,
    targetShares: 300,
    premium: 25,
    synergies: 150,
    debtPercent: 60,
    spread: 125,
    tax: 25,
  },
};
const questions: Record<string, string> = {
  bond: "How should we fund an illustrative USD 500m requirement while preserving financing flexibility?",
  buyback:
    "Should we return cash through a buyback while preserving liquidity for strategic investment?",
  acquisition:
    "Does this hypothetical acquisition justify its funding requirements and downside risk?",
};
const download = (name: string, value: unknown) => {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
const metric = (a: J, key: string) =>
  a?.model?.metrics.find((m: J) => m.key === key)?.value;
const working = (a: J, label: string) =>
  a?.model?.workings.find((m: J) => m.label === label)?.value;
function comparison(room: J) {
  const options = (room.options || []).map((o: J) => ({
    ...o,
    a: room.analyses[o.analysisId],
  }));
  const a = options[0]?.a;
  if (!a) return { columns: [], options: [] };
  if (["ipo", "lbo"].includes(a.kind)) {
    const keys =
      a.kind === "ipo"
        ? [
            ["offerPrice", "Offer price", "USD/share"],
            ["netProceeds", "Net primary proceeds", "USDm"],
            ["dilution", "New investor ownership", "%"],
          ]
        : [
            ["sponsorEquity", "Sponsor equity", "USDm"],
            ["irr", "Sponsor IRR", "%"],
            ["moic", "Sponsor MOIC", "x"],
          ];
    return {
      columns: keys.map(([key, label, unit]) => ({
        key,
        label,
        unit,
        get: (x: J) => metric(x, key),
        base: null,
      })),
      options,
    };
  }
  const columns =
    a.kind === "bond"
      ? [
          {
            key: "netProceeds",
            label: "Net proceeds",
            unit: "USDm",
            get: (a: J) => metric(a, "netProceeds"),
            base: 0,
          },
          {
            key: "fundingGap",
            label: "Unfunded requirement",
            unit: "USDm",
            get: (a: J) =>
              a.lineage?.fundingGap?.value ??
              (room.mandate.fundingNeed === null
                ? null
                : Math.max(
                    0,
                    room.mandate.fundingNeed - metric(a, "netProceeds"),
                  )),
            base: room.mandate.fundingNeed,
          },
          {
            key: "postUseLeverage",
            label: "Net leverage after proceeds deployed¹",
            unit: "x",
            get: (a: J) => working(a, "Net debt / EBITDA proxy"),
            base: a.model.references.baseLeverage,
          },
        ]
      : a.kind === "buyback"
        ? [
            {
              key: "cashReturned",
              label: "Cash returned",
              unit: "USDm",
              get: (a: J) => a.params.amount,
              base: 0,
            },
            {
              key: "eps",
              label: "Illustrative EPS",
              unit: "USD/share",
              get: (a: J) => metric(a, "eps"),
              base: a.model.references.baseEPS,
            },
            {
              key: "remainingCash",
              label: "Remaining cash",
              unit: "USDm",
              get: (a: J) => working(a, "Remaining cash"),
              base: working(a, "Remaining cash") + a.params.amount,
            },
          ]
        : [
            {
              key: "equity",
              label: "Equity cheque",
              unit: "USDm",
              get: (a: J) => metric(a, "equity"),
              base: 0,
            },
            {
              key: "eps",
              label: "EPS before purchase accounting",
              unit: "USD/share",
              get: (a: J) => working(a, "Pro forma EPS before PPA"),
              base: a.model.references.baseEPS,
            },
            {
              key: "leverage",
              label: "Net leverage¹",
              unit: "x",
              get: (a: J) => metric(a, "leverage"),
              base: a.model.references.baseLeverage,
            },
          ];
  return { columns, options };
}
function ParamsEditor({
  value,
  onChange,
  disabled = false,
  kind,
}: {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  disabled?: boolean;
  kind?: string;
}) {
  return (
    <div className="assumption-inputs">
      {Object.entries(value).map(([k, v]) => (
        <label key={k}>
          <span>
            {k === "fees" && ["ipo", "lbo"].includes(kind || "")
              ? "Transaction fees"
              : INPUTS[k]?.[0] || k}{" "}
            <small>
              {k === "fees" && ["ipo", "lbo"].includes(kind || "")
                ? "%"
                : INPUTS[k]?.[1]}
            </small>
          </span>
          <input
            aria-label={INPUTS[k]?.[0] || k}
            type="number"
            step={k === "tenor" ? 1 : "any"}
            value={v == null || Number.isNaN(v) ? "" : v}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, [k]: e.target.valueAsNumber })
            }
          />
        </label>
      ))}
    </div>
  );
}
function BriefForm({
  onCreate,
  busy,
}: {
  onCreate: (v: J) => void;
  busy: boolean;
}) {
  const [kind, setKind] = useState("bond"),
    [issuer, setIssuer] = useState("PEP"),
    [target, setTarget] = useState("CPB"),
    [question, setQuestion] = useState(questions.bond);
  return (
    <section className="client-start">
      <div className="intro-line">
        <span className="client-eyebrow">CLIENT WORK</span>
        <span className="archive-badge">
          Public-data rehearsal · models not connected
        </span>
      </div>
      <h1>Start with the client’s decision.</h1>
      <p className="client-lead">
        Agree what matters. Delegate the preparation. Challenge the
        alternatives.
        <br />
        Keep the evidence and client materials connected.
      </p>
      <form
        className="decision-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onCreate({
            kind,
            issuer,
            target: kind === "acquisition" ? target : null,
            question,
            audience: f.get("audience"),
            meetingDate: f.get("meetingDate"),
            criteria: f.get("criteria"),
            constraints: f.get("constraints"),
            fundingNeed: kind === "bond" ? Number(f.get("fundingNeed")) : null,
          });
        }}
      >
        <div className="workflow-choices">
          {Object.entries(labels).map(([k, l]) => (
            <button
              type="button"
              key={k}
              className={kind === k ? "selected" : ""}
              onClick={() => {
                setKind(k);
                setQuestion(questions[k]);
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="brief-fields">
          {kind === "bond" && (
            <label>
              Required net funding (USDm)
              <input
                name="fundingNeed"
                type="number"
                min="0.01"
                max="100000"
                step="any"
                required
                defaultValue="500"
              />
            </label>
          )}
          <label>
            Client
            <select
              aria-label="Client"
              value={issuer}
              onChange={(e) => {
                setIssuer(e.target.value);
                if (e.target.value === target)
                  setTarget(e.target.value === "CPB" ? "GIS" : "CPB");
              }}
            >
              {Object.entries(names).map(([k, n]) => (
                <option value={k} key={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {kind === "acquisition" && (
            <label>
              Illustrative target
              <select
                aria-label="Target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {Object.entries(names)
                  .filter(([k]) => k !== issuer)
                  .map(([k, n]) => (
                    <option value={k} key={k}>
                      {n}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Decision owner
            <input
              name="audience"
              required
              minLength={2}
              defaultValue="CFO and treasury team"
            />
          </label>
          <label>
            Client meeting
            <input
              name="meetingDate"
              type="date"
              required
              defaultValue="2026-10-26"
            />
          </label>
        </div>
        <label className="wide-label">
          What decision needs to be made?
          <textarea
            aria-label="Client decision"
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength={20}
          />
        </label>
        <div className="brief-fields two">
          <label>
            What will the client judge us on?
            <textarea
              name="criteria"
              maxLength={300}
              required
              minLength={10}
              defaultValue="Cash economics, downside resilience and retained strategic flexibility."
            />
          </label>
          <label>
            Constraints and information still needed
            <textarea
              name="constraints"
              maxLength={300}
              required
              minLength={10}
              defaultValue="Illustrative public-data case. Confirm funding purpose, current market terms and credit capacity before any recommendation."
            />
          </label>
        </div>
        <div className="form-footer">
          <span>
            A structured brief creates an editable work plan. No inference or
            live API call.
          </span>
          <button className="primary-action" disabled={busy}>
            Build work plan <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
function Plan({
  room,
  busy,
  onPrepare,
  act,
}: {
  room: J;
  busy: boolean;
  onPrepare: (v: J) => void;
  act: (path: string, body: J) => Promise<any>;
}) {
  const [base, setBase] = useState<Record<string, number>>(
      room.scenarioPlan?.base || defaults[room.mandate.kind],
    ),
    [alt, setAlt] = useState<Record<string, number>>(
      room.scenarioPlan?.alternative || {},
    ),
    [ack, setAck] = useState(false),
    [rationale, setRationale] = useState(
      "Illustrative terms for a public-data client rehearsal. These are scenario inputs, not retrieved equity prices, issuer spreads or agreed transaction terms.",
    );
  return (
    <div className="client-scroll">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">THE PREPARATION</span>
          <h2>A work plan you can inspect.</h2>
          <p>
            Local workflows prepare the analysis. Bankers own the commercial
            judgement and review.
          </p>
        </div>
        <span className="state-badge">
          {room.draft ? "Prepared · review open" : "Awaiting your instruction"}
        </span>
      </div>
      <ClientBriefEditor room={room} act={act} busy={busy} />
      <div className="work-items">
        {room.workItems.map((w: J, i: number) => (
          <WorkItem
            key={w.id}
            item={w}
            room={room}
            act={act}
            busy={busy}
            index={i}
          />
        ))}
      </div>
      {!room.draft && (
        <form
          className="plan-assumptions"
          onSubmit={(e) => {
            e.preventDefault();
            onPrepare({
              expectedRevision: room.revision,
              base,
              alternative: alt,
              rationale,
              acknowledgeIllustrative: ack,
            });
          }}
        >
          <div className="section-heading">
            <div>
              <h2>Confirm the economic assumptions.</h2>
              <p>
                Reported company financials are retrieved automatically. These
                inputs are your explicit scenario choices.
              </p>
            </div>
          </div>
          <div className="scenario-grid">
            <section>
              <h3>Primary structure</h3>
              <ParamsEditor
                kind={room.mandate.kind}
                value={base}
                onChange={setBase}
              />
            </section>
            <section>
              <h3>Alternative / downside</h3>
              <ParamsEditor
                kind={room.mandate.kind}
                value={alt}
                onChange={setAlt}
              />
            </section>
          </div>
          <label className="wide-label">
            Why these assumptions?
            <textarea
              value={rationale}
              minLength={20}
              required
              onChange={(e) => setRationale(e.target.value)}
            />
          </label>
          <label className="confirmation">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I confirm these are illustrative assumptions; current-market and
            commercial checks remain open.
          </label>
          <button className="primary-action" disabled={busy || !ack}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
            Approve assumptions & prepare
          </button>
        </form>
      )}
    </div>
  );
}
function Scenarios({
  room,
  busy,
  onRevise,
  onCoach,
}: {
  room: J;
  busy: boolean;
  onRevise: (v: J) => Promise<any>;
  onCoach: (prompt: string) => void;
}) {
  const [which, setWhich] = useRevisionDraft(
    `scenario-selection:${room.id}`,
    0,
    "base",
  );
  const option = room.options?.find((o: J) => o.id === which);
  const a = option ? room.analyses[option.analysisId] : null;
  const [draft, setDraft, clearDraft] = useRevisionDraft(
    `scenario:${room.id}:${which}`,
    room.revision,
    {
      params: { ...(a?.params || {}) } as Record<string, number>,
      rationale: "",
    },
  );
  const params = draft.params,
    rationale = draft.rationale;
  const setParams = (params: Record<string, number>) =>
    setDraft((old) => ({ ...old, params }));
  const setRationale = (rationale: string) =>
    setDraft((old) => ({ ...old, rationale }));
  const submit = (sizeToFunding = false) =>
    onRevise({
      expectedRevision: room.revision,
      optionId: which,
      params,
      rationale,
      sizeToFunding,
    }).then((r) => {
      if (r) clearDraft();
    });
  if (!a)
    return (
      <div className="empty-client">
        <h2>The plan comes before the model.</h2>
        <p>Approve the work plan to prepare sourced alternatives.</p>
      </div>
    );
  const scheduleKeys =
    a.kind === "lbo"
      ? [
          "year",
          "ebitda",
          "openingDebt",
          "interest",
          "cashBeforeInterest",
          "cashAfterInterest",
          "debtRepayment",
          "closingDebt",
          "excessCash",
          "unfundedCashShortfall",
        ]
      : ["stage", "equity", "shares"];
  const scheduleLabels: Record<string, string> = {
    year: "Year",
    ebitda: "EBITDA",
    openingDebt: "Opening debt",
    interest: "Cash interest",
    cashBeforeInterest: "Cash before interest",
    cashAfterInterest: "Cash after interest",
    debtRepayment: "Debt repaid",
    closingDebt: "Closing debt",
    excessCash: "Retained excess cash",
    unfundedCashShortfall: "Unfunded shortfall",
    stage: "Stage",
    equity: "Equity value",
    shares: "Shares",
  };
  return (
    <div className="client-scroll">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">FINANCIAL WORK</span>
          <h2>Inspect, tweak and coach the financial model.</h2>
          <p>
            Recalculate the chosen structure. Preserve prior results and the
            other alternative.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="quiet-action"
        disabled={busy}
        onClick={() =>
          onCoach(
            `Coach the ${which} action in this ${a.kind} model. Explain its assumptions, most sensitive driver and limitations using the stored calculations. Propose one useful sensitivity without changing reported facts or claiming approval.`,
          )
        }
      >
        Discuss this model with the agent <MessageSquare size={14} />
      </button>
      {room.modelCoaching?.length > 0 && (
        <section className="model-coaching">
          <h3>Agent coaching · reviewable interpretation</h3>
          {room.modelCoaching.map((note: string, i: number) => (
            <p key={i}>{note}</p>
          ))}
        </section>
      )}
      <div className="workflow-choices">
        {room.options.map((o: J) => (
          <button
            key={o.id}
            className={which === o.id ? "selected" : ""}
            onClick={() => {
              setWhich(o.id);
            }}
          >
            {o.name}
          </button>
        ))}
      </div>
      <form
        className="scenario-edit"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <ParamsEditor
          kind={a.kind}
          value={params}
          onChange={setParams}
          disabled={busy}
        />
        <label className="wide-label">
          Reason for the change
          <textarea
            required
            minLength={20}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="What client question or downside are we testing?"
          />
        </label>
        <div className="form-footer">
          <span>
            Illustrative inputs · historical public accounts · narrative
            requires review after recalculation
          </span>
          <button
            className="primary-action"
            disabled={busy || rationale.trim().length < 20}
          >
            Recalculate this alternative <ArrowRight size={15} />
          </button>
        </div>
        {a.kind === "bond" && room.mandate.fundingNeed != null && (
          <div className="sizing-action">
            <p>
              Required net funding: {format(room.mandate.fundingNeed, "USDm")}.
              Notional and net proceeds are different. Size this structure at
              its current coupon, tenor, spread and fees.
            </p>
            <button
              type="button"
              className="quiet-action"
              disabled={busy || rationale.trim().length < 20}
              onClick={() => void submit(true)}
            >
              Size issue to required net funding <ArrowRight size={14} />
            </button>
          </div>
        )}
      </form>
      <h3>Stored model schedule</h3>
      {a.model.schedule?.length > 0 && (
        <p className="review-provenance">
          {a.kind === "lbo"
            ? "Amounts in USD millions; cash conversion is after tax, capex and working capital, before interest."
            : "Equity value in USD millions; shares in millions."}
        </p>
      )}
      {a.model.schedule?.length > 0 ? (
        <div className="pool-grid">
          <table>
            <thead>
              <tr>
                {scheduleKeys.map((key) => (
                  <th key={key}>{scheduleLabels[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.model.schedule.map((row: J, i: number) => (
                <tr key={i}>
                  {scheduleKeys.map((key) => (
                    <td key={key}>
                      {typeof row[key] === "number"
                        ? row[key].toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : String(row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="review-provenance">
          This method has no annual operating/debt schedule. Inspect its formula
          workings below.
        </p>
      )}
      <button
        type="button"
        className="quiet-action"
        onClick={() => download(`financial-model-${a.id}.json`, a)}
      >
        Export exact model and source snapshot
      </button>
      <h3>Inspect the calculation</h3>
      <div className="working-table">
        <div className="table-head">
          <span>Output / formula</span>
          <span>Result</span>
        </div>
        {a.model.workings.map((w: J) => (
          <div key={w.label}>
            <span>
              <strong>{w.label}</strong>
              <small>{w.formula}</small>
            </span>
            <b>{format(w.value, w.unit)}</b>
          </div>
        ))}
      </div>
      <div className="method-warnings">
        <h3>Method and execution limits</h3>
        {a.model.warnings.map((w: string) => (
          <p key={w}>{w}</p>
        ))}
      </div>
    </div>
  );
}
function Decision({
  room,
  onView,
  onSave,
  busy,
  onInspect,
}: {
  room: J;
  onView: (v: string) => void;
  onSave: (v: J) => Promise<any>;
  busy: boolean;
  onInspect: (proof: J) => void;
}) {
  const { columns, options } = comparison(room);
  const [draft, setDraft, clearDraft] = useRevisionDraft(
    `decision:${room.id}`,
    room.revision,
    {
      choice: room.mandate.preferredOption || "",
      reason: room.mandate.recommendation || "",
      reversal: room.mandate.reversalCondition || "",
    },
  );
  const { choice, reason, reversal } = draft;
  const setChoice = (choice: string) => setDraft((old) => ({ ...old, choice }));
  const setReason = (reason: string) => setDraft((old) => ({ ...old, reason }));
  const setReversal = (reversal: string) =>
    setDraft((old) => ({ ...old, reversal }));
  return (
    <div className="client-scroll">
      <div className="decision-hero">
        <div>
          <span className="client-eyebrow">THE CLIENT DECISION</span>
          <h1>{room.mandate.question}</h1>
          <p>
            {room.mandate.audience} · meeting {room.mandate.meetingDate}
          </p>
        </div>
        <span className="state-badge warning">
          {room.mandate.decisionState === "conditional_view"
            ? "Conditional banker view"
            : room.mandate.decisionState === "review_required"
              ? "Changed economics / brief · re-review the view"
              : room.mandate.decisionState === "unrecorded"
                ? "Banker view not recorded"
                : "Insufficient evidence to choose"}
        </span>
      </div>
      {room.reviewCopyOutOfDate && (
        <p className="review-provenance">
          This draft has changed since the last frozen review copy. The saved
          copy remains unchanged.
        </p>
      )}
      <div className="decision-context">
        <section>
          <small>WHAT MATTERS</small>
          <p>{room.mandate.criteria}</p>
        </section>
        <section>
          <small>CONSTRAINTS & OPEN QUESTIONS</small>
          <p>{room.mandate.constraints}</p>
        </section>
      </div>
      {!room.draft ? (
        <div className="next-action">
          <div>
            <h3>Next: agree the assumptions and prepare the alternatives.</h3>
            <p>
              The brief is saved. No financial or presentation work has been
              claimed yet.
            </p>
          </div>
          <button className="primary-action" onClick={() => onView("plan")}>
            Review work plan <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <>
          {room.mandate.kind === "bond" && (
            <div className="funding-criterion">
              <strong>
                Required net funding:{" "}
                {room.mandate.fundingNeed != null
                  ? format(room.mandate.fundingNeed, "USDm")
                  : "Not specified"}
              </strong>
              <span>
                Any shortfall remains unfunded. Size each structure to the same
                net requirement before comparing.
              </span>
            </div>
          )}
          <div className="section-heading">
            <div>
              <h2>The alternatives, side by side.</h2>
              <p>
                Same source snapshot. Explicit scenario terms. A status quo to
                make the trade-off visible.
              </p>
            </div>
            <button
              className="quiet-action"
              onClick={() => onView("scenarios")}
            >
              Test another case <ArrowRight size={14} />
            </button>
          </div>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Choice</th>
                  {columns.map((c) => (
                    <th key={c.label}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {options.map((o: J) => (
                  <tr key={o.id}>
                    <th>
                      {o.name}
                      <small>
                        {o.a.kind === "bond"
                          ? `${o.a.params.tenor}y · ${o.a.params.spread}bp assumed spread`
                          : o.a.kind === "buyback"
                            ? "Illustrative cash-funded repurchase"
                            : "Illustrative acquisition case"}
                      </small>
                    </th>
                    {columns.map((c) => (
                      <td key={c.label}>
                        <button
                          className="figure-button"
                          disabled={!o.a.lineage?.[c.key]}
                          title="Inspect formula and exact inputs"
                          onClick={() => onInspect(o.a.lineage[c.key])}
                        >
                          {c.get(o.a) == null
                            ? "Not specified"
                            : format(c.get(o.a), c.unit)}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="status-quo">
                  <th>
                    Defer / status quo
                    <small>
                      {room.mandate.kind === "bond"
                        ? "Funding requirement remains unresolved"
                        : "No modeled transaction"}
                    </small>
                  </th>
                  {columns.map((c) => (
                    <td key={c.label}>
                      {c.base == null
                        ? "Not specified"
                        : format(c.base, c.unit)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {room.mandate.kind === "bond" && (
            <div className="financing-details">
              {options.map((o: J) => (
                <section key={o.id}>
                  <h4>{o.name}</h4>
                  {["tenor", "yield", "fees", "interest"].map((key) => {
                    const p = o.a.lineage?.[key];
                    return p ? (
                      <button key={key} onClick={() => onInspect(p)}>
                        <span>{p.label}</span>
                        <strong>
                          {p.unit === "years"
                            ? `${p.value} years`
                            : format(p.value, p.unit)}
                        </strong>
                      </button>
                    ) : null;
                  })}
                  <small>
                    Coupon cash cost is not the all-in financing cost. Shorter
                    tenor brings an earlier refinancing decision; future
                    availability and rates are not modeled.
                  </small>
                </section>
              ))}
            </div>
          )}
          {room.stresses?.length > 0 && (
            <section className="stress-comparison">
              <h3>Stress the same action; do not confuse it with a choice.</h3>
              {room.stresses.map((o: J) => {
                const a = room.analyses[o.analysisId];
                return (
                  <div key={o.id}>
                    <strong>{o.name}</strong>
                    <span>
                      Synergies {format(a.params.synergies, "USDm")} · all other
                      terms follow{" "}
                      {room.options.find(
                        (option: J) => option.id === o.actionId,
                      )?.name || "its matching action"}
                    </span>
                    <button
                      className="figure-button"
                      onClick={() => onInspect(a.lineage.eps)}
                    >
                      EPS {format(a.lineage.eps.value, "USD/share")}
                    </button>
                    <button
                      className="figure-button"
                      onClick={() => onInspect(a.lineage.leverage)}
                    >
                      Net leverage {format(a.lineage.leverage.value, "x")}
                    </button>
                  </div>
                );
              })}
            </section>
          )}
          <p className="table-note">
            ¹ EBITDA proxy = reported operating income + D&A. No covenant,
            rating-agency or execution assessment. Annual periods are not LTM.
            All transaction terms are illustrative.
          </p>
          <div className="decision-bottom">
            <section className="banker-view">
              <h3>Record the banker’s conditional view.</h3>
              <p>
                This is your judgement, not a model recommendation. Keep each
                client-facing summary within 300 characters; every condition is
                presented in full.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSave({
                    expectedRevision: room.revision,
                    preferredOption: choice,
                    recommendation: reason,
                    reversalCondition: reversal,
                  }).then((r) => {
                    if (r) clearDraft();
                  });
                }}
              >
                <label>
                  Working preference
                  <select
                    aria-label="Working preference"
                    required
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                  >
                    <option value="">No view recorded</option>
                    {room.options.map((o: J) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                    <option value="status_quo">Defer / status quo</option>
                    <option value="insufficient">
                      Insufficient evidence to choose
                    </option>
                  </select>
                </label>
                <label>
                  Why, against the client’s criteria?
                  <textarea
                    required
                    minLength={20}
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <label>
                  What would reverse this view?
                  <textarea
                    required
                    minLength={20}
                    maxLength={300}
                    value={reversal}
                    onChange={(e) => setReversal(e.target.value)}
                  />
                </label>
                <button className="primary-action" disabled={busy}>
                  Save conditional view
                </button>
              </form>
            </section>
            <aside className="attention-card">
              <span className="client-eyebrow">BEFORE THE CLIENT MEETING</span>
              <h3>What still needs banker judgement?</h3>
              <ul>
                <li>Current issuer / equity market terms are not connected.</li>
                <li>
                  Funding purpose, available liquidity and credit capacity need
                  confirmation.
                </li>
                <li>
                  All figures and the advisory narrative require qualified
                  review.
                </li>
              </ul>
              <button className="quiet-action" onClick={() => onView("review")}>
                Open review queue <ArrowRight size={14} />
              </button>
              <div className="small-divider" />
              <h4>Prepared work</h4>
              <p>
                {room.draft.slides.length} discussion pages ·{" "}
                {Object.keys(room.analyses).length} saved calculations ·
                revision {room.revision}
              </p>
              <button
                className="quiet-action"
                onClick={() => onView("materials")}
              >
                Open client materials <ArrowRight size={14} />
              </button>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
export default function ClientStudio() {
  const [rooms, setRooms] = useState<J[]>([]),
    [room, setRoom] = useState<J | null>(null),
    [platform, setPlatform] = useState<Platform | null>(null),
    [view, setView] = useState("home"),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [page, setPage] = useState(0),
    [discussion, setDiscussion] = useState(false);
  const [prompt, setPrompt, clearPrompt] = useRevisionDraft(
    `discussion:${room?.id || "none"}`,
    room?.revision || 0,
    "",
  );
  const [proof, setProof] = useState<J | null>(null);
  const navigationGeneration = useRef(0);
  const intendedHash = useRef(location.hash);
  const refresh = async () => {
    const r = await api<J>("/api/agent/rooms");
    setRooms(r.rooms);
    return r.rooms;
  };
  const navigate = (v: string, r = room) => {
    navigationGeneration.current += 1;
    setProof(null);
    setView(v);
    const hash = r ? `#client/${r.id}/${v}` : v === "home" ? "" : `#${v}`;
    intendedHash.current = hash;
    location.hash = hash;
    setError("");
  };
  const open = async (id: string, v = "storyline") => {
    const generation = ++navigationGeneration.current;
    const startedHash = location.hash;
    setProof(null);
    try {
      const r = await api<J>(`/api/agent/rooms/${id}`);
      if (
        generation !== navigationGeneration.current ||
        location.hash !== startedHash
      )
        return;
      setRoom(r);
      setPage(0);
      navigate(v, r);
    } catch (e) {
      if (
        generation === navigationGeneration.current &&
        location.hash === startedHash
      )
        setError(String(e));
    }
  };
  useEffect(() => {
    void (async () => {
      try {
        const b = await api<J>("/api/bootstrap");
        setToken(b.token);
        await refresh();
        setPlatform(await api<Platform>("/api/architecture"));
        const hash = location.hash.match(
          /^#(?:client|workroom)\/([^/]+)(?:\/(\w+))?/,
        );
        if (hash) await open(hash[1], hash[2] || "decision");
        else if (
          ["sources", "pool", "evaluation", "system"].includes(
            location.hash.slice(1),
          )
        )
          setView(location.hash.slice(1));
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const follow = async () => {
      const wanted = location.hash;
      if (wanted !== intendedHash.current) {
        navigationGeneration.current += 1;
        intendedHash.current = wanted;
      }
      const generation = navigationGeneration.current;
      setProof(null);
      const match = wanted.match(/^#(?:client|workroom)\/([^/]+)(?:\/(\w+))?/);
      if (!match) {
        setRoom(null);
        setPage(0);
        setView(
          ["sources", "pool", "evaluation", "system"].includes(wanted.slice(1))
            ? wanted.slice(1)
            : "home",
        );
        return;
      }
      const next = [
        "storyline",
        "pool",
        "decision",
        "plan",
        "scenarios",
        "materials",
        "evidence",
        "review",
        "sources",
        "evaluation",
        "system",
      ].includes(match[2])
        ? match[2]
        : "decision";
      if (match[1] === room?.id) {
        setView(next);
        return;
      }
      try {
        const full = await api<J>(
          `/api/agent/rooms/${encodeURIComponent(match[1])}`,
        );
        if (
          cancelled ||
          location.hash !== wanted ||
          generation !== navigationGeneration.current
        )
          return;
        setRoom(full);
        setPage(0);
        setView(next);
        setError("");
      } catch (e) {
        if (
          !cancelled &&
          location.hash === wanted &&
          generation === navigationGeneration.current
        )
          setError(String(e));
      }
    };
    window.addEventListener("hashchange", follow);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", follow);
    };
  }, [ready, room?.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);
  const action = async (path: string, body: J, next?: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const startedHash = location.hash,
      startedRoom = room?.id;
    try {
      const r = await api<J>(path, body);
      await refresh();
      const currentRoom = location.hash.match(
        /^#(?:client|workroom)\/([^/]+)/,
      )?.[1];
      if (startedHash !== location.hash && currentRoom !== startedRoom) {
        setNotice(
          "Saved the previous workroom. Your current context was preserved.",
        );
        return r;
      }
      setRoom(r);
      setProof(null);
      if (next && location.hash === startedHash) navigate(next, r);
      setNotice("Saved to this workroom.");
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const director = useDirector((id) => {
    void refresh();
    void open(id, "storyline");
  });
  const headerViews: Record<string, string> = {
    storyline: "Storyline",
    decision: "Decision",
    plan: "Work plan",
    scenarios: "Model inspector",
    materials: "Materials",
    evidence: "Evidence",
    review: "Review",
  };
  if (!ready)
    return (
      <main className="startup">
        <img src="/rabobank-wordmark.svg" width="150" alt="Rabobank" />
        <p>{error || "Opening your client workspace…"}</p>
      </main>
    );
  return (
    <div className="client-shell">
      <aside className="client-sidebar">
        <div className="client-logo">
          <img src="/rabobank-wordmark.svg" alt="Rabobank" />
          <span>Investment Banking Studio</span>
        </div>
        <button
          className="primary-action"
          disabled={busy || director.running}
          onClick={() => {
            setRoom(null);
            navigate("home", null);
          }}
        >
          <Plus size={16} /> New client work
        </button>
        <div className="sidebar-caption">CLIENT WORKROOMS</div>
        <nav>
          {rooms
            .filter((r) => r.mandate)
            .map((r) => (
              <button
                key={r.id}
                disabled={busy || director.running}
                className={room?.id === r.id ? "selected" : ""}
                onClick={() => open(r.id)}
              >
                <FolderOpen size={15} />
                <span>
                  {r.title}
                  <small>
                    {r.mandate?.audience} · {r.mandate?.meetingDate}
                  </small>
                </span>
              </button>
            ))}
          {!rooms.some((r) => r.mandate) && (
            <p className="sidebar-empty">
              Start a decision brief to bring the team’s work together.
            </p>
          )}
        </nav>
        <div className="client-sidebar-bottom">
          <button onClick={() => navigate("pool")}>
            <Database size={15} /> Data pool
          </button>
          <button onClick={() => navigate("evaluation")}>
            <Layers3 size={15} /> Evaluation
          </button>
          <button onClick={() => navigate("system")}>
            <Settings2 size={15} /> Platform & design
          </button>
          <p>
            Independent public-data prototype
            <br />
            Public data · local Codex agent
          </p>
        </div>
      </aside>
      <main className="client-main">
        <header className="client-topbar">
          <div>
            <span>Corporate Finance</span>
            <ChevronRight size={12} />
            <strong>
              {room?.mandate ? names[room.mandate.issuer] : "Client work"}
            </strong>
            {room?.mandate && (
              <span className="meeting-date">
                {room.mandate.audience} · {room.mandate.meetingDate}
              </span>
            )}
          </div>
          <div>
            <span className="archive-badge">Public source snapshots</span>
            {room && (
              <>
                <button
                  title="Export complete workroom inspection record"
                  onClick={() => download(`client-work-${room.id}.json`, room)}
                >
                  <Download size={16} />
                </button>
                <button
                  className={discussion ? "selected" : ""}
                  onClick={() => setDiscussion(!discussion)}
                >
                  <MessageSquare size={16} />
                  <span>Discussion</span>
                </button>
              </>
            )}
            <span className="client-avatar">DT</span>
          </div>
        </header>
        {room?.mandate && Object.keys(headerViews).includes(view) && (
          <nav className="client-tabs">
            {Object.entries(headerViews).map(([id, title]) => (
              <button
                className={view === id ? "active" : ""}
                key={id}
                onClick={() => navigate(id)}
              >
                {title}
                {id === "review" &&
                  !!room.reviewIssues?.filter((x: J) => x.status === "open")
                    .length && (
                    <b>
                      {
                        room.reviewIssues.filter((x: J) => x.status === "open")
                          .length
                      }
                    </b>
                  )}
              </button>
            ))}
            {room.draft && (
              <span>Draft · r{room.revision} · subject to banker review</span>
            )}
          </nav>
        )}
        {error && (
          <div className="client-error" role="alert">
            {error}
            <button
              onClick={() => {
                setError("");
                if (room) void open(room.id, view);
              }}
            >
              Reload current work
            </button>
          </div>
        )}
        {notice && (
          <div className="client-notice" role="status">
            {notice}
            <button aria-label="Dismiss message" onClick={() => setNotice("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {(director.run || director.error) && (
          <DirectorProgress
            run={director.run}
            error={director.error}
            onCancel={() => void director.cancel()}
            onDismiss={director.dismiss}
            onRetry={(prompt) =>
              void director.start({ prompt, refreshPublic: true })
            }
          />
        )}
        <div
          className={`client-content ${discussion ? "with-discussion" : ""}`}
        >
          <div className="client-pane">
            {view === "home" ? (
              <DirectorDesk
                agent={director}
                advanced={
                  <BriefForm
                    busy={busy}
                    onCreate={(v) => void action("/api/client-work", v, "plan")}
                  />
                }
              />
            ) : view === "pool" ? (
              <DataPool />
            ) : view === "sources" || view === "system" ? (
              <PlatformWorkspace
                view={view === "sources" ? "connections" : "architecture"}
                platform={platform}
                rooms={rooms as any}
                onOpen={(id) => void open(id)}
                onRun={() =>
                  setError(
                    "Start from a client decision brief to prepare work.",
                  )
                }
                busy={busy}
              />
            ) : view === "evaluation" ? (
              <ClientEvaluation
                key={room?.id || "global"}
                room={room}
                rooms={rooms}
                onSelect={(id) => void open(id, "evaluation")}
              />
            ) : !room?.mandate ? (
              <div className="empty-client">
                <h2>Start a client decision workroom.</h2>
                <p>
                  Earlier technical studies remain saved in the local database.
                  The new primary workflow starts with a client brief.
                </p>
                <button
                  className="primary-action"
                  onClick={() => {
                    setRoom(null);
                    navigate("home", null);
                  }}
                >
                  Create client brief
                </button>
              </div>
            ) : view === "storyline" ? (
              <ClientStoryline
                room={room}
                onFrame={(n) => {
                  setPage(n);
                  navigate("materials");
                }}
                onView={navigate}
              />
            ) : view === "plan" ? (
              <Plan
                key={room.id}
                room={room}
                busy={busy}
                act={action}
                onPrepare={(v) =>
                  void action(
                    `/api/client-work/${room.id}/prepare`,
                    v,
                    "decision",
                  )
                }
              />
            ) : view === "decision" ? (
              <Decision
                key={`${room.id}-${room.revision}`}
                room={room}
                busy={busy}
                onInspect={setProof}
                onView={navigate}
                onSave={(v) =>
                  action(`/api/client-work/${room.id}/decision`, v)
                }
              />
            ) : view === "scenarios" ? (
              <Scenarios
                key={`${room.id}-${room.revision}`}
                room={room}
                busy={busy}
                onCoach={(message) => {
                  setPrompt(message);
                  setDiscussion(true);
                }}
                onRevise={(v) =>
                  action(`/api/client-work/${room.id}/scenario`, v)
                }
              />
            ) : view === "materials" ? (
              <ClientMaterials
                room={room}
                act={action}
                busy={busy}
                page={page}
                onPage={setPage}
                onPlan={() => navigate("plan")}
                onReview={() => navigate("review")}
              />
            ) : view === "evidence" ? (
              <div className="client-scroll">
                <div className="section-heading">
                  <div>
                    <span className="client-eyebrow">PINNED EVIDENCE</span>
                    <h2>Open the source behind the work.</h2>
                    <p>
                      Original observations and normalized units remain separate
                      from scenario assumptions.
                    </p>
                  </div>
                </div>
                {Object.entries(room.sources).map(([key, c]: [string, any]) => (
                  <section className="evidence-card" key={key}>
                    <div className="section-heading">
                      <div>
                        <h3>{c.name || "USD Treasury par curve"}</h3>
                        <p>
                          Public source snapshot ·{" "}
                          {c.claims
                            ? `proposition reviewed ${c.reviewedAt}`
                            : c.rows
                              ? `lookup retrieved ${c.retrievedAt?.slice(0, 10)}`
                              : c.periodEnd
                                ? `annual period ended ${c.periodEnd}`
                                : `curve dated ${c.date}`}
                        </p>
                      </div>
                    </div>
                    {c.facts ? (
                      <div className="evidence-table">
                        {Object.entries(c.facts).map(
                          ([k, f]: [string, any]) => (
                            <div key={k}>
                              <div>
                                <strong>{k}</strong>
                                <details className="fact-context">
                                  <summary>Tag / filing context</summary>
                                  <span>
                                    {f.tag}
                                    <br />
                                    {f.basis}
                                    <br />
                                    Accession {f.accession}
                                    <br />
                                    Period{" "}
                                    {f.periodStart ? `${f.periodStart} → ` : ""}
                                    {f.periodEnd}
                                  </span>
                                </details>
                              </div>
                              <span>
                                {f.value.toLocaleString()} {f.unit}
                              </span>
                              <span>
                                {f.unit === "USD/shares"
                                  ? format(f.value, "USD/share")
                                  : format(
                                      f.value / 1e6,
                                      k === "shares" ? "m shares" : "USDm",
                                    )}
                              </span>
                              <a
                                href={f.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Filing directory · {f.filed}
                              </a>
                            </div>
                          ),
                        )}
                      </div>
                    ) : c.claims ? (
                      <div>
                        {c.claims.map((claim: J) => (
                          <p key={claim.title}>
                            <strong>{claim.title}</strong> · {claim.text}{" "}
                            <a
                              href={claim.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Public source
                            </a>
                            <br />
                            <small>{claim.application}</small>
                          </p>
                        ))}
                      </div>
                    ) : c.rows ? (
                      <div>
                        <p>
                          {c.definition} {c.valuationDate}
                        </p>
                        {c.rows.map((row: J) => (
                          <p key={row.industry}>
                            {row.industry}: {row.positiveEbitdaEvEbitda}×
                            EV/EBITDA (positive EBITDA firms);{" "}
                            {row.allFirmsEvEbitda}× (all firms) · {row.firms}{" "}
                            firms.
                          </p>
                        ))}
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                          Source table
                        </a>
                        <p>{c.use}</p>
                      </div>
                    ) : (
                      <p>
                        {c.points
                          ?.map((p: J) => `${p.years}y: ${p.yield}%`)
                          .join(" · ")}
                      </p>
                    )}
                  </section>
                ))}
                <details className="technical-details">
                  <summary>Selected context and technical provenance</summary>
                  <pre>{JSON.stringify(room.contextPacket, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <ClientReview
                key={room.id}
                room={room}
                act={action}
                busy={busy}
                pageIndex={page}
              />
            )}
          </div>
          {discussion && room && (
            <aside className="discussion-drawer">
              <div>
                <strong>The discussion</strong>
                <button
                  aria-label="Close discussion"
                  onClick={() => setDiscussion(false)}
                >
                  <X size={15} />
                </button>
              </div>
              <section>
                {room.messages.map((m: J, i: number) => (
                  <article key={i}>
                    <small>{m.role === "banker" ? "YOU" : "WORKFLOW"}</small>
                    <p>{m.text}</p>
                  </article>
                ))}
              </section>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void director
                    .start({
                      roomId: room.id,
                      expectedRevision: room.revision,
                      prompt,
                      refreshPublic: false,
                    })
                    .then((started) => {
                      if (started) clearPrompt();
                    });
                }}
              >
                <textarea
                  aria-label="Save discussion instruction"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Capture a client question or page instruction…"
                />
                <small>
                  Ask for a storyline change, a financial sensitivity or a page
                  revision. The local agent uses this workroom’s pinned data and
                  validated calculation tools.
                </small>
                <button
                  className="primary-action"
                  disabled={
                    busy || director.running || prompt.trim().length < 20
                  }
                >
                  {director.running
                    ? "Preparing the next turn…"
                    : "Ask the team"}{" "}
                  <ArrowRight size={14} />
                </button>
              </form>
            </aside>
          )}
        </div>
        {proof && <ProofDrawer proof={proof} onClose={() => setProof(null)} />}
      </main>
    </div>
  );
}
