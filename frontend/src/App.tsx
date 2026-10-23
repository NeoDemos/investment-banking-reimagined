import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Database,
  FileCheck2,
  FileText,
  FolderOpen,
  History,
  Layers3,
  LayoutDashboard,
  Library,
  Lightbulb,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  PanelRightClose,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { api, setToken } from "./api";
import { Analysis, CompanyTable, Sources } from "./Analysis";
const Materials = lazy(() =>
  import("./Materials").then((m) => ({ default: m.Materials })),
);
const Review = lazy(() =>
  import("./Review").then((m) => ({ default: m.Review })),
);
import {
  format,
  LABELS,
  type Brief,
  type Capabilities,
  type Data,
  type Fact,
  type Kind,
  type Material,
  type Project,
  type ReviewCopy,
} from "./types";

type View = "home" | "workflows" | "sources" | "project";
type Tab = "overview" | "analysis" | "materials" | "review";
const templates = [
  {
    kind: "bond" as Kind,
    name: "Financing alternatives",
    description:
      "Size an issuance, test terms and frame a financing discussion.",
    icon: TrendingUp,
  },
  {
    kind: "buyback" as Kind,
    name: "Capital allocation review",
    description:
      "Compare returning capital with financing and acquisition capacity.",
    icon: Layers3,
  },
  {
    kind: "acquisition" as Kind,
    name: "Acquisition discussion",
    description: "Connect purchase economics, funding, earnings and leverage.",
    icon: BriefcaseBusiness,
  },
];

