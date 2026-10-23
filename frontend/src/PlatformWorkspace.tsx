import { useState } from "react";
import {
  ArrowRight,
  Database,
  FileText,
  Layers3,
  Network,
  Play,
  ShieldCheck,
} from "lucide-react";
export type PlatformView =
  | "workroom"
  | "connections"
  | "library"
  | "architecture";
type Tool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  _meta?: Record<string, unknown>;
};
export type Platform = {
  phase: string;
  mcp: {
    sdk: string;
    protocol: string;
    transport: string;
    tools: Tool[];
    resources: { name: string; uri: string }[];
  };
  providers: {
    id: string;
    name: string;
    state: string;
    mode: string;
    asOf?: string;
    url?: string;
    rights?: string;
    capabilities?: string[];
  }[];
  models: { state: string; note: string };
  layers: string[];
  brand: {
    name: string;
    canvas: { width: number; height: number };
    typography: { source: string };
  };
};
export const playbooks = [
  {
    kind: "bond",
    title: "Financing discussion",
    description:
      "Source company financials and a Treasury reference, calculate an illustrative issue and compile the discussion.",
    pages: "Evidence → funding economics → downside → materials",
  },
  {
    kind: "buyback",
    title: "Capital returns review",
    description:
      "Inspect reported cash and shares, test explicit buyback terms and compare the earnings implications.",
    pages: "Evidence → capital allocation → sensitivity → materials",
  },
  {
    kind: "acquisition",
    title: "Hypothetical acquisition",
    description:
      "Resolve two companies, compare annual facts and test consideration, funding and pre-PPA earnings.",
    pages: "Companies → purchase economics → funding → risk → materials",
  },
];
export function Playbooks({
  onRun,
  busy,
}: {
  onRun: (kind: string, issuer: string, target?: string) => void;
  busy: boolean;
}) {
  const [issuer, setIssuer] = useState("PEP"),
    [target, setTarget] = useState("CPB");
  return (
    <section className="playbooks">
      <div className="playbook-heading">
        <div>
          <span className="eyebrow">EXPLORE THE LOCAL WORKFLOW</span>
          <h2>From evidence to a discussion</h2>
        </div>
        <label>
          Company
          <select
            value={issuer}
            onChange={(e) => {
              setIssuer(e.target.value);
              if (e.target.value === target)
                setTarget(e.target.value === "CPB" ? "GIS" : "CPB");
            }}
          >
            {[
              ["PEP", "PepsiCo"],
              ["CPB", "Campbell’s"],
              ["GIS", "General Mills"],
            ].map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label>
          Target
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {[
              ["PEP", "PepsiCo"],
              ["CPB", "Campbell’s"],
              ["GIS", "General Mills"],
            ]
              .filter(([k]) => k !== issuer)
              .map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="playbook-cards">
        {playbooks.map((p, i) => (
          <article key={p.kind}>
            <span className="playbook-number">0{i + 1}</span>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <small>{p.pages}</small>
            <button
              disabled={busy}
              onClick={() =>
                onRun(
                  p.kind,
                  issuer,
                  p.kind === "acquisition" ? target : undefined,
                )
              }
            >
              Explore blueprint <ArrowRight size={14} />
            </button>
          </article>
        ))}
      </div>
      <p className="blueprint-explanation">
        Local blueprints execute the real source, context, financial and slide
        tools using a dated public archive. Their narrative and transaction
        terms are explicit examples. Model-driven interpretation and live
        connections are reserved for the next phase.
      </p>
    </section>
  );
}
export function PlatformWorkspace({
  view,
  platform,
  rooms,
  onOpen,
  onRun,
  busy,
}: {
  view: PlatformView;
  platform: Platform | null;
  rooms: {
    id: string;
    title: string;
    revision: number;
    draft: { slides: unknown[] } | null;
    executionMode?: string;
  }[];
  onOpen: (id: string) => void;
  onRun: (kind: string, issuer: string, target?: string) => void;
  busy: boolean;
}) {
  if (!platform)
    return (
      <section className="platform-workspace">
        <p>Loading source and tool contracts…</p>
      </section>
    );
  if (view === "library")
    return (
      <section className="platform-workspace">
        <span className="eyebrow">MATERIALS LIBRARY</span>
        <h1>Work that stays connected</h1>
        <p>
          The conversation, financial analysis, sources and presentation belong
          to the same workroom.
        </p>
        <div className="artifact-library">
          {rooms
            .filter((r) => r.draft)
            .map((r) => (
              <button key={r.id} onClick={() => onOpen(r.id)}>
                <FileText size={26} />
                <h3>{r.title}</h3>
                <span>
                  {r.draft!.slides.length} pages · revision {r.revision}
                </span>
                <small>
                  {r.executionMode === "local_blueprint"
                    ? "Local blueprint preview"
                    : "Saved draft"}
                </small>
              </button>
            ))}
        </div>
        {!rooms.some((r) => r.draft) && <Playbooks onRun={onRun} busy={busy} />}
      </section>
    );
  if (view === "connections")
    return (
      <section className="platform-workspace">
        <span className="eyebrow">DATA CONNECTIONS</span>
        <h1>Start with the evidence</h1>
        <p>
          Sources have distinct coverage, identifiers, periods and usage rights.
          A common tool contract keeps those differences visible.
        </p>
        <div className="connection-cards">
          {platform.providers.map((p) => (
            <article key={p.id}>
              <div>
                <Database size={20} />
                <span className={`provider-state state-${p.state}`}>
                  {p.state}
                </span>
              </div>
              <h3>{p.name}</h3>
              <span>
                {p.mode}
                {p.asOf ? ` · as of ${p.asOf}` : ""}
              </span>
              <p>
                {p.capabilities?.join(" · ") ||
                  p.rights ||
                  "External access is next-phase work."}
              </p>
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer">
                  Provider documentation ↗
                </a>
              )}
            </article>
          ))}
        </div>
        <div className="connection-principle">
          <ShieldCheck size={22} />
          <div>
            <h3>Connect only what the work needs</h3>
            <p>
              The local archive is usable now. Provider licences, authentication
              and network calls are deferred. A planned MCP adapter is a
              contract, not an active connection or entitlement.
            </p>
          </div>
        </div>
        <Playbooks onRun={onRun} busy={busy} />
      </section>
    );
  return (
    <section className="platform-workspace">
      <span className="eyebrow">SYSTEM ARCHITECTURE</span>
      <h1>A financial workspace around the agent</h1>
      <p>
        The conversation steers a workflow. Data, calculations and presentation
        objects retain their own contracts and history.
      </p>
      <div className="architecture-flow">
        {platform.layers.map((l, i) => (
          <div key={l}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{l}</strong>
            {i < platform.layers.length - 1 && <ArrowRight size={14} />}
          </div>
        ))}
      </div>
      <div className="architecture-panels">
        <section>
          <Network size={23} />
          <h3>MCP is the tool boundary</h3>
          <p>{platform.mcp.sdk}</p>
          <p>{platform.mcp.transport}</p>
          <small>{platform.mcp.protocol}</small>
        </section>
        <section>
          <Layers3 size={23} />
          <h3>One document, multiple views</h3>
          <p>
            Semantic pages compile into a branded scene with frame geometry,
            source bindings and a citation index. The canvas and future Office
            exporters share that document.
          </p>
        </section>
        <section>
          <Play size={23} />
          <h3>Model port: {platform.models.state}</h3>
          <p>{platform.models.note}</p>
          <small>
            Briefs and review instructions can be saved now. No API key is
            required in this phase.
          </small>
        </section>
      </div>
      <h2>Discoverable tools</h2>
      <p className="section-caption">
        These definitions are discovered through the running MCP client/server,
        not copied into the screen.
      </p>
      <div className="tool-contracts">
        {platform.mcp.tools.map((t) => (
          <details key={t.name}>
            <summary>
              <code>{t.name}</code>
              <span>
                {t.annotations?.readOnlyHint ? "Read" : "Session action"}
              </span>
            </summary>
            <p>{t.description}</p>
            <pre>{JSON.stringify(t.inputSchema, null, 2)}</pre>
          </details>
        ))}
      </div>
      <h2>Context resources</h2>
      <div className="context-resources">
        {platform.mcp.resources.map((r) => (
          <div key={r.uri}>
            <strong>{r.name}</strong>
            <code>{r.uri}</code>
          </div>
        ))}
      </div>
    </section>
  );
}
