// API behaviour against the built app in mock mode. Run `npm run build` first.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { EDGE_CASES } from "./fixtures/edge-cases.js";
import { client, startServer, tempDataDir, waitFor } from "./helpers/server.js";

let server;
let call;

before(async () => {
  server = await startServer({ dataDir: tempDataDir({ stale: EDGE_CASES.stale }) });
  call = client(server.base);
});
after(() => server?.stop());

async function newCase(names = ["A", "B"], extra = {}) {
  const { status, data } = await call("POST", "/api/cases", {
    body: { title: "Who finished the milk", you: names[0], others: names.slice(1), ...extra },
  });
  assert.equal(status, 201);
  const admin = await call("GET", `/api/cases/${data.id}`, { k: data.k });
  return { id: data.id, k: data.k, tokens: admin.data.parties.map((p) => p.token) };
}
const story = (who) => ({ story: `${who} says the milk ran out three mornings in a row this week.` });
const statusOf = async (id) => (await call("GET", `/api/cases/${id}`)).data.status;
const ruled = (id) => waitFor(async () => (await statusOf(id)) === "ruled");

describe("filing a case", () => {
  test("rejects bad input with a readable message", async () => {
    const cases = [
      [{ title: "x", you: "A", others: ["B"] }, "The case title is too short."],
      [{ title: "abc", you: "   ", others: ["B"] }, "Your name is required."],
      [{ title: "abc", you: "A", others: [123, null] }, "A case needs at least two flatmates."],
      [{ title: "abc", you: "A", others: ["B", "C", "D", "E", "F"] }, "The court hears at most five flatmates at once."],
      [{ title: "abc", you: "Ana", others: ["ana "] }, "Each flatmate needs a different name."],
      [{ title: "t".repeat(121), you: "A", others: ["B"] }, "The case title is too long (max 120 characters)."],
      [{ title: "abc", you: "a".repeat(31), others: ["B"] }, "Your name is too long (max 30 characters)."],
    ];
    for (const [body, error] of cases) {
      const res = await call("POST", "/api/cases", { body });
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.data.error, error);
    }
  });

  test("rejects malformed and oversized bodies", async () => {
    assert.equal((await call("POST", "/api/cases", { body: "{not json" })).status, 400);
    assert.equal((await call("POST", "/api/cases", { body: "[1,2]" })).status, 400);
    assert.equal((await call("POST", "/api/cases", { body: { title: "x".repeat(70_000) } })).status, 413);
  });

  test("unknown style and language fall back to defaults", async () => {
    const { id } = await newCase(["A", "B"], { style: "<script>", language: "klingon" });
    const { data } = await call("GET", `/api/cases/${id}`);
    assert.equal(data.style, "High Court");
    assert.equal(data.language, "English");
  });
});

describe("tokens and privacy", () => {
  test("only the admin sees everyone's links", async () => {
    const { id, k, tokens } = await newCase();
    assert.equal(tokens.length, 2);
    const asParty = await call("GET", `/api/cases/${id}`, { p: tokens[1] });
    assert.ok(asParty.data.parties.every((p) => !("token" in p)));
    const asViewer = await call("GET", `/api/cases/${id}`);
    assert.equal(asViewer.data.me, null);
    assert.equal(asViewer.data.admin, false);
    assert.equal((await call("GET", `/api/cases/${id}`, { k })).data.admin, true);
  });

  test("statements stay hidden until the verdict", async () => {
    const { id, tokens } = await newCase(["A", "B", "C"]);
    await call("POST", `/api/cases/${id}/statement`, { p: tokens[0], body: story("A") });
    for (const who of [{ p: tokens[1] }, {}]) {
      const { data } = await call("GET", `/api/cases/${id}`, who);
      assert.ok(data.parties.every((p) => !("statement" in p)));
    }
  });

  test("wrong or foreign tokens are refused", async () => {
    const one = await newCase();
    const two = await newCase();
    assert.equal((await call("POST", `/api/cases/${one.id}/statement`, { p: "nope", body: story("x") })).status, 403);
    assert.equal((await call("POST", `/api/cases/${one.id}/statement`, { k: one.k, body: story("x") })).status, 403);
    assert.equal((await call("POST", `/api/cases/${one.id}/statement`, { p: two.tokens[0], body: story("x") })).status, 403);
    assert.equal((await call("POST", `/api/cases/${one.id}/delete`, { k: one.k, body: {} })).status, 404);
    assert.equal((await call("GET", `/api/cases/${"x".repeat(2000)}`)).status, 404);
  });

  test("nothing to sign or appeal before a verdict", async () => {
    const { id, k, tokens } = await newCase();
    assert.equal((await call("POST", `/api/cases/${id}/accept`, { p: tokens[0], body: {} })).status, 409);
    assert.equal((await call("POST", `/api/cases/${id}/appeal`, { p: tokens[0], body: { text: "appeal text here" } })).status, 409);
    assert.equal((await call("POST", `/api/cases/${id}/convene`, { k, body: {} })).status, 409);
  });
});

