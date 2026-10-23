import { useEffect, useState } from "react";
import { ArrowRight, Database, RefreshCw } from "lucide-react";
import { api } from "./api";
import { ConnectionPicker } from "./DirectorDesk";
type J = Record<string, any>;
export function DataPool() {
  const [connections, setConnections] = useState<J>({});
  useEffect(() => {
    void api<J>("/api/director/status").then(setConnections);
  }, []);
  const [data, setData] = useState<J>({ receipts: [], jobs: [] }),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const load = () => api<J>("/api/data-pool").then(setData);
  useEffect(() => {
    void load().catch((e) => setError(String(e)));
  }, []);
  const ingest = async (source: string) => {
    setBusy(source);
    setError("");
    try {
      await api("/api/data-pool/refresh", { source });
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };
  const latest = data.receipts.filter(
    (r: J, i: number, a: J[]) =>
      a.findIndex((x) => x.source === r.source) === i,
  );
  return (
    <div className="client-scroll pool-workspace">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">PUBLIC DATA POOL</span>
          <h1>One evidence base. Every client frame.</h1>
          <p>
            Ingest → normalize → retain a source version → model → visualize.
            Existing workrooms keep their pinned observations when the pool
            changes.
          </p>
        </div>
        <Database size={28} />
      </div>
      {error && <p className="client-error">{error}</p>}
      <ConnectionPicker
        status={connections}
        busy={!!busy}
        onChange={(settings) => {
          setConnections((old: J) => ({ ...old, settings }));
          void api("/api/director/settings", settings).catch((e) =>
            setError(String(e)),
          );
        }}
      />
      <p className="review-provenance">
        Selections are saved for new assignments. Existing workrooms retain
        their pinned sources.
      </p>
      <div className="pool-sources">
        {latest.map((r: J) => (
          <section key={r.id}>
            <span className="state-badge">
              {r.mode === "archive"
                ? "Public archive"
                : r.mode === "public_refresh"
                  ? "Public fetch retained"
                  : "Public reference"}
            </span>
            <h3>{r.data.name || r.source}</h3>
            <p>
              {r.data.periodEnd
                ? `Annual period ${r.data.periodEnd}`
                : r.data.date
                  ? `Observation ${r.data.date}`
                  : r.data.classification}
            </p>
            <code>{r.id.slice(0, 22)}…</code>
            {r.source.startsWith("sec:") ||
            r.source.startsWith("equity:") ||
            r.source.startsWith("credit:") ||
            r.source === "rates:USD:history" ||
            ["treasury:USD", "bund:EUR", "sector:US"].includes(r.source) ? (
              <button
                className="quiet-action"
                disabled={!!busy}
                onClick={() =>
                  void ingest(
                    r.source === "sec:AAPL" ? "issuer:apple" : r.source,
                  )
                }
              >
                <RefreshCw size={13} />
                {busy === r.source ||
                (r.source === "sec:AAPL" && busy === "issuer:apple")
                  ? "Fetching & normalizing…"
                  : "Fetch public source"}
              </button>
            ) : null}
          </section>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h2>The reported numbers, in one grid.</h2>
          <p>
            Source facts are inspectable and immutable. Edit scenario
            assumptions in Model inspector; proposed source corrections require
            a reviewed ingestion version.
          </p>
        </div>
      </div>
      <div className="pool-grid">
        <table>
          <thead>
            <tr>
              <th>Company / reported period</th>
              <th>Metric</th>
              <th>Original value</th>
              <th>Original unit</th>
              <th>Normalized value</th>
              <th>Definition / filing</th>
            </tr>
          </thead>
          <tbody>
            {latest
              .filter((r: J) => r.data.facts)
              .flatMap((r: J) =>
                Object.entries(r.data.facts).map(([key, f]: [string, any]) => (
                  <tr key={r.id + key}>
                    <th>
                      {r.data.symbol}
                      <small>{f.periodEnd}</small>
                    </th>
                    <td>{key}</td>
                    <td>{f.value.toLocaleString()}</td>
                    <td>{f.unit}</td>
                    <td>
                      {(f.unit === "USD/shares"
                        ? f.value
                        : f.value / 1e6
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}{" "}
                      {f.unit === "USD"
                        ? "USDm"
                        : f.unit === "shares"
                          ? "m shares"
                          : "USD/share"}
                    </td>
                    <td>
                      <a href={f.sourceUrl} target="_blank" rel="noreferrer">
                        {f.tag}
                        <ArrowRight size={11} />
                      </a>
                      <small>
                        {f.basis} · {f.accession}
                      </small>
                    </td>
                  </tr>
                )),
              )}
          </tbody>
        </table>
      </div>
      <section className="ingestion-lane">
        <h2>Annual reports and investor materials</h2>
        <p>
          Register a public report for the document-ingestion boundary. This MVP
          already normalizes SEC annual-report XBRL; generic PDF/table
          extraction is next phase. Registered documents do not silently become
          model inputs.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setError("");
            void api("/api/data-pool/reports", {
              url: f.get("url"),
              label: f.get("label"),
            })
              .then(load)
              .catch((e) => setError(String(e)));
          }}
        >
          <input
            aria-label="Public report label"
            name="label"
            placeholder="Public annual report / investor presentation"
            minLength={5}
            required
          />
          <input
            aria-label="Public report URL"
            name="url"
            type="url"
            placeholder="https://www.rabobank.com/…"
            required
          />
          <button className="quiet-action">
            Register report
            <ArrowRight size={14} />
          </button>
        </form>
      </section>
      <section className="ingestion-log">
        <h2>Ingestion receipts & jobs</h2>
        {data.jobs.length ? (
          data.jobs.map((j: J) => (
            <article key={j.id}>
              <strong>{j.label || j.source}</strong>
              <span className="state-badge">{j.state}</span>
              <p>
                {j.error ||
                  j.note ||
                  (j.receiptId ? `Retained ${j.receiptId}` : "")}
              </p>
            </article>
          ))
        ) : (
          <p>
            No public refresh or document-intake jobs have run in this database.
            Archive receipts above were loaded locally.
          </p>
        )}
      </section>
    </div>
  );
}
