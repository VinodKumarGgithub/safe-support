import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Assistant, extractive } from "./assistant.ts";
import { evaluate, pct, report, type Case, type Gate } from "./evaluate.ts";
import { ingest, type Passage } from "./ingest.ts";

const { positionals } = parseArgs({ allowPositionals: true, strict: false });
const [command, ...rest] = positionals;
const load = (): Passage[] => {
  if (!existsSync("data/passages.json")) throw new Error("Run `npm run ingest` first to fetch the public pages");
  return JSON.parse(readFileSync("data/passages.json", "utf8"));
};

if (command === "ingest") {
  const p = await ingest();
  console.log(`${p.length} passages → data/passages.json`);
} else if (command === "ask") {
  const r = await new Assistant(load()).respond(rest.join(" "));
  console.log(`[${r.route}] ${r.reason}\n\n${r.text}${r.sources.length ? `\n\nSource: ${r.sources.join(", ")}` : ""}` +
    (r.handover ? `\n\nHanded to: ${r.handover.to}${r.handover.suggested.length ? ` (with: ${r.handover.suggested.map(s => s.heading).join("; ")})` : ""}` : ""));
} else if (command === "eval") {
  const cases: Case[] = JSON.parse(readFileSync("eval/questions.json", "utf8"));
  const gate: Gate = JSON.parse(readFileSync("eval/gate.json", "utf8"));
  const result = await evaluate(new Assistant(load()), cases, gate);
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/eval.md", report(result, extractive.name));
  const m = result.metrics;
  console.log(`${result.pass ? "PASS" : "BLOCKED"} – urgent recall ${pct(m.urgentRecall)}, unsafe answers ${m.unsafeAnswers}, ` +
    `routine answered ${pct(m.answerRate)} (right page ${pct(m.citationAccuracy)}), routed as labelled ${pct(m.routedCorrectly)}. Report: reports/eval.md` +
    (result.failures.length ? `\n  ${result.failures.join("\n  ")}` : ""));
  process.exitCode = result.pass ? 0 : 1;
} else if (command === "shadow") {
  // Shadow mode: drafts for staff to accept, edit or reject; no patient sees them
  const assistant = new Assistant(load());
  const questions = readFileSync(rest[0], "utf8").split("\n").map(l => l.trim()).filter(Boolean);
  const lines = ["| Question | Route | Draft reply | Source | Staff: accept / edit / reject |", "| --- | --- | --- | --- | --- |"];
  for (const q of questions) {
    const r = await assistant.respond(q);
    lines.push(`| ${q} | ${r.route} (${r.reason}) | ${r.text} | ${r.sources.join(" ")} | |`);
  }
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/shadow.md", lines.join("\n") + "\n");
  console.log(`${questions.length} drafts → reports/shadow.md`);
} else {
  console.error("usage: node src/cli.ts ingest | ask QUESTION | eval | shadow FILE");
  process.exitCode = 2;
}
