import type { App } from '../state/useApp'

export type Scene = { id: string; title: string; blurb: string; handoff: string; play: (c: Ctx) => Promise<void> }

/** What a scene is allowed to do. Everything goes through the real app, so it behaves exactly like a tap. */
export type Ctx = {
  app: () => App
  cancelled: () => boolean
  wait: (ms: number) => Promise<void>
  type: (text: string, opts?: { clear?: boolean }) => Promise<void>
  openSearch: () => Promise<void>
  tapSuggestion: (index: number) => Promise<void>
  say: (text: string) => void
}

const find = <T,>(opts: { id: string }[] | undefined, id: string) => (opts ?? []).find((o) => o.id === id) as T | undefined

async function steer(c: Ctx) {
  await c.openSearch()
  await c.type('tabby')
  await c.wait(700)
  await c.tapSuggestion(2) // tabby bags in brown
  await c.wait(1000)
  await c.type('for wo')
  await c.wait(600)
  await c.tapSuggestion(0) // bags for work
  await c.wait(900)
}

export const scenes: Scene[] = [
  {
    id: 'steer', title: 'Search that steers', blurb: 'Type "tabby", refine, watch the counts and rail adapt',
    handoff: 'Your turn: add or remove a chip and watch the results re-sort.',
    play: async (c) => { await c.openSearch(); await c.type('tabby'); await c.wait(700); await c.tapSuggestion(2); await c.wait(900) },
  },
  {
    id: 'color', title: 'Color search', blurb: 'Black, then a color we do not stock (yellow)',
    handoff: 'The rail follows the color. Try "pink" or "green" next.',
    play: async (c) => { await c.openSearch(); await c.type('black'); await c.wait(2200); await c.type('yellow', { clear: true }) },
  },
  {
    id: 'occasion', title: 'Occasion search', blurb: '"bags for a wedding" re-titles and re-sorts the rail',
    handoff: 'Try "work" or "weekend" and watch the rail title change.',
    play: async (c) => { await c.openSearch(); await c.type('bags for a wedding') },
  },
  {
    id: 'rescue', title: 'Dead end, then rescue', blurb: 'A query nothing matches, with ways out',
    handoff: 'Your turn: tap Ask Coach, or a relax pill like "up to $500".',
    play: async (c) => { await c.openSearch(); await c.type('red tabby gold hardware under $200') },
  },
  {
    id: 'vague', title: 'Vague search, offer to help', blurb: '"something for my sister’s wedding"',
    handoff: 'Your turn: tap Ask Coach to narrow it down.',
    play: async (c) => { await c.openSearch(); await c.type("something for my sister's wedding") },
  },
  {
    id: 'full', title: 'Stalled → Coach → results', blurb: 'The full journey, ending on the PLP',
    handoff: 'Your turn: tap See 4 to land on the results page.',
    play: async (c) => {
      await steer(c)
      await c.wait(1400) // the nudge appears
      c.app().askCoach()
      await c.wait(2200)
      const t1 = c.app().thread?.msgs.at(-1)
      const laptop = find<{ id: string; label: string; query?: string }>(t1?.options, 'need:laptop')
      if (laptop && !c.cancelled()) c.app().answer({ option: laptop })
      await c.wait(2600)
      const t2 = c.app().thread?.msgs.at(-1)
      const sixteen = find<{ id: string; label: string; query?: string }>(t2?.options, 'l16')
      if (sixteen && !c.cancelled()) c.app().answer({ option: sixteen })
      await c.wait(1800)
    },
  },
]
