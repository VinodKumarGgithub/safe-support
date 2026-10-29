/**
 * Safety triage, before any answer is attempted. Plain rules on purpose: they can be read, reviewed by a clinician and
 * tested, and no wording in the question can talk them out of a hand-over. Order matters: urgent beats clinical beats
 * account, so "how do I log my blood pressure? also I have chest pain" is urgent.
 */
export type Route = "urgent" | "clinical" | "account" | "answer" | "unsure";

const DRUG = "(wegovy|mounjaro|saxenda|semaglutide|tirzepatide|liraglutide|ozempic|metformin|insulin|injection|injections|jab|pen|medication|medicine|tablets?|pills?|dose)";

export const RULES: { route: Route; name: string; pattern: RegExp }[] = [
  { route: "urgent", name: "chest pain or breathing", pattern: /chest pains?|crushing chest|heart attack|can'?t breathe|cannot breathe|struggling to breathe|short of breath/i },
  { route: "urgent", name: "suicide or self-harm", pattern: /suicid|kill myself|end(ing)? (my life|it all)|don'?t want to (be alive|live)|hurt(ing)? myself|self[- ]?harm/i },
  { route: "urgent", name: "severe abdominal pain", pattern: /severe (stomach|abdominal|tummy|belly) pain|(stomach|abdominal|tummy) pain .*(through|into|to) (my|the) back/i },
  { route: "urgent", name: "dehydration", pattern: /vomit\w* all day|can'?t keep (anything|water|fluids?|food) down/i },
  { route: "urgent", name: "allergic reaction", pattern: /anaphyla|allergic reaction|(lips|throat|tongue|face)\b.*swell|swell\w*.*(lips|throat|tongue|face)\b/i },
  { route: "urgent", name: "fainting", pattern: /faint(ed|ing)?\b|passed out|collapsed|unconscious/i },
  { route: "urgent", name: "very low blood sugar", pattern: /\bhypo\b|sugar is [0-3](\.\d)?\b|shaky.*(sweat|confus)|confused and/i },
  { route: "urgent", name: "overdose", pattern: /overdose|injected (the )?(whole|entire)|took too much|double dose by mistake/i },
  { route: "urgent", name: "stroke signs", pattern: /stroke|face (is )?drooping|slurred speech/i },
  { route: "clinical", name: "dose or medication change", pattern: new RegExp(
    `missed (my |a )?(\\w+ )?${DRUG}|skip(ped)? (my |a )?${DRUG}|(increase|reduce|decrease|change|double|stop|start)\\w* (my |the |a )?${DRUG}|` +
    `should i (take|stop|start|keep|increase|reduce|change|skip|inject)\\b|what dose|which dose|double up`, "i") },
  { route: "clinical", name: "side effects or symptoms", pattern: /side[- ]effects? (i|i'm|i am|since)|since (i )?start\w* (the |my )?\w+|feel\w* sick|nause|diarrh|constipat|hair (loss|is falling|falling)|headaches?|dizz|rash|is (that|this|it) normal/i },
  { route: "clinical", name: "pregnancy or breastfeeding", pattern: /pregnan|breastfeed|breast-?feed|trying for a baby|conceiv/i },
  { route: "clinical", name: "readings or results", pattern: /(blood (sugar|glucose|pressure)|readings?|levels?|hba1c|results?) .*(high|low|worr|wrong)|blood test/i },
  { route: "clinical", name: "medicines together", pattern: new RegExp(`(with|while (on|taking)|alongside|and) ${DRUG}\\b.*\\?|${DRUG} (with|and) \\w+|alcohol|ibuprofen|paracetamol|interact`, "i") },
  { route: "clinical", name: "eating or mood", pattern: /binge|bingeing|making myself sick|purg|eating disorder|starv|low mood|depress|anxious|anxiety|panic/i },
  { route: "clinical", name: "asks for clinical advice", pattern: /ignore (your|the) rules|tell me (what|which) dose/i },
  { route: "account", name: "appointments", pattern: /(my|next|the) appointment|reschedul|move (my|the) (call|appointment)|cancel/i },
  { route: "account", name: "contact with my team", pattern: /(coach|dietitian|nurse|doctor|team) (hasn'?t|has not|haven'?t|not) (replied|responded|called|got back)|no (reply|response)|haven'?t heard/i },
  { route: "account", name: "complaint", pattern: /complain|complaint|unhappy with/i },
  { route: "account", name: "leaving", pattern: /leave the programme|leaving the programme|withdraw|quit the programme|stop the programme/i },
  { route: "account", name: "my details or data", pattern: /change (my |the )?(phone|number|email|address|details|name)|update my|delete my (data|account)|my (data|records)\b|subject access/i },
  { route: "account", name: "prescription delivery", pattern: /prescription (hasn'?t|has not|not|never) (arrived|come|been delivered)|delivery|parcel/i },
];

export function triage(question: string): { route: Route; rule: string } | null {
  for (const r of RULES) if (r.pattern.test(question)) return { route: r.route, rule: r.name };
  return null;
}
