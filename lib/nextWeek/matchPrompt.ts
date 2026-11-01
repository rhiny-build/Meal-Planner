/**
 * Prompt and tool schema for matching recipe ingredient names to the items Ronen buys.
 * The item list goes in the (cached) system prompt, so every batch of names reuses it.
 */

export interface MatchItem {
  item: string
  aisle: string
  /** In how many past orders he bought it */
  bought: number
}

export const matchSystem = (items: MatchItem[]) => `You match recipe ingredients to the things one UK family actually buys in their weekly supermarket order.

You get a list of ingredient names copied from recipes (they may have typos, quantities, notes or odd wording). For each one decide:
- "item": the ONE item from the list below that is the same thing you would buy for that ingredient. Copy the item text exactly.
- "none": the family does not buy this (nothing on the list is it), or it is not something you buy (water, "salt and pepper to taste" when neither is listed).
- "unsure": you cannot tell what is meant, or two or more listed items are equally good and nothing tells them apart. Use this rarely: a wrong guess costs the family more than a "none".

Rules:
- Match on what the thing IS, never on a shared word. "sweet corn" is sweetcorn, not sweets. "garlic powder" is not garlic. "mayo" is mayonnaise, not egg mayo filling. "fries" are oven chips or fries, not breaded halloumi fries. A different form (powder, paste, juice, frozen, tinned, ready-made) is a different item unless the list has that exact form; then answer "none".
- Fix typos and read through wording: "Grated Mozzarela" is grated mozzarella; "ground turkey" is turkey mince; "El Paso Tortilla Kit" is a fajita kit; "Hallumi" is halloumi.
- A close everyday substitute is fine when it is the same ingredient in practice: "chicken strips" are chicken breast (or mini chicken fillets if those are listed and fit better); "chicken tenderloins" are mini chicken fillets or chicken breast; "scallions" are spring onions; "cornstarch" is cornflour.
- When several items could be right (for example "peppers" with red pepper and yellow pepper listed), pick the one bought most often. "unsure" is for real doubt, not for ties.
- Ignore quantities, units, preparation and "to taste / for garnish / optional" wording.
- A name that is several things ("salt and pepper") or is no ingredient at all ("boneless"): "unsure" if it clearly needs a person to look, otherwise "none".

The family's items (item | aisle | number of past orders it was in):
${items.map(i => `${i.item} | ${i.aisle} | ${i.bought}`).join('\n')}

Return exactly one answer per ingredient, with "name" copied exactly from the input.`

export const matchSchema = {
  type: 'object' as const,
  properties: {
    answers: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          decision: { type: 'string' as const, enum: ['item', 'none', 'unsure'] },
          item: { type: 'string' as const, description: 'The item from the list; only when decision is "item"' },
        },
        required: ['name', 'decision'],
      },
    },
  },
  required: ['answers'],
}
