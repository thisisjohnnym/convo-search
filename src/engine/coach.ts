import { mergeFilters, parseQuery } from './parse'
import { applyChip, chipsFromFilters, nextChips } from './suggest'
import { describe, hasNeed, isEmptyFilters, relaxations, search, whyTag } from './search'
import { NEED_LABEL } from './lexicon'
import type { Filters, Need, Product } from './types'

export type Option = { id: string; label: string; query?: string; patch?: (f: Filters) => Filters; free?: boolean }
/** A snapshot of the candidates at this point in the chat, so the user sees what a reply did instead of reading about it. */
export type Carousel = { ids: string[]; count: number; before?: number; added: string[] }
export type Msg = { id: number; from: 'coach' | 'user'; text: string; options?: Option[]; carousel?: Carousel }
export type Trigger = 'stalled' | 'zero' | 'vague' | 'manual' | 'normal'

let seq = 0
const mid = () => ++seq
/** Rotate through phrasings so Coach doesn't repeat itself turn after turn. */
const pick = (xs: string[]) => xs[seq % xs.length]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const names = (ps: Product[], n: number) => ps.slice(0, n).map((p) => p.name.replace(/ Shoulder Bag.*/, '').replace(/ Bag.*/, '')).join(' and the ')

const FREE: Option = { id: 'free', label: 'Type your own', free: true }

/** Short human summary of what we're looking at ("brown Tabbys for work"). */
export function summary(f: Filters): string {
  const parts: string[] = []
  parts.push(...f.colors)
  if (f.family) parts.push(cap(f.family) + 's')
  else if (f.category) parts.push(f.category + 's')
  else parts.push('bags')
  if (f.occasions.length) parts.push(`for ${f.occasions.join(' and ')}`)
  return parts.join(' ')
}

const THREAD_LABEL: Record<Need, string> = {
  laptop: 'I carry a laptop', lunch: 'I pack my lunch', comfy: 'I carry it all day', organized: 'I need pockets to stay organized', topHandle: 'I want a top handle',
}
function needOptions(f: Filters, limit = 4): Option[] {
  const all: Need[] = ['laptop', 'lunch', 'comfy', 'organized']
  return all.filter((n) => !f.needs.includes(n)).slice(0, limit).map((n) => ({ id: `need:${n}`, label: THREAD_LABEL[n], query: NEED_LABEL[n].toLowerCase() }))
}

export function opening(f: Filters, trigger: Trigger): Msg[] {
  if (trigger === 'zero') {
    const rx = relaxations(f)
    const options: Option[] = rx.slice(0, 3).map((r) => ({ id: `relax:${r.key}`, label: cap(r.label), patch: () => r.filters }))
    return [{ id: mid(), from: 'coach', text: `I couldn't find an exact match, but we can get close. ${rx.length ? `If you ${rx[0].label}, there are ${rx[0].count} to look at.` : 'Tell me what you are flexible on.'} What would be easiest to change?`, options: [...options, FREE] }]
  }
  if (trigger === 'vague') {
    if (f.occasions.includes('wedding')) {
      return [{ id: mid(), from: 'coach', text: "How fun. Are you dressing for the wedding, or looking for a gift for the bridal party?", options: [{ id: 'o:guest', label: 'Wedding guest', query: 'wedding evening' }, { id: 'o:gift', label: 'Bridesmaid gift', query: 'wedding gift' }, { id: 'o:budget', label: 'Under $250', query: 'under $250' }, FREE] }]
    }
    return [{ id: mid(), from: 'coach', text: "Happy to help. Who is it for, and what's the occasion?", options: [{ id: 'o:me', label: 'Something for work', query: 'work' }, { id: 'o:gift', label: 'A gift', query: 'gift' }, { id: 'o:wknd', label: 'A weekend bag', query: 'weekend' }, FREE] }]
  }
  if (trigger === 'manual') {
    return [{ id: mid(), from: 'coach', text: 'What are you shopping for today?', options: [{ id: 'm:work', label: 'Something for work', query: 'work' }, { id: 'm:gift', label: 'A gift', query: 'gift' }, { id: 'm:wknd', label: 'A weekend bag', query: 'weekend' }, FREE] }]
  }
  const text = trigger === 'stalled'
    ? "Let's look at these together. What will you be using it for most? Pick one, or just tell me."
    : 'Happy to help you find the right one. What will you be using it for most?'
  const found = search(f)
  const carousel: Carousel | undefined = found.length ? { ids: found.map((p) => p.id), count: found.length, added: [] } : undefined
  return [{ id: mid(), from: 'coach', text, carousel, options: [...needOptions(f), FREE] }]
}

