import { useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Monitor,
  X,
} from "lucide-react";
import { Page } from "./AgentStudio";
import { useRevisionDraft } from "./useRevisionDraft";
type J = Record<string, any>;
export function ClientMaterials({
  room,
  act,
  busy,
  page,
  onPage,
  onReview,
  onPlan,
}: {
  room: J;
  act: (path: string, body: J) => Promise<any>;
  busy: boolean;
  page: number;
  onPage: (v: number) => void;
  onReview: () => void;
  onPlan: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const slide = room.draft?.slides[page];
  const [buffer, setBuffer, clearBuffer] = useRevisionDraft(
    `materials:${room.id}:${slide?.id || "none"}`,
    room.revision,
    {
      open: false,
      title: slide?.title || "",
      prose: Object.fromEntries(
        (slide?.blocks || []).map((b: J, i: number) => [i, b.text || ""]),
      ) as Record<number, string>,
    },
  );
  const { open: edit, title, prose } = buffer;
  const setEdit = (open: boolean) => setBuffer((old) => ({ ...old, open }));
  const setTitle = (title: string) => setBuffer((old) => ({ ...old, title }));
  const setProse = (prose: Record<number, string>) =>
    setBuffer((old) => ({ ...old, prose }));
  useEffect(() => {
    const move = (e: KeyboardEvent) => {
      if (document.fullscreenElement !== stage.current) return;
      if (e.key === "ArrowRight" && page < room.draft.slides.length - 1)
        onPage(page + 1);
      if (e.key === "ArrowLeft" && page > 0) onPage(page - 1);
    };
    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, [page, room.draft]);
  if (!slide)
    return (
      <div className="empty-client">
        <h2>No materials claimed yet.</h2>
        <button className="primary-action" onClick={onPlan}>
          Review work plan
        </button>
      </div>
    );
  const patch = (operations: J[]) =>
    act(`/api/agent/rooms/${room.id}/patch`, {
      expectedRevision: room.revision,
      operations,
    }).then((r) => {
      if (r) onPage(r.draft.slides.findIndex((p: J) => p.id === slide.id));
    });
  return (
    <div className="client-materials">
      <div className="material-toolbar">
        <div>
          <strong>{room.draft.title}</strong>
          <span>
            {page + 1} / {room.draft.slides.length} · figures linked to active
            cases
          </span>
        </div>
        <div>
          <button disabled={busy} title="Review this page" onClick={onReview}>
            <MessageSquare size={15} />
          </button>
          <button
            title="Present; use arrow keys to move and Esc to exit"
            onClick={() => void stage.current?.requestFullscreen()}
          >
            <Monitor size={16} />
          </button>
          <button
            aria-label="Previous page"
            disabled={page === 0 || busy}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next page"
            disabled={page >= room.draft.slides.length - 1 || busy}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {room.documentUpgrade?.state === "requires_repreparation" && (
        <p className="materials-warning">
          This older document needs preparation under the current client-story
          contract: {room.documentUpgrade.reason}. Its original revision and
          copies remain preserved.
        </p>
      )}
      {room.mandate.decisionState === "review_required" && (
        <p className="materials-warning">
          Economics or brief changed. The prior banker view is invalidated;
          re-review advice and authored text before freezing.
        </p>
      )}
      <div className="material-edit-tools">
        <label>
          Composition
          <select
            aria-label="Page composition"
            value={slide.layout}
            disabled={busy}
            onChange={(e) =>
              void patch([
                { op: "set_layout", pageId: slide.id, layout: e.target.value },
              ])
            }
          >
            {["cover", "split", "full", "grid"].map((l) => (
              <option
                key={l}
                value={l}
                disabled={
                  slide.blocks.length > 1 &&
                  ["full", "cover"].includes(l) &&
                  slide.blocks.some((b: J) => b.type !== "text")
                }
              >
                {l}
              </option>
            ))}
          </select>
        </label>
        <button
          className="quiet-action"
          disabled={page === 0 || busy}
          onClick={() =>
            void patch([{ op: "move_page", pageId: slide.id, to: page - 1 }])
          }
        >
          Move page earlier
        </button>
        <button
          className="quiet-action"
          disabled={busy}
          onClick={() => setEdit(!edit)}
        >
          Edit authored text
        </button>
      </div>
      {edit && (
        <form
          className="page-text-editor"
          onSubmit={(e) => {
            e.preventDefault();
            const d = structuredClone(room.draft);
            d.slides[page].title = title;
            d.slides[page].blocks.forEach((b: J, i: number) => {
              if (b.type === "text") b.text = prose[i];
            });
            void act(`/api/agent/rooms/${room.id}/draft`, {
              expectedRevision: room.revision,
              draft: d,
            }).then((r) => {
              if (r) clearBuffer();
            });
          }}
        >
          <label>
            Page headline
            <input
              aria-label="Page headline"
              maxLength={130}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {slide.blocks.map((b: J, i: number) =>
            b.type === "text" ? (
              <label key={i}>
                Banker-authored narrative
                <textarea
                  aria-label={`Narrative block ${i + 1}`}
                  maxLength={650}
                  value={prose[i] || ""}
                  onChange={(e) => setProse({ ...prose, [i]: e.target.value })}
                />
              </label>
            ) : null,
          )}
          <p>
            Unsaved text stays with this page and revision while you inspect
            evidence. Cancel discards this page buffer. Financial figures remain
            bound. Change terms in Scenarios. The client-decision block reads
            your saved brief and conditional view; update those in Decision /
            Work plan.
          </p>
          <div className="review-buttons">
            <button className="primary-action" disabled={busy}>
              Save page revision
            </button>
            <button
              type="button"
              className="quiet-action"
              onClick={clearBuffer}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div ref={stage} className="client-canvas presentation-stage">
        <Page
          room={room as any}
          slide={slide}
          index={page}
          total={room.draft.slides.length}
        />
      </div>
      <div className="material-filmstrip">
        {room.draft.slides.map((p: J, i: number) => (
          <button
            key={p.id}
            className={page === i ? "active" : ""}
            disabled={busy}
            onClick={() => onPage(i)}
          >
            <small>{String(i + 1).padStart(2, "0")}</small>
            <strong>{p.title}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
