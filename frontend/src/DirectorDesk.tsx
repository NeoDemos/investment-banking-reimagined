import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  MessageSquare,
  Sparkles,
  X,
  RefreshCw,
  ChevronDown,
  XCircle,
  LoaderCircle,
} from "lucide-react";
import { api } from "./api";
import { EvidenceCoverage } from "./ResearchEvidence";
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
    continueDirection: (answers: J) =>
      start({
        prompt: run?.result.prompt,
        intakeId: run?.runId,
        directionAnswers: answers,
        refreshPublic: true,
        useRecommendedSources: true,
      }),
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
  onAnswer,
}: {
  run: J | null;
  error: string;
  onCancel?: () => void;
  onDismiss?: () => void;
  onRetry?: (prompt: string) => void;
  onAnswer?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!run && !error) return null;
  const r = run?.result || {},
    active = ["running", "starting"].includes(run?.status),
    awaiting = r.state === "awaiting_direction";
  const elapsed = Math.max(
    0,
    Math.floor(
      (now -
        Date.parse(r.startedAt || run?.createdAt || new Date().toISOString())) /
        1000,
    ),
  );
  const failures = (run?.events || []).filter(
    (e: J) => e.type === "public_ingestion" && e.data.state === "failed",
  );
  const title = active
    ? r.stage || "Working on your assignment"
    : awaiting
      ? "A few questions before drafting"
      : r.clarification
        ? "Your input is needed"
        : run?.status === "failed"
          ? "Assignment stopped"
          : run?.status === "cancelled"
            ? "Assignment cancelled"
            : "Client materials ready";
  return (
    <section
      className={`director-progress run-bar ${error || r.clarification ? "attention" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="director-run-summary">
        {active ? (
          <LoaderCircle size={15} className="spin" />
        ) : (
          <Sparkles size={15} />
        )}
        <strong title={title}>{title}</strong>
        <span className="run-meta">
          {active
            ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
            : failures.length
              ? `${failures.length} source access issue${failures.length > 1 ? "s" : ""}`
              : r.connection
                ? `${r.connection.model} · ${r.connection.effort}`
                : ""}
        </span>
        {awaiting && onAnswer && (
          <button onClick={onAnswer}>
            Answer questions <ArrowRight size={12} />
          </button>
        )}
        {r.roomId && !active && (
          <a href={`#client/${r.roomId}/storyline`}>Open work</a>
        )}
        <details className="run-activity">
          <summary>
            Activity <ChevronDown size={12} />
          </summary>
          <div className="run-activity-panel">
            <h3>Assignment activity</h3>
            <p>
              {r.connection
                ? `${r.connection.model} · ${r.connection.effort} effort. `
                : ""}
              {r.heartbeatAt
                ? `Heartbeat ${new Date(r.heartbeatAt).toLocaleTimeString()}.`
                : ""}
            </p>
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
                  <li
                    key={i}
                    className={
                      e.type === "public_ingestion" && e.data.state === "failed"
                        ? "activity-failed"
                        : ""
                    }
                  >
                    {e.type === "public_ingestion" &&
                    e.data.state === "failed" ? (
                      <XCircle size={13} />
                    ) : e.type === "model_started" ? (
                      <LoaderCircle size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>
                      {e.type === "director_plan"
                        ? "Client story and evidence plan prepared"
                        : e.type === "public_ingestion"
                          ? `${e.data.source}: ${e.data.state}${e.data.error ? " — " + e.data.error : ""}`
                          : e.type === "model_started"
                            ? `${e.data.connection.model} · ${e.data.connection.effort}: started`
                            : e.type === "model_completed"
                              ? "Model response received"
                              : e.type === "financial_work_stored"
                                ? "Financial models and source versions saved"
                                : "Client materials generated"}
                    </span>
                  </li>
                ))}
            </ol>
            {failures.length > 0 && (
              <p>
                Access failures are not unknown tickers. Inspect the retained
                source versions and dates before relying on the draft.
              </p>
            )}
            {!active && !awaiting && r.prompt && onRetry && (
              <button onClick={() => onRetry(r.prompt)}>
                Retry with current connections
              </button>
            )}
          </div>
        </details>
        {active && onCancel && <button onClick={onCancel}>Cancel</button>}
        {!active && onDismiss && (
          <button aria-label="Dismiss assignment feedback" onClick={onDismiss}>
            <X size={13} />
          </button>
        )}
      </div>
      {(error || r.clarification) && (
        <p role="alert" className="run-error">
          {error || r.clarification}
        </p>
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
  const ref = useRef<HTMLDetailsElement>(null);
  const [menuPlacement, setMenuPlacement] = useState({
    up: false,
    height: 480,
  });
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        ref.current.open = false;
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (!c) return <small>Checking local model connections…</small>;
  return (
    <div className="connection-picker compact-connections">
      <label className="model-select">
        <span>Model</span>
        <select
          aria-label="Model connection"
          value={c.modelProfile}
          disabled={busy}
          onChange={(e) => onChange({ ...c, modelProfile: e.target.value })}
        >
          {(status.profiles || []).map((p: J) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.authenticated ? "" : " · check sign-in"}
            </option>
          ))}
        </select>
      </label>
      <details
        className="source-menu"
        ref={ref}
        onToggle={() => {
          if (ref.current?.open) {
            const box = ref.current.getBoundingClientRect(),
              paneTop =
                ref.current.closest(".client-pane")?.getBoundingClientRect()
                  .top || 0,
              below = window.innerHeight - box.bottom - 16,
              above = box.top - Math.max(paneTop, 8) - 16,
              up = below < 320 && above > below;
            setMenuPlacement({
              up,
              height: Math.max(120, Math.min(480, up ? above : below)),
            });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && ref.current) ref.current.open = false;
        }}
      >
        <summary aria-label="Select available data sources">
          <Database size={14} /> Sources{" "}
          <span>{c.sourceIds.length} enabled</span>
          <ChevronDown size={13} />
        </summary>
        <fieldset
          className="source-options"
          style={{
            top: menuPlacement.up ? "auto" : "calc(100% + 9px)",
            bottom: menuPlacement.up ? "calc(100% + 9px)" : "auto",
            maxHeight: menuPlacement.height,
          }}
        >
          <legend>Available data connections</legend>
          <p>The agent selects the relevant sources for each assignment.</p>
          {status.sources.map((source: J) => (
            <label key={source.id}>
              <input
                type="checkbox"
                aria-label={source.name}
                checked={c.sourceIds.includes(source.id)}
                disabled={busy}
                onChange={(e) =>
                  onChange({
                    ...c,
                    sourceIds: e.target.checked
                      ? [...c.sourceIds, source.id]
                      : c.sourceIds.filter((v: string) => v !== source.id),
                  })
                }
              />
              <span>
                <strong>{source.name}</strong>
                <small>{source.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  );
}
function ClientBriefing({
  run,
  onContinue,
  busy,
}: {
  run: J;
  onContinue: (answers: J) => void;
  busy: boolean;
}) {
  const questions = run.result.questions || [],
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<J>({});
  const q = questions[index];
  if (!q) return null;
  const answer = answers[q.id] || "";
  return (
    <section className="client-briefing director-desk">
      <span className="client-eyebrow">
        LET’S SHAPE THE CLIENT CONVERSATION
      </span>
      <h1>Before we build the story.</h1>
      <p className="client-lead">
        The team has identified the financial work. Your direction will shape
        the argument and the bank’s positioning.
      </p>
      <details className="briefing-assignment">
        <summary>Your assignment</summary>
        <small>YOUR ASSIGNMENT</small>
        <p>{run.result.prompt}</p>
      </details>
      <div className="briefing-step">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <div>
          {questions.map((_: J, i: number) => (
            <i key={i} className={i <= index ? "active" : ""} />
          ))}
        </div>
      </div>
      <h2>{q.question}</h2>
      <div className="briefing-options">
        {(q.options || []).map((option: string) => (
          <button
            type="button"
            key={option}
            aria-pressed={answer === option}
            onClick={() => setAnswers({ ...answers, [q.id]: option })}
          >
            {option}
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
      <textarea
        aria-label="Client direction answer"
        value={answer}
        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
        placeholder="Choose a suggestion or explain it in your own words…"
        maxLength={2000}
      />
      <div className="briefing-actions">
        <button
          type="button"
          disabled={index === 0 || busy}
          onClick={() => setIndex(index - 1)}
        >
          Back
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={busy || answer.trim().length < 2}
          onClick={() =>
            index < questions.length - 1
              ? setIndex(index + 1)
              : onContinue(answers)
          }
        >
          {index < questions.length - 1
            ? "Next question"
            : "Build the client story"}
          <ArrowRight size={14} />
        </button>
      </div>
      <details className="briefing-plan">
        <summary>Proposed evidence and storyline</summary>
        <p>
          {(run.result.evidenceNeeds || [])
            .map((v: string) => v.replaceAll("_", " "))
            .join(" · ")}
        </p>
        <ol>
          {(run.result.proposedPlan || []).map((p: J, i: number) => (
            <li key={i}>
              <strong>{p.title}</strong>
              <p>{p.purpose}</p>
            </li>
          ))}
        </ol>
      </details>
    </section>
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
  if (agent.run?.result.state === "awaiting_direction")
    return (
      <ClientBriefing
        key={agent.run.runId}
        run={agent.run}
        busy={agent.running}
        onContinue={(answers) => void agent.continueDirection(answers)}
      />
    );
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
            discoverOnly: true,
            useRecommendedSources: true,
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
            Fetch relevant public evidence automatically
          </label>
          <button
            className="primary-action"
            disabled={agent.running || !status.settings || !status.enabled}
          >
            {agent.running
              ? "Preparing your assignment…"
              : "Plan the client story"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      <p className="review-provenance">
        Public evidence is chosen for the assignment: company reporting, credit
        disclosures, Treasury history, delayed equities, sector references and
        bank capabilities. SEC access failures are distinct from ticker
        coverage. Source dates, network failures and retained versions remain
        explicit. Public reporting currently covers Apple, PepsiCo, Campbell’s
        and General Mills. Delayed prices can anchor proposed buyback/M&A
        scenarios. Credit spreads, valuation multiples and forecast inputs
        remain explicit assumptions. IPO and single-tranche LBO are preliminary
        modelling modules, not underwriting approval.
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
          <h1>
            {(
              {
                AAPL: "Apple",
                PEP: "PepsiCo",
                CPB: "Campbell’s",
                GIS: "General Mills",
              } as J
            )[room.mandate.issuer] || room.mandate.issuer}{" "}
            ·{" "}
            {
              (
                {
                  bond: "Debt capital markets",
                  buyback: "Capital returns",
                  acquisition: "M&A advice",
                  ipo: "Potential listing",
                  lbo: "Sponsor investment",
                } as J
              )[room.mandate.kind]
            }
          </h1>
          <p className="story-client-question">{room.mandate.question}</p>
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
      <div className="story-workspace-grid">
        <div className="story-main-column">
          <div className="story-source-strip">
            <Database size={16} />
            <strong>
              {
                Object.keys(room.sources).filter((k) => k.startsWith("sec:"))
                  .length
              }{" "}
              company reporting snapshots
            </strong>
            <span>
              {room.sources["treasury:USD"] ? " · Treasury rate reference" : ""}
              {room.sources["bank:rabobank"]
                ? " + sourced bank proposition"
                : ""}
            </span>
            <button onClick={() => onView("pool")}>
              Inspect the data pool
              <ArrowRight size={12} />
            </button>
          </div>
          {room.modelPort?.state === "executed" && (
            <p className="review-provenance">
              The agent proposed the narrative. Figures resolve to stored models
              and evidence. No qualified banker review or executable market
              quotation is implied.
            </p>
          )}
          <div className="story-frames">
            {(draft?.slides || room.storylinePlan || []).map(
              (p: J, i: number) => (
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
                                  client_decision:
                                    "Client premise and decision",
                                  client_view:
                                    "Criteria and conditional advice",
                                  client_conditions: "What changes the view",
                                  peer_position:
                                    "Public reporting · comparable peer context",
                                  bank_proposition:
                                    "Why this bank · sourced proposition",
                                  decision_comparison:
                                    "Financial alternatives against the client requirement",
                                  chart: "Data-bound visualization",
                                  text: "Proposed narrative",
                                  research_summary:
                                    "Evidence coverage and open data needs",
                                  credit_context:
                                    "Credit metrics, ratings and dated issue context",
                                  rate_history:
                                    "Interest-rate development and timing",
                                  equity_context:
                                    "Delayed equity market evidence",
                                  assumptions:
                                    "Transparent scenario assumptions",
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
              ),
            )}
          </div>
        </div>
        <EvidenceCoverage room={room} onInspect={() => onView("evidence")} />
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
