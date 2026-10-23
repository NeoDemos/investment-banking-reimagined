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
};
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
function BlockView({ block: b, room }: { block: Block; room: Room }) {
  const a = b.analysisId ? room.analyses[b.analysisId] : null;
  const m = a?.model;
  if (b.type === "text") return <p className="draft-prose">{b.text}</p>;
  if (b.type === "metrics")
    return (
      <div className="bound-metrics">
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
              {c.provenance?.mode === "cached"
                ? "Dated cache · refresh unavailable"
                : "Retrieved from public source"}{" "}
              ·{" "}
              {c.provenance?.retrievedAt?.slice(0, 10) ||
                c.provenance?.original?.retrievedAt?.slice(0, 10) ||
                "snapshot"}
            </span>
          </div>
        ))}
        <p>
          Illustrative analysis. All transaction terms are assumptions. Human
          financial, editorial and legal review required before client use.
        </p>
      </div>
    );
  return null;
}
function Page({
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
    (c: any) => c.provenance?.mode === "cached",
  );
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
      <div className="page-blocks">
        {slide.blocks.map((b, i) => (
          <div className={`page-block block-${b.type}`} key={i}>
            <BlockView block={b} room={room} />
          </div>
        ))}
      </div>
      <footer>
        <span>
          {cached ? "Includes dated cached public data" : "Public source data"}{" "}
          · Illustrative assumptions · Subject to review
        </span>
        <span>
          {index + 1} / {total}
        </span>
      </footer>
    </article>
  );
}
export default function AgentStudio() {
  const [rooms, setRooms] = useState<Room[]>([]),
    [room, setRoom] = useState<Room | null>(null),
    [prompt, setPrompt] = useState(""),
    [runId, setRunId] = useState(""),
    [run, setRun] = useState<Run | null>(null),
    [page, setPage] = useState(0),
    [tab, setTab] = useState("draft"),
    [provider, setProvider] = useState("claude"),
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
    [notes, setNotes] = useState<{ page: number; text: string }[]>([]),
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
    const v = await api<{ rooms: Room[]; localClaude: boolean }>(
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
        setAi(b.capabilities.ai);
        const rr = await loadRooms();
        const hash = location.hash.match(/^#workroom\/(.+)$/);
        if (hash) {
          const found = rr.find((r) => r.id === hash[1]);
          setRoom(found || null);
          if (found?.lastRunId)
            setRun(await api<Run>(`/api/agent/runs/${found.lastRunId}`));
        }
        const pending = sessionStorage.getItem("draftingRun");
        if (pending) {
          const p = JSON.parse(pending);
          setRunId(p.runId);
          const r = rr.find((r) => r.id === p.roomId);
          if (r) setRoom(r);
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
            if (next) setRoom(next);
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
  const open = (r: Room) => {
    if (active) return;
    setRoom(r);
    setPage(0);
    setRun(null);
    if (r.lastRunId)
      void api<Run>(`/api/agent/runs/${r.lastRunId}`)
        .then(setRun)
        .catch((e) => setError(String(e)));
    setEdit(false);
    setNotes([]);
    location.hash = `workroom/${r.id}`;
  };
  const send = async (text = prompt) => {
    if (active || !text.trim()) return false;
    setError("");
    setNotice("");
    try {
      const r = await api<{ roomId: string; runId: string }>(
        "/api/agent/runs",
        {
          roomId: room?.id || null,
          expectedRevision: room?.revision ?? null,
          prompt: text,
          provider,
          allowCached: cache,
        },
      );
      const newRoom = await api<Room>(`/api/agent/rooms/${r.roomId}`);
      setRoom(newRoom);
      setRun(null);
      setRunId(r.runId);
      sessionStorage.setItem("draftingRun", JSON.stringify(r));
      location.hash = `workroom/${r.roomId}`;
      setPrompt("");
      setInspect(true);
      setEdit(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
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
    setNotes((ns) => [...ns, { page: page + 1, text: prompt.trim() }]);
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
            Local workspace · SQLite
          </div>
          <button onClick={() => setSettings(true)}>
            <Settings2 size={16} /> Connections & design
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
            <strong>{room ? "Client workroom" : "New discussion"}</strong>
          </div>
          <div>
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
        {!room ? (
          <section className="agent-welcome">
            <span className="eyebrow">
              FROM CONVERSATION TO CLIENT MATERIALS
            </span>
            <h1>
              What are we preparing
              <br />
              for the client?
            </h1>
            <p>
              Describe the decision. Your agent gathers public data, runs the
              analysis
              <br />
              and designs a sourced discussion in your company’s visual
              language.
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
                  Prepare discussion <ArrowRight size={17} />
                </button>
              </div>
            </div>
            <div className="example-briefs">
              {examples.map(([title, text], i) => (
                <button key={title} onClick={() => setPrompt(text)}>
                  <span>0{i + 1}</span>
                  <h3>
                    {title}
                    <ArrowUpRight size={16} />
                  </h3>
                  <p>
                    {
                      [
                        "Price an illustrative issuance and discuss financing trade-offs.",
                        "Assess a repurchase and its effect on earnings per share.",
                        "Evaluate purchase economics, funding and leverage.",
                      ][i]
                    }
                  </p>
                </button>
              ))}
            </div>
            <div className="welcome-connections">
              <span className="status-dot" />
              {local
                ? "Local Claude CLI installed · capacity checked on run"
                : "Connect a model to start"}
              <span>
                Public data is retrieved automatically. Source vintages stay
                visible.
              </span>
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
              <div className="conversation-scroll">
                {room.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`conversation-message role-${m.role}`}
                  >
                    <span className="message-role">
                      {m.role === "banker" ? "YOU" : "STUDIO AGENT"}
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
                        `Apply these review notes to the existing draft. Preserve unaffected pages and source links. ${notes.map((n) => `Page ${n.page}: ${n.text}`).join("\n")}`,
                      );
                      if (submitted) {
                        setNotes([]);
                        setMeeting(false);
                      }
                    }}
                  >
                    Apply review notes <ArrowRight size={14} />
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
                        : "Configure an OpenAI API key for audio transcription"
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
                        meeting ? "Add page review note" : "Send follow-up"
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
                      <div>
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
                        : run?.status === "failed"
                          ? "The model request failed. Inspect the execution, then retry when model capacity is available or choose another connection in Settings."
                          : "Answer the agent’s question to continue. Reported facts will be retrieved automatically."}
                    </p>
                    {active && <LoaderCircle className="spin" size={23} />}
                  </div>
                )
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
                          className={`source-pill ${c.provenance?.mode === "cached" ? "cached" : ""}`}
                        >
                          {c.provenance?.mode === "cached"
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
            className="agent-settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connection-title"
          >
            <div>
              <h2 id="connection-title">Connections & design</h2>
              <button
                onClick={() => setSettings(false)}
                aria-label="Close settings"
              >
                <X size={19} />
              </button>
            </div>
            <label>
              Drafting connection
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="claude" disabled={!local}>
                  Local Claude Code {local ? "· installed" : "· unavailable"}
                </option>
                <option value="openai">
                  OpenAI API {ai ? "· connected" : "· key required"}
                </option>
              </select>
            </label>
            <p>
              Local Claude uses your installed, signed-in CLI through its
              supported interface. No filesystem, shell, browser or external MCP
              tools are enabled. Usage draws on your plan. This connection is
              for your personal external demo.
            </p>
            <label>
              OpenAI API key · optional for drafting, required for audio
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={
                  ai
                    ? "Key configured in server memory"
                    : "Enter privately here"
                }
              />
            </label>
            <button
              disabled={!key.trim()}
              onClick={async () => {
                try {
                  const c = await api<J>("/api/settings", { openai: key });
                  setAi(c.ai);
                  setKey("");
                  setNotice("API connection saved in server memory.");
                  setSettings(false);
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Save API connection
            </button>
            <label className="check-setting">
              <input
                type="checkbox"
                checked={cache}
                onChange={(e) => setCache(e.target.checked)}
              />
              Allow explicitly dated public cache when a connector cannot
              refresh
            </label>
            <hr />
            <h3>Rabobank public design reference</h3>
            <p>
              The wordmark is the actual vector path from the public investor
              site. Myriad web fonts are loaded from this Mac’s local brand
              folder when available. Fonts are excluded from the repository.
              This prototype is independent and is not bank-approved.
            </p>
            <div className="font-check">
              Aa <span>Myriad · corporate typography</span>
            </div>
            <a
              href="https://www.rabobank.com/about-us/investor-relations/presentations"
              target="_blank"
              rel="noreferrer"
            >
              Public investor design reference ↗
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
