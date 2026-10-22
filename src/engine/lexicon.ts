import type { Category, Need } from './types'

/** word -> canonical color */
export const COLOR_WORDS: Record<string, string> = {
  black: 'black', brown: 'brown', chocolate: 'brown', espresso: 'brown', brick: 'rust', rust: 'rust', terracotta: 'rust',
  red: 'red', burgundy: 'red', wine: 'red', maroon: 'red', oxblood: 'red',
  tan: 'tan', camel: 'tan', beige: 'beige', neutral: 'beige', white: 'white', cream: 'white', ivory: 'white',
  navy: 'blue', blue: 'blue', green: 'green', mint: 'green', sage: 'green', floral: 'floral',
  yellow: 'yellow', mustard: 'yellow', pink: 'pink', blush: 'pink', purple: 'purple', lavender: 'purple', orange: 'orange', grey: 'grey', gray: 'grey',
}
/** canonical color -> product color names it matches */
export const COLOR_MATCH: Record<string, string[]> = {
  black: ['black'], brown: ['brown', 'rust'], rust: ['rust'], red: ['red', 'burgundy'], tan: ['tan', 'beige'],
  beige: ['beige', 'tan'], white: ['white', 'cream'], blue: ['navy', 'blue'], green: ['green', 'mint'], floral: ['floral'],
  // colors we do not stock: no direct match, so the engine shows the nearest shades instead
  yellow: [], pink: [], purple: [], orange: [], grey: [],
}

/** Nearest shades we do stock (used for "also in…" rails and for colors we do not carry). */
export const ADJACENT: Record<string, string[]> = {
  black: ['blue', 'brown'], brown: ['tan', 'black'], tan: ['brown', 'white'], beige: ['white', 'brown'], white: ['tan', 'green'],
  red: ['brown', 'black'], rust: ['brown', 'tan'], blue: ['black', 'green'], green: ['white', 'blue'], floral: ['white', 'green'],
  yellow: ['tan', 'white'], pink: ['red', 'white'], purple: ['blue', 'red'], orange: ['rust', 'tan'], grey: ['black', 'white'],
}
export const SHADE_LABEL: Record<string, string> = { blue: 'navy', rust: 'rust', white: 'cream' }

/** A related occasion to suggest after the one searched. */
export const OCCASION_REL: Record<string, string> = { wedding: 'evening', work: 'travel', evening: 'wedding', weekend: 'everyday', travel: 'work', gift: 'wedding', everyday: 'weekend' }

export const OCCASION_WORDS: Record<string, string> = {
  wedding: 'wedding', weddings: 'wedding', bridal: 'wedding', bridesmaid: 'wedding', bridesmaids: 'wedding', guest: 'wedding',
  work: 'work', office: 'work', commute: 'work', commuting: 'work', professional: 'work',
  evening: 'evening', party: 'evening', night: 'evening', date: 'evening', dinner: 'evening',
  weekend: 'weekend', casual: 'weekend', brunch: 'weekend',
  travel: 'travel', trip: 'travel', airport: 'travel', vacation: 'travel',
  gift: 'gift', gifts: 'gift', present: 'gift', birthday: 'gift', anniversary: 'gift',
  everyday: 'everyday', daily: 'everyday',
  graduation: 'gift', graduate: 'gift', holiday: 'gift', holidays: 'gift', christmas: 'gift', valentines: 'gift', mom: 'gift', mother: 'gift', mothers: 'gift', wife: 'gift', girlfriend: 'gift',
  club: 'evening', concert: 'evening', cocktail: 'evening', gala: 'evening', prom: 'evening',
  shower: 'wedding', reception: 'wedding', engagement: 'wedding',
  school: 'work', college: 'work', campus: 'work', class: 'work', interview: 'work', meeting: 'work',
  honeymoon: 'travel', flight: 'travel', getaway: 'travel', weekender: 'travel',
  errands: 'everyday', festival: 'weekend', picnic: 'weekend', beach: 'weekend', shopping: 'weekend',
}

