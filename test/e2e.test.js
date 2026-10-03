// Real-browser tests: layout at phone-to-desktop widths in both themes, then every flow clicked through.
// Needs `npm run build` and Chrome (set CHROME_PATH if it isn't in a usual place).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import puppeteer from "puppeteer-core";
import { EDGE_CASES } from "./fixtures/edge-cases.js";
import { startServer, tempDataDir } from "./helpers/server.js";

const CHROME =
  process.env.CHROME_PATH ||
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((p) => fs.existsSync(p));
if (!CHROME && process.env.CI) throw new Error("Chrome not found; set CHROME_PATH");

const RESULTS = path.resolve("test-results");
const WIDTHS = [320, 390, 768, 1280];
const THEMES = ["light", "dark"];

let browser;
before(async () => {
  if (!CHROME) return;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : [],
  });
});
after(() => browser?.close());

// Runs in the page: anything wider than the viewport or spilling out of its box.
function layoutProblems() {
  const vw = document.documentElement.clientWidth;
  const out = [];
  const desc = (el) => {
    const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls} "${(el.innerText || "").trim().slice(0, 30).replace(/\s+/g, " ")}"`;
  };
  if (document.documentElement.scrollWidth > vw) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px > ${vw}px)`);
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if ((cs.opacity === "0" && cs.position === "absolute") || el.closest("[aria-hidden=true]")) continue;
    if (r.right > vw + 0.5 || r.left < -0.5) out.push(`off screen: ${desc(el)}`);
    if (!["INPUT", "TEXTAREA"].includes(el.tagName) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      out.push(`content wider than its box: ${desc(el)}`);
    const p = el.parentElement;
    if (p && p !== document.body && !getComputedStyle(p).display.startsWith("inline")) {
      const spill = r.right - p.getBoundingClientRect().right;
      if (spill > 1) out.push(`spills ${Math.round(spill)}px out of ${desc(p)}: ${desc(el)}`);
    }
  }
  return [...new Set(out)];
}

