import type { Passage } from "./ingest.ts";

const STOP = new Set(("a an and are as at be but by can could do does for from get got have how i if in into is it its me my of on or our " +
  "so that the their them then there these this to was we what when where which who why will with would you your oviva " +
  "myself yourself im ive need").split(" "));

/** Lower-case words without stop words, trimmed to a rough stem so "shared", "sharing" and "share" all match. */
export function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(t => t.length > 1 && !STOP.has(t)).map(stem);
}

export function stem(t: string): string {
  if (t.length <= 3) return t;
  t = t.replace(/(ies|ied)$/, "y").replace(/(ing|ed|es|s)$/, "").replace(/([ai])bility$/, "$1bl");
  return t.replace(/e$/, "").replace(/([b-df-hj-np-tv-z])\1$/, "$1");
}

export interface Hit { passage: Passage; score: number; coverage: number }

/** BM25 over passages; the heading counts twice because it names what the passage answers. */
export class Index {
  private docs: { passage: Passage; tf: Map<string, number>; len: number }[];
  private df = new Map<string, number>();
  private avg: number;

  constructor(passages: Passage[]) {
    this.docs = passages.map(p => {
      const words = [...terms(p.heading), ...terms(p.heading), ...terms(p.text)];
      const tf = new Map<string, number>();
      for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1);
      return { passage: p, tf, len: words.length };
    });
    for (const d of this.docs) for (const w of d.tf.keys()) this.df.set(w, (this.df.get(w) ?? 0) + 1);
    this.avg = this.docs.reduce((s, d) => s + d.len, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, k = 3): Hit[] {
    const q = [...new Set(terms(query))];
    const n = this.docs.length, k1 = 1.2, b = 0.75;
    return this.docs.map(d => {
      let score = 0, matched = 0;
      for (const w of q) {
        const f = d.tf.get(w);
        if (!f) continue;
        matched++;
        const idf = Math.log(1 + (n - this.df.get(w)! + 0.5) / (this.df.get(w)! + 0.5));
        score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / this.avg));
      }
      const heading = new Set(terms(d.passage.heading));
      const shared = q.filter(w => heading.has(w)).length;
      score += shared ? 4 * shared / new Set([...q, ...heading]).size : 0; // a heading that asks the same question
      return { passage: d.passage, score, coverage: q.length ? matched / q.length : 0 };
    }).filter(h => h.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  }
}
