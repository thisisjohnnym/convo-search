# Coach Conversational Search: Discovery Interview

## What I read in the Paper file (7 mobile frames, 440x932)

Flow today: PLP -> search overlay (empty: "Previously searched") -> typing states:
general query ("ta" -> tabby), occasion query ("black w...", "bags for we..."), popular-term pill tapped
(chip "tabby family" + "Tap to add more terms"), chip + added term ("in br" -> brown/beige/brick).

Things the manual phase already does well (keep):
- Autocomplete rows with live result counts ("54 results")
- Query chips that accumulate (tabby family x) = proto-conversation without calling it that
- Recommendation rail whose *title changes with intent* ("Bags that fit a 16in laptop", "Perfect for a Wedding", "The Tabi Family")
- Bottom-anchored input + pill row above the keyboard (thumb zone)

Gaps / hooks for the conversational layer:
1. Pills above the keyboard are the only steering device; they overlap the rail and are covered by the keyboard.
2. Rail changes title but not *content logic* we can show: no "why this" signal.
3. No failure path: zero results, low confidence, repeated refinements without a tap.
4. No submit result state (what does the PLP look like after a steered search?).
5. Two input surfaces in the typing frames (top field with ghost text, bottom bar). Unclear which is canonical.
6. The inline chat entry on the PLP can be scrolled past (the problem we're solving).

## Working concept (to be challenged by your answers)

"Search that talks back": one surface, escalating levels.
1. Understand: classify the query (product name / category / occasion / attribute / vague / question)
2. Steer: rail + chips + suggestion rows re-shape to the detected intent
3. Narrow: chips accumulate, live result count, rail re-ranks per chip
4. Rescue: when search is struggling (0 results, low confidence, 2+ refinements with no tap, long dwell),
   the same input bar becomes a stylist thread carrying the full chip context
5. Land: results or a short set of picks back on the PLP, with the conversation collapsed into a persistent entry (not a scroll-past banner)

## Interview

### A. Goal and audience
1. What's the one sentence the team should leave the demo believing?
2. Who is in the room (design, product, eng, merch, execs) and what is each person skeptical about?
3. Is this a concept showcase (feels real, fake data OK) or a pre-production validation (real catalog/API shape)?
4. Success metric you'd pitch: conversion, search exit rate, time-to-first-product-tap, reduced zero-result sessions?

### B. Engine behavior (the strategy)
5. Which intents must the prototype demonstrably handle? (product name, color/material, occasion, size/fit like "16in laptop", price, gifting, vague/mood)
6. How should the rail "tweak" visibly: re-title only, re-rank, swap to collections, or show attribute facets?
7. When should the engine ask vs. act? (ask a clarifying question vs. silently apply a filter)
8. What triggers escalation to chat? (zero results / low confidence / N refinements / explicit tap / dwell)
9. Should the user ever see *why* (e.g. "Matched: fits 16in laptop")? Explainability level.

### C. Conversational layer
10. Does chat live inside the overlay (same input becomes thread), as a bottom sheet over PLP, or as a full screen?
11. Persona: "Coach stylist" voice? Tone, humor, length. Any brand voice doc?
12. What can chat DO beyond answering: apply filters, compare products, add to bag, save to wishlist?
13. How does a conversation end and hand back to the PLP? What persists after?
14. What should chat refuse or deflect (returns, order status, off-topic)?

### D. Entry points and integration
15. Where does the entry live so it can't be scrolled past: sticky bar, search field itself, floating button, filter bar?
16. Do the old inline pills/hints on the PLP stay, move into search, or get removed?
17. Voice (mic is in the design): in scope for the prototype?

### E. Prototype scope
18. Real LLM (needs API key + proxy on Vercel) or scripted/mock engine with deterministic flows? Hybrid?
19. Catalog: placeholder data, or can you provide real product names/images/prices (Coach images in the Paper file)?
20. Hero demo scripts (2-3 queries you want to nail), e.g. "bags for a wedding", "tabby in brown", "something for work that fits a laptop"
21. Mobile only: frame it in a phone chrome on desktop, or just responsive 440px?
22. Repo/hosting: GitHub org/name, Vercel account, public or password-protected (it uses Coach branding/imagery)?

### F. Design deltas
23. May I design new states in Paper (rescue/escalation, chat thread, post-search PLP) or do you want to design them and I build from what exists?
24. Brand constraints: keep Helvetica Now / monochrome strictly?
