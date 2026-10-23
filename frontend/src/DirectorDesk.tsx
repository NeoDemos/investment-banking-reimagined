import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { api } from "./api";
type J = Record<string, any>;
const examples = [
  [
    "Debt capital markets",
    "Prepare a client pitch for PepsiCo's CFO about raising USD500m net through a bond. Compare a five-year issue with a three-year issue and doing nothing. Explain funding cost, refinancing risk and balance-sheet position against Campbell's and General Mills. Include what makes Rabobank relevant. Use public reporting and illustrative market terms, with a clear recommendation framework and questions for the meeting.",
  ],
  [
    "Capital returns",
    "Prepare a client discussion for PepsiCo about a USD500m share buyback versus a smaller buyback and retaining the cash. Show EPS economics, liquidity implications, reported peer context and why Rabobank's food-sector knowledge could help. Label share prices as illustrative and identify the missing execution evidence.",
  ],
  [
    "M&A advice",
    "Prepare an illustrative PepsiCo acquisition discussion about buying Campbell's. Compare debt funding alternatives, zero-synergy downside and doing nothing. Show the financial consequences, client decision criteria, public peer context and a sourced Rabobank proposition. No legal diligence or invented current share prices.",
  ],
];
export function useDirector(onReady: (id: string) => void) {
  const [run, setRun] = useState<J | null>(null),
    [error, setError] = useState("");
  const start = async (body: J) => {
    setError("");
    setRun({
      status: "starting",
      result: { stage: "Giving the assignment to the local agent" },
      events: [],
    });
    try {
      const r = await api<J>("/api/director/assignments", body);
      setRun({
        runId: r.runId,
        status: "running",
        result: { stage: "Planning the client story" },
        events: [],
      });
    } catch (e) {
      setError(String(e));
      setRun(null);
    }
  };
  useEffect(() => {
    if (!run?.runId || run.status !== "running") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await api<J>(`/api/agent/runs/${run.runId}`);
        if (cancelled) return;
        setRun({ ...next, runId: run.runId });
        if (next.status === "completed" && next.result.roomId)
          onReady(next.result.roomId);
        if (next.status === "failed")
          setError(
            next.result.error ||
              "The agent stopped; saved work remains available.",
          );
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [run?.runId, run?.status]);
  return {
    run,
    error,
    start,
    running: ["running", "starting"].includes(run?.status || ""),
  };
}
export function DirectorProgress({
  run,
  error,
}: {
  run: J | null;
  error: string;
}) {
  return (
    <>
      {error && (
        <p className="client-error" role="alert">
          {error}
        </p>
      )}
      {run && (
        <section className="director-progress" aria-live="polite">
          <div>
            <Sparkles size={17} />
            <strong>
              {run.result.stage ||
                run.result.message ||
                run.result.clarification ||
                (run.status === "failed"
                  ? "Assignment stopped"
                  : "Client draft prepared")}
            </strong>
          </div>
          <p>
            {run.status === "completed" && run.result.clarification
              ? "Clarification required. No presentation or model was claimed."
              : "A real local Codex request proposes the work. Public data and validated Rust calculations supply the numbers."}
          </p>
          <ol>
            {run.events
              .filter((e: J) =>
                [
                  "director_plan",
                  "public_ingestion",
                  "financial_work_stored",
                  "client_materials_generated",
                ].includes(e.type),
              )
              .map((e: J, i: number) => (
                <li key={i}>
                  <Check size={12} />
                  {e.type === "director_plan"
                    ? "Client storyline planned"
                    : e.type === "public_ingestion"
                      ? `Public source: ${e.data?.state || e.state || "request recorded"}`
                      : e.type === "financial_work_stored"
                        ? "Financial model and source snapshots stored"
                        : "Dynamic client materials generated"}
                </li>
              ))}
          </ol>
          {run.result.roomId && run.status === "failed" && (
            <a href={`#client/${run.result.roomId}/storyline`}>
              Open saved work
            </a>
          )}
        </section>
      )}
    </>
  );
}
export function DirectorDesk({
  onOpen,
  advanced,
}: {
  onOpen: (id: string) => void;
  advanced: React.ReactNode;
}) {
  const [prompt, setPrompt] = useState(examples[0][1]),
    [refresh, setRefresh] = useState(true),
    [status, setStatus] = useState<J>({});
  const agent = useDirector(onOpen);
  useEffect(() => {
    void api<J>("/api/director/status").then(setStatus);
  }, []);
  return (
    <section className="director-desk">
      <div className="intro-line">
        <span className="client-eyebrow">
          FROM CLIENT QUESTION TO CLIENT CONVERSATION
        </span>
        <span className="archive-badge">
          Local Codex · {status.enabled ? "agent enabled" : "agent not enabled"}
        </span>
      </div>
      <h1>
        What does your client
        <br />
        need to understand?
      </h1>
      <p className="client-lead">
        Give the team an assignment. The agent connects the evidence, builds the
        financial work and shapes the argument.
      </p>
      <div className="director-examples">
        {examples.map(([name, text]) => (
          <button
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
          void agent.start({ prompt, refreshPublic: refresh });
        }}
      >
        <label htmlFor="director-brief">
          <MessageSquare size={15} /> Your assignment
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
        <div>
          <label className="director-refresh">
            <input
              type="checkbox"
              checked={refresh}
              onChange={(e) => setRefresh(e.target.checked)}
              disabled={agent.running}
            />{" "}
            Fetch public SEC reporting and Treasury rates before drafting
          </label>
          <button
            className="primary-action"
            disabled={agent.running || !status.enabled}
          >
            {agent.running
              ? "The team is preparing…"
              : "Prepare the client story"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      <DirectorProgress run={agent.run} error={agent.error} />
      <div className="director-flow">
        {[
          "Interpret the client brief",
          "Pool public evidence",
          "Model the alternatives",
          "Build the story & frames",
        ].map((x, i) => (
          <div key={x}>
            <small>0{i + 1}</small>
            <strong>{x}</strong>
          </div>
        ))}
      </div>
      <p className="review-provenance">
        Public-data demonstration only. Codex uses its local saved login; no
        credentials enter this app. Bond, buyback and simplified acquisition
        methods execute today. Full IPO, DCF, LBO and investor-memorandum
        modelling are additional modules to implement and validate. Current
        issuer spreads, equity prices and deal terms are illustrative.
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
