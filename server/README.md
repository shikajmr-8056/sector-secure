# AVSS — Problem Statement (Sector-Specific Framing)

## The Core Problem

**Every vulnerability scoring system in use today treats all organizations exactly the same.**

CVSS, EPSS, even most modern tools — they score a bug purely on its technical properties. A SQL injection bug gets the same base severity whether it's sitting in:
- A hospital's patient records system
- A bank's transaction processor
- A hobby project with no real users

**But the real-world consequence of that same bug is wildly different depending on which one it is.** A leaked patient SSN triggers DPDP Act violations and puts lives at risk if records get tampered with. A leaked card number triggers PCI-DSS violations and direct financial theft. A bug in a hobby project triggers... nothing much. Same technical bug, three completely different real-world outcomes — and current scoring systems can't tell them apart, because **none of them ask what industry the code belongs to.**

This is the gap. Not "CVSS is inaccurate" in general — CVSS is *sector-blind by design*, and nobody has built a scanner that actually corrects for that.

## Why This Matters (proof, not just theory)

- Change Healthcare was breached through a setting most scanners would rank as a routine "medium" issue — no sector-awareness would have flagged that a missing MFA setting on a healthcare system carries far higher stakes than the same setting on a random app. Result: 190 million patient records exposed.
- Equifax's breach came from a bug scored a flat "10.0 critical" — but a flat critical score gives a developer no sense of *why* it's critical for *their specific business*, no regulatory urgency attached, just a number.

## Our Solution: Sector-Aware Scoring (AVSS)

We built a scanner that asks one extra question no other tool asks: **"What industry does this code actually belong to — and what does that industry legally require?"**

```
AVSS Score = Base Severity × Sector Multiplier × Regulatory Weight (× real exploit data)
```

1. **We detect the sector automatically**, using real evidence pulled straight from the code — route paths (`/api/patients/:id`), field names (`diagnosis`, `card_number`), and keywords in comments/README. Not a guess, not user-typed — evidence-based.
2. **We apply a sector-specific multiplier** — the same bug scores higher in healthcare/fintech than in a general app, because the real-world blast radius is genuinely bigger.
3. **We tie every finding to a named regulation** — India's DPDP Act for healthcare data, RBI's 2026 Cybersecurity Directions or PCI-DSS for fintech — so the score isn't just a number, it's backed by a legal reason.

## The Demo, in One Sentence

*"Same bug, same code, same technical severity — but watch its priority score jump the moment we tell the tool this file belongs to a hospital's patient system instead of a random app. That's the one thing no other scanner does."*

That's the whole problem and the whole solution, in one line: **vulnerability scoring today is sector-blind — ours isn't.**