import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileOutput,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  SquareArrowOutUpRight,
} from "lucide-react";
import type { Brief, Data, Working, Fact } from "./types";
import { format, INPUTS, LABELS, number } from "./types";

export function Chart({ brief }: { brief: Brief }) {
  const chart = brief.model.chart;
  if (chart.type === "curve") {
    const points = chart.points!;
    const lo = Math.floor(Math.min(...points.map((p) => p.yield)) - 0.2);
    const hi = Math.ceil(Math.max(...points.map((p) => p.yield)) + 0.2);
    const x = (v: number) => 45 + ((v - 1) / 29) * 440;
    const y = (v: number) => 175 - ((v - lo) / (hi - lo)) * 140;
    return (
      <svg
        viewBox="0 0 520 220"
        className="financial-chart"
        role="img"
        aria-label={chart.label}
      >
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line
              x1="45"
              y1={y(v)}
              x2="490"
              y2={y(v)}
              stroke="#e9ebf1"
              strokeDasharray="3 4"
            />
            <text x="8" y={y(v) + 4}>
              {v.toFixed(1)}%
            </text>
          </g>
        ))}
        <polyline
          points={points.map((p) => `${x(p.years)},${y(p.yield)}`).join(" ")}
          fill="none"
          stroke="#0058ff"
          strokeWidth="2.5"
        />
        {points.map((p) => (
          <circle
            key={p.years}
            cx={x(p.years)}
            cy={y(p.yield)}
            r={p.years === brief.params.tenor ? 5 : 3}
            fill={p.years === brief.params.tenor ? "#ff6500" : "#0058ff"}
          />
        ))}
        {[1, 5, 10, 20, 30].map((v) => (
          <text key={v} x={x(v)} y="204" textAnchor="middle">
            {v}Y
          </text>
        ))}
      </svg>
    );
  }
  const items = chart.items!;
  const max = Math.max(...items.map((x) => x.value)) * 1.18;
  return (
    <svg
      viewBox="0 0 520 220"
      className="financial-chart"
      role="img"
      aria-label={chart.label}
    >
      {items.map((item, i) => (
        <g key={item.label}>
          <text x="15" y={32 + i * 95}>
            {item.label}
          </text>
          <rect
            x="15"
            y={44 + i * 95}
            width={(Math.max(0, item.value) / max) * 410}
            height="30"
            rx="2"
            fill={i ? "#ff6500" : "#0058ff"}
          />
          <text x={23 + (Math.max(0, item.value) / max) * 410} y={65 + i * 95}>
            {number(item.value, 1)}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function Metrics({ brief }: { brief: Brief }) {
  return (
    <div className="metric-grid">
      {brief.model.metrics.slice(0, 3).map((m) => (
        <div className="metric-cell" key={m.key}>
          <span>{m.label}</span>
          <strong>{format(m.value, m.unit)}</strong>
        </div>
      ))}
    </div>
  );
}

function WorkingTable({ brief }: { brief: Brief }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<Working>[]>(
    () => [
      {
        accessorKey: "label",
        header: "Calculation",
        cell: (i) => (
          <span className="working-label">{i.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "value",
        header: "Output",
        cell: (i) => format(i.getValue<number>(), i.row.original.unit),
      },
      { accessorKey: "formula", header: "Method / convention" },
    ],
    [],
  );
  const table = useReactTable({
    data: brief.model.workings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div className="table-scroll">
      <table className="data-table workings">
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th key={h.id}>
                  <button onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    <ArrowDownUp size={11} />
                  </button>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Analysis({
  brief,
  data,
  onSave,
  onInsert,
  busy,
  onInspect,
}: {
  brief: Brief;
  data: Data;
  onSave: (p: Record<string, number>) => Promise<void>;
  onInsert: () => void;
  busy: boolean;
  onInspect: () => void;
}) {
  const [params, setParams] = useState(brief.params);
  const [detail, setDetail] = useState(false);
  useEffect(() => setParams(brief.params), [brief.id, brief.version]);
  const changed = JSON.stringify(params) !== JSON.stringify(brief.params);
  return (
    <div className="analysis-layout">
      <aside className="assumption-sheet">
        <div className="section-heading">
          <span>
            <SlidersHorizontal size={15} /> Scenario inputs
          </span>
          <span className="tiny-tag">Editable</span>
        </div>
        <p className="muted small">
          Market terms below are assumptions. Public-source financials stay
          separate.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave(params);
          }}
        >
          {Object.entries(params).map(([key, value]) => (
            <label className="assumption-input" key={key}>
              <span>
                {INPUTS[key][0]}
                <small>{INPUTS[key][1]}</small>
              </span>
              <input
                aria-label={INPUTS[key][0]}
                name={key}
                type="number"
                step={INPUTS[key][2]}
                value={Number.isNaN(value) ? "" : value}
                required
                onChange={(e) =>
                  setParams({ ...params, [key]: e.currentTarget.valueAsNumber })
                }
              />
            </label>
          ))}
          <button className="btn navy full" disabled={busy || !changed}>
            <RefreshCw size={14} />
            {busy
              ? "Recalculating…"
              : changed
                ? "Recalculate scenario"
                : "Scenario is up to date"}
          </button>
        </form>
        <div className="source-footnote">
          <ShieldCheck size={15} />
          <p>
            Financial engine
            <br />
            <strong>{brief.model.engine}</strong>
            <br />
            Treasury reference {data.curve.date}
          </p>
        </div>
        <button className="link-button" onClick={onInspect}>
          Inspect source financials <ArrowUpRight size={13} />
        </button>
      </aside>
      <div className="analysis-results">
        <div className="result-toolbar">
          <div>
            <span className="eyebrow">
              SCENARIO {brief.version.toString().padStart(2, "0")}
            </span>
            <h2>{LABELS[brief.kind]}</h2>
          </div>
          <button className="btn" onClick={onInsert}>
            <FileOutput size={15} />
            Use in client materials <ArrowUpRight size={14} />
          </button>
        </div>
        <Metrics brief={brief} />
        <div className="analysis-visuals">
          <section className="white-panel">
            <div className="panel-title">
              <h3>{brief.model.chart.label}</h3>
              <span className="tiny-tag">
                {brief.kind === "bond" ? "Dated observation" : "Calculated"}
              </span>
            </div>
            <Chart brief={brief} />
            <div className="panel-note">
              {brief.kind === "bond"
                ? `U.S. Treasury · ${data.curve.date}. Issuer credit spread is assumed.`
                : brief.kind === "buyback"
                  ? "Full-period share-count effect; cash opportunity cost included."
                  : "Financing for the equity cheque; existing target debt assumed outstanding."}
            </div>
          </section>
          <section className="white-panel sensitivity">
            <div className="panel-title">
              <h3>Sensitivity</h3>
              <span className="tiny-tag">
                {brief.kind === "bond"
                  ? "Credit spread"
                  : brief.kind === "buyback"
                    ? "Execution price"
                    : "Offer premium"}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>
                    {brief.kind === "bond" ? "Price / 100" : "EPS change"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {brief.model.sensitivity.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>
                      {number(row.value, 2)}
                      {brief.kind === "bond" ? "" : "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="panel-note">
              {brief.kind === "acquisition"
                ? "Before purchase accounting and one-off costs."
                : "All other assumptions held constant."}
            </p>
          </section>
        </div>
        <section className="insight-strip">
          <div className="insight-icon">
            <Info size={18} />
          </div>
          <div>
            <strong>What this means for the discussion</strong>
            <p>{brief.model.summary}</p>
          </div>
        </section>
        <section className="white-panel">
          <button className="expand-heading" onClick={() => setDetail(!detail)}>
            <span>
              <h3>Calculation workings</h3>
              <small>
                {brief.model.workings.length} inspectable outputs · inputs →
                method → result
              </small>
            </span>
            <ChevronDown size={18} className={detail ? "rotated" : ""} />
          </button>
          {detail && <WorkingTable brief={brief} />}
        </section>
        <details className="limitations">
          <summary>
            Conventions & limitations <span>{brief.model.warnings.length}</span>
          </summary>
          {brief.model.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </details>
      </div>
    </div>
  );
}

export function CompanyTable({
  data,
  onFact,
}: {
  data: Data;
  onFact?: (symbol: string, key: string, f: Fact) => void;
}) {
  const keys = [
    ["Revenue", "revenue"],
    ["Operating income", "operatingIncome"],
    ["Earnings to common", "netIncome"],
    ["Total debt", "debt"],
    ["Cash & equivalents", "cash"],
    ["Diluted shares (m)", "shares"],
  ];
  return (
    <div className="table-scroll">
      <table className="data-table company-table">
        <thead>
          <tr>
            <th>USD millions, except shares</th>
            {data.companies.map((c) => (
              <th key={c.symbol}>
                {c.name}
                <small>
                  FY{c.fiscalYear} · {c.periodEnd}
                </small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map(([label, key]) => (
            <tr key={key}>
              <td>{label}</td>
              {data.companies.map((c) => (
                <td key={c.symbol}>
                  <button
                    className="source-number"
                    onClick={() => onFact?.(c.symbol, key, c.facts[key])}
                    disabled={!onFact}
                  >
                    {number(c.facts[key].value / 1e6, 0)}
                    {onFact && <SquareArrowOutUpRight size={10} />}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Sources({
  data,
  onFact,
}: {
  data: Data;
  onFact: (s: string, k: string, f: Fact) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <div className="sources-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">CONNECTED EVIDENCE</span>
          <h2>Source library</h2>
          <p>
            Trace financial facts to their original filing, period and
            definition.
          </p>
        </div>
        <label className="search-field">
          <Search size={15} />
          <input
            placeholder="Search a company or metric"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="source-summary">
        <div>
          <span className="source-provider">SEC</span>
          <span>
            <strong>Reported company financials</strong>
            <small>
              {data.companies.length} companies ·{" "}
              {data.companies.reduce(
                (n, c) => n + Object.keys(c.facts).length,
                0,
              )}{" "}
              facts · annual filings
            </small>
          </span>
          <span className="connected">
            <Check size={12} /> Loaded
          </span>
        </div>
        <div>
          <span className="source-provider treasury">US</span>
          <span>
            <strong>U.S. Treasury</strong>
            <small>USD par yield curve · {data.curve.date}</small>
          </span>
          <a href={data.curve.sourceUrl} target="_blank" rel="noreferrer">
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      {data.companies.map((c) => {
        const facts = Object.entries(c.facts).filter(([k]) =>
          `${c.name} ${c.symbol} ${k}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        );
        return (
          facts.length > 0 && (
            <section className="white-panel source-company" key={c.symbol}>
              <div className="panel-title">
                <h3>
                  {c.name} <span>{c.symbol}</span>
                </h3>
                <span className="tiny-tag">
                  FY{c.fiscalYear} · {c.periodEnd}
                </span>
              </div>
              <div className="fact-rows">
                {facts.map(([k, f]) => (
                  <button
                    className="fact-row"
                    onClick={() => onFact(c.symbol, k, f)}
                    key={k}
                  >
                    <span>{k.replace(/([A-Z])/g, " $1")}</span>
                    <strong>
                      {format(
                        f.unit === "USD/shares" ? f.value : f.value / 1e6,
                        f.unit === "USD/shares"
                          ? "USD/share"
                          : f.unit === "shares"
                            ? "m shares"
                            : "USDm",
                      )}
                    </strong>
                    <small>{f.tag}</small>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            </section>
          )
        );
      })}
      <p className="muted small">
        Fiscal periods differ. The public snapshot is as of {data.asOf}; prices
        and issuer spreads are separate scenario assumptions. Institutional
        provider access is not configured.
      </p>
    </div>
  );
}