type Result = { filters: Filters; msgs: Msg[]; widened: boolean; /** what kind of turn this was, for the tester log */ outcome: 'filter' | 'intent' | 'miss' | 'ask' }
type Intent = { filters?: Filters; /** said before the usual "I found these" line when filters changed; the whole reply when they did not */ text: string; carousel?: boolean }

const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const MISS = [
  "I'm not sure I caught that. I can help with bags, colors, budgets and gifts, or tell me a bit more about how you'll use it.",
  "Hmm, that one's outside what I can do. Try a color, a budget or what you'll use it for, or tap one below.",
  "I didn't quite get that. Tell me an occasion, a color or a price and I'll narrow these down.",
]

/** Follow-up pills that fit wherever the conversation is now. */
function followUps(f: Filters, chipCount = 2, total = 3): Option[] {
  const chips = nextChips(f, chipCount).map((c) => ({ id: `c:${c.id}`, label: cap(c.label), patch: (g: Filters) => applyChip(g, c) }))
  return [...chips, ...needOptions(f, 2)].slice(0, total)
}

/**
 * Things people say to a chat that are not product searches ("cheaper", "yes", "which is best?").
 * Only plain talk is caught here: anything that parses to a real filter ("red", "under $100") goes through the normal path.
 */
function intent(raw: string, f: Filters): Intent | null {
  const t = raw.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9$' ?]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return null
  const p = parseQuery(raw).filters
  const plain = isEmptyFilters(p)
  const found = search(f)
  const prices = found.map((x) => x.price)

  if (/\b(return|refund|exchange|shipping|ship|delivery|warranty|track my|tracking|in stock|in store|nearest store|size chart|how to clean|wash|promo|coupon|discount code|gift card)\b/.test(t))
    return { text: "That one's for Coach customer care. I can only help you find the right bag here, so want to keep narrowing these?" }
  if (plain && /^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening))\b/.test(t)) return { text: "Hi! Tell me what you're after, an occasion, a color or a budget, and I'll narrow these down." }
  if (/\b(thanks|thank you|thx|cheers)\b/.test(t)) return { text: 'Anytime. Tap See all above when you are ready, or tell me more and I will keep narrowing.' }
  if (plain && /^(lol|lmao|haha+|hehe+)/.test(t)) return { text: "Ha. Tell me a bit more about how you'll use it and I'll narrow these down." }
  if (/\b(cheaper|less expensive|lower price|more affordable|too expensive|too much|something under)\b/.test(t) && !/\d/.test(t) && found.length) {
    const lower = Array.from(new Set(prices)).sort((a, b) => a - b).filter((x) => x < Math.max(...prices))
    if (!lower.length) return { text: 'These are already the lowest-priced in this group. Want to loosen something else?', carousel: true }
    const cap_ = lower[Math.ceil(lower.length / 2) - 1]
    return { filters: { ...f, maxPrice: cap_ }, text: `Here is what I would look at under $${cap_}.` }
  }
  if (/\b(more expensive|pricier|fancier|nicer ones?|upgrade|higher end|splurge)\b/.test(t) && !/\d/.test(t) && found.length) {
    const mid = median(prices)
    if (mid === Math.min(...prices)) return { text: 'These are already at the top of our range. Want a different style instead?', carousel: true }
    return { filters: { ...f, minPrice: mid }, text: `Stepping up, from $${mid}.` }
  }
  if (/\b(compare|difference|versus|vs)\b/.test(t) && found.length >= 2) {
    const [a, b] = found
    const short = (x: Product) => `${x.colors[0]} ${x.name.replace(/ Shoulder Bag.*/, '').replace(/ Bag.*/, '')}`
    return { text: `The ${short(a)} is $${a.price} and ${a.size}; the ${short(b)} is $${b.price} and ${b.size}. ${a.price <= b.price ? `The ${short(a)} is easier on the budget` : `The ${short(b)} is easier on the budget`}${a.laptop !== b.laptop ? `, and the ${short(a.laptop > b.laptop ? a : b)} fits a bigger laptop` : ''}.`, carousel: true }
  }
  if (/\b(best|recommend|favou?rite|top pick|which one|which is|pick one|choose for me|your pick)\b/.test(t) && found.length) {
    const top = found[0]
    return { text: `If I had to pick one, the ${top.colors[0]} ${top.name.replace(/ Shoulder Bag.*/, '').replace(/ Bag.*/, '')} at $${top.price}. ${whyTag(top, f) ?? 'It fits what you told me best'}.`, carousel: true }
  }
  if (/\b(how much|what does it cost|what do they cost|price range)\b/.test(t) && found.length) return { text: `These run from $${Math.min(...prices)} to $${Math.max(...prices)}.`, carousel: true }
  if (plain && /^(no|nope|nah|nothing|not really|that's all|thats all|that's it|i'm good|im good|all good|no thanks)\b/.test(t)) return { text: "Sounds good. Tap See all above whenever you're ready, or tell me more if you think of something.", carousel: true }
  if (plain && /^(yes|yeah|yep|yup|sure|ok|okay|please|definitely|absolutely)\b/.test(t)) return { text: 'Great. What matters most: how you will carry it, your budget, or a color?' }
  return null
}

/** One conversational turn: apply what they said, answer, and ask the next best question. */
export function reply(f: Filters, input: { text?: string; option?: Option }): Result {
  const label = input.option?.label ?? input.text ?? ''
  const userMsg: Msg = { id: mid(), from: 'user', text: label }
  let next = clone(f)
  let lead = ''

  const say = (text: string, withCarousel = false, outcome: Result['outcome'] = 'intent'): Result => {
    const found = search(f)
    const carousel: Carousel | undefined = withCarousel && found.length ? { ids: found.map((p) => p.id), count: found.length, added: [] } : undefined
    return { filters: f, widened: false, outcome, msgs: [userMsg, { id: mid(), from: 'coach', text, carousel, options: [...followUps(f), FREE] }] }
  }

  if (input.option?.patch) next = input.option.patch(next)
  else if (input.text) {
    const it = intent(input.text, f)
    if (it && !it.filters) return say(it.text, it.carousel)
    if (it?.filters) { next = it.filters; lead = it.text }
  }
  if (!input.option?.patch && !lead) {
    const parsed = parseQuery(input.option?.query ?? input.text ?? '')
    const p = parsed.filters
    next = mergeFilters(next, p)
    // "I carry a laptop" with no size: ask, don't guess
    const raw = (input.option?.query ?? input.text ?? '').toLowerCase()
    if (p.needs.includes('laptop') && !/\b(13|14|15|16)\b/.test(raw) && !f.needs.includes('laptop')) {
      return {
        filters: f, widened: false, outcome: 'ask',
        msgs: [userMsg, { id: mid(), from: 'coach', text: "What size is your laptop? I'll make sure it fits comfortably.", options: [{ id: 'l13', label: '13 or 14 inch', query: '13 inch laptop' }, { id: 'l15', label: '15 inch', query: '15 inch laptop' }, { id: 'l16', label: '16 inch', query: '16 inch laptop' }, FREE] }],
      }
    }
    const understood = !isEmptyFilters(p) || p.needs.length > 0
    if (!understood) {
      const text = parsed.leftover.length ? `I don't have anything on “${parsed.leftover[0]}” yet. Try a color, a budget or how you'll use it, or tap one below.` : pick(MISS)
      return say(text, false, 'miss')
    }
  }

  let results = search(next)
  let widened = false
  let loosened = ''
  const before = search(f)
  if (results.length === 0) {
    const rx = relaxations(next)
    if (rx.length) { loosened = rx[0].label; next = rx[0].filters; results = search(next); widened = true }
  }

  const had = new Set(chipsFromFilters(f).map((c) => c.id))
  const carousel: Carousel | undefined = results.length
    ? { ids: results.map((p) => p.id), count: results.length, before: before.length || undefined, added: chipsFromFilters(next).filter((c) => !had.has(c.id)).map((c) => cap(c.label)) }
    : undefined
  let text: string
  if (widened && next.needs.includes('laptop')) {
    const tooSmall = before.filter((p) => !hasNeed(p, 'laptop', next.laptop))
    const ex = tooSmall[0] ? `${cap(tooSmall[0].family)} ${tooSmall[0].name.match(/\d+$/)?.[0] ?? ''}`.trim() : 'Those'
    text = `The ${ex} is a bit small for a ${next.laptop ?? 13}-inch laptop, so I picked these instead. Anything else that matters to you?`
  } else if (widened) {
    text = `Nothing matched every detail, so I loosened one thing (${loosened.toLowerCase()}) to show these. Anything else that matters to you?`
  } else if (results.length === 0) {
    text = "That's a tricky combination. Want to loosen one of those?"
  } else if (lead) {
    text = `${lead} Anything else that matters to you?`
  } else if (results.length === before.length || before.length === 0) {
    text = `${pick(['Got it. I found a few that could work well for you.', 'Great, these could be a good fit.'])} Anything else that matters to you?`
  } else {
    text = `${pick(['I found these that could be perfect for you.', 'These look like they would suit you well.', 'Here are a few I think you will like.'])} ${pick(['Anything else that matters to you?', 'Is there anything else you have in mind?'])}`
  }

  void describe; void names; void summary
  return { filters: next, widened, outcome: lead ? 'intent' : 'filter', msgs: [userMsg, { id: mid(), from: 'coach', text, carousel, options: [...followUps(next), FREE] }] }
}
