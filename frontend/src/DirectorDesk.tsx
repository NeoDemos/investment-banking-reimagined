import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  MessageSquare,
  Sparkles,
  X,
  RefreshCw,
} from "lucide-react";
import { api } from "./api";
type J = Record<string, any>;
const examples = [
  [
    "Debt capital markets",
    "Prepare an Apple CFO debt capital markets meeting about raising USD500m net with five-year versus three-year bonds. Use Apple annual reporting and public Treasury references. Label credit spreads as assumptions, compare funding sufficiency and refinancing risk, and make the missing execution evidence clear.",
  ],
  [
    "Potential listing",
    "Prepare an illustrative potential listing pitch using General Mills public accounts as an explicit financial proxy; it is already listed and no actual IPO is implied. Model primary issuance proceeds, valuation, offer discount, new shares and dilution. Compare two EV/EBITDA assumptions and explain what management must validate.",
  ],
  [
    "Leveraged buyout",
    "Prepare a sponsor LBO investment discussion using Campbell's public accounts as a hypothetical proxy. Model a five-year debt-sweep buyout with entry/exit multiples, opening leverage, interest, growth and cash conversion. Compare the base and operating/exit downside; show sponsor returns, debt schedule and the limitations.",
  ],
  [
    "M&A advice",
    "Prepare an illustrative PepsiCo acquisition discussion about buying Campbell's. Compare debt funding alternatives and matching no-synergy downside. Show the sourced financial consequences and a qualified Rabobank proposition; no actual transaction or legal work is implied.",
  ],
];
export function useDirector(onReady: (id: string) => void) {
  const [run, setRun] = useState<J | null>(null),
    [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void api<J>("/api/director/jobs")
      .then((r) => {
        if (!cancelled && r.jobs[0])
          setRun({ ...r.jobs[0], events: [], originHash: location.hash });
      })
      .catch((e) => {
        if (!cancelled)
          setError("Could not load assignment history: " + String(e));
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, []);
  const start = async (body: J) => {
    const originHash = location.hash;
    setError("");
    setRun({
      status: "starting",
      result: {
        stage: "Connecting to your selected model",
        startedAt: new Date().toISOString(),
        prompt: body.prompt,
      },
      events: [],
    });
    try {
      const r = await api<J>("/api/director/assignments", body);
      if (mounted.current)
        setRun({
          runId: r.runId,
          originHash,
          status: "running",
          result: {
            stage: "Interpreting your assignment",
            startedAt: new Date().toISOString(),
            prompt: body.prompt,
          },
          events: [],
        });
      return r;
    } catch (e) {
      setError(String(e));
      setRun(null);
      return null;
    }
  };
  useEffect(() => {
    if (
      !run?.runId ||
      !["running", "cancelled", "completed", "failed"].includes(run.status)
    )
      return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await api<J>(`/api/agent/runs/${run.runId}`);
        if (cancelled) return;
        setError("");
        setRun({ ...next, runId: run.runId, originHash: run.originHash });
        if (
          next.status === "completed" &&
          next.result.roomId &&
          run.status === "running" &&
          location.hash === run.originHash
        )
          onReady(next.result.roomId);
        if (next.status === "failed")
          setError(
            next.result.error || "Assignment stopped; saved work is retained.",
          );
        if (next.status === "running")
          timer = setTimeout(() => void poll(), 2000);
      } catch (e) {
        if (!cancelled) {
          setError("Progress connection interrupted; retrying. " + String(e));
          timer = setTimeout(() => void poll(), 3000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [run?.runId, run?.status]);
  const cancel = async () => {
    if (!run?.runId) return;
    try {
      await api(`/api/director/jobs/${run.runId}/cancel`, {});
      setRun({
        ...run,
        status: "cancelled",
        result: { ...run.result, stage: "Cancelled by you" },
      });
    } catch (e) {
      setError(String(e));
    }
  };
  return {
    run,
    error,
    start,
    cancel,
    dismiss: () => {
      setRun(null);
      setError("");
    },
    running: ["running", "starting"].includes(run?.status || ""),
  };
}
export function DirectorProgress({
  run,
  error,
  onCancel,
  onDismiss,
  onRetry,
}: {
  run: J | null;
  error: string;
  onCancel?: () => void;
  onDismiss?: () => void;
  onRetry?: (prompt: string) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!run && !error) return null;
  const active = run && ["running", "starting"].includes(run.status),
    r = run?.result || {},
    elapsed = Math.max(
      0,
      Math.floor(
        (now -
          Date.parse(
            r.startedAt || run?.createdAt || new Date().toISOString(),
          )) /
          1000,
      ),
    );
  return (
    <section
      className={`director-progress ${r.clarification ? "needs-clarification" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div>
        <Sparkles size={17} />
        <strong>
          {r.clarification
            ? "Your input is needed"
            : run?.status === "failed"
              ? "Assignment stopped"
              : active
                ? r.stage
                : run?.status === "cancelled"
                  ? "Assignment cancelled"
                  : r.message || "Client materials ready"}
        </strong>
        {active && (
          <span>
            {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </span>
        )}
        {active && onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        {!active && onDismiss && (
          <button
            type="button"
            aria-label="Dismiss assignment feedback"
            onClick={onDismiss}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {r.clarification && (
        <p className="clarification-message">{r.clarification}</p>
      )}
      {error && <p role="alert">{error}</p>}
      {!active &&
        run?.events?.some(
          (e: J) => e.type === "public_ingestion" && e.data.state === "failed",
        ) && (
          <p>
            Some selected sources could not refresh. Inspect the activity
            receipts and retained source dates before using the draft.
          </p>
        )}
      {active && (
        <p>
          {r.connection
            ? `${r.connection.model} · ${r.connection.effort} effort. `
            : ""}
          The assignment is active. Planning and drafting may take several
          minutes.{" "}
          {r.heartbeatAt
            ? "Last model heartbeat " +
              new Date(r.heartbeatAt).toLocaleTimeString() +
              "."
            : ""}{" "}
          You can inspect saved work while it runs.
        </p>
      )}
      <details open={!!active}>
        <summary>Assignment activity and source receipts</summary>
        <ol>
          {(run?.events || [])
            .filter((e: J) =>
              [
                "director_plan",
                "public_ingestion",
                "financial_work_stored",
                "model_started",
                "model_completed",
                "client_materials_generated",
              ].includes(e.type),
            )
            .map((e: J, i: number) => (
              <li key={i}>
                <Check size={12} />
                {e.type === "director_plan"
                  ? e.data.supported
                    ? "Client story and modelling plan prepared"
                    : "Clarification identified"
                  : e.type === "public_ingestion"
                    ? `${e.data.source}: ${e.data.state}${e.data.error ? " — " + e.data.error : ""}`
                    : e.type === "model_started"
                      ? `${e.data.connection.model} · ${e.data.connection.effort}: started`
                      : e.type === "model_completed"
                        ? "Model response received"
                        : e.type === "financial_work_stored"
                          ? "Financial model and source versions stored"
                          : "Presentation frames generated"}
              </li>
            ))}
        </ol>
      </details>
      {r.roomId && (
        <a href={`#client/${r.roomId}/storyline`}>Open saved client work →</a>
      )}
      {!active && r.prompt && onRetry && (
        <button
          type="button"
          className="quiet-action"
          onClick={() => onRetry(r.prompt)}
        >
          Run this assignment with the current connections{" "}
          <ArrowRight size={13} />
        </button>
      )}
    </section>
  );
}
export function ConnectionPicker({
  status,
  onChange,
  busy,
}: {
  status: J;
  onChange: (c: J) => void;
  busy: boolean;
}) {
  const c = status.settings;
  if (!c) return <p>Checking local model connections…</p>;
  return (
    <div className="connection-picker">
      <label>
        Model connection
        <select
          aria-label="Model connection"
          value={c.modelProfile}
          disabled={busy}
          onChange={(e) => onChange({ ...c, modelProfile: e.target.value })}
        >
          {(status.profiles || []).map((p: J) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.authenticated ? " · signed in" : " · sign-in not verified"}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Public data sources — select all that apply</legend>
        {status.sources.map((s: J) => (
          <label key={s.id}>
            <input
              type="checkbox"
              aria-label={s.name}
              checked={c.sourceIds.includes(s.id)}
              disabled={busy}
              onChange={(e) =>
                onChange({
                  ...c,
                  sourceIds: e.target.checked
                    ? [...c.sourceIds, s.id]
                    : c.sourceIds.filter((v: string) => v !== s.id),
                })
              }
            />
            <span>
              <strong>{s.name}</strong>
              <small>{s.description}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
export function DirectorDesk({
  advanced,
  agent,
}: {
  advanced: React.ReactNode;
  agent: ReturnType<typeof useDirector>;
}) {
  const [prompt, setPrompt] = useState(examples[0][1]),
    [refresh, setRefresh] = useState(true),
    [status, setStatus] = useState<J>({}),
    [error, setError] = useState("");
  const check = () =>
    api<J>("/api/director/status")
      .then(setStatus)
      .catch((e) => setError(String(e)));
  useEffect(() => {
    void check();
  }, []);
  const save = async (c: J) => {
    setStatus((old: J) => ({ ...old, settings: c }));
    try {
      await api("/api/director/settings", c);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <section className="director-desk">
      <div className="intro-line">
        <span className="client-eyebrow">
          FROM CLIENT QUESTION TO CLIENT CONVERSATION
        </span>
        <button
          className="quiet-action"
          type="button"
          onClick={() => void check()}
        >
          <RefreshCw size={12} />
          Check local connections
        </button>
      </div>
      <h1>
        What does your client
        <br />
        need to understand?
      </h1>
      <p className="client-lead">
        Give the team an assignment. Inspect the financial model, coach the
        assumptions, and shape the client materials.
      </p>
      <div className="director-examples">
        {examples.map(([name, text]) => (
          <button
            type="button"
            key={name}
            disabled={agent.running}
            onClick={() => setPrompt(text)}
          >
            {name}
            <ArrowRight size={12} />
          </button>
        ))}
      </div>
      <form
        className="director-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void agent.start({
            prompt,
            refreshPublic: refresh,
            modelProfile: status.settings.modelProfile,
            sourceIds: status.settings.sourceIds,
          });
        }}
      >
        <label htmlFor="director-brief">
          <MessageSquare size={15} />
          Your assignment
        </label>
        <textarea
          id="director-brief"
          aria-label="Director assignment"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          minLength={20}
          maxLength={6000}
          required
          disabled={agent.running}
        />
        <ConnectionPicker
          status={status}
          onChange={(c) => void save(c)}
          busy={agent.running}
        />
        {error && <p className="client-error">{error}</p>}
        <div>
          <label className="director-refresh">
            <input
              type="checkbox"
              checked={refresh}
              onChange={(e) => setRefresh(e.target.checked)}
              disabled={agent.running}
            />
            Fetch the selected public sources before drafting
          </label>
          <button
            className="primary-action"
            disabled={agent.running || !status.settings || !status.enabled}
          >
            {agent.running
              ? "Preparing your assignment…"
              : "Prepare the client story"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      <p className="review-provenance">
        Live public connectors: SEC (may refuse requests), Apple issuer report,
        Treasury, Bundesbank and sector lookup. Source dates, network failures
        and retained versions remain explicit. Public reporting currently covers
        Apple, PepsiCo, Campbell’s and General Mills. Prices/spreads, valuation
        multiples and forecast inputs are illustrative assumptions. IPO and
        single-tranche LBO are preliminary modelling modules, not underwriting
        approval.
      </p>
      <details className="advanced-brief">
        <summary>Inspect or enter a structured brief instead</summary>
        {advanced}
      </details>
    </section>
  );
}
export function ClientStoryline({
  room,
  onFrame,
  onView,
}: {
  room: J;
  onFrame: (n: number) => void;
  onView: (v: string) => void;
}) {
  const draft = room.draft;
  return (
    <div className="client-scroll storyline-workspace">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">THE CLIENT STORY</span>
          <h1>{room.mandate.question}</h1>
          <p>
            {room.mandate.audience} · {room.mandate.meetingDate} ·{" "}
            {room.modelPort?.state === "executed"
              ? "Agent-generated discussion draft"
              : "Structured public-data rehearsal"}
          </p>
        </div>
        <button className="quiet-action" onClick={() => onView("decision")}>
          Challenge the decision
          <ArrowRight size={14} />
        </button>
      </div>
      {room.directorInstruction && (
        <details className="story-instruction">
          <summary>The director’s original assignment</summary>
          <p>{room.directorInstruction}</p>
        </details>
      )}
      <div className="story-source-strip">
        <Database size={16} />
        <strong>
          {Object.keys(room.sources).filter((k) => k.startsWith("sec:")).length}{" "}
          company reporting snapshots
        </strong>
        <span>
          + Treasury rate reference
          {room.sources["bank:rabobank"] ? " + sourced bank proposition" : ""}
        </span>
        <button onClick={() => onView("pool")}>
          Inspect the data pool
          <ArrowRight size={12} />
        </button>
      </div>
      {room.modelPort?.state === "executed" && (
        <p className="review-provenance">
          The agent proposed the narrative. Figures resolve to stored models and
          evidence. No qualified banker review or executable market quotation is
          implied.
        </p>
      )}
      <div className="story-frames">
        {(draft?.slides || room.storylinePlan || []).map((p: J, i: number) => (
          <button
            key={p.id || i}
            onClick={() => (draft ? onFrame(i) : onView("plan"))}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3>{p.title}</h3>
              <p>
                {p.purpose ||
                  p.blocks
                    .map(
                      (b: J) =>
                        (
                          ({
                            client_decision: "Client premise and decision",
                            client_view: "Criteria and conditional advice",
                            client_conditions: "What changes the view",
                            peer_position:
                              "Public reporting · comparable peer context",
                            bank_proposition:
                              "Why this bank · sourced proposition",
                            decision_comparison:
                              "Financial alternatives against the client requirement",
                            chart: "Data-bound visualization",
                            text: b.text,
                            assumptions: "Transparent scenario assumptions",
                            sources: "Evidence and limitations",
                          }) as Record<string, string>
                        )[b.type] || "Linked financial analysis",
                    )
                    .filter(Boolean)
                    .join(" · ")}
              </p>
            </div>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
      {!draft && (
        <button className="primary-action" onClick={() => onView("plan")}>
          Inspect the proposed work
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