async function newPage(width, theme = "light", errors = []) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // the browser logs expected 4xx answers (validation, missing case) as console errors
    if (m.type() === "error" && !/status of 4\d\d/.test(m.text())) errors.push(m.text());
  });
  await page.setViewport({ width, height: 900, isMobile: width < 600, hasTouch: width < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
  return page;
}

describe("layout", { skip: !CHROME && "Chrome not found" }, () => {
  let server;
  before(async () => (server = await startServer({ dataDir: tempDataDir(EDGE_CASES) })));
  after(() => server?.stop());

  const pages = [
    ["home", "/"],
    ["open case, filer", "/case/open?k=admin&p=tok0"],
    ["open case, party yet to file", "/case/open?p=tok2"],
    ["open case, outsider", "/case/open"],
    ["huge verdict, party with appeal form open", "/case/ruled?p=tok0"],
    ["huge verdict, outsider", "/case/ruled"],
    ["empty verdict", "/case/empty?p=tok1"],
    ["bench deliberating", "/case/deliberating?p=tok0"],
    ["failed bench, filer", "/case/failed?k=admin&p=tok0"],
    ["failed bench, party", "/case/failed?p=tok1"],
    ["missing case", "/case/does-not-exist"],
    ["404 page", "/no/such/page"],
  ];

  for (const [name, url] of pages) {
    test(name, async () => {
      const failures = [];
      for (const width of WIDTHS) {
        for (const theme of THEMES) {
          const errors = [];
          const page = await newPage(width, theme, errors);
          await page.goto(server.base + url, { waitUntil: "networkidle2" });
          await page.waitForFunction(() => !document.body.innerText.includes("Opening the case file"), { timeout: 8000 });
          await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
          const [appeal] = await page.$$("xpath/.//button[normalize-space()='Appeal']");
          if (appeal) await appeal.click();
          const problems = [...(await page.evaluate(layoutProblems)), ...errors.map((e) => `browser error: ${e}`)];
          if (problems.length) {
            fs.mkdirSync(RESULTS, { recursive: true });
            const file = path.join(RESULTS, `${name.replace(/\W+/g, "-")}-${width}-${theme}.png`);
            await page.screenshot({ path: file, fullPage: true });
            failures.push(`${width}px ${theme}:\n    ${problems.slice(0, 8).join("\n    ")}`);
          }
          await page.close();
        }
      }
      assert.equal(failures.length, 0, failures.join("\n"));
    });
  }
});

describe("flows", { skip: !CHROME && "Chrome not found" }, () => {
  let server;
  const errors = [];
  before(async () => {
    server = await startServer();
    await browser.defaultBrowserContext().overridePermissions(server.base, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
  });
  after(() => server?.stop());

  const open = async (url, width = 390) => {
    const page = await newPage(width, "light", errors);
    page.on("dialog", (d) => d.dismiss());
    await page.goto(server.base + url, { waitUntil: "networkidle2" });
    return page;
  };
  const text = (page) => page.evaluate(() => document.body.innerText);
  const waitText = (page, s, timeout = 15000) =>
    page.waitForFunction((s) => document.body.innerText.includes(s), { timeout }, s);
  async function click(page, label) {
    await page.bringToFront();
    const [el] = await page.$$(`xpath/.//*[self::button or self::a or self::label][normalize-space()='${label}']`);
    assert.ok(el, `no "${label}" on ${page.url()}`);
    await el.click();
  }
  async function type(page, selector, value, index = 0) {
    await page.bringToFront();
    const el = (await page.$$(selector))[index];
    await el.focus();
    await el.evaluate((e) => e.select());
    await el.press("Backspace");
    await el.type(value);
  }
  const disabled = (page, label) =>
    page.$$eval(`xpath/.//button[normalize-space()='${label}']`, (els) => els[0]?.disabled ?? null);
  const flatmateInputs = (page) => page.$$("input[aria-label=\"Flatmate's name\"]");
  const linkFrom = (summons) => {
    const u = new URL(summons.match(/https?:\/\/\S+/)[0]);
    return u.pathname + u.search;
  };
  const summonses = (page) =>
    page.$$eval("a.btn", (as) => as.map((a) => decodeURIComponent(a.href.split("text=")[1] || "")).filter(Boolean));
  const onCasePage = (page) => page.waitForFunction(() => location.pathname.startsWith("/case/"), { timeout: 10000 });

  let filer;
  let neel;

  test("filing a case validates and lands on the case page", async () => {
    filer = await open("/");
    await click(filer, "File the case");
    await waitText(filer, "The case title is too short.");
    await type(filer, "input[maxlength='120']", "Who finished the milk");
    await type(filer, "input[autocomplete='given-name']", "Ishaan");
    for (let i = 0; i < 3; i++) await click(filer, "+ Add another flatmate");
    assert.equal((await flatmateInputs(filer)).length, 4);
    assert.ok(!(await text(filer)).includes("+ Add another flatmate"), "add button hides at four");
    for (let i = 0; i < 3; i++) await (await filer.$$("button[aria-label='Remove']"))[0].click();
    assert.equal((await flatmateInputs(filer)).length, 1);
    await type(filer, "input[aria-label=\"Flatmate's name\"]", "ishaan ");
    await click(filer, "File the case");
    await waitText(filer, "Each flatmate needs a different name.");
    await type(filer, "input[aria-label=\"Flatmate's name\"]", "Neel");
    await click(filer, "Filmy");
    await click(filer, "File the case");
    await onCasePage(filer);
    await waitText(filer, "Your side, Ishaan");
    assert.match(filer.url(), /\?k=.+&p=.+/);
  });

  test("statements file, edit, and stay private", async () => {
    assert.equal(await disabled(filer, "File my statement"), true);
    await type(filer, "textarea", "too short");
    assert.equal(await disabled(filer, "File my statement"), true);
    await type(filer, "textarea", "Neel finished the milk three mornings in a row and left the empty packet in the fridge.");
    await click(filer, "File my statement");
    await waitText(filer, "Waiting for Neel");
    await click(filer, "Edit my statement");
    await type(filer, "textarea", "Neel finished the milk FOUR mornings in a row and left the empty packet in the fridge.");
    await click(filer, "Update my statement");
    await waitText(filer, "FOUR mornings");
    assert.ok(!(await text(filer)).includes("Convene the bench now"));

    const [summons] = await summonses(filer);
    assert.match(summons, /Who finished the milk/);
    await click(filer, "Copy link");
    await waitText(filer, "Copied");

    const outsider = await open(linkFrom(summons).split("?")[0]);
    await waitText(outsider, "waiting for statements");
    assert.ok(!(await text(outsider)).includes("FOUR mornings"));
    neel = await open(linkFrom(summons));
    await waitText(neel, "Your side, Neel");
    assert.ok(!(await text(neel)).includes("FOUR mornings"));
    assert.ok(!(await text(neel)).includes("Copy link"));
  });

  test("the last statement convenes the bench and every page gets the verdict", async () => {
    await type(neel, "textarea", "I had one glass. Ishaan makes chai for his whole study group with our milk.");
    await click(neel, "File my statement");
    await waitText(neel, "IN THE FLATMATE COURT");
    await filer.bringToFront();
    await waitText(filer, "IN THE FLATMATE COURT", 20000);
    await neel.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    assert.ok((await text(neel)).includes("FOUR mornings"), "statements go on record after the verdict");
  });

  test("signing, then the one appeal", async () => {
    await click(neel, "Sign the verdict");
    await waitText(neel, "You've signed this verdict");
    await filer.bringToFront();
    await filer.reload({ waitUntil: "networkidle2" });
    await waitText(filer, "IN THE FLATMATE COURT");
    assert.match(await text(filer), /Neel\s*✓ Signed/);
    await click(filer, "Appeal");
    assert.equal(await disabled(filer, "File the appeal"), true);
    await type(filer, "textarea", "The chai is a separate issue; the milk was mine.");
    await click(filer, "File the appeal");
    await waitText(filer, "On appeal", 20000);
    await waitText(filer, "You've used your appeal");
    assert.equal((await filer.$$("xpath/.//button[normalize-space()='Appeal']")).length, 0);
    await neel.bringToFront();
    await neel.reload({ waitUntil: "networkidle2" });
    await waitText(neel, "Sign the verdict");
  });

  test("the filer can convene without a slow flatmate", async () => {
    const home = await open("/");
    await type(home, "input[maxlength='120']", "AC wars");
    await type(home, "input[autocomplete='given-name']", "Meera");
    await type(home, "input[aria-label=\"Flatmate's name\"]", "Tanvi");
    await click(home, "+ Add another flatmate");
    await type(home, "input[aria-label=\"Flatmate's name\"]", "Riya", 1);
    await click(home, "File the case");
    await onCasePage(home);
    await waitText(home, "Your side, Meera");
    await type(home, "textarea", "The AC runs all night and I pay a third of it, which is fine by me.");
    await click(home, "File my statement");
    await waitText(home, "Your statement is on file");
    const [tanviSummons, riyaSummons] = await summonses(home);
    const tanvi = await open(linkFrom(tanviSummons));
    await waitText(tanvi, "Your side, Tanvi");
    await type(tanvi, "textarea", "The bill doubled since Meera started running the AC at 18 every night.");
    await click(tanvi, "File my statement");
    await waitText(tanvi, "Your statement is on file");
    assert.ok(!(await text(tanvi)).includes("Convene the bench now"));
    await home.bringToFront();
    await waitText(home, "Riya hasn't filed yet", 8000);
    await click(home, "Convene the bench now");
    await waitText(home, "IN THE FLATMATE COURT", 20000);
    await home.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    assert.ok((await text(home)).includes("Didn't file a statement."));
    const riya = await open(linkFrom(riyaSummons));
    await waitText(riya, "IN THE FLATMATE COURT");
    assert.equal(await riya.$("textarea"), null);
  });

  test("a sample case reaches a verdict", async () => {
    const home = await open("/");
    await (await home.$$("button.sample"))[0].click();
    await onCasePage(home);
    await waitText(home, "IN THE FLATMATE COURT", 20000);
    await waitText(home, "This was a sample case.");
  });

  test("no browser errors along the way", () => {
    assert.deepEqual([...new Set(errors)], []);
  });
});
