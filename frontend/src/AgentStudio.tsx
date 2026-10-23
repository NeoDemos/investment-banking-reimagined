import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  LayoutPanelLeft,
  Layers3,
  LoaderCircle,
  MessageSquare,
  Mic,
  Plus,
  Send,
  Settings2,
  Square,
  X,
} from "lucide-react";
import { api, setToken } from "./api";
import { format, INPUTS } from "./types";
import "./agent.css";
import {
  PlatformWorkspace,
  Playbooks,
  type Platform,
  type PlatformView,
} from "./PlatformWorkspace";
type J = Record<string, any>;
type Block = {
  type: string;
  text?: string;
  analysisId?: string;
  symbol?: string;
};
type Slide = { id: string; title: string; layout: string; blocks: Block[] };
type Draft = { title: string; slides: Slide[] };
type Room = {
  id: string;
  title: string;
  revision: number;
  messages: { role: string; text: string; at: string }[];
  draft: Draft | null;
  sources: J;
  analyses: J;
  history: J[];
  lastRunId?: string;
  scene?: J;
  contextPacket?: J;
  executionMode?: string;
  workflow?: { stages: { id: string; label: string; state: string }[] };
};
type RoomSummary = Pick<
  Room,
  "id" | "title" | "revision" | "draft" | "lastRunId" | "executionMode"
>;
type Run = {
  status: string;
  result: J;
  events: { seq: number; type: string; data: J; at: string }[];
};
const examples = [
  [
    "Financing discussion",
    "Prepare a concise PepsiCo bond financing discussion for the CFO. Illustrate a USD 500 million five-year issuance with a 125 bps assumed spread, 6.25% coupon and 50 bps fees. Retrieve public company financials and the Treasury curve automatically. Show pricing, a downside sensitivity and limitations. Propose the page design.",
  ],
  [
    "Capital returns",
    "Prepare a PepsiCo share buyback discussion for USD 500 million. Use USD 150 as an explicitly illustrative share price and 25% tax rate, not a market quote. Retrieve public accounts and Treasury rates automatically. Discuss EPS and funding trade-offs. Design a concise client narrative.",
  ],
  [
    "Peer acquisition",
    "Prepare a hypothetical PepsiCo acquisition of Campbell’s. Retrieve both companies’ public accounts and the Treasury curve. For an explicitly illustrative scenario assume 300 million target deal shares, USD 25 per share, 25% premium, USD 150 million annual synergies, 60% debt funding, 125 bps financing spread and 25% tax. Show economics, leverage, sensitivity and pre-PPA limitations. This is not an announced deal.",
  ],
];
const sourceLabel = (mode?: string) =>
  mode === "archive"
    ? "Frozen public archive"
    : mode === "cached"
      ? "Dated cache · refresh unavailable"
      : "Retrieved from public source";
const n = (v: number, unit: string) =>
  unit === "% EPS change"
    ? `${format(v, "%")} EPS`
    : unit === "% yield"
      ? `${format(v, "%")} yield`
      : unit === "years"
        ? `${v} years`
        : format(v, unit);
