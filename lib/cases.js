import crypto from "node:crypto";
import { LANGUAGES, STYLES, benchInfo, deliberate } from "./court";
import { HttpError, text } from "./http";
import { SAMPLES } from "./samples";
import { createStore } from "./store";

const STALE_MS = 3 * 60 * 1000;
const MAX_CONVENES = 8;

// Kept on globalThis so dev reloads don't open a second store or lose the locks.
const g = globalThis;
function getStore() {
  g.__fcStore ||= createStore().catch((err) => {
    g.__fcStore = null;
    throw err;
  });
  return g.__fcStore;
}
const queues = (g.__fcQueues ||= new Map());

// One change at a time per case, so two flatmates filing together don't overwrite each other.
function withCase(id, fn) {
  const run = (queues.get(id) || Promise.resolve()).then(async () => {
    const store = await getStore();
    const c = await store.get(id);
    if (!c) throw new HttpError(404, "No such case.");
    const out = await fn(c);
    await store.put(c);
    return out;
  });
  const tail = run.catch(() => {});
  queues.set(id, tail);
  tail.then(() => queues.get(id) === tail && queues.delete(id));
  return run;
}

async function load(id) {
  const c = await (await getStore()).get(id);
  if (!c) throw new HttpError(404, "No such case.");
  return c;
}

const token = (bytes) => crypto.randomBytes(bytes).toString("base64url");

function newCase({ title, context, names, style, language }) {
  return {
    id: token(6),
    number: `FC-${new Date().getFullYear()}-${String(crypto.randomInt(10000)).padStart(4, "0")}`,
    title,
    context,
    style,
    language,
    createdAt: new Date().toISOString(),
    adminToken: token(12),
    parties: names.map((name) => ({ id: token(4), name, token: token(12), statement: null, appeal: null, accepted: false })),
    status: "open",
    verdict: null,
    history: [],
    progress: null,
    error: null,
    convened: 0,
  };
}

const isStale = (c) =>
  c.status === "deliberating" && Date.now() - new Date(c.deliberationStartedAt).getTime() > STALE_MS;

function view(c, { k, p }) {
  const admin = Boolean(k) && k === c.adminToken;
  const me = p ? c.parties.find((x) => x.token === p) : null;
  const stale = isStale(c);
  const status = stale ? (c.verdict ? "ruled" : "open") : c.status;
  const ruled = status === "ruled";
  return {
    id: c.id,
    number: c.number,
    title: c.title,
    context: c.context,
    style: STYLES[c.style].label,
    language: LANGUAGES[c.language].label,
    createdAt: c.createdAt,
    sample: Boolean(c.sample),
    status,
    admin,
    me: me && { id: me.id, name: me.name, statement: me.statement, appealed: Boolean(me.appeal), accepted: me.accepted },
    parties: c.parties.map((x) => ({
      id: x.id,
      name: x.name,
      filed: Boolean(x.statement),
      accepted: x.accepted,
      ...(admin && { token: x.token }),
      ...(ruled && { statement: x.statement, appeal: x.appeal }),
    })),
    progress: status === "deliberating" ? c.progress : null,
    verdict: c.verdict,
    error: stale ? "The bench was interrupted. Convene it again." : c.error,
  };
}

function partyOf(c, p) {
  const me = c.parties.find((x) => x.token === p);
  if (!me) throw new HttpError(403, "That link isn't for a party in this case.");
  return me;
}

// Starts the bench. Returns the deliberation promise wrapped in an object, so awaiting
// convene() only waits for the bench to sit down, not for the verdict.
async function convene(id) {
  const snapshot = await withCase(id, (c) => {
    if (c.status === "deliberating" && !isStale(c)) return null;
    if (c.convened >= MAX_CONVENES) throw new HttpError(429, "This case has been heard enough times.");
    const { bench, chief } = benchInfo();
    c.convened++;
    c.status = "deliberating";
    c.deliberationStartedAt = new Date().toISOString();
    c.error = null;
    c.progress = { judges: bench.map((judge) => ({ judge, state: "thinking" })), chief, writing: false };
    return structuredClone(c);
  });
  if (!snapshot) return { done: null };

  const done = deliberate(snapshot, (i, state) =>
    withCase(id, (c) => {
      if (!c.progress) return;
      c.progress.judges[i].state = state;
      c.progress.writing = c.progress.judges.every((j) => j.state !== "thinking");
    }),
  )
    .then((verdict) =>
      withCase(id, (c) => {
        if (c.verdict) c.history.push(c.verdict);
        c.verdict = verdict;
        c.status = "ruled";
        c.progress = null;
        for (const p of c.parties) p.accepted = false;
      }),
    )
    .catch((err) => {
      console.error(`case ${id}:`, err.message);
      const busy = err.status === 429 || /\b429\b|rate.?limit/i.test(err.message);
      return withCase(id, (c) => {
        c.status = c.verdict ? "ruled" : "open";
        c.progress = null;
        c.error = busy
          ? "The judges are on a chai break (free-tier rate limit). Convene again in a minute."
          : "The bench couldn't reach a verdict. Convene again in a minute.";
      });
    });
  return { done };
}

