import { ArrowRight, CheckCircle2, CircleAlert, Database } from "lucide-react";
import { format } from "./types";
type J = Record<string, any>;
export function EvidenceCoverage({
  room,
  onInspect,
}: {
  room: J;
  onInspect: () => void;
}) {
  const r = room.research,
    rows = r?.requirements || [],
    ready = rows.filter((x: J) => x.status === "available").length;
  return (
    <aside className="evidence-coverage">
      <div className="coverage-title">
        <Database size={15} />
        <h3>Evidence for this assignment</h3>
      </div>
      {r ? (
        <>
          <p className="coverage-summary">
            {ready} ready · {rows.length - ready} qualified or missing
          </p>
          <div className="coverage-list">
            {rows.map((x: J) => (
              <div key={x.id} className={`coverage-${x.status}`}>
                {x.status === "available" ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <CircleAlert size={13} />
                )}
                <span>
                  {x.label}
                  <small>
                    {x.status === "available"
                      ? "Sourced"
                      : x.status === "dated"
                        ? "Dated reference"
                        : x.status === "partial"
                          ? "Partial evidence"
                          : "Still needed"}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p>
          This saved draft predates the request-specific evidence plan. Ask the
          team to enrich the draft, or start a new client story.
        </p>
      )}
      <button className="quiet-action" onClick={onInspect}>
        Inspect evidence and gaps <ArrowRight size={13} />
      </button>
    </aside>
  );
}
export function ResearchInspection({ room }: { room: J }) {
  const r = room.research;
  if (!r)
    return (
      <p className="review-provenance">
        No request-specific market evidence has been assembled for this saved
        revision.
      </p>
    );
  return (
    <section className="research-inspection">
      <div className="section-heading">
        <div>
          <span className="client-eyebrow">REQUEST-SPECIFIC EVIDENCE</span>
          <h2>The data this client decision needs.</h2>
          <p>
            Available observations, dated references and missing inputs stay
            distinct.
          </p>
        </div>
      </div>
      <div className="research-coverage-table">
        {r.requirements.map((x: J) => (
          <article key={x.id}>
            <span className={`research-state ${x.status}`}>{x.status}</span>
            <div>
              <h3>{x.label}</h3>
              <p>{x.why}</p>
              <p>{x.detail}</p>
              {(() => {
                const source =
                  r.sources[x.sourceKey] || room.sources[x.sourceKey];
                const url =
                  source?.sourceUrl ||
                  Object.values(source?.facts || {})
                    .map((f: any) => f.sourceUrl)
                    .find(Boolean);
                return url ? (
                  <a href={String(url)} target="_blank" rel="noreferrer">
                    Open source ↗
                  </a>
                ) : null;
              })()}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function ResearchBlock({ type, room }: { type: string; room: J }) {
  const r = room.research;
  if (!r) return null;
  if (type === "research_summary")
    return (
      <div className="bound-research-grid">
        {r.requirements.map((x: J) => (
          <section key={x.id}>
            <h3>
              {x.label}
              <small className={`research-state ${x.status}`}>{x.status}</small>
            </h3>
            <p>{x.detail}</p>
          </section>
        ))}
      </div>
    );
  if (type === "credit_context") {
    const c = r.sources[`credit:${room.mandate.issuer}`];
    return (
      <div className="bound-credit-context">
        <div className="credit-metric-row">
          {r.creditMetrics.map((x: J) => (
            <div key={x.label}>
              <small>{x.label}</small>
              <strong>{format(x.value, x.unit)}</strong>
            </div>
          ))}
        </div>
        {c ? (
          <>
            <p className="credit-source-date">
              Issuer disclosure {c.date} ·{" "}
              {(c.ratings || [])
                .map((x: J) => `${x.agency} ${x.rating} (${x.outlook})`)
                .join(" · ")}
              . Current affirmation not verified.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Maturity</th>
                  <th>Coupon</th>
                  <th>Original issue spread</th>
                  <th>Original issue yield</th>
                </tr>
              </thead>
              <tbody>
                {c.issues.map((x: J) => (
                  <tr key={x.maturity}>
                    <th>{x.maturity}</th>
                    <td>{format(x.coupon, "%")}</td>
                    <td>{x.issueSpreadBps} bps</td>
                    <td>{format(x.issueYield, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>{c.limitations}</p>
          </>
        ) : (
          <p>
            No issuer-specific rating or debt-term mapping is available.
            Interest expense and rating-agency adjustments require further
            evidence.
          </p>
        )}
      </div>
    );
  }
  if (type === "rate_history") {
    const history = r.sources["rates:USD:history"],
      points = history?.points || [],
      values = points.flatMap((p: J) => [p.y3, p.y5, p.y10]),
      min = Math.min(...values) - 0.1,
      max = Math.max(...values) + 0.1;
    return (
      <div className="bound-rate-history">
        <h3>Government benchmark developments · USD</h3>
        <svg
          viewBox="0 0 500 105"
          role="img"
          aria-label="Dated three, five and ten-year Treasury yield history"
        >
          {[
            ["y3", "#000099"],
            ["y5", "#ff6200"],
            ["y10", "#8999b7"],
          ].map(([key, color]) => (
            <polyline
              key={key}
              points={points
                .map(
                  (p: J, i: number) =>
                    `${10 + (i * 480) / Math.max(points.length - 1, 1)},${85 - ((p[key] - min) / (max - min)) * 72}`,
                )
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="2"
            />
          ))}
          <text x="10" y="102">
            {points[0]?.date}
          </text>
          <text x="410" y="102">
            {points.at(-1)?.date}
          </text>
        </svg>
        <p className="rate-legend">
          <span>3-year</span>
          <span>5-year</span>
          <span>10-year</span>
        </p>
        <table>
          <thead>
            <tr>
              <th>Tenor</th>
              <th>Earlier observation</th>
              <th>Latest observation</th>
              <th>Move</th>
            </tr>
          </thead>
          <tbody>
            {r.timing.map((x: J) => (
              <tr key={x.tenor}>
                <th>{x.tenor} years</th>
                <td>
                  {format(x.yieldThen, "%")} · {x.dateThen}
                </td>
                <td>
                  {format(x.yieldNow, "%")} · {x.dateNow}
                </td>
                <td>{x.changeBps.toFixed(0)} bps</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Approximately ninety calendar days apart. Benchmark movement only;
          issuer spreads, credit and fees can also change. Source: Federal
          Reserve H.15 via FRED.
        </p>
      </div>
    );
  }
  if (type === "equity_context") {
    const rows = Object.entries(r.sources)
      .filter(([key]) => key.startsWith("equity:"))
      .map(([, v]) => v as J);
    return (
      <div className="bound-equity-context">
        <h3>Delayed equity observations · USD</h3>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Price snapshot</th>
              <th>Provider observation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q: J) => (
              <tr key={q.symbol}>
                <th>{q.symbol}</th>
                <td>{format(q.price, "USD/share")}</td>
                <td>{q.providerTimestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Delayed public quote snapshots are not executable prices. Last-trade
          time and snapshot time may differ. Historical diluted shares are not
          the current share register; forecasts, current comparable multiples
          and transaction valuation still require review.
        </p>
      </div>
    );
  }
  return null;
}
