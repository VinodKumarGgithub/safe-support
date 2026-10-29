import { mkdirSync, writeFileSync } from "node:fs";
import { SOURCES } from "./sources.ts";

export interface Passage { id: string; url: string; title: string; heading: string; text: string }

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", hellip: "…", pound: "£" };
const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m);
const clean = (s: string) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** A page's main content as (heading, text) sections; navigation, scripts, forms and footers are dropped. */
export function sections(html: string): { title: string; sections: { heading: string; text: string }[] } {
  const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s*\|\s*Oviva UK$/, "");
  let body = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  body = body.replace(/<(script|style|noscript|svg|nav|header|footer|form|button|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|li|div|tr|h[1-6])>/gi, "$&\n").replace(/<br\s*\/?>/gi, "\n");
  const out: { heading: string; text: string }[] = [];
  const parts = body.split(/(<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>)/i);
  let heading = title;
  for (const part of parts) {
    if (/^<h[1-4]/i.test(part)) { heading = clean(part) || heading; continue; }
    const text = decode(part.replace(/<[^>]+>/g, " ")).split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(l => l.length > 2).join(" ");
    if (text.split(" ").length >= 8) out.push({ heading, text });
  }
  return { title, sections: out };
}

/** Sections longer than ~140 words are split on sentence boundaries, so each passage answers one thing. */
export function chunk(text: string, max = 140): string[] {
  const safe = text.replace(/\b(e\.g|i\.e|etc|approx|Dr|vs)\./gi, m => m.replace(/\./g, "\u2024")); // keep abbreviations inside their sentence
  const sentences = (safe.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [safe]).map(x => x.replace(/\u2024/g, "."));
  const chunks: string[] = [];
  let cur: string[] = [];
  for (const s of sentences) {
    if (cur.length && (cur.join(" ") + " " + s).split(/\s+/).length > max) { chunks.push(cur.join(" ").trim()); cur = []; }
    cur.push(s.trim());
  }
  if (cur.length) chunks.push(cur.join(" ").trim());
  return chunks;
}

export async function ingest(out = "data/passages.json"): Promise<Passage[]> {
  const passages: Passage[] = [];
  for (const url of SOURCES) {
    const res = await fetch(url, { headers: { "user-agent": "safe-support/0.1 (public-content demo)" } });
    if (!res.ok) { console.warn(`skipped ${url}: ${res.status}`); continue; }
    const page = sections(await res.text());
    const seen = new Set<string>();
    for (const s of page.sections) for (const text of chunk(s.text)) {
      if (seen.has(text)) continue; // repeated blocks (calls to action, footers inside <main>)
      seen.add(text);
      passages.push({ id: `p${passages.length + 1}`, url, title: page.title, heading: s.heading, text });
    }
    console.log(`${url}: ${page.sections.length} sections`);
  }
  mkdirSync("data", { recursive: true });
  writeFileSync(out, JSON.stringify(passages, null, 1));
  return passages;
}
