# Build Plan: Coach Conversational Search Prototype

## 1. What we're building (one sentence)

A phone-sized, fully clickable prototype where search gets smarter as you type, steers you toward the right bags, and, only if search is struggling, turns into a conversation with Coach inside the same screen.

**What the team should walk away believing:** "Search is the hero. Chat is the safety net, and it feels like the same thing."

---

## 2. What the team will experience

Five demo moments, each one scripted to feel great. Anyone can also type their own queries, but these five are the polished path.

| # | Moment | What happens |
|---|---|---|
| 1 | **Search that steers** | Type "tabby", tap a suggestion, add "in brown". Chips build up, the count drops (178 → 54 → 12), the rail re-titles and re-sorts. |
| 2 | **Occasion search** | Type "bags for a wedding". The rail becomes "Perfect for a Wedding" with the most formal bags first. |
| 3 | **Dead end → rescue** | Type "red tabby gold hardware under $200". Nothing matches, so search says why and offers fixes. Tap Ask Coach. |
| 4 | **Vague search → offer** | Type "something for my sister's wedding". Results show right away, with a one-line "Want help narrowing this?" |
| 5 | **Stalled → Coach → PLP** | Add Tabby, Brown, For work and don't tap anything. A quiet "Still looking?" appears. Tap it, say "fits my 16 inch laptop", tap Show these. You land on the PLP with an Ask Coach dock that stays put. |

---

## 3. How the "brain" works (no AI needed)

Think of it as a short chain. Each step is simple and can be inspected, which is why the demo can't embarrass you.

1. **Read the query.** Is it a product name, a color, an occasion, a size or budget, or something vague?
2. **Match the catalog.** Every bag has tags (family, color, occasion, size, price, hardware, laptop fit).
3. **Decide what the screen does.**

| If the query is… | Then the screen… |
|---|---|
| A product name ("tabby") | Shows exact suggestions, a product rail, and "next step" chips |
| An occasion ("wedding") | Re-titles the rail and sorts by that occasion |
| Specific but impossible | Shows closest matches and the rescue message |
| Vague or a question | Shows best-effort results, then offers help |
| Two or more refinements with no tap | Shows the "Still looking?" nudge |

4. **Chips and counts stay honest.** The suggested chips are only ones that still have results. The count is always the real number.

**Coach replies are scripted**, written for the demo paths, with graceful fallbacks for anything else ("I can help with bags, sizes and gifts, try one of these"). No API keys, no cost, no surprises.

---

## 4. Screens (17 total)

- **Your 7 existing frames:** PLP entry, empty search, 3 typing states, pill tapped, pill plus added term.
- **The 5 approved new frames:** rescue, nudge, vague offer, Coach thread, PLP after Coach.
- **Plus the connective states I'll build in code:** results after submit, and a hidden demo reset (long-press the logo).

Everything is sized for a phone, with the page capped at 500px wide and centered on larger screens. There is no device frame, since the team will test it on iPhones. It handles the iOS safe areas and the Safari toolbar properly.

---

## 5. The catalog

About 48 products so the chips and counts behave realistically.
- **Real images and names** from your Figma files (about 17 images so far). More get added as I pull from the other Figma file.
- **Hand-written tags** for each product (color, occasion, size, laptop fit, hardware, price).
- Where we run short of photos, the same bag appears in different colors, and the data is built so real product data can replace it later.

---

## 6. Motion (the rule you set)

Nothing is instant. Every change uses scale, opacity and blur with a slight overshoot, and elements stagger top to bottom. The full rule and the 11 named sequences are in [CLAUDE.md](CLAUDE.md). I'll build the motion system **first**, so no screen is ever written without it.

---

## 7. The tech (plain version)

| What | Choice | Why |
|---|---|---|
| App | React + TypeScript, built with Vite | Fast to build, easy for engineers to read |
| Motion | GSAP (with its React hook and Flip plugin) | Timelines make the choreography easy to read, and Flip handles reorders and the rail-to-strip move |
| Styling | Plain CSS with design tokens from your Paper file | Matches your file exactly |
| Data | One JSON file for the catalog, one for Coach scripts | Easy to edit without touching code |
| Hosting | GitHub → Vercel | Every push updates the live link automatically |

---

## 8. Build order

Each step ends with something you can open and click. I'll show you after each one.

1. **Foundation:** project, design tokens (colors, fonts), motion system, page shell (500px max width, iOS-friendly). *Opens as an empty animated shell.*
2. **Catalog + brain:** the data and the rules, with a small test panel to check queries.
3. **Search overlay:** your 7 existing states, working with real typing.
4. **Smart states:** rescue, nudge and vague offer, triggered by real behavior.
5. **Coach thread:** the same input turns into the conversation, with the rail compressing into the picks strip.
6. **PLP + dock:** results page, applied chips, persistent Ask Coach.
7. **Motion polish:** run every transition against the checklist.
8. **Ship:** private GitHub repo, Vercel deploy with a password, and a short "how to demo" card.

---

## 9. What I need from you

1. **GitHub:** repo name, and your username or org. I'll make it **private**, since it uses Coach imagery.
2. **Vercel:** which account to deploy under, and a password for the preview link.
3. **Mic button:** show it as a visual only (my recommendation), or should it actually do voice?
4. **Product images from the second Figma file:** OK to keep pulling them tile by tile (slow but works)?

---

## 10. Not in this version (on purpose)

A live AI model, real checkout or bag, desktop layouts, accounts, and analytics. If the team likes it, these are the natural next steps.