/** Typed phrase -> headline wording for its occasion ("Perfect for a Night Out"). First match wins; only used when the occasion agrees. */
export const OCCASION_PHRASES: [RegExp, string, string][] = [
  [/\bbirt/, 'gift', 'a Birthday'], [/\banni/, 'gift', 'an Anniversary'], [/\bgrad/, 'gift', 'Graduation'],
  [/\b(holi|christ|valen)/, 'gift', 'the Holidays'], [/\b(mom|moth|wife|girlf)/, 'gift', 'Someone Special'],
  [/\b(date)\b/, 'evening', 'a Date Night'], [/\b(nigh|girls|club|conc|cock|gala|prom|part|dinn)/, 'evening', 'a Night Out'],
  [/\b(show|rece|enga)/, 'wedding', 'a Wedding Event'],
  [/\b(scho|coll|camp|clas)/, 'work', 'School'], [/\b(inte|meet)/, 'work', 'a Big Meeting'],
  [/\b(hone|flig|geta|week.*ender)/, 'travel', 'a Getaway'],
  [/\b(fest|picn|beac|shop)/, 'weekend', 'a Day Out'],
]
export const OCCASION_LABEL: Record<string, string> = {
  wedding: 'a Wedding', work: 'Work', evening: 'an Evening Out', weekend: 'the Weekend',
  travel: 'Travel', gift: 'a Gift', everyday: 'Everyday',
}
export const OCCASION_SHORT: Record<string, string> = {
  wedding: 'wedding', work: 'work', evening: 'evening', weekend: 'weekend', travel: 'travel', gift: 'gifts', everyday: 'everyday',
}

export const CATEGORY_WORDS: Record<string, Category | 'any'> = {
  shoulder: 'shoulder', hobo: 'hobo', hobos: 'hobo', tote: 'tote', totes: 'tote', crossbody: 'crossbody', crossbodies: 'crossbody',
  bucket: 'bucket', sandal: 'shoes', sandals: 'shoes', shoes: 'shoes', bag: 'any', bags: 'any', handbag: 'any', handbags: 'any', purse: 'any',
}
export const CATEGORY_LABEL: Record<string, string> = {
  shoulder: 'shoulder bag', hobo: 'hobo', tote: 'tote', crossbody: 'crossbody', bucket: 'bucket bag', shoes: 'sandal',
}

export const NEED_LABEL: Record<Need, string> = {
  laptop: 'Fits my laptop', lunch: 'Room for lunch', comfy: 'Comfortable to carry', organized: 'Keeps things organized', topHandle: 'Top handle',
}

export const VAGUE_TRIGGERS = /\b(something|anything|ideas?|suggest|recommend|help me|gift for|looking for|what should|best|nice|cute|pretty|stylish|trendy|elegant|classic|chic|fancy|special|good)\b/
export const QUESTION_TRIGGERS = /^(what|which|how|who|can|could|should|do|does|is|are|will)\b|\?\s*$/
export const STOP = new Set(['a', 'an', 'the', 'for', 'my', 'me', 'in', 'with', 'and', 'of', 'to', 'that', 'it', 'is', 'on', 'i', 'need', 'want', 'bag', 'bags', 'sisters', "sister's", 'sister', 'out', 'girls', 'girl', 'new', 'newest', 'latest', 'some', 'any', 'please', 'just', 'really', 'very', 'like', 'you', 'your', 'get', 'find', 'show', 'are', 'am', 'be', 'have', 'got', 'one', 'would', 'im', "i'm", 'or', 'but', 'at', 'from', 'up', 'under', 'than'])

/** Size words -> size preference. */
export const SIZE_WORDS: Record<string, 'mini' | 'small' | 'large'> = {
  mini: 'mini', tiny: 'mini', petite: 'mini', micro: 'mini',
  small: 'small', smaller: 'small', little: 'small', compact: 'small', lightweight: 'small',
  large: 'large', larger: 'large', big: 'large', bigger: 'large', roomy: 'large', roomier: 'large', spacious: 'large', oversized: 'large', huge: 'large', xl: 'large',
}
/** Which product sizes satisfy each size preference. */
export const SIZE_MATCH: Record<string, string[]> = { mini: ['mini'], small: ['mini', 'small'], large: ['large'] }
export const SIZE_LABEL: Record<string, string> = { mini: 'mini', small: 'small', large: 'large' }

export const MATERIAL_WORDS: Record<string, 'leather' | 'canvas' | 'signature'> = { leather: 'leather', canvas: 'canvas', signature: 'signature', jacquard: 'signature', monogram: 'signature' }
export const MATERIAL_LABEL: Record<string, string> = { leather: 'leather', canvas: 'canvas', signature: 'signature' }

export const CHEAP_WORDS = new Set(['cheap', 'cheaper', 'cheapest', 'affordable', 'inexpensive', 'budget', 'economical'])
export const LUXURY_WORDS = new Set(['luxury', 'luxe', 'splurge', 'premium', 'investment', 'pricey', 'pricier'])
export const SALE_WORDS = new Set(['sale', 'discount', 'discounted', 'deal', 'deals', 'clearance', 'markdown', 'markdowns', 'reduced'])
export const CHEAP_CAP = 200
export const LUXURY_FLOOR = 290
