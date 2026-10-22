export type Category = 'shoulder' | 'hobo' | 'tote' | 'crossbody' | 'bucket' | 'shoes'
export type Hardware = 'gold' | 'silver'

export type Product = {
  id: string
  name: string
  family: string // lowercase family key, e.g. "tabby", "teri"
  category: Category
  price: number
  was?: number
  colors: string[] // canonical color names (see lexicon)
  swatches: string[] // hex for the swatch dots
  hardware: Hardware
  material: string
  occasions: string[] // work, wedding, evening, weekend, everyday, travel, gift
  size: 'mini' | 'small' | 'medium' | 'large'
  laptop: 0 | 13 | 15 | 16 // largest laptop (inches) it carries, 0 = none
  topHandle: boolean
  lunch: boolean // room for lunch
  organized: boolean
  comfy: boolean // comfortable to carry (strap)
  skus: number // colorways/variants, drives result counts
  img: string
  note?: string // short merchandising line used for "why this" tags
}

/** What a typed query means, after parsing. */
export type Filters = {
  family?: string
  category?: Category
  colors: string[]
  occasions: string[]
  maxPrice?: number
  hardware?: Hardware
  laptop?: 13 | 15 | 16
  needs: Need[]
  minPrice?: number
  size?: SizePref
  material?: Material
  sale?: boolean
  /** colors the shopper ruled out ("not black") */
  notColors?: string[]
}

export type SizePref = 'mini' | 'small' | 'large'
export type Material = 'leather' | 'canvas' | 'signature'

export type Need = 'laptop' | 'lunch' | 'comfy' | 'organized' | 'topHandle'

export type ChipKind = 'family' | 'color' | 'occasion' | 'category' | 'price' | 'hardware' | 'laptop' | 'need' | 'size' | 'material' | 'sale' | 'exclude'
export type Chip = { id: string; kind: ChipKind; label: string; apply: Partial<Filters> & { laptop?: 13 | 15 | 16 } }

export type QueryKind = 'empty' | 'product' | 'occasion' | 'attribute' | 'vague' | 'question'
