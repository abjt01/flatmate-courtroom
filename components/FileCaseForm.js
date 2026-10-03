"use client";

import { useState } from "react";
import { api, caseUrl } from "./api";

const MAX_OTHERS = 4;

function Choices({ name, items, value, onChange }) {
  return (
    <div className="choices">
      {items.map((it) => (
        <label key={it.id}>
          <input type="radio" name={name} value={it.id} checked={value === it.id} onChange={() => onChange(it.id)} />
          <span>{it.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function FileCaseForm({ styles, languages }) {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [you, setYou] = useState("");
  const [others, setOthers] = useState([""]);
  const [style, setStyle] = useState(styles[0].id);
  const [language, setLanguage] = useState(languages[0].id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setOther = (i, v) => setOthers((list) => list.map((x, j) => (j === i ? v : x)));
  const removeOther = (i) => setOthers((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [""]));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api("/api/cases", {
        title,
        context,
        you,
        others: others.filter((n) => n.trim()),
        style,
        language,
      });
      window.location.href = caseUrl(res);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>File a case</h2>
      <label>
        What&apos;s the case about?
        <input
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Who keeps leaving dishes in the sink"
        />
      </label>
      <label>
        Background the court should know <span className="opt">optional</span>
        <textarea
          maxLength={800}
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="We split rent and bills equally. Dishes are meant to be done the same night."
        />
        <span className="hint">
          Everyone will see this, so keep it to the facts. Your side of the story comes next, in private.
        </span>
      </label>
      <label>
        Your name
        <input
          type="text"
          maxLength={30}
          value={you}
          onChange={(e) => setYou(e.target.value)}
          placeholder="Aarav"
          autoComplete="given-name"
        />
      </label>
      <fieldset>
        <legend>Flatmates in this case</legend>
        {others.map((name, i) => (
          <div className="row" key={i}>
            <input
              type="text"
              maxLength={30}
              value={name}
              onChange={(e) => setOther(i, e.target.value)}
              placeholder="Flatmate's name"
              aria-label="Flatmate's name"
            />
            <button type="button" className="icon" aria-label="Remove" onClick={() => removeOther(i)}>
              ✕
            </button>
          </div>
        ))}
        {others.length < MAX_OTHERS && (
          <button type="button" className="link" onClick={() => setOthers((list) => [...list, ""])}>
            + Add another flatmate
          </button>
        )}
      </fieldset>
      <fieldset>
        <legend>Court style</legend>
        <Choices name="style" items={styles} value={style} onChange={setStyle} />
      </fieldset>
      <fieldset>
        <legend>Language</legend>
        <Choices name="language" items={languages} value={language} onChange={setLanguage} />
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Filing…" : "File the case"}
      </button>
      <p className="hint" style={{ marginTop: 10 }}>
        You&apos;ll get a private link for each flatmate to send on WhatsApp. No sign-up.
      </p>
    </form>
  );
}
