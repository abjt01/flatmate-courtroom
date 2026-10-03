"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, copy, whatsapp } from "./api";
import Verdict from "./Verdict";

const COLORS = ["var(--p0)", "var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)"];

function Header({ view }) {
  return (
    <section className="case-head">
      <p className="eyebrow">Case No. {view.number}</p>
      <h1>{view.title}</h1>
      <p className="vs">
        {view.parties.map((p, i) => (
          <span key={p.id}>
            {i > 0 && <i>vs</i>}
            {p.name}
          </span>
        ))}
      </p>
      <p className="chips">
        <span>{view.style}</span>
        <span>{view.language}</span>
        {view.sample && <span>Sample case</span>}
      </p>
      {view.context && <p className="notice" style={{ marginTop: 12 }}>{view.context}</p>}
    </section>
  );
}

function Statement({ view, send, busy }) {
  const mine = view.me.statement;
  const [editing, setEditing] = useState(!mine);
  const [story, setStory] = useState(mine?.story ?? "");
  const [wants, setWants] = useState(mine?.wants ?? "");
  const waiting = view.parties.filter((p) => !p.filed && p.id !== view.me.id).map((p) => p.name);

  if (mine && !editing) {
    return (
      <section className="card">
        <h2>Your statement is on file</h2>
        <p className="filed">{mine.story}</p>
        {mine.wants && <p className="filed">You asked for: {mine.wants}</p>}
        <p className="notice">
          {waiting.length
            ? `Waiting for ${waiting.join(" and ")}. The bench sits as soon as everyone has filed.`
            : "Everyone has filed."}
        </p>
        <button className="small" onClick={() => setEditing(true)}>
          Edit my statement
        </button>
      </section>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (await send("statement", { story, wants })) setEditing(false);
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Your side, {view.me.name}</h2>
      <p className="notice">
        Only the bench reads this until the verdict is out. After that, everyone in the case can see what each person
        said.
      </p>
      <label>
        What happened?
        <textarea
          rows={6}
          maxLength={2000}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Tell the court in your own words. Specifics help: how often, since when, what was agreed."
        />
        <span className="hint">{story.trim().length}/2000</span>
      </label>
      <label>
        What do you want the court to order? <span className="opt">optional</span>
        <textarea
          rows={2}
          maxLength={500}
          value={wants}
          onChange={(e) => setWants(e.target.value)}
          placeholder="e.g. dishes done the same night, or a weekly rota"
        />
      </label>
      <div className="actions">
        <button className="primary" type="submit" disabled={busy || story.trim().length < 20}>
          {busy ? "Filing…" : mine ? "Update my statement" : "File my statement"}
        </button>
        {mine && (
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Parties({ view, colorOf }) {
  const [copied, setCopied] = useState(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const linkFor = (p) => `${origin}/case/${view.id}?p=${p.token}`;
  const summons = (p) =>
    `⚖️ You've been summoned to Flatmate Court.\n\nCase: "${view.title}"\n\nTell the bench your side here. Nobody else sees what you write until the verdict:\n${linkFor(p)}`;

  async function copyLink(p) {
    await copy(linkFor(p));
    setCopied(p.id);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="card">
      <h2>The parties</h2>
      {view.admin && (
        <p className="notice">
          Send each flatmate their own link. Keep this page&apos;s link too, it&apos;s how you get back here and convene
          the bench.
        </p>
      )}
      <ul className="parties">
        {view.parties.map((p) => (
          <li key={p.id}>
            <span className="dot" style={{ "--c": colorOf(p.name) }} />
            <span className="who">
              {p.name}
              {view.me?.id === p.id && " (you)"}
            </span>
            <span className={`status ${p.filed ? "ok" : "wait"}`}>{p.filed ? "✓ Filed" : "Waiting"}</span>
            {view.admin && p.token && view.me?.id !== p.id && (
              <span className="share">
                <button className="small" onClick={() => copyLink(p)}>
                  {copied === p.id ? "Copied" : "Copy link"}
                </button>
                <a className="btn small" href={whatsapp(summons(p))} target="_blank" rel="noreferrer">
                  Send on WhatsApp
                </a>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Convene({ view, send, busy }) {
  const filed = view.parties.filter((p) => p.filed);
  const missing = view.parties.filter((p) => !p.filed).map((p) => p.name);
  if (filed.length < 2) return null;
  if (!missing.length && !view.error) return null;
  // only the filer can call the bench early; anyone can retry once everyone has filed
  if (missing.length && !view.admin) return null;
  return (
    <section className="card">
      <h2>{missing.length ? "Don't want to wait?" : "Try again"}</h2>
      <p className="notice">
        {missing.length
          ? `${missing.join(" and ")} hasn't filed yet. You can have the bench rule without them, and the judgment will say so.`
          : "The bench didn't finish last time."}
      </p>
      <button className="primary" disabled={busy} onClick={() => send("convene")}>
        {missing.length ? "Convene the bench now" : "Convene the bench again"}
      </button>
    </section>
  );
}

function BenchLive({ view }) {
  const { judges, chief, writing } = view.progress;
  const label = { thinking: "Deliberating…", done: "Has ruled", absent: "Couldn't make it" };
  return (
    <section className="card bench-live" aria-live="polite">
      <h2>{view.verdict ? "The bench is hearing the appeal" : "The bench is deliberating"}</h2>
      <p className="notice">Each judge reads the case on their own. This usually takes a few seconds.</p>
      <div className="judges">
        {judges.map((j) => (
          <div key={j.judge} className={`judge ${j.state}`}>
            <span className="gavel">⚖️</span>
            <b>{j.judge}</b>
            <small>{label[j.state]}</small>
          </div>
        ))}
      </div>
      <p className="notice">{writing ? `${chief} is writing the judgment…` : `${chief} waits for the bench.`}</p>
    </section>
  );
}

function Actions({ view, send, busy }) {
  const [appealing, setAppealing] = useState(false);
  const [appeal, setAppeal] = useState("");
  const v = view.verdict;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicLink = `${origin}/case/${view.id}`;
  const shareText = [
    `⚖️ Flatmate Court has ruled on "${view.title}"`,
    `\n${v.headline}`,
    `\nBlame: ${view.parties.map((p) => `${p.name} ${v.blame[p.name]}%`).join(", ")}`,
    `\nOrders:\n${v.orders.map((o) => `• ${o.party}: ${o.order}`).join("\n")}`,
    `\nFull judgment: ${publicLink}`,
  ].join("\n");

  async function submitAppeal(e) {
    e.preventDefault();
    if (await send("appeal", { text: appeal })) setAppealing(false);
  }

  return (
    <section className="card no-print" id="actions">
      {view.me && (
        <>
          <h2>{view.me.accepted ? "You've signed this verdict" : `Over to you, ${view.me.name}`}</h2>
          <div className="actions">
            {!view.me.accepted && (
              <button className="primary" disabled={busy} onClick={() => send("accept")}>
                Sign the verdict
              </button>
            )}
            {!view.me.appealed && !appealing && (
              <button disabled={busy} onClick={() => setAppealing(true)}>
                Appeal
              </button>
            )}
          </div>
          {appealing && (
            <form onSubmit={submitAppeal} style={{ marginTop: 16 }}>
              <label>
                Your appeal
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={appeal}
                  onChange={(e) => setAppeal(e.target.value)}
                  placeholder="What did the court get wrong, or what did it not know?"
                />
                <span className="hint">
                  You get one appeal. The whole bench hears the case again with your new argument, and it can go
                  either way.
                </span>
              </label>
              <div className="actions">
                <button className="primary" type="submit" disabled={busy || appeal.trim().length < 10}>
                  File the appeal
                </button>
                <button type="button" onClick={() => setAppealing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {view.me.appealed && <p className="notice">You&apos;ve used your appeal.</p>}
        </>
      )}
      <h2 style={{ marginTop: view.me ? 22 : 0 }}>Share the judgment</h2>
      <div className="actions">
        <a className="btn" href={whatsapp(shareText)} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
        <button onClick={() => copy(publicLink)}>Copy link</button>
        <button onClick={() => window.print()}>Print</button>
      </div>
      {view.sample && (
        <p className="notice" style={{ marginTop: 14 }}>
          This was a sample case. <Link href="/">File a real one</Link>.
        </p>
      )}
    </section>
  );
}

export default function CaseRoom({ id, k, p }) {
  const [view, setView] = useState(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    if (k) q.set("k", k);
    if (p) q.set("p", p);
    return q.toString();
  }, [k, p]);

  const colorOf = useCallback(
    (name) => COLORS[Math.max(0, view?.parties.findIndex((x) => x.name === name) ?? 0) % COLORS.length],
    [view],
  );

  const load = useCallback(async () => {
    try {
      const next = await api(`/api/cases/${id}?${qs}`);
      setView(next);
      return next;
    } catch (err) {
      if (err.status === 404) setMissing(true);
      return null;
    }
  }, [id, qs]);

  useEffect(() => {
    let timer;
    let alive = true;
    async function tick() {
      const next = document.hidden ? null : await load();
      if (!alive) return;
      const status = next?.status;
      timer = setTimeout(tick, status === "deliberating" ? 2500 : status === "open" ? 5000 : 15000);
    }
    tick();
    const wake = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [load]);

  async function send(action, body = {}) {
    setBusy(true);
    setError("");
    try {
      setView(await api(`/api/cases/${id}/${action}?${qs}`, body));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <section className="hero">
        <h1>No such case.</h1>
        <p className="lede">
          The link might be cut off. <Link href="/">File a new case</Link>.
        </p>
      </section>
    );
  }
  if (!view) return <p className="notice">Opening the case file…</p>;

  return (
    <>
      <Header view={view} />
      {(error || view.error) && (
        <p className="error" role="alert">
          {error || view.error}
        </p>
      )}

      {view.status === "open" && (
        <>
          {view.me && <Statement key={view.me.statement?.filedAt ?? "new"} view={view} send={send} busy={busy} />}
          <Parties view={view} colorOf={colorOf} />
          {(view.admin || view.me) && <Convene view={view} send={send} busy={busy} />}
          {!view.me && !view.admin && (
            <p className="notice">
              This case is waiting for statements. If you&apos;re one of the flatmates, open the private link you were
              sent.
            </p>
          )}
        </>
      )}

      {view.status === "deliberating" && view.progress && <BenchLive view={view} />}

      {view.status === "ruled" && view.verdict && (
        <>
          <Verdict view={view} colorOf={colorOf} />
          <Actions view={view} send={send} busy={busy} />
        </>
      )}
    </>
  );
}
