export async function api(path, body) {
  const res = await fetch(
    path,
    body === undefined
      ? { cache: "no-store" }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const err = new Error(data.error || `Something went wrong (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const caseUrl = ({ id, k, p }) => `/case/${id}?${new URLSearchParams({ k, p })}`;

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this:", text);
    return false;
  }
}

export const whatsapp = (message) => `https://wa.me/?text=${encodeURIComponent(message)}`;