describe("the bench", () => {
  test("two flatmates filing at the same instant both count, and the bench sits once", async () => {
    const { id, k, tokens } = await newCase();
    await Promise.all(tokens.map((p, i) => call("POST", `/api/cases/${id}/statement`, { p, body: story(`P${i}`) })));
    const busy = await call("POST", `/api/cases/${id}/convene`, { k, body: {} });
    assert.equal(busy.status, 409);
    await ruled(id);
    const { data } = await call("GET", `/api/cases/${id}`);
    assert.ok(data.parties.every((p) => p.filed && p.statement));
    assert.equal((await call("POST", `/api/cases/${id}/statement`, { p: tokens[0], body: story("late") })).status, 409);
  });

  test("the filer can convene early; the absent party is on record", async () => {
    const { id, k, tokens } = await newCase(["A", "B", "C"]);
    await call("POST", `/api/cases/${id}/statement`, { p: tokens[0], body: story("A") });
    assert.equal((await call("POST", `/api/cases/${id}/convene`, { k, body: {} })).status, 409, "needs two sides");
    await call("POST", `/api/cases/${id}/statement`, { p: tokens[1], body: story("B") });
    assert.equal((await call("POST", `/api/cases/${id}/convene`, { p: tokens[1], body: {} })).status, 403, "only the filer, early");
    assert.equal((await call("POST", `/api/cases/${id}/convene`, { k, body: {} })).status, 200);
    await ruled(id);
    const { data } = await call("GET", `/api/cases/${id}`);
    assert.equal(data.parties[2].statement, null);
  });

  test("signing and the one appeal", async () => {
    const { id, tokens } = await newCase();
    await Promise.all(tokens.map((p, i) => call("POST", `/api/cases/${id}/statement`, { p, body: story(`P${i}`) })));
    await ruled(id);
    assert.equal((await call("POST", `/api/cases/${id}/accept`, { body: {} })).status, 403, "viewers can't sign");
    const signed = await call("POST", `/api/cases/${id}/accept`, { p: tokens[1], body: {} });
    assert.equal(signed.data.parties[1].accepted, true);
    assert.equal((await call("POST", `/api/cases/${id}/appeal`, { p: tokens[0], body: { text: "no" } })).status, 400);
    assert.equal((await call("POST", `/api/cases/${id}/appeal`, { p: tokens[0], body: { text: "The milk was mine." } })).status, 200);
    await ruled(id);
    const { data } = await call("GET", `/api/cases/${id}`, { p: tokens[0] });
    assert.equal(data.verdict.appeal, true);
    assert.equal(data.me.appealed, true);
    assert.equal(data.parties[1].accepted, false, "signatures reset after an appeal");
    assert.equal((await call("POST", `/api/cases/${id}/appeal`, { p: tokens[0], body: { text: "Again please." } })).status, 409);
  });

  test("sample cases reach a verdict", async () => {
    const { status, data } = await call("POST", "/api/samples/sink", { body: {} });
    assert.equal(status, 201);
    await ruled(data.id);
    assert.equal((await call("POST", "/api/samples/nope", { body: {} })).status, 404);
  });

  test("a bench interrupted by a restart can sit again", async () => {
    const view = await call("GET", "/api/cases/stale");
    assert.equal(view.data.status, "open");
    assert.match(view.data.error, /interrupted/);
    assert.equal((await call("POST", "/api/cases/stale/convene", { k: "admin", body: {} })).status, 200);
    await ruled("stale");
  });
});