export function publicConfig() {
  return {
    ...benchInfo(),
    styles: Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label })),
    languages: Object.entries(LANGUAGES).map(([id, l]) => ({ id, label: l.label })),
    samples: Object.entries(SAMPLES).map(([id, s]) => ({ id, title: s.title, blurb: s.blurb })),
  };
}

export async function caseTitle(id) {
  const c = await (await getStore()).get(id);
  return c?.title ?? null;
}

export async function getView(id, who) {
  return view(await load(id), who);
}

export async function createCase(b) {
  const title = text(b.title, { label: "The case title", min: 3, max: 120 });
  const context = text(b.context, { label: "The background", max: 800 });
  const you = text(b.you, { label: "Your name", min: 1, max: 30 });
  const others = (Array.isArray(b.others) ? b.others : [])
    .map((n) => text(n, { label: "A flatmate's name", max: 30 }))
    .filter(Boolean);
  const names = [you, ...others];
  if (names.length < 2) throw new HttpError(400, "A case needs at least two flatmates.");
  if (names.length > 5) throw new HttpError(400, "The court hears at most five flatmates at once.");
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length)
    throw new HttpError(400, "Each flatmate needs a different name.");

  const c = newCase({
    title,
    context,
    names,
    style: STYLES[b.style] ? b.style : "high-court",
    language: LANGUAGES[b.language] ? b.language : "en",
  });
  await (await getStore()).put(c);
  return { id: c.id, k: c.adminToken, p: c.parties[0].token };
}

export async function createSample(key) {
  const s = SAMPLES[key];
  if (!s) throw new HttpError(404, "No such sample.");
  const c = newCase({ ...s, names: s.parties.map((x) => x.name) });
  c.sample = key;
  c.parties.forEach((p, i) => {
    p.statement = { story: s.parties[i].story, wants: s.parties[i].wants, filedAt: c.createdAt };
  });
  await (await getStore()).put(c);
  const { done } = await convene(c.id);
  return { result: { id: c.id, k: c.adminToken, p: c.parties[0].token }, work: done };
}

export async function fileStatement(id, b, who) {
  const story = text(b.story, { label: "Your side of the story", min: 20, max: 2000 });
  const wants = text(b.wants, { label: "What you want", max: 500 });
  const allFiled = await withCase(id, (c) => {
    if (c.status !== "open" && !isStale(c)) throw new HttpError(409, "The court isn't taking statements right now.");
    partyOf(c, who.p).statement = { story, wants, filedAt: new Date().toISOString() };
    return c.parties.every((x) => x.statement);
  });
  const work = allFiled ? (await convene(id)).done : null;
  return { view: await getView(id, who), work };
}

export async function conveneBench(id, who) {
  const c = await load(id);
  if (who.k !== c.adminToken) throw new HttpError(403, "Only whoever filed the case can convene the bench.");
  if (c.status !== "open" && !isStale(c)) throw new HttpError(409, "The bench has already sat.");
  if (c.parties.filter((x) => x.statement).length < 2) throw new HttpError(409, "The court needs at least two sides first.");
  const work = (await convene(id)).done;
  return { view: await getView(id, who), work };
}

export async function acceptVerdict(id, who) {
  await withCase(id, (c) => {
    if (c.status !== "ruled") throw new HttpError(409, "There's no verdict to sign yet.");
    partyOf(c, who.p).accepted = true;
  });
  return { view: await getView(id, who), work: null };
}

export async function fileAppeal(id, b, who) {
  const appeal = text(b.text, { label: "Your appeal", min: 10, max: 1000 });
  await withCase(id, (c) => {
    if (c.status !== "ruled") throw new HttpError(409, "There's no verdict to appeal yet.");
    const me = partyOf(c, who.p);
    if (me.appeal) throw new HttpError(409, "You've already used your one appeal.");
    me.appeal = { text: appeal, filedAt: new Date().toISOString() };
  });
  const work = (await convene(id)).done;
  return { view: await getView(id, who), work };
}
