function Bar({ blame, names, colorOf, className }) {
  return (
    <div className={className}>
      {names
        .filter((n) => blame[n] > 0)
        .map((n) => (
          <span key={n} style={{ "--c": colorOf(n), flex: blame[n] }} title={`${n} ${blame[n]}%`} />
        ))}
    </div>
  );
}

export default function Verdict({ view, colorOf }) {
  const v = view.verdict;
  const names = view.parties.map((p) => p.name);
  const decided = new Date(v.decidedAt);
  const allSigned = view.parties.every((p) => p.accepted);

  return (
    <article className="verdict">
      <p className="court-of">In the Flatmate Court</p>
      <p className="court-meta">
        Case No. {view.number} · {v.appeal ? "On appeal · " : ""}
        {decided.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <p className="vs" style={{ textAlign: "center" }}>
        {names.map((n, i) => (
          <span key={n}>
            {i > 0 && <i>vs</i>}
            {n}
          </span>
        ))}
      </p>
      <p className="court-meta">In the matter of “{view.title}”</p>

      <h2 className="headline">{v.headline}</h2>
      {v.opening && <p className="opening">{v.opening}</p>}

      {v.appealNote && (
        <>
          <h3>On appeal</h3>
          <p className="appeal-note">{v.appealNote}</p>
        </>
      )}

      {v.sides.length > 0 && (
        <>
          <h3>The parties&apos; cases</h3>
          {v.sides.map((s) => (
            <p key={s.party} className="side" style={{ "--c": colorOf(s.party) }}>
              <b>{s.party}.</b> {s.summary}
            </p>
          ))}
        </>
      )}

      {v.findings.length > 0 && (
        <>
          <h3>Findings</h3>
          <ul>
            {v.findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Who&apos;s to blame</h3>
      <Bar className="blame-bar" blame={v.blame} names={names} colorOf={colorOf} />
      <ul className="legend">
        {names.map((n) => (
          <li key={n}>
            <span className="dot" style={{ "--c": colorOf(n) }} />
            {n} <strong>{v.blame[n]}%</strong>
          </li>
        ))}
      </ul>
      <div className="bench-split">
        {v.bench.map((o) => (
          <div key={o.judge}>
            <span>
              {o.judge}
              {o.dissent && <span className="tag"> · dissents</span>}
            </span>
            <Bar className="mini" blame={o.blame} names={names} colorOf={colorOf} />
          </div>
        ))}
      </div>
      {v.absent?.length > 0 && (
        <p className="notice">{v.absent.join(" and ")} couldn&apos;t make it to court, so the bench ruled without them.</p>
      )}
      <details className="reasons">
        <summary>Read each judge&apos;s reasoning</summary>
        {v.bench.map((o) => (
          <p key={o.judge}>
            <b>{o.judge}:</b> {o.reasoning}
          </p>
        ))}
      </details>

      {v.dissent && (
        <>
          <h3>Dissent</h3>
          <p className="dissent">{v.dissent}</p>
        </>
      )}

      <h3>Orders of the court</h3>
      {v.orders.length ? (
        <ol>
          {v.orders.map((o, i) => (
            <li key={i} className="order" style={{ "--c": colorOf(o.party) }}>
              <b>{o.party}</b>: {o.order}
            </li>
          ))}
        </ol>
      ) : (
        <p>No orders. Everyone carry on.</p>
      )}

      {v.rota.length > 0 && (
        <>
          <h3>Rota</h3>
          <table className="rota">
            <thead>
              <tr>
                <th>Task</th>
                <th>Who</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {v.rota.map((r, i) => (
                <tr key={i}>
                  <td>{r.task}</td>
                  <td>{r.who}</td>
                  <td>{r.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {v.houseRules.length > 0 && (
        <>
          <h3>New house rules</h3>
          <ol>
            {v.houseRules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </>
      )}

      {v.contempt.length > 0 && (
        <>
          <h3>Contempt of court</h3>
          <ul>
            {v.contempt.map((x) => (
              <li key={x.party} className="contempt">
                <b>{x.party}</b>: {x.reason}
              </li>
            ))}
          </ul>
        </>
      )}

      {v.closing && <p className="closing">{v.closing}</p>}
      <div className="seal" aria-hidden="true">
        FLATMATE
        <br />
        COURT
        <br />
        {decided.getFullYear()}
      </div>

      <h3>Signatures</h3>
      <ul className="signatures">
        {view.parties.map((p) => (
          <li key={p.id}>
            <span>{p.name}</span>
            {p.accepted ? <span className="signed">✓ Signed</span> : <span className="unsigned">Not signed yet</span>}
          </li>
        ))}
      </ul>
      {allSigned && <p className="final">Signed by everyone. This verdict is final.</p>}

      <details className="reasons">
        <summary>Statements on record</summary>
        {view.parties.map((p) => (
          <div key={p.id} style={{ marginTop: 10 }}>
            <b style={{ color: "var(--ink)" }}>{p.name}</b>
            <p className="record">
              {p.statement
                ? `${p.statement.story}${p.statement.wants ? `\n\nAsked for: ${p.statement.wants}` : ""}`
                : "Didn't file a statement."}
            </p>
            {p.appeal && <p className="record">Appeal: {p.appeal.text}</p>}
          </div>
        ))}
      </details>
    </article>
  );
}
