import { useState } from "react";
import { Check } from "lucide-react";
type J = Record<string, any>;
type Act = (path: string, body: J) => Promise<any>;
export function WorkItem({
  item,
  room,
  act,
  busy,
  index,
}: {
  item: J;
  room: J;
  act: Act;
  busy: boolean;
  index: number;
}) {
  const [edit, setEdit] = useState(false);
  return (
    <article>
      <span className={`task-mark ${item.status}`}>
        {item.status === "complete" ? (
          <Check size={14} />
        ) : (
          String(index + 1).padStart(2, "0")
        )}
      </span>
      <div>
        <h3>{item.title}</h3>
        <p>{item.acceptance}</p>
        <small>
          {item.owner} ·{" "}
          {item.dependsOn.length
            ? "After " +
              item.dependsOn
                .map(
                  (id: string) =>
                    room.workItems.find((x: J) => x.id === id)?.title || id,
                )
                .join("; ")
            : "Starts here"}
        </small>
        {item.updateNote && <p className="task-note">{item.updateNote}</p>}
        {edit && (
          <form
            className="task-editor"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act(`/api/client-work/${room.id}/task`, {
                expectedRevision: room.revision,
                taskId: item.id,
                owner: f.get("owner"),
                acceptance: f.get("acceptance"),
                status: f.get("status"),
                note: f.get("note"),
              }).then((r) => {
                if (r) setEdit(false);
              });
            }}
          >
            <div className="brief-fields two">
              <label>
                Responsible person or workflow
                <input
                  name="owner"
                  required
                  minLength={2}
                  defaultValue={item.owner}
                />
              </label>
              <label>
                State
                <select name="status" defaultValue={item.status}>
                  {["planned", "ready", "blocked", "complete", "deferred"].map(
                    (v) => (
                      <option value={v} key={v}>
                        {v}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <label>
              Acceptance criterion
              <textarea
                name="acceptance"
                required
                minLength={10}
                defaultValue={item.acceptance}
              />
            </label>
            <label>
              Why is this being updated?
              <textarea name="note" required minLength={10} />
            </label>
            <button className="primary-action" disabled={busy}>
              Save task accountability
            </button>
          </form>
        )}
      </div>
      <div className="task-status-actions">
        <span className={`state-badge ${item.status}`}>{item.status}</span>
        <button className="quiet-action" onClick={() => setEdit(!edit)}>
          {edit ? "Close" : "Assign / update"}
        </button>
      </div>
    </article>
  );
}
export function ClientBriefEditor({
  room,
  act,
  busy,
}: {
  room: J;
  act: Act;
  busy: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const m = room.mandate;
  const [fundingNeed, setFundingNeed] = useState<number | string>(
    m.fundingNeed ?? "",
  );
  const fundingChanged =
    m.kind === "bond" && Number(fundingNeed) !== m.fundingNeed;
  return (
    <section className="brief-amend">
      <div className="section-heading">
        <div>
          <h3>The brief remains authoritative.</h3>
          <p>
            {m.decisionOwner} · {m.audience} · meeting {m.meetingDate}
          </p>
        </div>
        <button className="quiet-action" onClick={() => setEdit(!edit)}>
          {edit ? "Close" : "Amend brief"}
        </button>
      </div>
      {edit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act(`/api/client-work/${room.id}/brief`, {
              expectedRevision: room.revision,
              question: f.get("question"),
              audience: f.get("audience"),
              meetingDate: f.get("meetingDate"),
              criteria: f.get("criteria"),
              constraints: f.get("constraints"),
              owner: f.get("owner"),
              fundingNeed: m.kind === "bond" ? Number(fundingNeed) : null,
              fundingRequirementConfirmed: f.get("fundingConfirmed") === "on",
            }).then((r) => {
              if (r) setEdit(false);
            });
          }}
        >
          <label>
            Client decision
            <textarea
              name="question"
              maxLength={300}
              required
              minLength={20}
              defaultValue={m.question}
            />
          </label>
          <div className="brief-fields">
            <label>
              Decision owner / audience
              <input name="audience" required defaultValue={m.audience} />
            </label>
            <label>
              Meeting
              <input
                name="meetingDate"
                type="date"
                required
                defaultValue={m.meetingDate}
              />
            </label>
            <label>
              Responsible banker
              <input name="owner" required defaultValue={m.decisionOwner} />
            </label>
          </div>
          <div className="brief-fields two">
            {m.kind === "bond" && (
              <label>
                Required net funding (USDm)
                <input
                  aria-label="Amended net funding requirement"
                  name="fundingNeed"
                  type="number"
                  min="0.01"
                  max="100000"
                  step="any"
                  required
                  value={fundingNeed}
                  onChange={(e) => setFundingNeed(e.target.value)}
                />
              </label>
            )}
            <label>
              Decision criteria
              <textarea
                name="criteria"
                maxLength={300}
                required
                minLength={10}
                defaultValue={m.criteria}
              />
            </label>
            <label>
              Constraints and unknowns
              <textarea
                name="constraints"
                maxLength={300}
                required
                minLength={10}
                defaultValue={m.constraints}
              />
            </label>
          </div>
          <p className="review-provenance">
            This reopens advice and review. A changed net-funding requirement
            refreshes gaps using the same source snapshot and retained
            transaction terms; it does not resize either issue. The question is
            not automatically reinterpreted. Use new client work to change the
            company or financial method.
          </p>
          {fundingChanged && (
            <label className="confirmation">
              <input name="fundingConfirmed" type="checkbox" required />I
              reconciled the structured requirement with the client question. I
              will deliberately size any structure that should meet the new
              need.
            </label>
          )}
          <button className="primary-action" disabled={busy}>
            Save amended brief
          </button>
        </form>
      )}
    </section>
  );
}
