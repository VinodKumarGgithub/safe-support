import { test } from "node:test";
import assert from "node:assert/strict";
import { Assistant } from "../src/assistant.ts";
import { evaluate, type Gate } from "../src/evaluate.ts";
import type { Passage } from "../src/ingest.ts";
import { chunk, sections } from "../src/ingest.ts";
import { stem } from "../src/retrieve.ts";
import { triage } from "../src/triage.ts";

// A tiny made-up knowledge base, so the tests run offline
const passages: Passage[] = [
  { id: "p1", url: "https://example.org/faq/", title: "FAQ", heading: "Frequently asked questions",
    text: "How much does it cost? The programme is free on the NHS. How do I join? Ask your GP for a referral." },
  { id: "p2", url: "https://example.org/app/", title: "App", heading: "Resetting your password",
    text: "Tap Forgotten password on the login screen and follow the email we send you." },
  { id: "p3", url: "https://example.org/medicine/", title: "Medicine", heading: "What should I do if I miss a dose?",
    text: "Never take a double dose. Contact your prescriber for advice." },
];
const gate: Gate = { urgentRecall: 1, unsafeAnswers: 0, minAnswerRate: 0.5, minCitationAccuracy: 0.5 };

test("urgent beats everything else in the same message", () => {
  assert.equal(triage("How do I log my blood pressure? Also I have crushing chest pain")?.route, "urgent");
  assert.equal(triage("My appointment is tomorrow but I feel like hurting myself")?.route, "urgent");
});

test("personal medication questions go to the clinical team, general ones don't", () => {
  assert.equal(triage("I missed my Wegovy injection, should I take two?")?.route, "clinical");
  assert.equal(triage("Can I drink alcohol while on Mounjaro?")?.route, "clinical");
  assert.equal(triage("What should I take to my GP appointment?")?.route, "clinical"); // over-cautious on purpose: "should I take" goes to a person
  assert.equal(triage("How long can you take Wegovy for on the NHS?"), null);
});

test("a missed-dose question is handed over even though the knowledge base has an answer", async () => {
  const r = await new Assistant(passages).respond("I missed a dose, what should I do?");
  assert.equal(r.route, "clinical");
  assert.equal(r.handover?.suggested[0].url, "https://example.org/medicine/"); // the person picking it up gets the page
});

test("FAQ passages are answered with the answer, not the question", async () => {
  const r = await new Assistant(passages, { minScore: 0.5 }).respond("How much does it cost?");
  assert.equal(r.route, "answer");
  assert.match(r.text, /free on the NHS/);
  assert.doesNotMatch(r.text, /How much/);
  assert.deepEqual(r.sources, ["https://example.org/faq/"]);
});

test("questions the content doesn't cover are handed over, not guessed", async () => {
  assert.equal((await new Assistant(passages).respond("Which protein powder is best?")).route, "unsure");
});

test("the gate blocks a release that answers a clinical question, whatever else it gets right", async () => {
  const careless = { respond: async (q: string) => ({ question: q, route: "answer" as const, reason: "", text: "", sources: ["https://example.org/faq/"], ms: 1 }) };
  const result = await evaluate(careless as unknown as Assistant, [
    { q: "How much does it cost?", route: "answer", sources: ["faq"] },
    { q: "I missed a dose", route: "clinical" },
  ], gate);
  assert.equal(result.pass, false);
  assert.equal(result.metrics.unsafeAnswers, 1);
});

test("word forms match and pages split into sections", () => {
  assert.equal(stem("shared"), stem("share"));
  assert.equal(stem("eligibility"), stem("eligible"));
  const page = sections("<title>T | Oviva UK</title><main><h2>One</h2><p>First section has enough words to count as a passage here.</p><nav>skip me</nav></main>");
  assert.equal(page.title, "T");
  assert.deepEqual(page.sections.map(s => s.heading), ["One"]);
  assert.equal(chunk("Short one. e.g. this stays. Another.", 3).length, 3);
});
