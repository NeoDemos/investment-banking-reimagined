import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { api } from "./api";
import { Page } from "./AgentStudio";
import { useRevisionDraft } from "./useRevisionDraft";
type J = Record<string, any>;
type Act = (path: string, body: J) => Promise<any>;
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
function Issue({
  issue,
  room,
  act,
  busy,
}: {
  issue: J;
  room: J;
  act: Act;
  busy: boolean;
}) {
  const [reason, setReason] = useState(""),
    [verifier, setVerifier] = useState(""),
    [rev, setRev] = useState("");
  const changes = (room.changeLog || []).filter(
    (c: J) =>
      c.revision > issue.capturedRevision &&
      c.revision >= (issue.reopenedAtRevision || 0) &&
      c.affectedPages?.includes(issue.pageId) &&
      (issue.category !== "financial" || c.newAnalysisId),
  );
  const submit = (op: string) =>
    void act(`/api/client-work/${room.id}/review`, {
      expectedRevision: room.revision,
      op,
      issueId: issue.id,
      resolution: reason,
      owner: verifier,
      changeRevision: rev ? Number(rev) : null,
    });
  return (
    <article className="review-issue">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">
            {issue.category} · page {issue.pageId} · captured r
            {issue.capturedRevision}
          </span>
          <h3>{issue.body}</h3>
          <p>Owner: {issue.owner}</p>
        </div>
        <span className={`state-badge ${issue.status}`}>{issue.status}</span>
      </div>
      {issue.appliedRevision && (
        <p className="review-provenance">
          Correction linked to r{issue.appliedRevision}.{" "}
          {issue.status !== "verified" && "Verification still required."}
        </p>
      )}
      {issue.resolution && (
        <p className="review-resolution">
          {issue.supersededVerification && issue.status === "open"
            ? "Previous check (superseded): "
            : ""}
          {issue.resolution}
        </p>
      )}
      {issue.reopenReason && issue.status === "open" && (
        <p className="materials-warning">
          Reopened at r{issue.reopenedAtRevision}: {issue.reopenReason}. The
          earlier verification or correction link is superseded.
        </p>
      )}
      {issue.verifiedBy && (
        <p className="review-provenance">
          Self-attested by {issue.verifiedBy} against r{issue.verifiedRevision};
          identity and qualification not verified.
        </p>
      )}
      {issue.status !== "verified" && (
        <div className="issue-actions">
          <label>
            Verification / deferral explanation
            <textarea
              aria-label={`Resolution for ${issue.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What changed, or what did you independently check?"
              minLength={20}
            />
          </label>
          <div className="brief-fields two">
            <label>
              Correction revision
              <select
                aria-label="Correction revision"
                value={rev}
                onChange={(e) => setRev(e.target.value)}
              >
                <option value="">Select an actual page change</option>
                {changes.map((c: J) => (
                  <option key={c.revision} value={c.revision}>
                    r{c.revision} · {c.type || "scenario recalculation"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Verifier name (self-attested)
              <input
                aria-label="Verifier name"
                value={verifier}
                onChange={(e) => setVerifier(e.target.value)}
              />
            </label>
          </div>
          <div className="review-buttons">
            <button
              className="quiet-action"
              disabled={busy || !rev || reason.trim().length < 20}
              onClick={() => submit("link_change")}
            >
              Link correction
            </button>
            <button
              className="primary-action"
              disabled={
                busy || reason.trim().length < 20 || verifier.trim().length < 2
              }
              onClick={() => submit("verify")}
            >
              Verify after checking
            </button>
            <button
              className="quiet-action"
              disabled={busy || reason.trim().length < 20}
              onClick={() => submit("defer")}
            >
              Defer explicitly
            </button>
          </div>
          <small>
            Linking a revision records an applied change. Verification is a
            separate manual assertion; no deferred model action is treated as
            performed.
          </small>
        </div>
      )}
    </article>
  );
}
export function ClientReview({
  room,
  act,
  busy,
  pageIndex = 0,
}: {
  room: J;
  act: Act;
  busy: boolean;
  pageIndex?: number;
}) {
  const [draft, setDraft, clearDraft] = useRevisionDraft(
    `review-note:${room.id}`,
    room.revision,
    {
      page: room.draft?.slides[pageIndex]?.id || "decision",
      body: "",
      owner: "",
      category: "question",
    },
  );
  const { page, body, owner, category } = draft;
  const setPage = (page: string) => setDraft((old) => ({ ...old, page })),
    setBody = (body: string) => setDraft((old) => ({ ...old, body })),
    setOwner = (owner: string) => setDraft((old) => ({ ...old, owner })),
    setCategory = (category: string) =>
      setDraft((old) => ({ ...old, category }));
  const [copies, setCopies] = useState<J[]>([]),
    [copyListing, setCopyListing] = useState<J>({}),
    [selected, setSelected] = useState<J | null>(null),
    [copyPage, setCopyPage] = useState(0),
    [historyRevision, setHistoryRevision] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    void api<J>(`/api/client-work/${room.id}/copies`)
      .then((r) => {
        setCopies(r.copies);
        setCopyListing(r);
      })
      .catch((e) => setError(String(e)));
  }, [room.id, room.revision]);
  const olderCopies = async () => {
    if (copyListing.nextCursor == null) return;
    try {
      const page = await api<J>(
        `/api/client-work/${room.id}/copies?maxId=${copyListing.maxId}&before=${copyListing.nextCursor}`,
      );
      setCopies((old) => [...old, ...page.copies]);
      setCopyListing(page);
    } catch (e) {
      setError(String(e));
    }
  };
  if (!room.draft)
    return (
      <div className="empty-client">
        <h2>Prepare the work plan before reviewing pages.</h2>
      </div>
    );
  return (
    <div className="client-scroll">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">REVIEW & DELIVERY</span>
          <h2>Close the loop on the actual work.</h2>
          <p>
            Persist a page issue, link a real correction, verify it, then freeze
            the exact discussion state.
          </p>
        </div>
        <span className="state-badge warning">
          Commercial execution blocked
        </span>
      </div>
      {error && <p role="alert">{error}</p>}
      <form
        className="review-add"
        onSubmit={(e) => {
          e.preventDefault();
          void act(`/api/client-work/${room.id}/review`, {
            expectedRevision: room.revision,
            op: "add",
            pageId: page,
            body,
            owner,
            category,
          }).then((r) => {
            if (r) clearDraft();
          });
        }}
      >
        <div className="brief-fields">
          <label>
            Page anchor
            <select
              aria-label="Review page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            >
              {room.draft.slides.map((p: J) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Issue type
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["question", "financial", "source", "story", "design"].map(
                (x) => (
                  <option key={x}>{x}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Responsible person
            <input
              aria-label="Review issue owner"
              required
              minLength={2}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </label>
        </div>
        <label>
          What needs to be challenged or changed?
          <textarea
            aria-label="Page review issue"
            minLength={5}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button className="primary-action" disabled={busy}>
          Save page issue <ArrowRight size={14} />
        </button>
      </form>
      <div className="review-queue">
        {room.reviewIssues?.length ? (
          room.reviewIssues.map((i: J) => (
            <Issue key={i.id} issue={i} room={room} act={act} busy={busy} />
          ))
        ) : (
          <p className="review-provenance">
            No page issues recorded. This is not evidence that qualified review
            has occurred.
          </p>
        )}
      </div>
      {room.changeLog?.length > 0 && (
        <section className="change-record">
          <h3>What changed</h3>
          {room.changeLog
            .slice()
            .reverse()
            .map((c: J, i: number) => (
              <div key={i}>
                <strong>
                  r{c.revision} · {c.type || "scenario recalculation"}
                </strong>
                <p>{c.rationale || "Banker-authored work updated."}</p>
                <small>
                  {c.oldAnalysisId &&
                    `${c.oldAnalysisId} → ${c.newAnalysisId} · `}
                  Pages: {c.affectedPages?.join(", ")}
                  {c.narrativeReviewRequired
                    ? " · Narrative review still required"
                    : " · Narrative review declared"}
                </small>
              </div>
            ))}
        </section>
      )}
      <section className="history-opener">
        <h3>Inspect an exact prior revision</h3>
        <p className="review-provenance">
          {room.historyCount || room.history.length} revisions retained
          separately; routine workroom reads contain only the latest 100
          summaries.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void api<J>(
              `/api/client-work/${room.id}/history/${historyRevision}`,
            )
              .then((v) => {
                setSelected({
                  reviewCopy: {
                    id: `history-${v.revision}`,
                    label: "Archived workroom revision",
                    revision: v.revision,
                    history: true,
                    renderContract: v.mandate?.documentContract,
                    scope:
                      "Historical advisory state, not a declaration of review or client readiness.",
                  },
                  workroom: v,
                });
                setCopyPage(0);
              })
              .catch((e) => setError(String(e)));
          }}
        >
          <label>
            Revision number
            <input
              aria-label="Archived revision number"
              type="number"
              min="1"
              max={room.revision}
              required
              value={historyRevision}
              onChange={(e) => setHistoryRevision(e.target.value)}
            />
          </label>
          <button className="quiet-action">Open archived revision</button>
        </form>
      </section>
      <section className="freeze-section">
        <div className="section-heading">
          <div>
            <h2>Freeze a discussion review copy.</h2>
            <p>
              Pins the brief, judgement, options, calculations, evidence,
              materials and issues. Subsequent work remains a separate draft.
            </p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act(`/api/client-work/${room.id}/copies`, {
              expectedRevision: room.revision,
              label: f.get("label"),
              reviewer: f.get("reviewer"),
              calculationsChecked: f.get("calculations") === "on",
              sourcesAndDatesChecked: f.get("sources") === "on",
              narrativeReviewed: f.get("narrative") === "on",
            });
          }}
        >
          <div className="brief-fields two">
            <label>
              Copy name
              <input
                name="label"
                required
                minLength={4}
                defaultValue="CFO discussion rehearsal"
              />
            </label>
            <label>
              Reviewer (self-attested)
              <input name="reviewer" required minLength={2} />
            </label>
          </div>
          <label className="confirmation">
            <input type="checkbox" name="calculations" required />I checked the
            calculations and scenario terms.
          </label>
          <label className="confirmation">
            <input type="checkbox" name="sources" required />I checked sources,
            dates, definitions and remaining qualifications.
          </label>
          <label className="confirmation">
            <input type="checkbox" name="narrative" required />I reviewed the
            conditional view and affected narrative against the active figures.
          </label>
          <p className="review-provenance">
            This records your declaration; the app does not verify reviewer
            identity, qualification or independence. It does not approve client
            use, market execution or bank deployment.
          </p>
          <button className="primary-action" disabled={busy}>
            Freeze exact discussion copy
          </button>
        </form>
      </section>
      <section className="review-copies">
        <h3>Saved review copies</h3>
        <p className="review-provenance">
          Showing {copies.length} of {copyListing.totalStored || 0} copies in
          this fixed snapshot.
        </p>
        {copies.length ? (
          copies.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                void api<J>(`/api/client-work/${room.id}/copies/${c.id}`)
                  .then((v) => {
                    setSelected(v);
                    setCopyPage(0);
                  })
                  .catch((e) => setError(String(e)))
              }
            >
              <FileIcon />
              <span>
                <strong>{c.label}</strong>
                <small>
                  r{c.revision} · {c.reviewer} · {c.createdAt.slice(0, 10)}
                </small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))
        ) : (
          <p className="review-provenance">No immutable review copy yet.</p>
        )}
      </section>
      {copyListing.nextCursor != null && (
        <button className="quiet-action" onClick={() => void olderCopies()}>
          Load older review copies
        </button>
      )}
      {selected && (
        <div className="client-modal-shade">
          <section
            className="copy-inspector"
            role="dialog"
            aria-label={
              selected.reviewCopy.history
                ? "Archived workroom revision"
                : "Immutable discussion copy"
            }
          >
            <header>
              <div>
                <strong>
                  {selected.reviewCopy.label} · r{selected.reviewCopy.revision}
                </strong>
                <small>
                  {selected.reviewCopy.history
                    ? "Archived revision · not a reviewed copy"
                    : `Immutable review copy · self-attested by ${selected.reviewCopy.reviewer}`}
                </small>
              </div>
              <button
                aria-label="Close review copy"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </header>
            <p>{selected.reviewCopy.scope}</p>
            <div className="copy-navigation">
              <span>
                {selected.workroom.draft ? copyPage + 1 : 0} /{" "}
                {selected.workroom.draft?.slides.length || 0}
              </span>
              <button
                disabled={copyPage === 0}
                aria-label="Previous frozen page"
                onClick={() => setCopyPage(copyPage - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                disabled={
                  !selected.workroom.draft ||
                  copyPage >= selected.workroom.draft.slides.length - 1
                }
                aria-label="Next frozen page"
                onClick={() => setCopyPage(copyPage + 1)}
              >
                <ChevronRight size={17} />
              </button>
              <button
                className="quiet-action"
                onClick={() =>
                  exportJson(
                    `review-copy-${selected.reviewCopy.id}.json`,
                    selected,
                  )
                }
              >
                <Download size={14} /> Export exact review bundle
              </button>
            </div>
            {selected.workroom.draft &&
            selected.reviewCopy.renderContract === "client-decision/2" ? (
              <Page
                room={selected.workroom}
                slide={selected.workroom.draft.slides[copyPage]}
                index={copyPage}
                total={selected.workroom.draft.slides.length}
              />
            ) : (
              <p className="materials-warning">
                {!selected.workroom.draft
                  ? "This was a plan-only revision; no materials were claimed."
                  : "This record uses an earlier rendering contract. Inspect its exact JSON instead of presenting it with a different renderer."}
              </p>
            )}
            <details>
              <summary>Frozen decision and issues</summary>
              <pre>
                {JSON.stringify(
                  {
                    mandate: selected.workroom.mandate,
                    issues: selected.workroom.reviewIssues,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
function FileIcon() {
  return <span className="copy-file-icon">R</span>;
}

export function ProofDrawer({
  proof,
  onClose,
}: {
  proof: J;
  onClose: () => void;
}) {
  return (
    <div className="client-modal-shade proof-shade">
      <aside
        className="proof-inspector"
        role="dialog"
        aria-label="Figure evidence"
      >
        <header>
          <div>
            <span className="client-eyebrow">FIGURE ACCOUNTABILITY</span>
            <h2>{proof.label}</h2>
          </div>
          <button aria-label="Close figure evidence" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="proof-value">
          {proof.value?.toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
          <small>{proof.unit}</small>
        </div>
        <h3>How it was calculated</h3>
        <p className="proof-formula">{proof.formula}</p>
        <small>
          {proof.engine} · {proof.analysisId}
        </small>
        <h3>The actual inputs</h3>
        {proof.inputs.map((i: J, n: number) => (
          <article key={i.id || n}>
            <span className="state-badge">{i.classification}</span>
            <h4>{i.label}</h4>
            <strong>
              {i.value?.toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
              {i.unit}
            </strong>
            {i.reportedValue !== undefined && (
              <p>
                Reported: {i.reportedValue.toLocaleString()} {i.reportedUnit}
                <br />
                Period {i.periodStart ? `${i.periodStart} → ` : ""}
                {i.periodEnd} · filed {i.filed}
              </p>
            )}
            {i.rationale && (
              <p>
                {i.rationale}
                <br />
                {i.owner}. Range: {i.range}
              </p>
            )}
            {i.tag && (
              <p>
                <strong className="source-definition-label">
                  Retained fact context
                </strong>
                <br />
                CIK {i.cik} · accession {i.accession}
                <br />
                XBRL tag: <code className="visible-source-tag">{i.tag}</code>
                {i.definition && (
                  <>
                    <br />
                    {i.definition}
                  </>
                )}
              </p>
            )}
            {i.components?.length > 0 && (
              <div className="source-components">
                <small>Reported components of this total</small>
                {i.components.map((p: J, n: number) => (
                  <p key={n}>
                    {p.tag}: {p.value.toLocaleString()} {p.unit}
                    <br />
                    Period {p.periodEnd} · accession {p.accession}
                  </p>
                ))}
              </div>
            )}
            {i.date && (
              <p>
                Reference date {i.date}. {i.method}
              </p>
            )}
            {i.interpolationPoints && (
              <small>{JSON.stringify(i.interpolationPoints)}</small>
            )}
            {i.sourceUrl ? (
              <a href={i.sourceUrl} target="_blank" rel="noreferrer">
                {i.sourceDestination === "filing directory"
                  ? "Open filing directory (original documents)"
                  : "Open public rate source"}
              </a>
            ) : i.classification === "illustrative assumption" ? (
              <small>No market-source claim</small>
            ) : null}
            {i.conceptLinks?.map((link: J) => (
              <a
                key={link.tag}
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                SEC fact series · {link.tag}
              </a>
            ))}
            {i.conceptLinks?.length > 0 && (
              <small>
                Match the accession, units and period shown above. A
                company-concept series is not a page-level document anchor.
              </small>
            )}
            <code>{i.id}</code>
          </article>
        ))}
        <p className="review-provenance">{proof.limitation}</p>
        <button
          className="quiet-action"
          onClick={() => exportJson("figure-evidence.json", proof)}
        >
          <Download size={14} /> Export this calculation trace
        </button>
      </aside>
    </div>
  );
}