describe("rate limiting", () => {
  test("one address can't file endless cases", async () => {
    const limited = await startServer({ env: { DISABLE_RATE_LIMIT: "0" } });
    const api = client(limited.base);
    const statuses = [];
    for (let i = 0; i < 21; i++) {
      statuses.push((await api("POST", "/api/cases", { body: { title: `Case ${i}`, you: "A", others: ["B"] } })).status);
    }
    await limited.stop();
    assert.deepEqual(statuses.slice(0, 20), Array(20).fill(201));
    assert.equal(statuses[20], 429);
  });
});

describe("when the models are down", () => {
  test("nothing gets stuck and a failed appeal isn't used up", async () => {
    const dataDir = tempDataDir();
    let live = await startServer({ dataDir });
    let api = client(live.base);
    const { data: created } = await api("POST", "/api/cases", { body: { title: "Outage", you: "A", others: ["B"] } });
    const tokens = (await api("GET", `/api/cases/${created.id}`, { k: created.k })).data.parties.map((p) => p.token);
    await Promise.all(tokens.map((p, i) => api("POST", `/api/cases/${created.id}/statement`, { p, body: story(`P${i}`) })));
    await waitFor(async () => (await api("GET", `/api/cases/${created.id}`)).data.status === "ruled");
    const second = await api("POST", "/api/cases", { body: { title: "Outage two", you: "X", others: ["Y"] } });
    const tokens2 = (await api("GET", `/api/cases/${second.data.id}`, { k: second.data.k })).data.parties.map((p) => p.token);
    await live.stop();

    // a closed port: every judge fails straight away
    live = await startServer({ dataDir, env: { MOCK_COURT: "0", LLM_BASE_URL: "http://127.0.0.1:9/v1" } });
    api = client(live.base);
    await api("POST", `/api/cases/${created.id}/appeal`, { p: tokens[0], body: { text: "This should fail to be heard." } });
    const failedAppeal = await waitFor(async () => {
      const { data } = await api("GET", `/api/cases/${created.id}`, { p: tokens[0] });
      return data.status === "ruled" && data.error ? data : null;
    });
    assert.match(failedAppeal.error, /hasn't been used up/);
    assert.equal(failedAppeal.me.appealed, false);

    await Promise.all(tokens2.map((p, i) => api("POST", `/api/cases/${second.data.id}/statement`, { p, body: story(`Q${i}`) })));
    const failedFirst = await waitFor(async () => {
      const { data } = await api("GET", `/api/cases/${second.data.id}`);
      return data.status === "open" && data.error ? data : null;
    });
    assert.ok(failedFirst.error);
    await live.stop();

    live = await startServer({ dataDir });
    api = client(live.base);
    assert.equal((await api("POST", `/api/cases/${second.data.id}/convene`, { p: tokens2[1], body: {} })).status, 200, "any party can retry");
    assert.equal((await api("POST", `/api/cases/${created.id}/appeal`, { p: tokens[0], body: { text: "Trying again now." } })).status, 200);
    await waitFor(async () => (await api("GET", `/api/cases/${second.data.id}`)).data.status === "ruled");
    const heard = await waitFor(async () => {
      const { data } = await api("GET", `/api/cases/${created.id}`, { p: tokens[0] });
      return data.me.appealed ? data : null;
    });
    assert.equal(heard.verdict.appeal, true);
    await live.stop();
  });
});
