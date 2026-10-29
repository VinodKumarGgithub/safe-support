# safe-support

A first-line support assistant for a digital health programme, built around one rule: **it answers only what it can
quote from approved content, and everything clinical, urgent or account-specific goes to a person**. A release check
scores every change before it ships.

The demo runs on Oviva's public UK pages (programmes, the app's user manual, eligibility, the weight-loss medication
guides). It's built for the job of answering the routine questions that take coaches' time, so patients reach a person
faster when they actually need one.

```
$ npm run ingest && npm run eval
210 passages → data/passages.json
PASS – urgent recall 100%, unsafe answers 0, routine answered 100% (right page 93%), routed as labelled 100%.
```

| Check (64 labelled questions) | Result | Gate |
| --- | ---: | ---: |
| Urgent messages recognised | 10 / 10 | must be 100% |
| Clinical or urgent questions answered automatically | 0 | must be 0 |
| Routine questions answered without a person | 30 / 30 | ≥ 80% |
| …answered from the right page | 28 / 30 (93%) | ≥ 90% |

The gate has already earned its place. The first version **was blocked at 79% right-page answers**, for two reasons:
- It quoted FAQ questions back instead of their answers.
- It missed word forms ("shared" vs "share").

Fixing the ranking raised the score to 93%, without loosening a single safety rule. Full report:
[examples/eval-report.md](examples/eval-report.md). Why I built it, and a 4-week pilot:
[one-page brief](docs/oviva-brief.pdf).

## Run it

Node.js 22.18 or newer runs the TypeScript directly. There is nothing to install.

```
npm run ingest                                  # fetch the public pages (the text is never committed)
npm run ask -- "Can I connect my Bluetooth scales?"
npm run eval                                    # the release check; exits 1 if the gate fails
npm run shadow -- eval/shadow-sample.txt        # drafts for staff to accept, edit or reject
npm test                                        # offline unit tests
```

## How a message is handled

1. **Safety rules first** (`src/triage.ts`). Plain, readable patterns that a clinician can review. Urgent always beats
   clinical, and clinical beats account. No wording in the message can talk them out of a hand-over.
   - **Urgent:** chest pain, self-harm, severe abdominal pain, swelling of the lips or throat, fainting, very low blood
     sugar, overdose. The reply points to 999 and NHS 111, as Oviva's own pages do, and flags the message to the
     clinical team.
   - **Clinical:** doses, missed injections, side effects, pregnancy, readings, medicines together, eating and mood.
     These go to the clinical team, even when the content holds an answer.
   - **Account:** appointments, "my coach hasn't replied", complaints, leaving, personal data, prescription delivery.
     These go to the support team.
2. **Retrieval** (`src/retrieve.ts`). BM25 over the approved passages, and a heading that asks the same question counts
   extra. When the best match is weak, the message goes to a person instead of getting a guess.
3. **Answer** (`Writer` in `src/assistant.ts`). The default quotes one or two sentences and always names the page. For
   medication pages, it adds that this is general information and to ask the prescriber.
4. **Hand-over packet.** Every hand-over carries the message, the rule that fired and the two most relevant pages, so
   the person who picks it up starts with context.

The `Writer` is the replaceable part. An LLM writer (Gemini, Claude) plugs in behind the same rules, and the same
release check scores it. That way an assistant that sounds better can't ship if it answers one clinical question.

## Shadow mode

Before any patient sees a reply, `npm run shadow` writes drafts for staff to accept, edit or reject. In the sample, 1
draft of 8 came from the wrong programme's page (how long the programme lasts). That's the kind of draft staff reject,
and every rejection becomes a new test question.

## Limits

- I wrote the 64 test questions and used them while building, so they flatter the assistant. A real check would use a
  held-out set of anonymised questions from Oviva's support channels.
- The demo covers English UK public pages only, uses no patient data and has no access to any system.
- It's a demo, not a medical device and not clinical advice. It isn't affiliated with or endorsed by Oviva.

Built by [Vinod Kumar G](https://imvinod.com). I lead a team running a healthcare (Pharmacy Benefit Management)
platform at 1M+ transactions a day, and I build RAG and multi-agent assistants. MIT licensed.
