"use client";

import { useState } from "react";
import { api, caseUrl } from "./api";

export default function SampleCases({ samples }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function open(id) {
    setBusy(id);
    setError("");
    try {
      window.location.href = caseUrl(await api(`/api/samples/${id}`, {}));
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <>
      <div className="samples">
        {samples.map((s) => (
          <button key={s.id} type="button" className="sample" disabled={Boolean(busy)} onClick={() => open(s.id)}>
            <b>{s.title}</b>
            <small>{busy === s.id ? "Calling the court to order…" : s.blurb}</small>
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </>
  );
}