export default function App() {
  const [data, setData] = useState<Data | null>(null);
  const [caps, setCaps] = useState<Capabilities>({
    ai: false,
    quotes: false,
    textModel: "",
    voiceModel: "",
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [material, setMaterial] = useState<Material | null>(null);
  const [saved, setSaved] = useState("");
  const [view, setView] = useState<View>("home");
  const [tab, setTab] = useState<Tab>("overview");
  const [analysisId, setAnalysisId] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [present, setPresent] = useState(false);
  const [reviewCopy, setReviewCopy] = useState<ReviewCopy | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [newKind, setNewKind] = useState<Kind>("bond");
  const [due, setDue] = useState("2026-10-26");
  const [prompt, setPrompt] = useState("");
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState(false);
  const [openai, setOpenai] = useState("");
  const [alpha, setAlpha] = useState("");
  const [history, setHistory] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [rebuild, setRebuild] = useState(false);
  const [jobReport, setJobReport] = useState<string[] | null>(null);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);
  const [fact, setFact] = useState<{
    symbol: string;
    key: string;
    fact: Fact;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeId = useRef("");
  activeId.current = project?.id || "";
  const dirty = !!material && JSON.stringify(material) !== saved;
  const brief =
    project?.analyses.find((a) => a.id === analysisId) || project?.analyses[0];
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, tab, project?.id]);
  useEffect(() => {
    const search = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        navigate("home");
        setTimeout(() => document.querySelector<HTMLInputElement>("#engagement-search")?.focus(), 0);
      }
    };
    window.addEventListener("keydown", search);
    return () => window.removeEventListener("keydown", search);
  }, []);
  const notice = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  };
  const attempt = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (error) {
      notice(error instanceof Error ? error.message : String(error));
    }
  };
  useEffect(() => {
    const initialRoute = location.hash;
    void (async () => {
      try {
        const boot = await api<{
          token: string;
          data: Data;
          capabilities: Capabilities;
        }>("/api/bootstrap");
        setToken(boot.token);
        setData(boot.data);
        setCaps(boot.capabilities);
        const result = await api<{ projects: Project[] }>("/api/projects");
        setProjects(result.projects);
        const match = initialRoute.match(/^#engagement\/([a-zA-Z0-9-]+)\/(overview|analysis|materials|review)$/);
        const initialProject = match && result.projects.find(p => p.id === match[1]);
        if (match && initialProject) {
          install(initialProject);
          setView("project");
          setTab(match[2] as Tab);
        } else if (initialRoute === "#sources" || initialRoute === "#workflows") {
          setView(initialRoute.slice(1) as View);
        }
        setReady(true);
      } catch (error) {
        setLoadError(String(error));
      }
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const route = view === "project" && project ? `#engagement/${project.id}/${tab}` : `#${view}`;
    if (location.hash !== route) window.history.pushState(null, "", route);
  }, [ready, view, tab, project?.id]);
  useEffect(() => {
    if (!ready) return;
    const restore = () => void attempt(async () => {
      const match = location.hash.match(/^#engagement\/([a-zA-Z0-9-]+)\/(overview|analysis|materials|review)$/);
      if (match) await openProject(match[1], match[2] as Tab);
      else navigate(location.hash === "#sources" ? "sources" : location.hash === "#workflows" ? "workflows" : "home");
    });
    window.addEventListener("hashchange", restore);
    return () => { window.removeEventListener("hashchange", restore); };
  }, [ready, dirty, project?.id, project?.revision, material]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  const install = (next: Project, reset = true) => {
    setProject(next);
    setProjects((p) => [next, ...p.filter((p) => p.id !== next.id)]);
    if (reset) {
      setMaterial(next.document);
      setSaved(JSON.stringify(next.document));
    }
    if (!next.analyses.some((a) => a.id === analysisId))
      setAnalysisId(next.analyses[0].id);
  };
  async function saveDraft() {
    if (!project || !material) throw new Error("Open an engagement first.");
    if (!dirty) return project;
    setSaving(true);
    try {
      const next = await api<Project>(`/api/projects/${project.id}/document`, {
        expectedRevision: project.revision,
        document: material,
      });
      install(next);
      return next;
    } finally {
      setSaving(false);
    }
  }
  async function refresh() {
    if (!project) return;
    const id = project.id;
    const next = await api<Project>(`/api/projects/${id}`);
    if (activeId.current === id) install(next, false);
  }
  async function openProject(id: string, into: Tab = "overview") {
    setPresent(false);
    if (dirty) await saveDraft();
    const next = await api<Project>(`/api/projects/${id}`);
    install(next);
    setView("project");
    setTab(into);
    setPage(0);
    setReviewCopy(null);
    setHistory(false);
    setFact(null);
  }
  function navigate(next: View) {
    setView(next);
    setFact(null);
    setReviewCopy(null);
    setPresent(false);
  }
  function startNew(kind: Kind = "bond", text = "") {
    setNewKind(kind);
    setNewTitle(
      kind === "bond"
        ? "Financing alternatives"
        : kind === "buyback"
          ? "Capital allocation review"
          : "Acquisition discussion",
    );
    setObjective(text || templates.find((t) => t.kind === kind)!.description);
    setNewOpen(true);
  }
  async function create() {
    setBusy(true);
    try {
      if (dirty) await saveDraft();
      const next = await api<Project>("/api/projects", {
        title: newTitle,
        objective,
        dueDate: due,
        client: "PepsiCo",
      });
      install(next);
      setAnalysisId(next.analyses.find((a) => a.kind === newKind)!.id);
      setNewOpen(false);
      setView("project");
      setTab("overview");
      setPage(0);
      setJobReport(null);
      setPrompt("");
      notice(
        "Engagement created with three linked analyses and an editable client draft.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function calculate(params: Record<string, number>) {
    if (!brief) return;
    setBusy(true);
    try {
      await api(`/api/briefs/${brief.id}/assumptions`, {
        expectedVersion: brief.version,
        params,
      });
      await refresh();
      notice(
        "Analysis recalculated. Linked figures in client materials now reflect the new version.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (!project) return;
    setBusy(true);
    try {
      const current = await saveDraft();
      const result = await api<{ project: Project; steps: string[] }>(
        `/api/projects/${project.id}/generate`,
        { expectedRevision: current.revision },
      );
      install(result.project);
      setJobReport(result.steps);
      setTab("materials");
      setRebuild(false);
      setPage(0);
      notice(`Client draft r${result.project.revision} is ready.`);
    } finally {
      setBusy(false);
    }
  }
  async function revise() {
    if (!brief) return;
    setBusy(true);
    try {
      const id = project!.id;
      const { jobId } = await api<{ jobId: string }>(
        `/api/briefs/${brief.id}/revise`,
        { expectedVersion: brief.version, mode: caps.ai ? "ai" : "local" },
      );
      let result:
        | {
            status: string;
            result: { version: number; unresolved: string[]; error?: string };
          }
        | undefined;
      const until = Date.now() + 180000;
      while (Date.now() < until) {
        result = await api(`/api/jobs/${jobId}`);
        if (["completed", "failed"].includes(result!.status)) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (result?.status !== "completed")
        throw new Error(
          result?.result.error ||
            "Revision is still running. The previous version remains available.",
        );
      if (activeId.current === id) await refresh();
      const message = `Analysis v${result.result.version} is ready. Linked material figures updated.${result.result.unresolved.length ? ` ${result.result.unresolved.length} instruction(s) need clarification.` : ""}`;
      notice(message);
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("Banking Studio · Review complete", { body: message });
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    if (!project) return;
    const current = await saveDraft();
    const result = await api<ReviewCopy>(
      `/api/projects/${project.id}/snapshots`,
      { expectedRevision: current.revision },
    );
    await refresh();
    setReviewCopy(result);
    setTab("materials");
    setHistory(false);
    notice("Review copy saved with its exact narrative and analysis versions.");
  }
  async function exportHTML() {
    const { exportMaterial } = await import("./export");
    if (!data || !project || !material) return;
    if (reviewCopy) {
      await exportMaterial(
        project.title,
        reviewCopy.document,
        reviewCopy.analyses,
        data,
        reviewCopy.revision,
      );
    } else {
      const p = await saveDraft();
      await exportMaterial(p.title, p.document, p.analyses, data, p.revision);
    }
    setExportOpen(false);
  }
  const changeTab = (next: Tab) => {
    setTab(next);
    setReviewCopy(null);
    setPresent(false);
    setFact(null);
  };
  const onFact = (symbol: string, key: string, value: Fact) =>
    setFact({ symbol, key, fact: value });
  const checkNarrative = () =>
    attempt(async () => {
      if (!material || !project) return;
      setSaving(true);
      try {
        const doc = {
          ...material,
          generatedFrom: Object.fromEntries(
            project.analyses.map((a) => [a.id, a.version]),
          ),
        };
        const next = await api<Project>(
          `/api/projects/${project.id}/document`,
          { expectedRevision: project.revision, document: doc },
        );
        install(next);
        notice("Narrative check recorded for the current analysis versions.");
      } finally {
        setSaving(false);
      }
    });
  const stale =
    !!project &&
    !!material &&
    project.analyses.some((a) => material.generatedFrom[a.id] !== a.version);
  if (!data || !ready)
    return (
      <div className="startup">
        <span className="brand-word">Rabobank</span>
        {loadError ? (
          <p role="alert">{loadError}</p>
        ) : (
          <>
            <LoaderCircle className="spinning" size={23} />
            <p>Opening your workspace…</p>
          </>
        )}
      </div>
    );
  const pending =
    project?.analyses.reduce(
      (n, a) => n + a.notes.filter((n) => n.state === "pending").length,
      0,
    ) || 0;
  return (
    <div className={`app ${present ? "presenting" : ""}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-word">Rabobank</span>
          <span>Banking Studio</span>
        </button>
        <button className="workspace-switch" onClick={() => navigate("home")}>
          <span className="workspace-symbol">R</span>
          <span>
            Advisory workspace<small>Local demonstration</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <button
          className="sidebar-search"
          onClick={() => {
            navigate("home");
            setTimeout(
              () =>
                document
                  .querySelector<HTMLInputElement>("#engagement-search")
                  ?.focus(),
              0,
            );
          }}
        >
          <Search size={14} />
          <span>Find an engagement</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => navigate("home")}
          >
            <FolderOpen size={17} />
            Engagements<span>{projects.length}</span>
          </button>
          <button
            className={view === "workflows" ? "active" : ""}
            onClick={() => navigate("workflows")}
          >
            <Layers3 size={17} />
            Workflows
          </button>
          <button
            className={view === "sources" ? "active" : ""}
            onClick={() => navigate("sources")}
          >
            <Database size={17} />
            Source library
          </button>
        </nav>
        <div className="sidebar-section">
          <span className="nav-label">RECENT ENGAGEMENTS</span>
          <button aria-label="New engagement" onClick={() => startNew()}>
            <Plus size={14} />
          </button>
        </div>
        <div className="recent-projects">
          {projects.slice(0, 5).map((p) => (
            <button
              className={
                view === "project" && project?.id === p.id ? "selected" : ""
              }
              key={p.id}
              onClick={() => void attempt(() => openProject(p.id))}
            >
              <span className="project-dot" />
              <span>
                {p.title}
                <small>{p.client}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-indicator">
            <span className="status-dot" />
            Public-data workspace
            <button
              aria-label="Connections and settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={15} />
            </button>
          </div>
          <div className="profile">
            <span>DT</span>
            <div>
              My workspace<small>External prototype</small>
            </div>
            <button
              aria-label="About this application"
              onClick={() => setSettings(true)}
            >
              <CircleHelp size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Advisory</span>
            <ChevronRight size={12} />
            <button onClick={() => navigate("home")}>Engagements</button>
            {view === "project" && project && (
              <>
                <ChevronRight size={12} />
                <span>{project.client}</span>
              </>
            )}
          </div>
          <div className="header-actions">
            <span className="environment">
              <span className="status-dot" />
              Local workspace
            </span>
            <button
              className="icon-btn"
              title="Enable desktop completion alerts"
              aria-label="Enable desktop completion alerts"
              onClick={() =>
                void attempt(async () => {
                  if (!("Notification" in window))
                    throw new Error(
                      "Desktop alerts are unavailable. In-app messages remain enabled.",
                    );
                  const p = await Notification.requestPermission();
                  notice(
                    p === "granted"
                      ? "Completion alerts enabled."
                      : "In-app completion messages remain enabled.",
                  );
                })
              }
            >
              <Bell size={17} />
            </button>
            <span className="avatar">DT</span>
          </div>
        </header>
        {view === "home" && (
          <main className="home-page">
            <div className="home-heading">
              <div>
                <span className="eyebrow">YOUR ADVISORY WORKSPACE</span>
                <h1>
                  From financial thinking
                  <br />
                  to client-ready materials.
                </h1>
                <p>
                  Research, analyse and shape the story. One connected place to
                  work.
                </p>
              </div>
              <div className="home-date">
                <span>
                  {new Date()
                    .toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                    .toUpperCase()}
                </span>
                <small>Public-source demonstration</small>
              </div>
            </div>
            <form
              className="intent-composer"
              onSubmit={(e) => {
                e.preventDefault();
                startNew("bond", prompt);
              }}
            >
              <div className="intent-label">
                <Sparkles size={17} />
                <span>What are we preparing?</span>
                <small>Start an engagement</small>
              </div>
              <textarea
                aria-label="Engagement brief"
                placeholder="Prepare a capital allocation discussion for PepsiCo. Compare a bond issue, a buyback and acquisition capacity…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div>
                <span>
                  <ShieldCheck size={13} />
                  Public financials · traceable calculations · firm-style
                  materials
                </span>
                <button className="btn navy">
                  Create engagement <ArrowRight size={15} />
                </button>
              </div>
            </form>
            <div className="section-header">
              <div>
                <h2>Start with a workflow</h2>
                <p>
                  A clear brief, connected analysis and an editable deliverable.
                </p>
              </div>
              <button
                className="link-button"
                onClick={() => navigate("workflows")}
              >
                View workflows <ArrowRight size={14} />
              </button>
            </div>
            <div className="workflow-grid">
              {templates.map((t) => (
                <button
                  className="workflow-card"
                  key={t.kind}
                  onClick={() => startNew(t.kind)}
                >
                  <span className={`workflow-icon ${t.kind}`}>
                    <t.icon size={20} strokeWidth={1.6} />
                  </span>
                  <ArrowUpRight size={15} className="card-arrow" />
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <span className="card-footer">
                    Analysis + client briefing
                    <ChevronRight size={13} />
                  </span>
                </button>
              ))}
            </div>
            <div className="section-header engagement-heading">
              <div>
                <h2>
                  My engagements <span>{projects.length}</span>
                </h2>
              </div>
              <div>
                <label className="search-field">
                  <Search size={14} />
                  <input
                    id="engagement-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search engagements"
                  />
                </label>
                <button className="btn" onClick={() => startNew()}>
                  <Plus size={14} />
                  New engagement
                </button>
              </div>
            </div>
            <div className="engagement-table">
              <div className="engagement-row table-head">
                <span>ENGAGEMENT</span>
                <span>CLIENT</span>
                <span>WORK PRODUCT</span>
                <span>STATUS</span>
                <span>DUE</span>
                <span />
              </div>
              {projects
                .filter((p) =>
                  `${p.title} ${p.client}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <button
                    className="engagement-row"
                    key={p.id}
                    onClick={() => void attempt(() => openProject(p.id))}
                  >
                    <span>
                      <span className="engagement-icon">
                        <BriefcaseBusiness size={17} />
                      </span>
                      <strong>
                        {p.title}
                        <small>
                          {p.analyses.length} analyses ·{" "}
                          {p.document.sections.length} material sections
                        </small>
                      </strong>
                    </span>
                    <span>{p.client}</span>
                    <span>
                      <FileText size={13} />
                      Client discussion
                    </span>
                    <span>
                      <span className="draft-status">In preparation</span>
                    </span>
                    <span>
                      {new Date(p.dueDate + "T12:00:00").toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short" },
                      )}
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
            </div>
            <div className="workspace-footnote">
              <ShieldCheck size={14} />
              <span>
                Public-data prototype. Source snapshot {data.asOf}. Client and
                transaction terms are illustrative; no bank approval is implied.
              </span>
            </div>
          </main>
        )}
        {view === "workflows" && (
          <main className="home-page">
            <div className="page-intro">
              <div>
                <span className="eyebrow">REUSABLE WORK</span>
                <h1>Workflows for client work.</h1>
                <p>
                  Begin with a decision. Keep the research, financial work and
                  deliverable connected.
                </p>
              </div>
            </div>
            <div className="workflow-grid large">
              {templates.map((t) => (
                <section className="workflow-card" key={t.kind}>
                  <span className={`workflow-icon ${t.kind}`}>
                    <t.icon size={23} />
                  </span>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <ol>
                    <li>Set the engagement brief</li>
                    <li>Inspect public financials</li>
                    <li>Calculate and compare scenarios</li>
                    <li>Prepare an editable briefing</li>
                    <li>Review, revise and save a copy</li>
                  </ol>
                  <button
                    className="btn navy full"
                    onClick={() => startNew(t.kind)}
                  >
                    Use workflow <ArrowRight size={14} />
                  </button>
                </section>
              ))}
            </div>
            <div className="capability-note">
              <Lightbulb size={18} />
              <p>
                These workflows use the implemented PepsiCo public-data example
                and deterministic financial methods. Broader coverage, full
                valuation and institutional data connections remain later work.
              </p>
            </div>
          </main>
        )}
        {view === "sources" && <Sources data={data} onFact={onFact} />}
        {view === "project" && project && material && brief && (
          <>
            <div className="engagement-header">
              <div className="engagement-title">
                <div className="engagement-context">
                  <span className="company-badge">P</span>
                  <span>
                    {project.client}
                    <small>Food & Agribusiness</small>
                  </span>
                  <ChevronRight size={14} />
                  <span className="draft-status">In preparation</span>
                </div>
                <h1>{project.title}</h1>
                <p>
                  <span>Client discussion</span>
                  <span>Due {project.dueDate}</span>
                  <span>Material r{project.revision}</span>
                </p>
              </div>
              <div className="engagement-actions">
                <button
                  className="icon-btn"
                  aria-label="Version history"
                  onClick={() => setHistory(!history)}
                >
                  <History size={18} />
                </button>
                <button className="btn" onClick={() => setExportOpen(true)}>
                  <ArrowDownToLine size={14} />
                  Export
                </button>
                <button
                  className="btn navy"
                  onClick={() => changeTab("review")}
                >
                  <MessageSquare size={14} />
                  Review draft
                </button>
              </div>
            </div>
            <nav className="work-tabs">
              {(
                [
                  ["overview", "Overview", LayoutDashboard],
                  ["analysis", "Financial analysis", TrendingUp],
                  ["materials", "Client materials", FileText],
                  ["review", "Review room", MessageSquare],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  className={tab === key ? "active" : ""}
                  onClick={() => changeTab(key)}
                >
                  <Icon size={15} />
                  {label}
                  {key === "review" && pending > 0 && <span>{pending}</span>}
                </button>
              ))}
              <span>
                <span className="binding-dot" />
                Sources → analysis → materials
              </span>
            </nav>
            {tab === "overview" && (
              <main className="project-overview">
                <div className="overview-intro">
                  <div>
                    <span className="eyebrow">ENGAGEMENT BRIEF</span>
                    <h2>A connected workroom for the client discussion.</h2>
                    <p>{project.objective}</p>
                  </div>
                  <button
                    className="btn navy"
                    disabled={busy}
                    onClick={() => setRebuild(true)}
                  >
                    <Play size={14} />
                    Build client draft
                  </button>
                </div>
                <div className="workflow-path">
                  {[
                    {
                      label: "Source evidence",
                      sub: `${data.companies.length} companies · SEC / Treasury`,
                      icon: Database,
                      action: () => navigate("sources"),
                    },
                    {
                      label: "Financial analysis",
                      sub: `${project.analyses.length} calculated scenarios`,
                      icon: TrendingUp,
                      action: () => changeTab("analysis"),
                    },
                    {
                      label: "Client materials",
                      sub: `6 editable sections · r${project.revision}`,
                      icon: FileText,
                      action: () => changeTab("materials"),
                    },
                    {
                      label: "Review & revise",
                      sub: `${pending} pending notes`,
                      icon: MessageSquare,
                      action: () => changeTab("review"),
                    },
                  ].map((step, i) => (
                    <button key={step.label} onClick={step.action}>
                      <span className="path-icon">
                        <step.icon size={18} />
                      </span>
                      <strong>
                        {step.label}
                        <small>{step.sub}</small>
                      </strong>
                      {i < 3 && <ChevronRight size={15} />}
                    </button>
                  ))}
                </div>
                <div className="overview-columns">
                  <section className="white-panel worklist">
                    <div className="panel-title">
                      <h3>Financial work</h3>
                      <span>3 scenarios</span>
                    </div>
                    {project.analyses.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setAnalysisId(a.id);
                          changeTab("analysis");
                        }}
                      >
                        <span className={`workflow-icon ${a.kind}`}>
                          {a.kind === "bond" ? (
                            <TrendingUp size={18} />
                          ) : a.kind === "buyback" ? (
                            <Layers3 size={18} />
                          ) : (
                            <BriefcaseBusiness size={18} />
                          )}
                        </span>
                        <div>
                          <strong>{LABELS[a.kind]}</strong>
                          <small>{a.model.summary}</small>
                        </div>
                        <span className="version-pill">v{a.version}</span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  </section>
                  <section className="white-panel deliverable-card">
                    <div className="panel-title">
                      <h3>Client work product</h3>
                      <span className="tiny-tag">Digital briefing</span>
                    </div>
                    <div className="mini-document">
                      <div>RABOBANK · STRATEGIC ADVISORY</div>
                      <h3>{material.title}</h3>
                      <p>PepsiCo</p>
                      <span />
                      <span />
                      <div className="mini-metrics">
                        <b />
                        <b />
                        <b />
                      </div>
                    </div>
                    <div className="deliverable-summary">
                      <strong>{material.title}</strong>
                      <p>6 sections · linked figures · editable narrative</p>
                    </div>
                    <button
                      className="btn full"
                      onClick={() => changeTab("materials")}
                    >
                      Open materials <ArrowRight size={14} />
                    </button>
                  </section>
                </div>
                {jobReport && (
                  <div className="run-report">
                    <Check size={18} />
                    <div>
                      <strong>Draft workflow completed</strong>
                      {jobReport.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="workspace-footnote">
                  <BookOpen size={14} />
                  <span>
                    Financial outputs are connected to the briefing. Review
                    narrative whenever assumptions or analysis versions change.
                  </span>
                </div>
              </main>
            )}
            {tab === "analysis" && (
              <>
                <div className="analysis-switcher">
                  {project.analyses.map((a) => (
                    <button
                      className={a.id === brief.id ? "active" : ""}
                      key={a.id}
                      onClick={() => setAnalysisId(a.id)}
                    >
                      {LABELS[a.kind]}
                      <small>v{a.version}</small>
                    </button>
                  ))}
                  <a
                    className="link-button"
                    href={`/api/briefs/${brief.id}/export.xlsx?version=${brief.version}`}
                  >
                    <ArrowDownToLine size={13} />
                    Inspect in Excel
                  </a>
                </div>
                <Analysis
                  brief={brief}
                  data={data}
                  busy={busy}
                  onSave={(p) => attempt(() => calculate(p))}
                  onInsert={() =>
                    void attempt(async () => {
                      const target =
                        brief.kind === "bond"
                          ? 2
                          : brief.kind === "buyback"
                            ? 3
                            : 4;
                      const current = {
                        ...material,
                        sections: material.sections.map((s, i) =>
                          i === target
                            ? {
                                ...s,
                                layout: "analysis" as const,
                                linkedAnalyses: [brief.id],
                              }
                            : s,
                        ),
                      };
                      const next = await api<Project>(
                        `/api/projects/${project.id}/document`,
                        {
                          expectedRevision: project.revision,
                          document: current,
                        },
                      );
                      install(next);
                      setPage(target);
                      changeTab("materials");
                      notice(
                        `${LABELS[brief.kind]} linked to section ${target + 1}.`,
                      );
                    })
                  }
                  onInspect={() => navigate("sources")}
                />
              </>
            )}
            {tab === "materials" && (
              <>
                {reviewCopy ? (
                  <div className="review-copy-banner">
                    <FileCheck2 size={15} />
                    Saved review copy ·{" "}
                    {new Date(reviewCopy.createdAt).toLocaleString()} · r
                    {reviewCopy.revision}
                    <button onClick={() => setReviewCopy(null)}>
                      Return to live draft <ArrowRight size={13} />
                    </button>
                  </div>
                ) : (
                  stale && (
                    <div className="update-banner">
                      <InfoIcon />
                      Analysis changed since this narrative was prepared. Linked
                      figures are current; check the commentary.
                      <button onClick={() => void checkNarrative()}>
                        Narrative checked <Check size={13} />
                      </button>
                    </div>
                  )
                )}
                <Suspense
                  fallback={
                    <div className="loading-panel">
                      Opening material editor…
                    </div>
                  }
                >
                  <Materials
                    material={reviewCopy?.document || material}
                    analyses={reviewCopy?.analyses || project.analyses}
                    data={data}
                    page={page}
                    setPage={setPage}
                    onChange={setMaterial}
                    onSave={() =>
                      void attempt(async () => {
                        await saveDraft();
                        notice("Material draft saved.");
                      })
                    }
                    onSource={() => navigate("sources")}
                    saving={saving}
                    dirty={dirty}
                    present={present}
                    setPresent={setPresent}
                    readonly={!!reviewCopy}
                  />
                </Suspense>
              </>
            )}
            {tab === "review" && (
              <>
                <div className="analysis-switcher">
                  {project.analyses.map((a) => (
                    <button
                      className={a.id === brief.id ? "active" : ""}
                      key={a.id}
                      onClick={() => setAnalysisId(a.id)}
                    >
                      {LABELS[a.kind]}
                      <small>
                        {a.notes.filter((n) => n.state === "pending").length}{" "}
                        notes
                      </small>
                    </button>
                  ))}
                </div>
                <Suspense
                  fallback={
                    <div className="loading-panel">Opening review room…</div>
                  }
                >
                  <Review
                    key={brief.id}
                    project={project}
                    brief={brief}
                    material={material}
                    page={page}
                    setPage={setPage}
                    onRefresh={refresh}
                    caps={caps}
                    onSettings={() => setSettings(true)}
                    onRevise={() => attempt(revise) as Promise<void>}
                    busy={busy}
                    notice={notice}
                  />
                </Suspense>
              </>
            )}
          </>
        )}
      </div>
      {fact && (
        <aside className="inspector">
          <div className="inspector-title">
            <span>
              <Database size={16} />
              Source evidence
            </span>
            <button
              className="icon-btn"
              aria-label="Close source evidence"
              onClick={() => setFact(null)}
            >
              <X size={18} />
            </button>
          </div>
          <span className="eyebrow">REPORTED FACT · {fact.symbol}</span>
          <h2>{fact.key.replace(/([A-Z])/g, " $1")}</h2>
          <strong className="evidence-value">
            {format(
              fact.fact.unit === "USD/shares"
                ? fact.fact.value
                : fact.fact.value / 1e6,
              fact.fact.unit === "USD/shares"
                ? "USD/share"
                : fact.fact.unit === "shares"
                  ? "m shares"
                  : "USDm",
            )}
          </strong>
          <dl>
            {[
              ["Period end", fact.fact.periodEnd],
              ["Filed", fact.fact.filed],
              ["Original unit", fact.fact.unit],
              ["Original value", String(fact.fact.value)],
              ["XBRL concept", fact.fact.tag],
              ["Accession", fact.fact.accession],
              ["Basis", fact.fact.basis],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <a
            className="btn navy full"
            href={fact.fact.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open original SEC filing <ArrowUpRight size={15} />
          </a>
          <p className="muted small">
            Reported source values remain separate from scenario inputs. No
            adjusted earnings or calendarization is implied.
          </p>
        </aside>
      )}
      {history && project && (
        <aside className="inspector">
          <div className="inspector-title">
            <span>
              <History size={17} />
              Version history
            </span>
            <button
              className="icon-btn"
              aria-label="Close version history"
              onClick={() => setHistory(false)}
            >
              <X size={18} />
            </button>
          </div>
          <h3>Saved review copies</h3>
          <p className="muted small">
            Exact narrative and analysis versions, preserved together.
          </p>
          <button className="btn full" onClick={() => void attempt(copy)}>
            <Plus size={14} />
            Save current review copy
          </button>
          {project.snapshots.length === 0 && (
            <p className="empty-note">No review copies saved yet.</p>
          )}
          {project.snapshots.map((s, i) => (
            <button
              className="history-entry"
              key={s.id}
              onClick={() =>
                void attempt(async () => {
                  const snap = await api<ReviewCopy>(
                    `/api/projects/${project.id}/snapshots/${s.id}`,
                  );
                  setReviewCopy(snap);
                  setTab("materials");
                  setHistory(false);
                })
              }
            >
              <FileCheck2 size={16} />
              <span>
                Review copy {project.snapshots.length - i}
                <small>{new Date(s.createdAt).toLocaleString()}</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          ))}
          <h3>Material revisions</h3>
          {project.history.map((h) => (
            <div className="history-entry" key={h.revision}>
              <FileText size={14} />
              <span>
                Revision {h.revision}
                <small>{new Date(h.createdAt).toLocaleString()}</small>
              </span>
            </div>
          ))}
        </aside>
      )}
      {newOpen && (
        <Modal
          title="Start an engagement"
          eyebrow="NEW CLIENT WORK"
          close={() => setNewOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void attempt(create);
            }}
          >
            <label>
              Client
              <select aria-label="Client" defaultValue="PepsiCo">
                <option>PepsiCo</option>
              </select>
              <small className="field-help">
                Public-data demo: PepsiCo with Campbell’s and General Mills
                context.
              </small>
            </label>
            <label>
              Engagement title
              <input
                aria-label="Engagement title"
                value={newTitle}
                maxLength={160}
                required
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>
            <label>
              What should the materials address?
              <textarea
                aria-label="Engagement objective"
                value={objective}
                maxLength={5000}
                onChange={(e) => setObjective(e.target.value)}
              />
            </label>
            <div className="two-fields">
              <label>
                Starting workflow
                <select
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as Kind)}
                >
                  {templates.map((t) => (
                    <option key={t.kind} value={t.kind}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Target date
                <input
                  type="date"
                  aria-label="Target date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="modal-note">
              <ShieldCheck size={15} />
              Public data only. No external service is called to create this
              engagement.
            </div>
            <button
              className="btn navy full"
              disabled={busy || !newTitle.trim()}
            >
              {busy ? (
                <LoaderCircle size={15} className="spinning" />
              ) : (
                <Plus size={15} />
              )}
              Create engagement
            </button>
          </form>
        </Modal>
      )}
      {settings && (
        <Modal
          title="Workspace connections"
          eyebrow="SETTINGS"
          close={() => setSettings(false)}
        >
          <p className="muted">
            The financial workspace runs locally. Connect your own API access
            for AI review, transcription and live voice.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void attempt(async () => {
                const result = await api<{ ai: boolean; quotes: boolean }>(
                  "/api/settings",
                  {
                    ...(openai ? { openai } : {}),
                    ...(alpha ? { alpha } : {}),
                  },
                );
                setCaps({ ...caps, ...result });
                setOpenai("");
                setAlpha("");
                setSettings(false);
                notice("Connections saved for this session.");
              });
            }}
          >
            <label>
              OpenAI API key
              <input
                type="password"
                aria-label="OpenAI API key"
                value={openai}
                autoComplete="off"
                placeholder="Keep current connection if blank"
                onChange={(e) => setOpenai(e.target.value)}
              />
            </label>
            <label>
              Alpha Vantage API key
              <input
                type="password"
                aria-label="Alpha Vantage API key"
                value={alpha}
                autoComplete="off"
                placeholder="Optional dated equity quote access"
                onChange={(e) => setAlpha(e.target.value)}
              />
            </label>
            <div className="connection-state">
              <span className={`status-dot ${caps.ai ? "" : "grey"}`} />
              AI & voice {caps.ai ? "connected" : "not configured"}
              <span>Keys clear when the server restarts.</span>
            </div>
            <p className="small muted">
              Keys stay in server memory and are excluded from documents and
              SQLite. External API use is separately billed. Use public material
              only; no bank-approved or ZDR route is established.
            </p>
            <div className="font-state">
              <TypeIcon />
              <span>
                Brand type: installed Myriad / Myriad Light, with Source Sans 3
                fallback. Proprietary fonts are not bundled.
              </span>
            </div>
            <a
              className="link-button"
              href="/third-party-notices.txt"
              target="_blank"
              rel="noreferrer"
            >
              Open-source acknowledgements <ArrowUpRight size={12} />
            </a>
            <button className="btn navy full" type="submit">
              Save connections
            </button>
          </form>
        </Modal>
      )}
      {exportOpen && project && (
        <Modal
          title="Export client work"
          eyebrow="DELIVERABLES"
          close={() => setExportOpen(false)}
        >
          <p className="muted">
            Use the digital briefing for the client story and the workbook to
            inspect the financial calculation.
          </p>
          <button
            className="export-choice"
            onClick={() => void attempt(exportHTML)}
          >
            <FileText size={22} />
            <span>
              <strong>Client briefing</strong>
              <small>
                Editable narrative + linked calculations · offline HTML
              </small>
            </span>
            <ArrowDownToLine size={17} />
          </button>
          {brief && (
            <a
              className="export-choice"
              href={`/api/briefs/${brief.id}/export.xlsx?version=${brief.version}`}
              onClick={() => setExportOpen(false)}
            >
              <TrendingUp size={22} />
              <span>
                <strong>Financial inspection</strong>
                <small>
                  {LABELS[brief.kind]} · calculation v{brief.version} · XLSX
                </small>
              </span>
              <ArrowDownToLine size={17} />
            </a>
          )}
          <button
            className="export-choice"
            onClick={() =>
              void attempt(async () => {
                await copy();
                setExportOpen(false);
              })
            }
          >
            <FileCheck2 size={22} />
            <span>
              <strong>Save a review copy</strong>
              <small>
                Freeze this narrative with the exact analysis versions
              </small>
            </span>
            <ArrowRight size={17} />
          </button>
          <p className="small muted">
            HTML exports include an audit appendix. Open the file and print to
            PDF if needed. Native PowerPoint export is not implemented.
          </p>
        </Modal>
      )}
      {rebuild && (
        <Modal
          title="Build the client draft"
          eyebrow="CONNECTED WORKFLOW"
          close={() => setRebuild(false)}
        >
          <p>
            Build six editable sections from the current financial analyses and
            source evidence.
          </p>
          <div className="build-steps">
            {[
              "Use the latest calculated scenario versions",
              "Bind figures and comparison blocks",
              "Prepare the client narrative and source section",
              "Save a new material revision",
            ].map((s) => (
              <span key={s}>
                <Check size={14} />
                {s}
              </span>
            ))}
          </div>
          <p className="small muted">
            This replaces the current draft narrative with the local template.
            Saved revisions and review copies are preserved. It does not call an
            AI model.
          </p>
          <button
            className="btn navy full"
            disabled={busy}
            onClick={() => void attempt(generate)}
          >
            {busy ? (
              <LoaderCircle size={15} className="spinning" />
            ) : (
              <Play size={14} />
            )}
            Build draft
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function Modal({
  children,
  title,
  eyebrow,
  close,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow: string;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={close}>
      <div className="modal-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-btn" aria-label="Close dialog" onClick={close}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function InfoIcon() {
  return <Lightbulb size={15} />;
}
function TypeIcon() {
  return <BookOpen size={15} />;
}
