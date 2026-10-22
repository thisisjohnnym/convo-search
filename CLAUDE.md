# Coach Conversational Search: Project Rules

Mobile-only prototype. No device frame. Page width is capped at 500px and centered; tested on iOS Safari (use 100dvh and safe-area insets). Scripted engine, mock catalog, static deploy (GitHub -> Vercel).
Design source of truth: Paper file "Coach - Convo search" (frames named `NEW · ...` are the approved new states).
Figma is for assets and context only. Never build from Figma layouts.

## MOTION RULE (mandatory, applies to every screen, component and state change)

**Nothing happens instantly.** Every appearance, disappearance, reorder, count change, press and state change is animated. The UI reacts to the user; it never feels stiff and never acts as a barrier.

### 1. Never a plain fade
Every enter combines **scale + opacity + blur**, not opacity alone.
- Enter from: `opacity 0, scale 0.96, blur 8px, y +8px` -> `opacity 1, scale 1, blur 0, y 0`
- Exit to: `opacity 0, scale 0.98, blur 4px` (exits are ~60% the duration of enters and never overshoot)
- Large surfaces (overlay, sheet, thread): scale 0.98 and blur 12px. Small elements (chips, tags): scale 0.9 and blur 4px.

### 2. Slight overshoot
Enters settle with a small spring overshoot (about 4-6%, never bouncy or cartoonish).
- Ease: `back.out(1.4)` in GSAP (see section 9)
- Scale overshoot peaks around 1.02-1.03 and settles at 1. Position overshoots by 2-4px.

### 3. Stagger top to bottom
Elements enter in reading order, top to bottom, left to right within a row.
- Stagger step: **45ms** between siblings (cap total stagger at 400ms; after 8 items, group the rest)
- Containers lead, content follows: container -> text -> chips/products -> CTA
- Exits stagger in reverse (bottom to top) at 25ms

### 4. Every screen change follows a choreography
No element animates on its own. Each state change is a written sequence with one lead element. Implement as a named timeline in `src/motion/choreography.ts` and reference it by name from components. Do not scatter ad-hoc transitions.

| Moment | Lead | Sequence (top to bottom) |
|---|---|---|
| Open search overlay | Search field | Overlay surface (scale/blur in) -> field -> history/suggestion rows -> rail -> input dock (rises from the bottom) |
| Typing, suggestions update | Rows | Rows re-flow with layout animation; changed rows crossfade with blur; counts tick (digit roll) |
| Rail re-title and re-rank | Rail title | Title swaps (blur crossfade) -> cards reorder with FLIP/layout spring -> "why" tags scale in last, staggered |
| Chip added or removed | Chip | Chip scales in with overshoot; neighbours slide to make room; live count ticks; adaptive next chips swap out in order |
| Nudge ("Still looking?") | Nudge row | Slides down from under the chip field with scale/blur, then its button |
| Rescue (zero results) | Heading | Heading -> body -> Ask Coach button -> relax pills, staggered |
| Vague-query offer | Offer row | Rises above the input dock, then its button |
| Escalate to Coach thread | Input bar | Input stays put (shared element). Rail compresses to the picks strip (layout animation). Thread messages enter top to bottom, need-chips last. |
| Coach message arrives | Message block | Block scales in -> text reveals line by line (blur-to-sharp) -> chips stagger in |
| "Show these" / land on PLP | Picks strip | Overlay dissolves with scale/blur; PLP grid tiles stagger in; Ask Coach dock rises last |
| Persistent Ask Coach dock | Dock | Rises with overshoot after the grid settles |

### 5. UI is never a barrier
- **Never block input during animation.** All animations are interruptible; a tap during an animation retargets it from its current value (GSAP tweens with `overwrite: "auto"`, not fire-and-forget).
- No scrim or lock that prevents scrolling, typing or tapping while something animates.
- Typing keeps focus across all transitions (the keyboard must not dismiss or flicker).
- Animation never delays content the user is waiting on. Content is interactive as it appears.

### 6. Feedback on every interaction (no stiff UI)
- Press: scale 0.97 with a quick spring (120ms) and release with overshoot. Applies to pills, chips, buttons, tiles, rows.
- Hover and focus (where present): subtle scale 1.01 or background shift, eased, never instant.
- Counts and prices change with a short roll or blur-crossfade, never a hard swap.
- Loading and thinking states animate (soft shimmer or staggered dots), never a static spinner.

### 7. Timing budget
- Micro (press, chip, tag): 120-220ms
- Components (rows, cards, messages): 260-380ms
- Surfaces (overlay, sheet, page): 380-520ms
- Whole choreography for one state change: <= 900ms to full interactivity; nothing is interactive-blocked, but visual settling beyond 900ms is a bug.
- No animation is 0ms. No `transition: none` and no `display` toggles without an animated wrapper.

### 8. Accessibility
`prefers-reduced-motion: reduce` swaps scale/blur/translate/overshoot for a short (120ms) opacity-only change and keeps stagger at 0. State changes are still never instant-snapping jarringly. Nothing relies on motion to convey meaning.

### 9. Implementation (GSAP only)
- Library: **GSAP** (`gsap` + `@gsap/react`). No other animation library, and no CSS keyframe animations for UI motion.
- React: always **`useGSAP()`** with a `scope` ref. Never target by selector without a scope. Wrap event-handler animations in **`contextSafe`** so they clean up on unmount.
- Sequencing: build every choreography as a **`gsap.timeline()`** with `defaults`, labels and the position parameter (`"<"`, `"<0.045"`). Never chain with `delay`.
- Overshoot: `back.out(1.4)` for enters (tune 1.2-1.7), `power2.in` for exits. Springy settles can use `elastic.out(1, 0.8)` sparingly.
- Enter recipe: `gsap.fromTo(el, {opacity:0, scale:.96, y:8, filter:"blur(8px)"}, {opacity:1, scale:1, y:0, filter:"blur(0px)", duration:.42, ease:"back.out(1.4)", stagger:.045})`. Clear `filter` on completion (`clearProps: "filter"`) so blur never lingers.
- Interruptible: use `overwrite: "auto"` on every tween so a new tap retargets from the current value instead of queueing. Never `pointer-events: none` on content during a tween.
- Reorder and shared-element moves (rail re-rank, rail compressing into the picks strip, chips making room): **GSAP Flip** (`gsap/Flip`): `Flip.getState()` -> change the DOM -> `Flip.from(state, {duration, ease:"back.out(1.2)", stagger})`.
- Exits: keep the element mounted until its exit timeline finishes. Use a small `<Presence>` helper in `src/motion/Presence.tsx` that plays the exit, then unmounts. No React unmount without an exit.
- Number changes (counts, prices): tween a proxy value and render it each update (digit roll), never swap text.
- Shared tokens live in `src/motion/tokens.ts` (eases, durations, stagger, blur/scale values) and named sequences in `src/motion/choreography.ts`. No magic numbers in components.
- Animate only `transform`, `opacity` and `filter`. Never animate width/height/top/left.
- Keep blur radii modest (large surfaces max 6px, small elements up to 8px; blur is expensive on full-screen layers) and use `will-change` only during the animation. Use `gsap.matchMedia()` for the reduced-motion path. Test on a mid-range phone.

### Review checklist (a PR or change is not done until all pass)
- [ ] No instant state changes anywhere (tap through every state)
- [ ] Every enter uses scale + opacity + blur with a slight overshoot
- [ ] Siblings stagger top to bottom; the lead element is obvious
- [ ] Mid-animation taps retarget instead of queueing or being ignored
- [ ] Keyboard stays up while typing through transitions
- [ ] Reduced-motion path verified
