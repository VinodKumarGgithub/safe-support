import type { Passage } from "./ingest.ts";
import { Index, terms, type Hit } from "./retrieve.ts";
import { triage, type Route } from "./triage.ts";

export interface Reply {
  question: string;
  route: Route;
  reason: string; // the rule that fired, or why retrieval answered or didn't
  text: string; // what the patient would see
  sources: string[];
  handover?: { to: string; suggested: { url: string; heading: string }[] }; // the packet a person picks up
  ms: number;
}

/** Anything that turns retrieved passages into an answer. The extractive one quotes the content; an LLM can replace it. */
export interface Writer { name: string; write(question: string, hits: Hit[]): Promise<{ text: string; sources: string[] }> }

const EMERGENCY = "https://oviva.com/uk/en/our-programmes/"; // "If you have a medical emergency … call 999 or NHS 111"
const MEDICATION_PAGES = /wegovy|injections/;

export const extractive: Writer = {
  name: "extractive (quotes the approved text)",
  async write(question, hits) {
    const top = hits[0].passage;
    const want = new Set(terms(question));
    const sentences = (top.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [top.text]).map(s => s.trim());
    const overlap = (s: string) => terms(s).filter(t => want.has(t)).length;
    // FAQ passages hold "question? answer." pairs: when one of their questions matches, quote the answer that follows it
    const asked = sentences.map((s, i) => ({ i, n: s.endsWith("?") ? overlap(s) : 0 })).sort((a, b) => b.n - a.n)[0];
    let picked: number[];
    if (asked?.n >= 2 || (asked?.n && asked.n === want.size)) {
      picked = [];
      for (let i = asked.i + 1; i < sentences.length && !sentences[i].endsWith("?") && picked.length < 2; i++) picked.push(i);
    } else {
      picked = sentences.map((s, i) => ({ i, n: s.endsWith("?") ? -1 : overlap(s) })).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 2).map(x => x.i);
    }
    let text = picked.sort((a, b) => a - b).map(i => sentences[i]).join(" ");
    if (MEDICATION_PAGES.test(top.url)) text += " This is general information. For anything about your own treatment, ask your Oviva prescriber.";
    return { text, sources: [top.url] };
  },
};

export class Assistant {
  private index: Index;
  private writer: Writer;
  private minScore: number;
  private minCoverage: number;

  constructor(passages: Passage[], { writer = extractive, minScore = 4, minCoverage = 0.6 } = {}) {
    this.index = new Index(passages);
    this.writer = writer;
    this.minScore = minScore;
    this.minCoverage = minCoverage;
  }

  async respond(question: string): Promise<Reply> {
    const start = performance.now();
    const hits = this.index.search(question, 3);
    const suggested = hits.slice(0, 2).map(h => ({ url: h.passage.url, heading: h.passage.heading }));
    const done = (r: Omit<Reply, "question" | "ms">): Reply => ({ question, ...r, ms: performance.now() - start });
    const flagged = triage(question);
    if (flagged?.route === "urgent") return done({ route: "urgent", reason: flagged.rule, sources: [EMERGENCY],
      text: "This sounds urgent. If it's an emergency, call 999 now. For urgent medical advice, call NHS 111. I've also flagged your message to your Oviva clinical team.",
      handover: { to: "clinical team – urgent", suggested } });
    if (flagged?.route === "clinical") return done({ route: "clinical", reason: flagged.rule, sources: [],
      text: "This is one for your clinical team, so I've passed your message to them and they'll reply in the app. If it becomes urgent, call NHS 111, or 999 in an emergency.",
      handover: { to: "clinical team", suggested } });
    if (flagged?.route === "account") return done({ route: "account", reason: flagged.rule, sources: [],
      text: "I can't see or change your account, so I've passed your message to the support team with the details.",
      handover: { to: "support team", suggested } });
    const best = hits[0];
    if (!best || best.score < this.minScore || best.coverage < this.minCoverage) return done({ route: "unsure",
      reason: best ? `best match too weak (score ${best.score.toFixed(1)}, ${Math.round(best.coverage * 100)}% of the question's words)` : "nothing matched",
      sources: [], text: "I couldn't find this in Oviva's information, so I've passed it to a person rather than guess.",
      handover: { to: "support team", suggested } });
    const answer = await this.writer.write(question, hits);
    return done({ route: "answer", reason: `"${best.passage.heading}" (score ${best.score.toFixed(1)})`, ...answer });
  }
}
