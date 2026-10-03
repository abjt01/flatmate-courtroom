// Cases with the longest, strangest data the app accepts, for the layout tests.
const now = new Date().toISOString();
const run = (ch, n) => ch.repeat(n);

const NAMES = ["Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "प्रियंका शर्मा-वर्मा", "Raj 🐐🐐🐐 the GOAT of Flat 302", "<b>bold</b> & \"quotes\" 'x'", "Zed"];
const STORY =
  "It started on a Monday. https://example.com/" +
  run("x", 180) +
  " " +
  "Then it happened again and again. ".repeat(40) +
  run("A", 220) +
  "\n\nNew paragraph with <script>alert('xss')</script> and an emoji 🧽.";

const party = (i, name, filed, extra = {}) => ({
  id: `p${i}`,
  name,
  token: `tok${i}`,
  statement: filed ? { story: STORY.slice(0, 2000), wants: run("W", 500), filedAt: now } : null,
  appeal: null,
  accepted: false,
  ...extra,
});

const base = (id, parties, more = {}) => ({
  id,
  number: "FC-2026-0001",
  title: run("T", 60) + " Who keeps leaving dishes in the sink every single night of the w",
  context: ("Background " + run("b", 120) + " ").repeat(6).slice(0, 800),
  style: "filmy",
  language: "hinglish",
  createdAt: now,
  adminToken: "admin",
  parties,
  status: "open",
  verdict: null,
  history: [],
  progress: null,
  error: null,
  convened: 0,
  ...more,
});

const blameOf = (names, first, rest) => Object.fromEntries(names.map((n, i) => [n, i === 0 ? first : rest]));

const bigVerdict = (names) => ({
  headline: "The Extremely Long Headline Of A Ruling That Goes On And On " + run("H", 50),
  opening: "Opening " + run("o", 300),
  appealNote: "Appeal note " + run("n", 200),
  sides: names.map((n) => ({ party: n, summary: `${n} says ` + "a lot of things. ".repeat(20) + run("s", 90) })),
  findings: Array.from({ length: 8 }, (_, i) => `Finding ${i + 1} ` + run("f", 150)),
  orders: Array.from({ length: 10 }, (_, i) => ({ party: names[i % names.length], order: "Order " + run("r", 250) })),
  rota: Array.from({ length: 12 }, (_, i) => ({
    task: "Task " + run("t", 75),
    who: i === 11 ? "Someone not in the case " + run("q", 20) : names[i % names.length],
    when: "When " + run("w", 75),
  })),
  houseRules: Array.from({ length: 3 }, (_, i) => `Rule ${i + 1} ` + run("u", 220)),
  dissent: "Dissent " + run("d", 300),
  closing: "Closing " + run("c", 190),
  blame: blameOf(names, 96, 1),
  contempt: [{ party: names[3], reason: "Tried to instruct the court " + run("z", 200) }],
  bench: [
    { judge: "Justice GPT-OSS 120B", model: "a", blame: blameOf(names, 100, 0), reasoning: run("y", 600), dissent: false },
    { judge: "Justice Qwen", model: "b", blame: blameOf(names, 92, 2), reasoning: "ok", dissent: false },
    { judge: "Justice With An Unreasonably Long Name For A Judge", model: "c", blame: blameOf(names, 20, 20), reasoning: "split", dissent: true },
  ],
  absent: ["Justice GPT-OSS 20B"],
  chief: "Justice GPT-OSS 120B",
  appeal: true,
  decidedAt: now,
});

const emptyVerdict = {
  headline: "Judgment",
  opening: "",
  appealNote: null,
  sides: [],
  findings: [],
  orders: [],
  rota: [],
  houseRules: [],
  dissent: null,
  closing: "",
  blame: { A: 100, B: 0 },
  contempt: [],
  bench: [{ judge: "Justice Gemma", model: "gemma3:4b", blame: { A: 100, B: 0 }, reasoning: "", dissent: false }],
  absent: [],
  chief: "Justice Gemma",
  appeal: false,
  decidedAt: now,
};

export const EDGE_CASES = {
  open: base("open", NAMES.map((n, i) => party(i, n, i < 2))),
  ruled: base(
    "ruled",
    NAMES.map((n, i) => party(i, n, true, { accepted: true, appeal: i === 1 ? { text: run("p", 900), heard: true, filedAt: now } : null })),
    { status: "ruled", verdict: bigVerdict(NAMES) },
  ),
  empty: base("empty", [party(0, "A", true), party(1, "B", false)], {
    title: "Abc",
    context: "",
    style: "high-court",
    language: "en",
    status: "ruled",
    verdict: emptyVerdict,
  }),
  deliberating: base("deliberating", NAMES.map((n, i) => party(i, n, true)), {
    status: "deliberating",
    deliberationStartedAt: "2099-01-01T00:00:00.000Z",
    progress: {
      judges: [
        { judge: "Justice GPT-OSS 120B", state: "done" },
        { judge: "Justice Qwen", state: "thinking" },
        { judge: "Justice GPT-OSS 20B", state: "absent" },
      ],
      chief: "Justice GPT-OSS 120B",
      writing: false,
    },
  }),
  failed: base("failed", NAMES.slice(0, 3).map((n, i) => party(i, n, true)), {
    error: "The bench couldn't reach a verdict. Convene again in a minute.",
  }),
  stale: base("stale", NAMES.slice(0, 2).map((n, i) => party(i, n, true)), {
    status: "deliberating",
    deliberationStartedAt: "2020-01-01T00:00:00.000Z",
    progress: { judges: [{ judge: "Justice Qwen", state: "thinking" }], chief: "Justice Qwen", writing: false },
  }),
};
