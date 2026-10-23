import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "./api";
import { completeSnapshot } from "./paging";
type J = Record<string, any>;
const phases = [
  ["setup", "Setup & coordination"],
  ["research", "Research & normalization"],
  ["calculation", "Financial analysis"],
  ["materials", "Client materials"],
  ["qualityReview", "QA & senior review"],
  ["rework", "Corrections & rework"],
];
function exportJson(name: string, value: unknown) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function ClientEvaluation({
  room,
  rooms,
  onSelect,
}: {
  room: J | null;
  rooms: J[];
  onSelect: (id: string) => void;
}) {
  const [data, setData] = useState<J>({ observations: [], summary: {} }),
    [copies, setCopies] = useState<J[]>([]),
    [copyId, setCopyId] = useState(""),
    [copyPage, setCopyPage] = useState<J>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async () => {
    if (!room?.mandate) return;
    const [d, c] = await Promise.all([
      api<J>(`/api/client-work/${room.id}/evaluations`),
      api<J>(`/api/client-work/${room.id}/copies`),
    ]);
    setData(d);
    setCopies(c.copies);
    setCopyPage(c);
    setCopyId((id) =>
      c.copies.some((c: J) => c.id === id) ? id : c.copies[0]?.id || "",
    );
  };
  const moreObservations = async () => {
    if (!room || data.nextCursor == null) return;
    try {
      const next = await api<J>(
        `/api/client-work/${room.id}/evaluations?before=${data.nextCursor}&maxId=${data.maxId}`,
      );
      setData((old: J) => ({
        ...next,
        observations: [...old.observations, ...next.observations],
      }));
    } catch (e) {
      setError(String(e));
    }
  };
  const moreCopies = async () => {
    if (!room || copyPage.nextCursor == null) return;
    try {
      const next = await api<J>(
        `/api/client-work/${room.id}/copies?before=${copyPage.nextCursor}&maxId=${copyPage.maxId}`,
      );
      setCopies((old) => [...old, ...next.copies]);
      setCopyPage(next);
    } catch (e) {
      setError(String(e));
    }
  };
  const exportAll = async () => {
    if (!room) return;
    setBusy(true);
    setError("");
    try {
      const all = await completeSnapshot(
        `/api/client-work/${room.id}/evaluations`,
        "observations",
      );
      exportJson(`evaluation-${room.id}-complete-snapshot.json`, all);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setData({ observations: [], summary: {} });
    setCopies([]);
    setCopyId("");
    void load().catch((e) => setError(String(e)));
  }, [room?.id]);
  const pack = async () => {
    if (!room || !copyId) return;
    try {
      const saved = await api<J>(
        `/api/client-work/${room.id}/copies/${copyId}`,
      );
      const r = saved.workroom;
      exportJson("paired-task-public-inputs.json", {
        schemaVersion: "public-task-pack/1",
        copyId,
        decisionBrief: Object.fromEntries(
          [
            "question",
            "audience",
            "criteria",
            "constraints",
            "fundingNeed",
            "kind",
            "issuer",
            "target",
            "meetingDate",
          ].map((k) => [k, r.mandate[k]]),
        ),
        publicSources: r.sources,
        scenarioInputs: r.options.map((o: J) => ({
          name: o.name,
          params: r.analyses[o.analysisId].params,
          rationale: r.analyses[o.analysisId].assumptionRationale,
        })),
        requiredDeliverables: [
          "Decision-specific alternatives and explicit status quo",
          "Independent calculations with units, periods and source identities",
          "Downside and method limitations",
          "Firm-reference discussion materials with complete advice and conditions",
          "Senior review and correction log",
        ],
        protocol:
          "Use matched cases or counterbalance order. This input pack excludes computed answers. Include all staff setup, QA, review and rework. Exposure to the assisted result must be disclosed.",
      });
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <div className="client-scroll">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">VALUE EVIDENCE</span>
          <h1 className="evaluation-heading">Measure the whole job.</h1>
          <p>
            From the client brief through accepted delivery, including checking
            and rework.
          </p>
        </div>
      </div>
      <div className="value-hypotheses">
        <section>
          <small>STAFF PRODUCTIVITY TARGET</small>
          <h2>
            10× <span>unproven</span>
          </h2>
          <p>
            Baseline aggregate active staff minutes ÷ assisted minutes, at the
            same scope and quality floor.
          </p>
        </section>
        <section>
          <small>CLIENT IMPACT TARGET</small>
          <h2>
            5× <span>unproven</span>
          </h2>
          <p>
            Use a predefined, ratio-scale outcome. Correctly resolved CFO
            questions are a limited discussion proxy, not realized client value.
          </p>
        </section>
      </div>
      <div className="evaluation-scope">
        <label>
          Evaluate a specific client task
          <select
            aria-label="Evaluation workroom"
            value={room?.mandate ? room.id : ""}
            onChange={(e) => {
              if (e.target.value) onSelect(e.target.value);
            }}
          >
            <option value="">Choose a client workroom</option>
            {rooms
              .filter((r) => r.mandate)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · {r.mandate.meetingDate}
                </option>
              ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="client-error" role="alert">
          {error}
        </p>
      )}
      {!room?.mandate ? (
        <p className="review-provenance">
          Create or select client work before recording observations. No
          demonstration timings or model-review scores are seeded as banker
          evidence.
        </p>
      ) : (
        <>
          <section className="measurement-summary">
            <strong>
              {data.summary.enteredPairs || 0} entered pairs ·{" "}
              {data.summary.qualityQualifiedPairs || 0} meet the declared
              quality gate
            </strong>
            <p>
              Showing {data.observations.length} of{" "}
              {data.summary.enteredPairs || 0} stored observations in this fixed
              snapshot. {data.summary.observationWindow}
            </p>
            <p>
              {data.observations.length
                ? `Full snapshot staff minutes: ${data.summary.totalBaselineStaffMinutes} baseline → ${data.summary.totalAssistedStaffMinutes} assisted, including failed-quality pairs. Median for the most recently loaded page’s qualified entries: ${data.summary.medianDisplayedQualifiedRatio == null ? "not available" : data.summary.medianDisplayedQualifiedRatio.toFixed(2) + "×"}. Unverified entries do not establish a general productivity result.`
                : "No paired banker observations recorded. Backend speed and the five model review passes do not establish either multiplier."}
            </p>
          </section>
          {data.observations.map((r: J) => (
            <article className="observation-card" key={r.id}>
              <div className="section-heading">
                <div>
                  <h3>{r.taskLabel}</h3>
                  <p>
                    {r.reviewer} · copy r{r.copyRevision} ·{" "}
                    {r.order.replaceAll("_", " ")}
                  </p>
                </div>
                <span
                  className={`state-badge ${r.metrics.qualityGatePassed ? "complete" : "warning"}`}
                >
                  {r.metrics.qualityGatePassed
                    ? "Declared quality gate met"
                    : "Quality / scope gate not met"}
                </span>
              </div>
              <div className="entered-metrics">
                <span>
                  <small>Entered total staff minutes</small>
                  {r.baselineTotalStaffMinutes} → {r.assistedTotalStaffMinutes}
                </span>
                <span>
                  <small>Calculated staff-time ratio</small>
                  {r.metrics.enteredStaffTimeRatio == null
                    ? "Suppressed"
                    : r.metrics.enteredStaffTimeRatio.toFixed(2) + "×"}
                </span>
                <span>
                  <small>Entered question coverage proxy</small>
                  {r.baselineResolved}/{r.questions.length} →{" "}
                  {r.assistedResolved}/{r.questions.length}
                  {r.metrics.enteredQuestionCoverageRatio != null
                    ? ` (${r.metrics.enteredQuestionCoverageRatio.toFixed(2)}×)`
                    : " · ratio not available"}
                </span>
              </div>
              <p className="review-provenance">
                {r.provenance}. Client economic impact remains unproven.
              </p>
              <details>
                <summary>
                  Inspect all times, defects, scope declarations and limitations
                </summary>
                <pre>{JSON.stringify(r, null, 2)}</pre>
              </details>
            </article>
          ))}
          {data.nextCursor != null && (
            <button
              className="primary-action"
              onClick={() => void moreObservations()}
            >
              Load older observations, including failures
            </button>
          )}
          <section className="observation-form">
            <h2>Record an actual paired observation.</h2>
            <p>
              Do not enter hypothetical savings. An operator-entered record does
              not verify identity, independent acceptance or client benefit.
            </p>
            {!copies.length ? (
              <p className="materials-warning">
                No exact discussion review copy exists yet. Complete the review
                journey first; observations attach to that immutable assisted
                artifact.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (busy) return;
                  const f = new FormData(e.currentTarget);
                  const times = (prefix: string) =>
                    Object.fromEntries(
                      phases.map(([key]) => [
                        key,
                        Number(f.get(`${prefix}.${key}`)),
                      ]),
                    );
                  const flag = (name: string) => f.get(name) === "on";
                  setBusy(true);
                  setError("");
                  void api(`/api/client-work/${room.id}/evaluations`, {
                    copyId,
                    taskLabel: f.get("taskLabel"),
                    reviewer: f.get("reviewer"),
                    baselineMethod: f.get("baselineMethod"),
                    order: f.get("order"),
                    baselineMinutes: times("baseline"),
                    assistedMinutes: times("assisted"),
                    baselineElapsedMinutes: Number(f.get("baselineElapsed")),
                    assistedElapsedMinutes: Number(f.get("assistedElapsed")),
                    baselineAccepted: flag("baselineAccepted"),
                    assistedAccepted: flag("assistedAccepted"),
                    baselineCriticalErrors: Number(f.get("baselineErrors")),
                    assistedCriticalErrors: Number(f.get("assistedErrors")),
                    sameScopeConfirmed: flag("sameScope"),
                    allStaffAndSetupIncluded: flag("allStaff"),
                    questions: String(f.get("questions") || "")
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                    questionsPredefined: flag("predefined"),
                    baselineResolved: Number(f.get("baselineResolved")),
                    assistedResolved: Number(f.get("assistedResolved")),
                    evidenceNotes: f.get("notes"),
                  })
                    .then(() => load())
                    .catch((e) => setError(String(e)))
                    .finally(() => setBusy(false));
                }}
              >
                <div className="brief-fields two">
                  <label>
                    Assisted artifact
                    <select
                      aria-label="Evaluation review copy"
                      value={copyId}
                      onChange={(e) => setCopyId(e.target.value)}
                    >
                      {copies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} · r{c.revision}
                        </option>
                      ))}
                    </select>
                    {copyPage.nextCursor != null && (
                      <button
                        type="button"
                        className="quiet-action"
                        onClick={() => void moreCopies()}
                      >
                        Load older review copies
                      </button>
                    )}
                  </label>
                  <label>
                    Task label
                    <input
                      name="taskLabel"
                      required
                      minLength={5}
                      maxLength={180}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="quiet-action"
                  onClick={() => void pack()}
                >
                  <Download size={14} /> Export the public task inputs, without
                  answers
                </button>
                <div className="brief-fields two">
                  <label>
                    Reviewer (self-attested)
                    <input name="reviewer" required minLength={2} />
                  </label>
                  <label>
                    Order / learning control
                    <select name="order">
                      <option value="matched_cases">
                        Matched equivalent cases
                      </option>
                      <option value="baseline_first">Baseline first</option>
                      <option value="assisted_first">Assisted first</option>
                    </select>
                  </label>
                </div>
                <label>
                  What did the manual baseline actually involve?
                  <textarea
                    name="baselineMethod"
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                </label>
                <div className="time-entry-table">
                  <div>
                    <strong>Aggregate active staff minutes</strong>
                    <strong>Baseline</strong>
                    <strong>Assisted</strong>
                  </div>
                  {phases.map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <input
                        aria-label={`Baseline ${label}`}
                        name={`baseline.${key}`}
                        type="number"
                        min="0"
                        step="any"
                        required
                      />
                      <input
                        aria-label={`Assisted ${label}`}
                        name={`assisted.${key}`}
                        type="number"
                        min="0"
                        step="any"
                        required
                      />
                    </div>
                  ))}
                  <div>
                    <span>Wall-clock elapsed minutes (separate)</span>
                    <input
                      name="baselineElapsed"
                      type="number"
                      min="0.01"
                      step="any"
                      required
                    />
                    <input
                      name="assistedElapsed"
                      type="number"
                      min="0.01"
                      step="any"
                      required
                    />
                  </div>
                  <div>
                    <span>Critical numeric/source/method errors</span>
                    <input
                      name="baselineErrors"
                      type="number"
                      min="0"
                      step="1"
                      required
                    />
                    <input
                      name="assistedErrors"
                      type="number"
                      min="0"
                      step="1"
                      required
                    />
                  </div>
                </div>
                <p className="review-provenance">
                  Staff time sums all contributors. It can exceed wall-clock
                  time when people work in parallel. Record failed attempts and
                  corrections in these totals, not only the successful final
                  run.
                </p>
                <label className="confirmation">
                  <input type="checkbox" name="sameScope" />
                  Same public evidence snapshot, decision scope, deliverables
                  and quality threshold.
                </label>
                <label className="confirmation">
                  <input type="checkbox" name="allStaff" />
                  Includes setup, coordination, all staff, senior review and
                  rework through acceptance.
                </label>
                <label className="confirmation">
                  <input type="checkbox" name="baselineAccepted" />
                  The reviewer accepted the baseline at the stated quality
                  floor.
                </label>
                <label className="confirmation">
                  <input type="checkbox" name="assistedAccepted" />
                  The reviewer accepted the assisted result at the same floor.
                </label>
                <h3>Optional simulated-meeting question coverage</h3>
                <label>
                  Pre-specified, comparable CFO questions (one per line)
                  <textarea
                    name="questions"
                    placeholder="Leave empty if no comparable meeting observation took place."
                  />
                </label>
                <label className="confirmation">
                  <input type="checkbox" name="predefined" />
                  These questions and correctness criteria were specified before
                  comparing outcomes.
                </label>
                <div className="brief-fields two">
                  <label>
                    Baseline questions correctly resolved
                    <input
                      name="baselineResolved"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="0"
                    />
                  </label>
                  <label>
                    Assisted questions correctly resolved
                    <input
                      name="assistedResolved"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="0"
                    />
                  </label>
                </div>
                <p className="review-provenance">
                  Zero baseline coverage has no defined improvement ratio. This
                  bounded proxy cannot establish 5× realized client impact, and
                  a 1–5 quality rating cannot be multiplied.
                </p>
                <label>
                  Acceptance evidence, defects, familiarity and limitations
                  <textarea
                    name="notes"
                    required
                    minLength={30}
                    maxLength={4000}
                  />
                </label>
                <button className="primary-action" disabled={busy}>
                  Save entered observation
                </button>
              </form>
            )}
          </section>
          <button
            className="quiet-action"
            disabled={busy}
            onClick={() => void exportAll()}
          >
            <Download size={14} /> Export complete observation snapshot,
            including failures
          </button>
        </>
      )}
    </div>
  );
}