function download(name: string, content: string, type = "application/json") {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function Curve({ points }: { points: J[] }) {
  const max = Math.max(...points.map((p) => p.yield)) + 0.3;
  const min = Math.min(...points.map((p) => p.yield)) - 0.3;
  const xy = (p: J, i: number) =>
    `${28 + (i * 440) / (points.length - 1)},${140 - ((p.yield - min) / (max - min)) * 105}`;
  return (
    <div className="bound-chart">
      <svg
        viewBox="0 0 500 180"
        role="img"
        aria-label="Dated USD Treasury par yield curve"
      >
        <line x1="28" x2="468" y1="141" y2="141" stroke="#ddd" />
        <polyline
          points={points.map(xy).join(" ")}
          fill="none"
          stroke="#0058ff"
          strokeWidth="3"
        />
        {points.map((p, i) => (
          <g key={p.years}>
            <circle
              cx={28 + (i * 440) / (points.length - 1)}
              cy={140 - ((p.yield - min) / (max - min)) * 105}
              r="4"
              fill="#0058ff"
            />
            <text
              x={28 + (i * 440) / (points.length - 1)}
              y={162}
              textAnchor="middle"
            >
              {p.years}y
            </text>
            <text
              x={28 + (i * 440) / (points.length - 1)}
              y={128 - ((p.yield - min) / (max - min)) * 105}
              textAnchor="middle"
            >
              {p.yield.toFixed(2)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
function Table({ rows }: { rows: J[] }) {
  return (
    <div className="bound-table">
      {rows.map((r, i) => (
        <div key={i}>
          <span>{r.label}</span>
          <strong>{n(r.value, r.unit)}</strong>
        </div>
      ))}
    </div>
  );
}
export function BlockView({ block: b, room }: { block: Block; room: Room }) {
  const a = b.analysisId ? room.analyses[b.analysisId] : null;
  const m = a?.model;
  if (
    ["client_decision", "client_view", "client_conditions"].includes(b.type)
  ) {
    const r = room as any,
      d = r.mandate;
    const needsReview = ["review_required", "unrecorded"].includes(
      d.decisionState,
    );
    const chosen = needsReview
      ? "No current choice · banker review required"
      : d.preferredOption === "status_quo"
        ? "Defer / status quo"
        : d.preferredOption === "insufficient"
          ? "Insufficient evidence to choose"
          : r.options?.find((o: any) => o.id === d.preferredOption)?.name ||
            "No action recorded";
    const sections =
      b.type === "client_decision"
        ? [
            ["The client question", d.question],
            ["Conditional action", chosen],
          ]
        : b.type === "client_view"
          ? [
              ["The client’s decision criteria", d.criteria],
              [
                needsReview
                  ? "Prior rationale · requires re-review"
                  : "Banker’s conditional rationale",
                d.recommendation || "No conditional rationale recorded.",
              ],
            ]
          : [
              [
                "What could reverse the view?",
                d.reversalCondition || "No reversal condition recorded.",
              ],
              ["Constraints and unresolved questions", d.constraints],
            ];
    return (
      <div className="bound-client-decision">
        <small>
          BANKER-AUTHORED SUMMARIES ·{" "}
          {needsReview ? "REVIEW REQUIRED" : "CONDITIONAL DISCUSSION VIEW"}
        </small>
        {sections.map(([label, value]) => (
          <section key={label}>
            <h3>{label}</h3>
            <p>{value}</p>
          </section>
        ))}
        <small>
          Complete summary fields · public-data rehearsal · no market-execution
          approval
        </small>
      </div>
    );
  }
  if (b.type === "decision_comparison") {
    const r = room as any,
      opts = (r.options || []).map((o: any) => ({
        ...o,
        a: r.analyses[o.analysisId],
      }));
    if (opts.length !== 2)
      return (
        <p>
          Prepare the current client alternatives before presenting the
          comparison.
        </p>
      );
    const base = opts[0].a,
      kind = base.kind;
    const value = (a: any, key: string) => a.lineage?.[key]?.value;
    const rowValues = (a: any) =>
      kind === "bond"
        ? [
            value(a, "netProceeds"),
            value(a, "fundingGap"),
            value(a, "postUseLeverage"),
          ]
        : kind === "buyback"
          ? [
              value(a, "cashReturned"),
              value(a, "eps"),
              value(a, "remainingCash"),
            ]
          : [value(a, "equity"), value(a, "eps"), value(a, "leverage")];
    const headings =
      kind === "bond"
        ? ["Net proceeds", "Unfunded need", "Net leverage after use¹"]
        : kind === "buyback"
          ? ["Cash returned", "Illustrative EPS", "Remaining cash"]
          : ["Equity cheque", "EPS before PPA", "Net leverage¹"];
    const units =
      kind === "bond"
        ? ["USDm", "USDm", "x"]
        : kind === "buyback"
          ? ["USDm", "USD/share", "USDm"]
          : ["USDm", "USD/share", "x"];
    const baseline =
      kind === "bond"
        ? [0, r.mandate.fundingNeed, base.model.references.baseLeverage]
        : kind === "buyback"
          ? [
              0,
              base.model.references.baseEPS,
              value(base, "remainingCash") + base.params.amount,
            ]
          : [
              0,
              base.model.references.baseEPS,
              base.model.references.baseLeverage,
            ];
    const f = (x: any, u: string) =>
      x == null ? "Not specified" : format(x, u);
    return (
      <div className="bound-decision-comparison">
        {kind === "bond" && (
          <p>
            Required net funding:{" "}
            <strong>{f(r.mandate.fundingNeed, "USDm")}</strong>. A shortfall
            remains unfunded.
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>Management action</th>
              {headings.map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opts.map((o: any) => (
              <tr key={o.id}>
                <th>
                  {o.name}
                  {kind === "bond" ? (
                    <small>
                      {o.a.params.tenor}-year horizon ·{" "}
                      {f(value(o.a, "yield"), "%")} illustrative yield
                      <br />
                      {f(value(o.a, "fees"), "USDm")} fees ·{" "}
                      {f(value(o.a, "interest"), "USDm")} annual coupon cash
                      cost
                    </small>
                  ) : kind === "acquisition" ? (
                    <small>
                      {o.a.params.debtPercent}% debt funding · same
                      consideration
                    </small>
                  ) : (
                    <small>Illustrative cash-funded repurchase</small>
                  )}
                </th>
                {rowValues(o.a).map((x: any, i: number) => (
                  <td key={i}>{f(x, units[i])}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th>
                Defer / status quo
                <small>
                  {kind === "bond"
                    ? "Funding requirement unresolved"
                    : "No modeled transaction"}
                </small>
              </th>
              {baseline.map((x: any, i: number) => (
                <td key={i}>{f(x, units[i])}</td>
              ))}
            </tr>
          </tbody>
        </table>
        {kind === "acquisition" && (
          <div className="bound-stress-pairs">
            {r.stresses?.map((s: any) => {
              const a = r.analyses[s.analysisId];
              return (
                <p key={s.id}>
                  <strong>{s.name}</strong>
                  <br />
                  EPS {f(value(a, "eps"), "USD/share")} · net leverage{" "}
                  {f(value(a, "leverage"), "x")}. All other terms match that
                  action.
                </p>
              );
            })}
          </div>
        )}
        <small>
          ¹ EBITDA is reported operating income + D&A, not adjusted/covenant
          EBITDA. Bond leverage assumes proceeds deployed. Historical annual
          accounts; all deal terms illustrative. Coupon is not all-in financing
          cost. No current quote, rating or execution assessment.
        </small>
      </div>
    );
  }
  if (b.type === "text") return <p className="draft-prose">{b.text}</p>;
  if (b.type === "metrics")
    return (
      <div className="bound-metrics">
        {a.displayName && <h3 className="metric-case-name">{a.displayName}</h3>}
        {m.metrics.slice(0, 4).map((x: J) => (
          <div key={x.key}>
            <small>{x.label}</small>
            <strong>{n(x.value, x.unit)}</strong>
          </div>
        ))}
      </div>
    );
  if (b.type === "facts") {
    const c = room.sources[`sec:${b.symbol}`];
    return (
      <div>
        <h3>
          {c.name} <small>FY {c.fiscalYear}</small>
        </h3>
        <Table
          rows={[
            "revenue",
            "operatingIncome",
            "netIncome",
            "cash",
            "debt",
            "shares",
          ].map((k) => ({
            label: k.replace(/([A-Z])/g, " $1"),
            value: c.facts[k].value / 1e6,
            unit: k === "shares" ? "m shares" : "USDm",
          }))}
        />
        <small className="source-line">
          Reported annual US GAAP · period ended {c.periodEnd}
        </small>
      </div>
    );
  }
  if (b.type === "assumptions")
    return (
      <div className="assumptions-block">
        <h3>Scenario assumptions</h3>
        <Table
          rows={Object.entries(a.params).map(([k, v]) => ({
            label: INPUTS[k]?.[0] || k,
            value: v,
            unit: INPUTS[k]?.[1] || "",
          }))}
        />
        <p>{a.assumptionRationale}</p>
      </div>
    );
  if (b.type === "workings") return <Table rows={m.workings.slice(0, 7)} />;
  if (b.type === "sensitivity") {
    const ss = m.sensitivity;
    const max = Math.max(...ss.map((x: J) => Math.abs(x.value)), 1);
    return (
      <div className="sensitivity-block">
        <h3>Scenario sensitivity</h3>
        {ss.map((x: J) => (
          <div className="bar-row" key={x.label}>
            <span>{x.label}</span>
            <i
              style={{
                width: `${Math.max(2, (Math.abs(x.value) / max) * 48)}%`,
              }}
            />
            <strong>{n(x.value, x.unit || "%")}</strong>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "chart") {
    if (m.chart.points)
      return (
        <div>
          <h3>USD Treasury par curve</h3>
          <Curve points={m.chart.points} />
          <small className="source-line">
            Observation {a.sourceSnapshot.curve.date} · indicative reference
          </small>
        </div>
      );
    const rows = m.chart.items || [];
    const max = Math.max(...rows.map((x: J) => x.value), 1);
    return (
      <div>
        <h3>{m.chart.label}</h3>
        {rows.map((x: J) => (
          <div className="bar-row" key={x.label}>
            <span>{x.label}</span>
            <i style={{ width: `${Math.max(1, (x.value / max) * 45)}%` }} />
            <strong>
              {x.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </strong>
          </div>
        ))}
      </div>
    );
  }
  if (b.type === "sources")
    return (
      <div className="draft-sources">
        {Object.entries(room.sources).map(([id, c]: [string, any]) => (
          <div key={id}>
            <strong>{c.name || "U.S. Treasury"}</strong>
            <span>
              {c.periodEnd
                ? `Annual accounts · period ended ${c.periodEnd}`
                : `USD par curve · ${c.date}`}
            </span>
            <span
              className={c.provenance?.mode === "cached" ? "cache-label" : ""}
            >
              {sourceLabel(c.provenance?.mode)} ·{" "}
              {c.provenance?.retrievedAt?.slice(0, 10) ||
                c.provenance?.original?.retrievedAt?.slice(0, 10) ||
                "snapshot"}
            </span>
          </div>
        ))}
        <p>
          Illustrative analysis. All transaction terms are assumptions.
          Qualified banker review is required; current market and execution
          terms remain unconfirmed.
        </p>
      </div>
    );
  return null;
}
export function Page({
  slide,
  room,
  index,
  total,
}: {
  slide: Slide;
  room: Room;
  index: number;
  total: number;
}) {
  const cached = Object.values(room.sources).some(
    (c: any) => c.provenance?.mode !== "retrieved",
  );
  const scene = room.scene?.pages?.find((p: J) => p.id === slide.id);
  return (
    <article className={`agent-page layout-${slide.layout}`}>
      <header>
        <span>{room.draft?.title}</span>
        <img src="/rabobank-wordmark.svg" alt="Rabobank" />
      </header>
      <div className="page-heading">
        <span className="page-kicker">
          CLIENT DISCUSSION · EXTERNAL PROTOTYPE
        </span>
        <h2>{slide.title}</h2>
        <i />
      </div>
      <div className={`page-blocks ${scene ? "scene-composition" : ""}`}>
        {slide.blocks.map((b, i) => (
          <div
            className={`page-block block-${b.type}`}
            key={i}
            data-frame-id={scene?.frames[i]?.id}
            style={
              scene
                ? {
                    left: `${scene.frames[i].bounds.x * 100}%`,
                    top: `${scene.frames[i].bounds.y * 100}%`,
                    width: `${scene.frames[i].bounds.width * 100}%`,
                    height: `${scene.frames[i].bounds.height * 100}%`,
                  }
                : undefined
            }
          >
            <BlockView block={b} room={room} />
          </div>
        ))}
      </div>
      <footer>
        <span>
          {cached ? "Dated public archive / cache" : "Public source data"} ·
          Illustrative assumptions · Subject to review
        </span>
        <span>
          {index + 1} / {total}
        </span>
      </footer>
    </article>
  );
}
export default function AgentStudio() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]),
    [room, setRoom] = useState<Room | null>(null),
    [prompt, setPrompt] = useState(""),
    [runId, setRunId] = useState(""),
    [run, setRun] = useState<Run | null>(null),
    [page, setPage] = useState(0),
    [tab, setTab] = useState("draft"),
    [provider, setProvider] = useState("deferred"),
    [section, setSection] = useState<PlatformView>("workroom"),
    [platform, setPlatform] = useState<Platform | null>(null),
    [previewBusy, setPreviewBusy] = useState(false),
    [cache, setCache] = useState(true),
    [local, setLocal] = useState(false),
    [ai, setAi] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [settings, setSettings] = useState(false),
    [key, setKey] = useState(""),
    [inspect, setInspect] = useState(false),
    [edit, setEdit] = useState(false),
    [editTitle, setEditTitle] = useState(""),
    [edits, setEdits] = useState<Record<number, string>>({}),
    [meeting, setMeeting] = useState(false),
    [notes, setNotes] = useState<
      { page: number; pageId: string; revision: number; text: string }[]
    >([]),
    [recording, setRecording] = useState(false),
    [transcribing, setTranscribing] = useState(false),
    [notice, setNotice] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    media = useRef<MediaStream | null>(null),
    chunks = useRef<Blob[]>([]),
    alive = useRef(true),
    messagesEnd = useRef<HTMLDivElement>(null);
  const active = runId && (!run || run.status === "running");
  const loadRooms = async () => {
    const v = await api<{ rooms: RoomSummary[]; localClaude: boolean }>(
      "/api/agent/rooms",
    );
    setRooms(v.rooms);
    setLocal(v.localClaude);
    return v.rooms;
  };
  useEffect(() => {
    alive.current = true;
    void (async () => {
      try {
        const b = await api<J>("/api/bootstrap");
        setToken(b.token);
        setAi(false);
        setPlatform(await api<Platform>("/api/architecture"));
        const rr = await loadRooms();
        const hash = location.hash.match(/^#workroom\/(.+)$/);
        if (hash) {
          const found = rr.find((r) => r.id === hash[1]);
          setRoom(
            found ? await api<Room>(`/api/agent/rooms/${found.id}`) : null,
          );
          if (found?.lastRunId)
            setRun(await api<Run>(`/api/agent/runs/${found.lastRunId}`));
        }
        const pending = sessionStorage.getItem("draftingRun");
        if (pending) {
          const p = JSON.parse(pending);
          setRunId(p.runId);
          const r = rr.find((r) => r.id === p.roomId);
          if (r) setRoom(await api<Room>(`/api/agent/rooms/${r.id}`));
        }
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
    return () => {
      alive.current = false;
      media.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [room?.messages.length, run?.events.length]);
  useEffect(() => {
    if (!runId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await api<Run>(`/api/agent/runs/${runId}`);
        if (stop) return;
        setRun(r);
        if (r.status === "running") {
          timer = setTimeout(poll, 1300);
        } else {
          sessionStorage.removeItem("draftingRun");
          const rr = await loadRooms();
          const id = r.result.roomId || room?.id;
          if (id) {
            const next = rr.find((x) => x.id === id);
            if (next) setRoom(await api<Room>(`/api/agent/rooms/${next.id}`));
          }
          if (r.status === "failed")
            setError(
              r.result.error || "Drafting failed; saved draft preserved.",
            );
          else setNotice(r.result.message || `Run ${r.status}`);
          setRunId("");
          if (r.status === "completed") {
            setPage(0);
            setTab("draft");
          }
        }
      } catch (e) {
        if (!stop) {
          setError(String(e));
          timer = setTimeout(poll, 4000);
        }
      }
    };
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [runId]);
  const open = async (r: Room | RoomSummary) => {
    if (active) return;
    try {
      const full: Room =
        "messages" in r
          ? (r as Room)
          : await api<Room>(`/api/agent/rooms/${r.id}`);
      setSection("workroom");
      setRoom(full);
      setTab("draft");
      setPage(0);
      setRun(null);
      if (full.lastRunId)
        setRun(await api<Run>(`/api/agent/runs/${full.lastRunId}`));
      setEdit(false);
      setNotes([]);
      location.hash = `workroom/${full.id}`;
    } catch (e) {
      setError(String(e));
    }
  };
  const send = async (text = prompt) => {
    if (active || !text.trim()) return false;
    setError("");
    try {
      const r = await api<Room>("/api/agent/briefs", {
        roomId: room?.id || null,
        expectedRevision: room?.revision ?? null,
        prompt: text,
      });
      setRoom(r);
      setPrompt("");
      setRun(null);
      await loadRooms();
      location.hash = `workroom/${r.id}`;
      setNotice(
        "Brief saved. Model integration is deferred; local blueprints exercise the complete data-to-materials path.",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  const runBlueprint = async (
    kind: string,
    issuer: string,
    target?: string,
  ) => {
    if (previewBusy) return;
    setPreviewBusy(true);
    setError("");
    try {
      const r = await api<Room>("/api/workflows/preview", {
        kind,
        issuer,
        target: target || null,
      });
      await loadRooms();
      await open(r);
      setInspect(false);
      if (r.lastRunId) setRun(await api<Run>(`/api/agent/runs/${r.lastRunId}`));
      setNotice(
        "Local workflow complete: MCP tools, pinned evidence, Rust analysis and scene compilation. No model or external API used.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreviewBusy(false);
    }
  };
  const applyPagePatch = async (operations: unknown[]) => {
    if (!room) return;
    setError("");
    try {
      const r = await api<Room>(`/api/agent/rooms/${room.id}/patch`, {
        expectedRevision: room.revision,
        operations,
      });
      const selected = room.draft?.slides[page]?.id;
      setRoom(r);
      if (selected) {
        const next = r.draft?.slides.findIndex((p) => p.id === selected);
        if (next !== undefined && next >= 0) setPage(next);
      }
      await loadRooms();
    } catch (e) {
      setError(String(e));
    }
  };
  const slide =
    room?.draft?.slides[Math.min(page, (room.draft?.slides.length || 1) - 1)];
  const record = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    setError("");
    try {
      media.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      chunks.current = [];
      const r = new MediaRecorder(media.current);
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      r.onstop = async () => {
        media.current?.getTracks().forEach((t) => t.stop());
        setTranscribing(true);
        try {
          const f = new FormData();
          f.append(
            "audio",
            new Blob(chunks.current, { type: r.mimeType }),
            "review.webm",
          );
          const v = await api<J>("/api/transcribe", f);
          setPrompt((p) => `${p}${p ? " " : ""}${v.text}`);
        } catch (e) {
          setError(String(e));
        } finally {
          if (alive.current) setTranscribing(false);
        }
      };
      r.start();
      setRecording(true);
    } catch (e) {
      setError(String(e));
    }
  };
  const saveEdit = async () => {
    if (!room?.draft || !slide) return;
    const d = structuredClone(room.draft);
    d.slides[page].title = editTitle;
    Object.entries(edits).forEach(
      ([i, text]) => (d.slides[page].blocks[+i].text = text),
    );
    try {
      setRoom(
        await api<Room>(`/api/agent/rooms/${room.id}/draft`, {
          expectedRevision: room.revision,
          draft: d,
        }),
      );
      setEdit(false);
      await loadRooms();
    } catch (e) {
      setError(String(e));
    }
  };
  const addNote = () => {
    if (!prompt.trim()) return;
    setNotes((ns) => [
      ...ns,
      {
        page: page + 1,
        pageId: slide?.id || "brief",
        revision: room?.revision || 0,
        text: prompt.trim(),
      },
    ]);
    setPrompt("");
  };
  if (!ready)
    return (
      <main className="startup">
        <img width="150" src="/rabobank-wordmark.svg" alt="Rabobank" />
        <p>{error || "Opening your local workroom…"}</p>
      </main>
    );
  return (
    <div className="agent-shell">
      <aside className="agent-sidebar">
        <div className="studio-brand">
          <img src="/rabobank-wordmark.svg" alt="Rabobank" />
          <span>Investment Banking Studio</span>
        </div>
        <button
          className="new-workroom"
          disabled={!!active}
          onClick={() => {
            setSection("workroom");
            setRoom(null);
            setPage(0);
            setRun(null);
            setPrompt("");
            setNotes([]);
            location.hash = "";
          }}
        >
          <Plus size={17} />
          New discussion
        </button>
        <div className="platform-navigation">
          {(
            [
              ["connections", "Data connections", Database],
              ["library", "Materials library", FileText],
              ["architecture", "Architecture", LayoutPanelLeft],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              className={section === id ? "selected" : ""}
              key={id}
              onClick={() => setSection(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <span className="nav-caption">YOUR WORKROOMS</span>
        <nav>
          {rooms.map((r) => (
            <button
              className={room?.id === r.id ? "selected" : ""}
              disabled={!!active}
              key={r.id}
              onClick={() => open(r)}
            >
              <MessageSquare size={16} />
              <span>{r.title}</span>
              {!!r.draft && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <span className="status-dot" />
            Local public workspace
          </div>
          <button onClick={() => setSettings(true)}>
            <Settings2 size={16} /> Platform & design
          </button>
          <p>
            Independent external prototype
            <br />
            Public information only
          </p>
        </div>
      </aside>
      <main className="agent-main">
        <header className="agent-topbar">
          <div>
            <span>Corporate Finance</span>
            <ChevronRight size={13} />
            <strong>
              {section === "workroom"
                ? room
                  ? "Client workroom"
                  : "New discussion"
                : section === "connections"
                  ? "Data connections"
                  : section === "library"
                    ? "Materials library"
                    : "Architecture"}
            </strong>
          </div>
          <div>
            <span className="phase-label">Local architecture preview</span>
            <span className="draft-status">
              {active
                ? "Agent working"
                : room?.draft
                  ? `Draft · revision ${room.revision}`
                  : run?.status === "failed"
                    ? "Connection failed"
                    : "Ready to begin"}
            </span>
            {room && (
              <button
                title="Export full inspection record"
                onClick={() =>
                  download(
                    `workroom-${room.id}.json`,
                    JSON.stringify(room, null, 2),
                  )
                }
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={() => setSettings(true)}
              aria-label="Open settings"
            >
              <Settings2 size={17} />
            </button>
            <span className="avatar">DT</span>
          </div>
        </header>
        {section !== "workroom" ? (
          <PlatformWorkspace
            view={section}
            platform={platform}
            rooms={rooms}
            onOpen={(id) => {
              const r = rooms.find((r) => r.id === id);
              if (r) open(r);
            }}
            onRun={runBlueprint}
            busy={previewBusy}
          />
        ) : !room ? (
          <section className="agent-welcome">
            <span className="eyebrow">
              FROM CONVERSATION TO CLIENT MATERIALS
            </span>
            <h1>What are we preparing for the client?</h1>
            <p>
              Capture the client decision, explore connected evidence and
              inspect the analysis
              <br />
              and dynamically composed materials. Model connections come next.
            </p>
            <div className="brief-composer">
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="We’re meeting PepsiCo’s CFO. Help us frame the financing options…"
                aria-label="Banker brief"
              />
              <div>
                <span>
                  <Database size={15} /> SEC financials · US Treasury
                </span>
                <button
                  className="send-brief"
                  disabled={!prompt.trim()}
                  onClick={() => void send()}
                >
                  Save brief <ArrowRight size={17} />
                </button>
              </div>
            </div>
            <Playbooks onRun={runBlueprint} busy={previewBusy} />
            <div className="welcome-connections">
              <span className="status-dot" />
              Public archive ready · sources retain dates and units
              <span>Live data and model connections are deferred.</span>
            </div>
          </section>
        ) : (
          <div className="workroom-body">
            <section className="banker-conversation">
              <div className="conversation-heading">
                <span className="eyebrow">THE DISCUSSION</span>
                <h2>{room.draft?.title || "Developing the brief"}</h2>
                <p>Brief → sources → financial tools → materials</p>
              </div>
              {room.workflow && (
                <div className="workflow-strip">
                  {room.workflow.stages.map((stage) => (
                    <span key={stage.id} className={stage.state}>
                      {stage.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="conversation-scroll">
                {room.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`conversation-message role-${m.role}`}
                  >
                    <span className="message-role">
                      {m.role === "banker"
                        ? "YOU"
                        : m.role === "system"
                          ? "WORKFLOW"
                          : "STUDIO AGENT"}
                    </span>
                    <p>{m.text}</p>
                  </div>
                ))}
                {run && (
                  <div className="run-summary">
                    <div>
                      <span
                        className={active ? "status-dot pulse" : "status-dot"}
                      />
                      <strong>
                        {active
                          ? "Building the discussion"
                          : run.status.replace("_", " ")}
                      </strong>
                      {active && <LoaderCircle size={15} className="spin" />}
                    </div>
                    <button onClick={() => setInspect(!inspect)}>
                      {inspect ? "Hide" : "Inspect"} execution ·{" "}
                      {run.events.filter((e) => e.type === "tool_call").length}{" "}
                      tools
                    </button>
                    {inspect && (
                      <ol className="execution-trace">
                        {run.events
                          .filter((e) =>
                            [
                              "tool_call",
                              "tool_result",
                              "tool_error",
                              "error",
                            ].includes(e.type),
                          )
                          .map((e) => (
                            <li
                              key={e.seq}
                              className={
                                e.type === "tool_error" || e.type === "error"
                                  ? "trace-error"
                                  : ""
                              }
                            >
                              {e.type === "tool_call" ? (
                                <LoaderCircle size={12} />
                              ) : (
                                <Check size={12} />
                              )}
                              <details>
                                <summary>
                                  {e.data.tool?.replaceAll("_", " ") ||
                                    "Run error"}
                                  {e.type === "tool_result"
                                    ? " · complete"
                                    : e.type === "tool_error"
                                      ? " · needs correction"
                                      : ""}
                                </summary>
                                <pre>{JSON.stringify(e.data, null, 2)}</pre>
                              </details>
                            </li>
                          ))}
                      </ol>
                    )}
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
              {meeting && (
                <div className="meeting-notes">
                  <strong>Page-by-page review · {notes.length} notes</strong>
                  <span>
                    Discuss the selected page, record a note, then apply the
                    review.
                  </span>
                  {notes.map((n, i) => (
                    <div key={i}>
                      Page {n.page} · {n.text}
                    </div>
                  ))}
                  <button
                    disabled={!notes.length || !!active}
                    onClick={async () => {
                      const submitted = await send(
                        `Apply these review notes to the existing draft. Preserve unaffected pages and source links. ${notes.map((n) => `Page id ${n.pageId} (page ${n.page}, captured revision ${n.revision}): ${n.text}`).join("\n")}`,
                      );
                      if (submitted) {
                        setNotes([]);
                        setMeeting(false);
                      }
                    }}
                  >
                    Save review brief <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <div className="conversation-compose">
                <textarea
                  value={prompt}
                  disabled={!!active}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    meeting
                      ? `Feedback on page ${page + 1}…`
                      : "Ask for another angle, a new analysis, or a change to a page…"
                  }
                  aria-label="Follow-up instruction"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      meeting ? addNote() : void send();
                    }
                  }}
                />
                <div>
                  <button
                    className={recording ? "recording" : ""}
                    title={
                      ai
                        ? "Record audio and transcribe using OpenAI"
                        : "Voice connections are deferred to the next phase"
                    }
                    disabled={!ai || !!active || transcribing}
                    onClick={() => void record()}
                    aria-label={
                      recording ? "Stop recording" : "Record review note"
                    }
                  >
                    {recording ? <Square size={16} /> : <Mic size={16} />}
                  </button>
                  <span>
                    {recording
                      ? "Recording…"
                      : transcribing
                        ? "Transcribing…"
                        : meeting
                          ? `Reviewing page ${page + 1}`
                          : "⌘ Enter to send"}
                  </span>
                  {active ? (
                    <button
                      aria-label="Cancel drafting run"
                      onClick={() =>
                        void api(`/api/agent/runs/${runId}/cancel`, {}).catch(
                          (e) => setError(String(e)),
                        )
                      }
                    >
                      <Square size={15} />
                    </button>
                  ) : (
                    <button
                      className="send-icon"
                      disabled={!prompt.trim()}
                      aria-label={
                        meeting ? "Add page review note" : "Save follow-up"
                      }
                      onClick={() => (meeting ? addNote() : void send())}
                    >
                      <Send size={15} />
                    </button>
                  )}
                </div>
              </div>
            </section>
            <section className="materials-workbench">
              <div className="workbench-tabs">
                <div>
                  {[
                    ["draft", "Materials", LayoutPanelLeft],
                    ["analysis", "Analysis", FileText],
                    ["sources", "Sources", Database],
                    ["context", "Context", Layers3],
                  ].map(([id, title, Icon]) => (
                    <button
                      key={id as string}
                      className={tab === id ? "active" : ""}
                      onClick={() => setTab(id as string)}
                    >
                      {typeof Icon !== "string" && <Icon size={15} />}{" "}
                      {title as string}
                    </button>
                  ))}
                </div>
                <button
                  disabled={!room.draft || !!active}
                  className={meeting ? "meeting-active" : ""}
                  onClick={() => setMeeting(!meeting)}
                >
                  <MessageSquare size={14} />
                  {meeting ? "End review" : "Review together"}
                </button>
              </div>
              {tab === "draft" ? (
                slide ? (
                  <>
                    <div className="page-controls">
                      <span>
                        {page + 1} of {room.draft!.slides.length} pages ·{" "}
                        {slide.layout} composition
                      </span>
                      <div className="scene-tools">
                        <label>
                          Composition{" "}
                          <select
                            aria-label="Page composition"
                            value={slide.layout}
                            onChange={(e) =>
                              void applyPagePatch([
                                {
                                  op: "set_layout",
                                  pageId: slide.id,
                                  layout: e.target.value,
                                },
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
                                  slide.blocks.some((b) => b.type !== "text")
                                }
                              >
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          aria-label="Move page earlier"
                          disabled={page === 0}
                          onClick={() =>
                            void applyPagePatch([
                              {
                                op: "move_page",
                                pageId: slide.id,
                                to: page - 1,
                              },
                            ])
                          }
                        >
                          Move earlier
                        </button>
                        <button
                          disabled={!!active}
                          onClick={() => {
                            setEdit(!edit);
                            setEditTitle(slide.title);
                            setEdits(
                              Object.fromEntries(
                                slide.blocks.map((b, i) => [i, b.text || ""]),
                              ),
                            );
                          }}
                        >
                          Edit page
                        </button>
                        <button
                          disabled={!page}
                          onClick={() => {
                            setPage((p) => p - 1);
                            setEdit(false);
                          }}
                          aria-label="Previous page"
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <button
                          disabled={page === room.draft!.slides.length - 1}
                          onClick={() => {
                            setPage((p) => p + 1);
                            setEdit(false);
                          }}
                          aria-label="Next page"
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="page-stage">
                      <Page
                        slide={slide}
                        room={room}
                        index={page}
                        total={room.draft!.slides.length}
                      />
                    </div>
                    <div className="page-filmstrip">
                      {room.draft!.slides.map((p, i) => (
                        <button
                          className={page === i ? "active" : ""}
                          key={p.id}
                          onClick={() => {
                            setPage(i);
                            setEdit(false);
                          }}
                        >
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <strong>{p.title}</strong>
                          <small>
                            {p.blocks.map((b) => b.type).join(" · ")}
                          </small>
                        </button>
                      ))}
                    </div>
                    {edit && (
                      <div className="page-editor">
                        <div>
                          <h3>Edit page narrative</h3>
                          <button
                            onClick={() => setEdit(false)}
                            aria-label="Close page editor"
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <label>
                          Headline
                          <input
                            value={editTitle}
                            maxLength={130}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        </label>
                        {slide.blocks.map(
                          (b, i) =>
                            b.type === "text" && (
                              <label key={i}>
                                Narrative · numbers remain in bound data blocks
                                <textarea
                                  value={edits[i] || ""}
                                  maxLength={650}
                                  onChange={(e) =>
                                    setEdits((x) => ({
                                      ...x,
                                      [i]: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                            ),
                        )}
                        <button
                          className="send-brief"
                          onClick={() => void saveEdit()}
                        >
                          Save page revision <Check size={15} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-materials">
                    <LayoutPanelLeft size={36} />
                    <h2>
                      {active
                        ? "Your discussion is taking shape"
                        : "The canvas starts with the brief"}
                    </h2>
                    <p>
                      {active
                        ? "The agent will retrieve evidence, calculate the scenario and compose the pages here."
                        : "Your brief is saved for the next model-enabled phase. Explore a local workflow from Data connections to inspect the complete evidence-to-materials path now."}
                    </p>
                    {active && <LoaderCircle className="spin" size={23} />}
                  </div>
                )
              ) : tab === "context" ? (
                <div className="inspection-panel context-panel">
                  <h2>Context for the assignment</h2>
                  <p>
                    The workflow selects evidence and financial outputs before a
                    model sees the task. Source records retain their units,
                    periods and citation identities.
                  </p>
                  {room.contextPacket ? (
                    <>
                      <div className="packet-counts">
                        <span>
                          {room.contextPacket.observations.length} evidence
                          records
                        </span>
                        <span>
                          {
                            Object.keys(room.contextPacket.citationManifest)
                              .length
                          }{" "}
                          citations
                        </span>
                        <span>
                          {room.contextPacket.omittedEvidenceIds.length} omitted
                          by budget
                        </span>
                      </div>
                      <p>{room.contextPacket.task}</p>
                      {room.contextPacket.observations.map((o: J) => (
                        <div className="evidence-row" key={o.id}>
                          <strong>
                            {o.symbol} · {o.metric}
                          </strong>
                          <span>
                            {n(o.normalized.value, o.normalized.unit)}
                          </span>
                          <small>
                            Annual period {o.period.end} · filed {o.publishedAt}
                          </small>
                          <small>
                            Reported: {o.reported.value.toLocaleString()}{" "}
                            {o.reported.unit}
                          </small>
                          <a
                            href={o.source.uri}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {o.source.tag} ↗
                          </a>
                          <small>{o.source.basis}</small>
                        </div>
                      ))}
                      <details>
                        <summary>Inspect bounded context contract</summary>
                        <pre>{JSON.stringify(room.contextPacket, null, 2)}</pre>
                      </details>
                    </>
                  ) : (
                    <p>
                      Run a local workflow to assemble a bounded evidence
                      packet. A saved brief does not invent supporting data.
                    </p>
                  )}
                </div>
              ) : tab === "analysis" ? (
                <div className="inspection-panel">
                  <h2>The financial record</h2>
                  <p>
                    Calculated in Rust from a pinned source snapshot. Each
                    scenario keeps its own inputs and sources.
                  </p>
                  {!Object.keys(room.analyses).length && (
                    <p>No calculations yet.</p>
                  )}
                  {Object.entries(room.analyses).map(
                    ([id, a]: [string, any]) => (
                      <section key={id}>
                        <span className="eyebrow">
                          {a.kind} · {a.issuer}{" "}
                          {a.target ? `/ ${a.target}` : ""}
                        </span>
                        <h3>{a.model.title}</h3>
                        <BlockView
                          room={room}
                          block={{ type: "metrics", analysisId: id }}
                        />
                        <h4>Assumption rationale</h4>
                        <p>{a.assumptionRationale}</p>
                        <details>
                          <summary>Inputs, formulas and full result</summary>
                          <pre>{JSON.stringify(a, null, 2)}</pre>
                        </details>
                        <ul>
                          {a.model.warnings.map((w: string) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                        <button
                          onClick={() =>
                            download(
                              `${id}-workings.csv`,
                              "Label,Value,Unit,Formula\n" +
                                a.model.workings
                                  .map((r: J) =>
                                    [r.label, r.value, r.unit, r.formula]
                                      .map(
                                        (x) =>
                                          '"' +
                                          String(x).replaceAll('"', '""') +
                                          '"',
                                      )
                                      .join(","),
                                  )
                                  .join("\n"),
                              "text/csv",
                            )
                          }
                        >
                          Export workings CSV <Download size={14} />
                        </button>
                      </section>
                    ),
                  )}
                </div>
              ) : (
                <div className="inspection-panel">
                  <h2>Evidence, with its context</h2>
                  <p>
                    Connectors retrieve data automatically. Public accounts are
                    annual, market references are dated, and transaction terms
                    are separate assumptions.
                  </p>
                  {Object.entries(room.sources).map(
                    ([id, c]: [string, any]) => (
                      <section key={id}>
                        <span
                          className={`source-pill ${c.provenance?.mode !== "retrieved" ? "cached" : ""}`}
                        >
                          {c.provenance?.mode === "archive"
                            ? "FROZEN ARCHIVE"
                            : c.provenance?.mode === "cached"
                              ? "DATED CACHE"
                              : "RETRIEVED"}
                        </span>
                        <h3>{c.name || "U.S. Treasury"}</h3>
                        <p>
                          {c.periodEnd
                            ? `Fiscal year ${c.fiscalYear} · period ended ${c.periodEnd}`
                            : `USD Treasury par curve · ${c.date}`}
                        </p>
                        {c.provenance?.refreshError && (
                          <p className="cache-notice">
                            Refresh failed: {c.provenance.refreshError}. The
                            cached observation is preserved and labelled.
                          </p>
                        )}
                        {c.facts ? (
                          <div className="source-facts">
                            {Object.entries(c.facts).map(
                              ([k, f]: [string, any]) => (
                                <div key={k}>
                                  <strong>{k}</strong>
                                  <span>
                                    {f.value.toLocaleString()} {f.unit}
                                  </span>
                                  <a
                                    href={f.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {f.tag} ↗
                                  </a>
                                  <small>
                                    Filed {f.filed} · {f.accession}
                                  </small>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <>
                            <Curve points={c.points} />
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Treasury source ↗
                            </a>
                          </>
                        )}
                        <details>
                          <summary>Source identity & retrieval record</summary>
                          <pre>{JSON.stringify(c.provenance, null, 2)}</pre>
                        </details>
                      </section>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>
        )}
        {(error || notice) && (
          <div
            className={`agent-notice ${error ? "error" : ""}`}
            role={error ? "alert" : "status"}
          >
            <span>{error || notice}</span>
            <button
              aria-label="Dismiss notice"
              onClick={() => {
                setError("");
                setNotice("");
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </main>
      {settings && (
        <div className="modal-shade">
          <section
            className="platform-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Platform and design"
          >
            <button
              className="close-platform"
              onClick={() => setSettings(false)}
              aria-label="Close platform"
            >
              <X size={18} />
            </button>
            <PlatformWorkspace
              view="architecture"
              platform={platform}
              rooms={rooms}
              onOpen={(id) => {
                setSettings(false);
                const r = rooms.find((r) => r.id === id);
                if (r) open(r);
              }}
              onRun={(...args) => {
                setSettings(false);
                void runBlueprint(...args);
              }}
              busy={previewBusy}
            />
          </section>
        </div>
      )}
    </div>
  );
}
