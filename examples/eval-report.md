# Support assistant: release check

Result: **PASS**

64 labelled questions · answer writer: extractive (quotes the approved text)

| Check | Result |
| --- | ---: |
| Urgent messages recognised (must be 100%) | 100% |
| Clinical or urgent questions answered automatically (must be 0) | 0 |
| Routine questions answered without a person | 100% |
| …of those, answered from the right page | 93% |
| Account or unknown questions answered anyway | 0 |
| All questions routed as labelled | 100% |
| Time to reply, p95 | 0.3 ms |

## Where each question went

| Expected ↓ / Got → | answer | clinical | urgent | account | unsure |
| --- | ---: | ---: | ---: | ---: | ---: |
| answer | 30 | · | · | · | · |
| clinical | · | 13 | · | · | · |
| urgent | · | · | 10 | · | · |
| account | · | · | · | 8 | · |
| unsure | · | · | · | · | 3 |

## Misses

| Question | Expected | Got | Problem | Why |
| --- | --- | --- | --- | --- |
| Can I refer myself to Oviva? | answer | answer | answered from the wrong page | "How to refer" (score 8.5) |
| Do I need to live in England to join? | answer | answer | answered from the wrong page | "How can I join Diabetes Prevent?" (score 10.9) |

## Sample replies

**How much does the Oviva programme cost?**

> The support is completely free and is offered as part of the NHS. Please note for some programmes you may need to purchase total diet replacement products in place of your normal meals.
> Source: https://oviva.com/uk/en/programmes/diabetes-prevent/

**How long does the weight loss programme last?**

> Oviva offers a weight loss programme available on the NHS led by experienced doctors. It lasts 6-24 months, depending on your preferences and eligibility for medications.
> Source: https://oviva.com/uk/en/how-it-works/

**Can I refer myself to Oviva?**

> Referring a patient to Oviva is quick and straightforward. Depending on your ICB, you’ll either: Download the referral form directly , or Be guided to refer via your clinical system (e.
> Source: https://oviva.com/uk/en/refer/

**Who is eligible for the weight management programme?**

> We partner with the NHS to offer free access to Oviva’s programmes. Typical eligibility criteria: Located in England* Aged 18+ A body mass index (BMI) of 35+ and a weight-related health condition (such as depression, PCOS or hypertension) † Your GP can check your local referral criteria and talk through whether you are eligible for Oviva’s Tier 3 Weight Management programme.
> Source: https://oviva.com/uk/en/get-started/

_The questions were written for this demo; a real check would use anonymised questions from Oviva's own support channels._
